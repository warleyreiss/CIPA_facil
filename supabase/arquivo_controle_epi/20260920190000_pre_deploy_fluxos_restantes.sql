-- Pente fino 2: fluxos restantes (acesso pós-cancelamento, estoque, limites, digital, catálogo, parceiro)

-- ── 1) Acesso ao projeto: usuário ativo + assinatura não cancelada ───────────
CREATE OR REPLACE FUNCTION public.checar_acesso_projeto(p_projeto_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.membro_projetos mp
    JOIN public.usuarios u ON u.id = mp.usuario_id
    JOIN public.projetos p ON p.id = mp.projeto_id
    JOIN public.assinaturas a ON a.id = p.assinatura_id
    WHERE mp.projeto_id = p_projeto_id
      AND mp.usuario_id = auth.uid()
      AND mp.status = true
      AND COALESCE(u.status, true) = true
      AND COALESCE(p.status, true) = true
      AND COALESCE(a.plano_status, '') <> 'canceled'
  );
$$;

CREATE OR REPLACE FUNCTION public.checar_gestor_projeto(p_projeto_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.membro_projetos mp
    JOIN public.usuarios u ON u.id = mp.usuario_id
    JOIN public.projetos p ON p.id = mp.projeto_id
    JOIN public.assinaturas a ON a.id = p.assinatura_id
    WHERE mp.projeto_id = p_projeto_id
      AND mp.usuario_id = auth.uid()
      AND mp.funcao = 'GESTOR'
      AND mp.status = true
      AND COALESCE(u.status, true) = true
      AND COALESCE(p.status, true) = true
      AND COALESCE(a.plano_status, '') <> 'canceled'
  );
$$;

-- ── 2) criar_projeto_avulso com limite do plano ───────────────────────────────
CREATE OR REPLACE FUNCTION public.criar_projeto_avulso(p_nome text, p_assinatura_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_projeto_id uuid;
  v_resultado jsonb;
  v_limite integer;
  v_qtd integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE id = v_user_id AND assinatura_id = p_assinatura_id AND COALESCE(status, true) = true
  ) THEN
    RAISE EXCEPTION 'Acesso negado: Seu usuário não está vinculado a esta assinatura.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.assinaturas
    WHERE id = p_assinatura_id AND COALESCE(plano_status, '') = 'canceled'
  ) THEN
    RAISE EXCEPTION 'Assinatura cancelada — não é possível criar projetos.';
  END IF;

  SELECT COALESCE(
    (
      SELECT pr.quantidade_projetos
      FROM public.assinaturas a
      JOIN public.plano_regras pr
        ON pr.stripe_price_id = COALESCE(NULLIF(a.plano_regra_id, ''), a.stripe_price_id)
      WHERE a.id = p_assinatura_id
      LIMIT 1
    ),
    (
      SELECT pr.quantidade_projetos
      FROM public.assinaturas a
      JOIN public.plano_regras pr ON pr.nome_plano = COALESCE(a.plano_tipo, 'INICIANTE')
      WHERE a.id = p_assinatura_id
      LIMIT 1
    ),
    0
  ) INTO v_limite;

  SELECT COUNT(*)::integer INTO v_qtd
  FROM public.projetos
  WHERE assinatura_id = p_assinatura_id AND COALESCE(status, true) = true;

  IF COALESCE(v_limite, 0) > 0 AND v_qtd >= v_limite THEN
    RAISE EXCEPTION 'LIMITE_PLANO: limite de projetos atingido (%).', v_limite;
  END IF;

  INSERT INTO public.projetos (
    nome, assinatura_id, status, periodicidade_troca, controle_estoque
  ) VALUES (
    p_nome, p_assinatura_id, true, true, true
  ) RETURNING id INTO v_projeto_id;

  INSERT INTO public.membro_projetos (
    assinatura_id, usuario_id, projeto_id, funcao, status
  ) VALUES (
    p_assinatura_id, v_user_id, v_projeto_id, 'GESTOR', true
  );

  SELECT row_to_json(p)::jsonb INTO v_resultado
  FROM public.projetos p WHERE p.id = v_projeto_id;

  RETURN v_resultado;
END;
$$;

REVOKE ALL ON FUNCTION public.criar_projeto_avulso(text, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.criar_projeto_avulso(text, uuid) TO authenticated, service_role;

-- ── 3) Estorno fornecimento com lock (anti double-credit) ────────────────────
CREATE OR REPLACE FUNCTION public.fn_estornar_fornecimento_epi(
  p_historico_id uuid,
  p_motivo_estorno text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hist public.historico_controle_epi%ROWTYPE;
  v_anterior public.historico_controle_epi%ROWTYPE;
  v_latest_id uuid;
  v_controle_estoque boolean;
  v_saldo integer;
  v_novo integer;
  v_motivo text;
  v_integridade jsonb;
  v_restaurou_anterior boolean := false;
BEGIN
  v_motivo := TRIM(COALESCE(p_motivo_estorno, ''));
  IF length(v_motivo) < 3 THEN
    RAISE EXCEPTION 'Informe o motivo do estorno (mínimo 3 caracteres) para auditoria';
  END IF;

  SELECT * INTO v_hist
  FROM public.historico_controle_epi
  WHERE id = p_historico_id
  FOR UPDATE;

  IF v_hist.id IS NULL THEN
    RAISE EXCEPTION 'Registro de fornecimento não encontrado';
  END IF;

  IF NOT public.checar_acesso_projeto(v_hist.projeto_id) THEN
    RAISE EXCEPTION 'Sem permissão neste projeto';
  END IF;

  -- Trava o conjunto e confirma que o alvo ainda é o último fornecimento
  PERFORM 1
  FROM public.historico_controle_epi h
  WHERE h.colaborador_id = v_hist.colaborador_id
    AND h.epi_catalogo_id = v_hist.epi_catalogo_id
  FOR UPDATE;

  SELECT h.id INTO v_latest_id
  FROM public.historico_controle_epi h
  WHERE h.colaborador_id = v_hist.colaborador_id
    AND h.epi_catalogo_id = v_hist.epi_catalogo_id
  ORDER BY h.data_fornecimento DESC NULLS LAST, h.id DESC
  LIMIT 1;

  IF v_latest_id IS DISTINCT FROM p_historico_id THEN
    RAISE EXCEPTION 'Somente o último fornecimento deste EPI pode ser estornado';
  END IF;

  SELECT COALESCE(controle_estoque, true) INTO v_controle_estoque
  FROM public.projetos WHERE id = v_hist.projeto_id;

  IF v_controle_estoque AND v_hist.epi_id IS NOT NULL AND COALESCE(v_hist.quantidade, 0) > 0 THEN
    SELECT COALESCE(estoque_atual, 0) INTO v_saldo
    FROM public.epis WHERE id = v_hist.epi_id
    FOR UPDATE;

    v_novo := v_saldo + v_hist.quantidade;

    UPDATE public.epis
    SET estoque_atual = v_novo, updated_at = now()
    WHERE id = v_hist.epi_id;

    INSERT INTO public.estoque_movimentacoes (
      projeto_id, epi_id, tipo, quantidade,
      saldo_anterior, saldo_posterior, motivo,
      colaborador_id, historico_controle_epi_id
    ) VALUES (
      v_hist.projeto_id, v_hist.epi_id, 'ESTORNO_FORNECIMENTO', v_hist.quantidade,
      v_saldo, v_novo,
      'Estorno: ' || v_motivo || ' — fornecimento ' || COALESCE(v_hist.motivo_acao, ''),
      v_hist.colaborador_id, v_hist.id
    );
  END IF;

  SELECT * INTO v_anterior
  FROM public.historico_controle_epi h
  WHERE h.colaborador_id = v_hist.colaborador_id
    AND h.epi_catalogo_id = v_hist.epi_catalogo_id
    AND h.id <> p_historico_id
  ORDER BY h.data_fornecimento DESC NULLS LAST, h.id DESC
  LIMIT 1;

  IF v_hist.motivo_acao IS DISTINCT FROM 'EMERGENCIAL' THEN
    IF v_anterior.id IS NOT NULL THEN
      UPDATE public.controle_epi SET
        epi_id = v_anterior.epi_id,
        data_fornecimento = v_anterior.data_fornecimento,
        ca_numero = v_anterior.ca_numero,
        quantidade = v_anterior.quantidade,
        motivo_acao = v_anterior.motivo_acao,
        observacao = v_anterior.observacao,
        validacao_digital = COALESCE(v_anterior.validacao_digital, false),
        metodo = v_anterior.metodo,
        autenticacao_leitura = v_anterior.autenticacao_leitura,
        status = true
      WHERE colaborador_id = v_hist.colaborador_id
        AND epi_catalogo_id = v_hist.epi_catalogo_id
        AND status IS DISTINCT FROM false;
      v_restaurou_anterior := true;
    ELSE
      UPDATE public.controle_epi SET
        epi_id = NULL,
        data_fornecimento = NULL,
        ca_numero = NULL,
        quantidade = 1,
        motivo_acao = 'LANÇAMENTO INICIAL',
        observacao = NULL,
        validacao_digital = false,
        metodo = NULL,
        autenticacao_leitura = NULL,
        status = true
      WHERE colaborador_id = v_hist.colaborador_id
        AND epi_catalogo_id = v_hist.epi_catalogo_id
        AND status IS DISTINCT FROM false;
    END IF;
  END IF;

  DELETE FROM public.historico_controle_epi WHERE id = p_historico_id;

  v_integridade := public.fn_garantir_epis_obrigatorios_colaborador(v_hist.colaborador_id);

  RETURN jsonb_build_object(
    'ok', true,
    'historico_id', p_historico_id,
    'motivo_estorno', v_motivo,
    'restaurou_anterior', v_restaurou_anterior,
    'historico_anterior_id', v_anterior.id,
    'integridade', v_integridade
  );
END;
$$;

-- ── 4) Devolução: colaborador do mesmo projeto e ativo ───────────────────────
CREATE OR REPLACE FUNCTION public.fn_devolver_epi_estoque(
  p_projeto_id uuid,
  p_epi_id uuid,
  p_colaborador_id uuid,
  p_quantidade integer,
  p_observacao text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_saldo integer;
  v_novo integer;
BEGIN
  IF NOT public.checar_acesso_projeto(p_projeto_id) THEN
    RAISE EXCEPTION 'Acesso negado ao projeto';
  END IF;

  IF p_quantidade IS NULL OR p_quantidade < 1 THEN
    RAISE EXCEPTION 'Quantidade inválida';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.colaboradores
    WHERE id = p_colaborador_id
      AND projeto_id = p_projeto_id
      AND status = true
  ) THEN
    RAISE EXCEPTION 'Colaborador não encontrado ou inativo neste projeto';
  END IF;

  SELECT coalesce(estoque_atual, 0)
  INTO v_saldo
  FROM public.epis
  WHERE id = p_epi_id
    AND projeto_id = p_projeto_id
    AND status = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'EPI não encontrado neste projeto';
  END IF;

  v_novo := v_saldo + p_quantidade;

  UPDATE public.epis
  SET estoque_atual = v_novo, updated_at = now()
  WHERE id = p_epi_id;

  INSERT INTO public.estoque_movimentacoes (
    projeto_id, epi_id, tipo, quantidade,
    saldo_anterior, saldo_posterior, motivo, colaborador_id
  ) VALUES (
    p_projeto_id, p_epi_id, 'DEVOLUCAO', p_quantidade,
    v_saldo, v_novo, p_observacao, p_colaborador_id
  );
END;
$$;

-- ── 5) Fornecimento: leitura digital obrigatória + FOR UPDATE no estoque ─────
CREATE OR REPLACE FUNCTION public.fn_salvar_fornecimento_epi(
  p_projeto_id uuid,
  p_colaborador_id uuid,
  p_epi_id uuid,
  p_epi_catalogo_id uuid,
  p_quantidade integer,
  p_data_fornecimento date,
  p_motivo_acao text,
  p_ca_numero text DEFAULT NULL,
  p_observacao text DEFAULT NULL,
  p_emergencial boolean DEFAULT false,
  p_validacao_digital boolean DEFAULT false,
  p_metodo text DEFAULT NULL,
  p_autenticacao_leitura text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_controle_estoque boolean;
  v_saldo integer;
  v_novo integer;
  v_hist public.historico_controle_epi%ROWTYPE;
  v_ultimo public.historico_controle_epi%ROWTYPE;
  v_retroativo boolean := false;
  v_apenas_historico boolean := false;
  v_atualizar_controle boolean := true;
  v_obs text := p_observacao;
  v_leitura text := TRIM(COALESCE(p_autenticacao_leitura, ''));
BEGIN
  IF p_quantidade IS NULL OR p_quantidade < 1 THEN
    RAISE EXCEPTION 'Quantidade inválida';
  END IF;

  IF p_data_fornecimento IS NULL THEN
    RAISE EXCEPTION 'Data de fornecimento obrigatória';
  END IF;

  IF COALESCE(p_validacao_digital, false) THEN
    IF p_metodo IS NULL OR length(TRIM(p_metodo)) < 2 THEN
      RAISE EXCEPTION 'Método de autenticação obrigatório quando validação digital está ativa';
    END IF;
    IF length(v_leitura) < 4 THEN
      RAISE EXCEPTION 'Leitura de autenticação digital obrigatória e inválida';
    END IF;
  ELSIF p_metodo IS NOT NULL OR p_autenticacao_leitura IS NOT NULL THEN
    RAISE EXCEPTION 'Autenticação digital não deve ser enviada no modo padrão';
  END IF;

  IF NOT public.checar_acesso_projeto(p_projeto_id) THEN
    RAISE EXCEPTION 'Sem permissão neste projeto';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.colaboradores
    WHERE id = p_colaborador_id AND projeto_id = p_projeto_id AND status = true
  ) THEN
    RAISE EXCEPTION 'Colaborador não encontrado ou inativo';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.epis
    WHERE id = p_epi_id
      AND projeto_id = p_projeto_id
      AND epi_catalogo_id = p_epi_catalogo_id
      AND status = true
  ) THEN
    RAISE EXCEPTION 'EPI não encontrado neste projeto';
  END IF;

  v_retroativo := p_data_fornecimento < CURRENT_DATE;

  IF v_retroativo AND NOT p_emergencial THEN
    SELECT * INTO v_ultimo
    FROM public.historico_controle_epi h
    WHERE h.colaborador_id = p_colaborador_id
      AND h.epi_catalogo_id = p_epi_catalogo_id
    ORDER BY h.data_fornecimento DESC NULLS LAST, h.id DESC
    LIMIT 1;

    IF v_ultimo.id IS NOT NULL AND p_data_fornecimento <= v_ultimo.data_fornecimento THEN
      v_apenas_historico := true;
      v_atualizar_controle := false;
      v_obs := TRIM(BOTH FROM COALESCE(v_obs, '') ||
        CASE WHEN COALESCE(v_obs, '') <> '' THEN ' | ' ELSE '' END ||
        '[Retroativo — registrado apenas no histórico; controle de periodicidade mantido no fornecimento mais recente]');
    END IF;
  END IF;

  IF p_emergencial THEN
    v_atualizar_controle := false;
  END IF;

  SELECT COALESCE(controle_estoque, true) INTO v_controle_estoque
  FROM public.projetos WHERE id = p_projeto_id;

  SELECT COALESCE(estoque_atual, 0) INTO v_saldo
  FROM public.epis WHERE id = p_epi_id
  FOR UPDATE;

  IF v_atualizar_controle THEN
    INSERT INTO public.controle_epi (
      projeto_id, colaborador_id, epi_catalogo_id, epi_id,
      data_fornecimento, ca_numero, quantidade, motivo_acao, observacao,
      validacao_digital, metodo, autenticacao_leitura, status
    ) VALUES (
      p_projeto_id, p_colaborador_id, p_epi_catalogo_id, p_epi_id,
      p_data_fornecimento, p_ca_numero, p_quantidade, p_motivo_acao, v_obs,
      COALESCE(p_validacao_digital, false), p_metodo,
      CASE WHEN COALESCE(p_validacao_digital, false) THEN v_leitura ELSE NULL END,
      true
    )
    ON CONFLICT (colaborador_id, epi_catalogo_id) DO UPDATE SET
      epi_id = EXCLUDED.epi_id,
      data_fornecimento = EXCLUDED.data_fornecimento,
      ca_numero = EXCLUDED.ca_numero,
      quantidade = EXCLUDED.quantidade,
      motivo_acao = EXCLUDED.motivo_acao,
      observacao = EXCLUDED.observacao,
      validacao_digital = EXCLUDED.validacao_digital,
      metodo = EXCLUDED.metodo,
      autenticacao_leitura = EXCLUDED.autenticacao_leitura,
      status = true;
  END IF;

  INSERT INTO public.historico_controle_epi (
    projeto_id, colaborador_id, epi_id, epi_catalogo_id,
    quantidade, data_fornecimento, motivo_acao, ca_numero, observacao,
    validacao_digital, metodo, autenticacao_leitura
  ) VALUES (
    p_projeto_id, p_colaborador_id, p_epi_id, p_epi_catalogo_id,
    p_quantidade, p_data_fornecimento, p_motivo_acao, p_ca_numero, v_obs,
    COALESCE(p_validacao_digital, false), p_metodo,
    CASE WHEN COALESCE(p_validacao_digital, false) THEN v_leitura ELSE NULL END
  )
  RETURNING * INTO v_hist;

  IF v_controle_estoque AND NOT v_apenas_historico THEN
    v_novo := v_saldo - p_quantidade;
    UPDATE public.epis
    SET estoque_atual = v_novo, updated_at = now()
    WHERE id = p_epi_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'historico_id', v_hist.id,
    'apenas_historico', v_apenas_historico,
    'mensagem_retroativo', CASE WHEN v_apenas_historico THEN
      'Fornecimento retroativo registrado apenas no histórico. O controle de periodicidade permanece no fornecimento mais recente.'
    ELSE NULL END,
    'data_fornecimento', p_data_fornecimento,
    'validacao_digital', COALESCE(p_validacao_digital, false),
    'metodo', p_metodo,
    'estoque_apos', CASE WHEN v_controle_estoque AND NOT v_apenas_historico THEN v_saldo - p_quantidade ELSE NULL END
  );
END;
$$;

-- ── 6) Catálogo EPI: RLS + upsert privilegiado ────────────────────────────────
ALTER TABLE public.epi_catalogo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS epi_catalogo_select_auth ON public.epi_catalogo;
CREATE POLICY epi_catalogo_select_auth
  ON public.epi_catalogo FOR SELECT TO authenticated
  USING (true);

CREATE OR REPLACE FUNCTION public.fn_upsert_epi_catalogo(
  p_descricao text,
  p_guia_tamanho integer DEFAULT 1,
  p_classificacao text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_desc text := TRIM(COALESCE(p_descricao, ''));
  v_guia integer := COALESCE(NULLIF(p_guia_tamanho, 0), 1);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;
  IF length(v_desc) < 2 THEN
    RAISE EXCEPTION 'Descrição de EPI inválida';
  END IF;

  SELECT id INTO v_id
  FROM public.epi_catalogo
  WHERE lower(descricao) = lower(v_desc)
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  INSERT INTO public.epi_catalogo (descricao, guia_tamanho_catalogo, classificacao)
  VALUES (v_desc, v_guia, p_classificacao)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_upsert_epi_catalogo(text, integer, text) TO authenticated, service_role;

-- ── 7) Parceiro: só na janela de cadastro recente (7 dias) ───────────────────
CREATE OR REPLACE FUNCTION public.aplicar_indicacao_parceiro(p_parceiro_codigo text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_projeto_id uuid;
  v_fornecedor_id uuid;
  v_created timestamptz;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  END IF;

  SELECT u.created_at INTO v_created
  FROM public.usuarios u WHERE u.id = v_user_id;

  IF v_created IS NOT NULL AND v_created < (now() - interval '7 days') THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'janela_indicacao_expirada');
  END IF;

  SELECT mp.projeto_id INTO v_projeto_id
  FROM public.membro_projetos mp
  WHERE mp.usuario_id = v_user_id
    AND mp.funcao = 'GESTOR'
    AND mp.status = true
  ORDER BY mp.created_at NULLS LAST
  LIMIT 1;

  IF v_projeto_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'projeto_nao_encontrado');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.fornecedores f
    WHERE f.projeto_id = v_projeto_id
      AND f.parceiro_id IS NOT NULL
      AND COALESCE(f.status, '1') NOT IN ('0', 'false')
  ) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'ja_tem_parceiro');
  END IF;

  v_fornecedor_id := public.criar_fornecedor_de_parceiro(v_projeto_id, p_parceiro_codigo);

  IF v_fornecedor_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'parceiro_invalido_ou_inativo');
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'fornecedor_id', v_fornecedor_id,
    'projeto_id', v_projeto_id
  );
END;
$$;
