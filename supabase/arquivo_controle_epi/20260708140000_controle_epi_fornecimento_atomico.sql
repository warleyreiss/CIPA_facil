-- Fornecimento atômico, estorno com rollback, auditoria de estoque e view enriquecida

-- ── 1. Tipos de movimentação: fornecimento e estorno ──
ALTER TABLE public.estoque_movimentacoes
  DROP CONSTRAINT IF EXISTS estoque_movimentacoes_tipo_check;

ALTER TABLE public.estoque_movimentacoes
  ADD CONSTRAINT estoque_movimentacoes_tipo_check
  CHECK (tipo IN ('AJUSTE', 'ESTORNO_ENTRADA', 'DEVOLUCAO', 'FORNECIMENTO', 'ESTORNO_FORNECIMENTO'));

ALTER TABLE public.estoque_movimentacoes
  ADD COLUMN IF NOT EXISTS historico_controle_epi_id uuid
    REFERENCES public.historico_controle_epi(id) ON DELETE SET NULL;

-- ── 2. View controle: epi_id, tamanho e último histórico (para rollback) ──
DROP VIEW IF EXISTS public.v_dashboard_conformidade_resumo;
DROP VIEW IF EXISTS public.v_controle_epi;

CREATE VIEW public.v_controle_epi AS
 SELECT ce.id AS controle_id,
    ce.projeto_id,
    ce.epi_id,
    ce.data_fornecimento,
    ce.quantidade,
    ce.ca_numero,
    ce.motivo_acao,
    ce.observacao,
    ce.epi_catalogo_id,
    c.id AS colaborador_id,
    c.nome AS colaborador_nome,
    c.inscricao AS colaborador_matricula,
    c.data_admissao AS colaborador_data_admissao,
    cf.nomenclatura AS cargo_funcao_nome,
    g.descricao AS ghe_nome,
    ec.descricao AS epi_nome,
    ec.classificacao AS epi_classificacao,
    ct.descricao AS tamanho_desc,
    e.prazo_troca_dias,
        CASE
            WHEN (ce.epi_id IS NULL) THEN NULL::date
            ELSE ((ce.data_fornecimento + ((COALESCE(e.prazo_troca_dias, 90) || ' days'::text))::interval))::date
        END AS prazo_previsto,
        CASE
            WHEN (ce.epi_id IS NULL) THEN NULL::integer
            ELSE (((ce.data_fornecimento + ((COALESCE(e.prazo_troca_dias, 90) || ' days'::text))::interval))::date - CURRENT_DATE)
        END AS prazo_restante_dias,
        CASE
            WHEN (ce.epi_id IS NULL) THEN 'PENDENTE'::text
            WHEN ((((ce.data_fornecimento + ((COALESCE(e.prazo_troca_dias, 90) || ' days'::text))::interval))::date - CURRENT_DATE) < 0) THEN 'VENCIDO'::text
            WHEN (((((ce.data_fornecimento + ((COALESCE(e.prazo_troca_dias, 90) || ' days'::text))::interval))::date - CURRENT_DATE) >= 0) AND ((((ce.data_fornecimento + ((COALESCE(e.prazo_troca_dias, 90) || ' days'::text))::interval))::date - CURRENT_DATE) <= 3)) THEN 'IMINENTE'::text
            ELSE 'NO PRAZO'::text
        END AS status_prazo,
    ce.metodo,
    ce.validacao_digital,
    (
      SELECT h.id
      FROM public.historico_controle_epi h
      WHERE h.colaborador_id = ce.colaborador_id
        AND h.epi_catalogo_id = ce.epi_catalogo_id
      ORDER BY h.data_fornecimento DESC NULLS LAST, h.id DESC
      LIMIT 1
    ) AS ultimo_historico_id
   FROM public.controle_epi ce
     JOIN public.colaboradores c ON ce.colaborador_id = c.id AND c.status = true
     LEFT JOIN public.cargo_funcoes cf ON c.cargo_funcao_id = cf.id
     LEFT JOIN public.ghe g ON cf.ghe_id = g.id
     JOIN public.epi_catalogo ec ON ce.epi_catalogo_id = ec.id
     LEFT JOIN public.epis e ON ce.epi_id = e.id
     LEFT JOIN public.catalogo_tamanhos ct ON e.catalogo_tamanho_id = ct.id
  WHERE ce.status IS DISTINCT FROM false;

GRANT SELECT ON TABLE public.v_controle_epi TO authenticated, service_role;

CREATE VIEW public.v_dashboard_conformidade_resumo AS
SELECT
  projeto_id,
  status_prazo,
  COUNT(*)::bigint AS total
FROM public.v_controle_epi
GROUP BY projeto_id, status_prazo;

GRANT SELECT ON public.v_dashboard_conformidade_resumo TO authenticated, service_role;

-- ── 3. Salvar fornecimento (transação única) ──
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
  p_metodo text DEFAULT NULL
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
BEGIN
  IF p_quantidade IS NULL OR p_quantidade < 1 THEN
    RAISE EXCEPTION 'Quantidade inválida';
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

  SELECT COALESCE(controle_estoque, true) INTO v_controle_estoque
  FROM public.projetos WHERE id = p_projeto_id;

  SELECT COALESCE(estoque_atual, 0) INTO v_saldo
  FROM public.epis WHERE id = p_epi_id;

  IF v_controle_estoque AND v_saldo < p_quantidade THEN
    RAISE EXCEPTION 'Estoque insuficiente. Disponível: %, solicitado: %', v_saldo, p_quantidade;
  END IF;

  IF NOT p_emergencial THEN
    INSERT INTO public.controle_epi (
      projeto_id, colaborador_id, epi_catalogo_id, epi_id,
      data_fornecimento, ca_numero, quantidade, motivo_acao, observacao,
      validacao_digital, metodo, status
    ) VALUES (
      p_projeto_id, p_colaborador_id, p_epi_catalogo_id, p_epi_id,
      p_data_fornecimento, p_ca_numero, p_quantidade, p_motivo_acao, p_observacao,
      COALESCE(p_validacao_digital, false), p_metodo, true
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
      status = true;
  END IF;

  INSERT INTO public.historico_controle_epi (
    projeto_id, colaborador_id, epi_id, epi_catalogo_id,
    quantidade, data_fornecimento, motivo_acao, ca_numero, observacao,
    validacao_digital, metodo
  ) VALUES (
    p_projeto_id, p_colaborador_id, p_epi_id, p_epi_catalogo_id,
    p_quantidade, p_data_fornecimento, p_motivo_acao, p_ca_numero, p_observacao,
    COALESCE(p_validacao_digital, false), p_metodo
  )
  RETURNING * INTO v_hist;

  IF v_controle_estoque THEN
    v_novo := v_saldo - p_quantidade;
    UPDATE public.epis
    SET estoque_atual = v_novo, updated_at = now()
    WHERE id = p_epi_id;

    INSERT INTO public.estoque_movimentacoes (
      projeto_id, epi_id, tipo, quantidade,
      saldo_anterior, saldo_posterior, motivo,
      colaborador_id, historico_controle_epi_id
    ) VALUES (
      p_projeto_id, p_epi_id, 'FORNECIMENTO', p_quantidade,
      v_saldo, v_novo,
      COALESCE(p_motivo_acao, 'Fornecimento') || COALESCE(' — ' || NULLIF(p_observacao, ''), ''),
      p_colaborador_id, v_hist.id
    );
  END IF;

  RETURN to_jsonb(v_hist);
END;
$$;

-- ── 4. Estornar fornecimento (rollback atômico) ──
CREATE OR REPLACE FUNCTION public.fn_estornar_fornecimento_epi(
  p_historico_id uuid
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
BEGIN
  SELECT * INTO v_hist
  FROM public.historico_controle_epi
  WHERE id = p_historico_id;

  IF v_hist.id IS NULL THEN
    RAISE EXCEPTION 'Registro de fornecimento não encontrado';
  END IF;

  IF NOT public.checar_acesso_projeto(v_hist.projeto_id) THEN
    RAISE EXCEPTION 'Sem permissão neste projeto';
  END IF;

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
    FROM public.epis WHERE id = v_hist.epi_id;

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
      v_saldo, v_novo, 'Estorno fornecimento — ' || COALESCE(v_hist.motivo_acao, ''),
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

  DELETE FROM public.historico_controle_epi WHERE id = p_historico_id;

  IF v_hist.motivo_acao IS DISTINCT FROM 'EMERGENCIAL' THEN
    IF v_anterior.id IS NOT NULL THEN
      UPDATE public.controle_epi SET
        epi_id = v_anterior.epi_id,
        data_fornecimento = v_anterior.data_fornecimento,
        ca_numero = v_anterior.ca_numero,
        quantidade = v_anterior.quantidade,
        motivo_acao = v_anterior.motivo_acao,
        observacao = v_anterior.observacao,
        validacao_digital = v_anterior.validacao_digital,
        metodo = v_anterior.metodo,
        status = true
      WHERE colaborador_id = v_hist.colaborador_id
        AND epi_catalogo_id = v_hist.epi_catalogo_id
        AND status IS DISTINCT FROM false;
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
        status = true
      WHERE colaborador_id = v_hist.colaborador_id
        AND epi_catalogo_id = v_hist.epi_catalogo_id
        AND status IS DISTINCT FROM false;
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', true, 'historico_id', p_historico_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_salvar_fornecimento_epi(
  uuid, uuid, uuid, uuid, integer, date, text, text, text, boolean, boolean, text
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.fn_estornar_fornecimento_epi(uuid) TO authenticated;
