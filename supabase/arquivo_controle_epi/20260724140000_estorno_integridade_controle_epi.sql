-- Estorno de fornecimento: ordem segura + restaura autenticacao_leitura + integridade EPIs obrigatórios.

CREATE OR REPLACE FUNCTION public.fn_garantir_epis_obrigatorios_colaborador(p_colaborador_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_projeto_id uuid;
  v_epi_ids uuid[];
  v_epi_id uuid;
  v_existente public.controle_epi%ROWTYPE;
  v_inseridos integer := 0;
  v_reativados integer := 0;
  v_inalterados integer := 0;
BEGIN
  IF p_colaborador_id IS NULL THEN
    RETURN jsonb_build_object('inseridos', 0, 'reativados', 0, 'inalterados', 0);
  END IF;

  SELECT c.projeto_id, COALESCE(cf.epi_catalogo_ids, '{}'::uuid[])
  INTO v_projeto_id, v_epi_ids
  FROM public.colaboradores c
  LEFT JOIN public.cargo_funcoes cf ON cf.id = c.cargo_funcao_id
  WHERE c.id = p_colaborador_id
    AND c.status = true;

  IF v_projeto_id IS NULL THEN
    RETURN jsonb_build_object('inseridos', 0, 'reativados', 0, 'inalterados', 0);
  END IF;

  IF NOT public.checar_acesso_projeto(v_projeto_id) THEN
    RAISE EXCEPTION 'Sem permissão para verificar integridade do controle EPI';
  END IF;

  IF v_epi_ids IS NULL OR v_epi_ids = '{}'::uuid[] THEN
    RETURN jsonb_build_object('inseridos', 0, 'reativados', 0, 'inalterados', 0);
  END IF;

  FOREACH v_epi_id IN ARRAY v_epi_ids LOOP
    SELECT * INTO v_existente
    FROM public.controle_epi ce
    WHERE ce.colaborador_id = p_colaborador_id
      AND ce.epi_catalogo_id = v_epi_id
    LIMIT 1;

    IF NOT FOUND THEN
      INSERT INTO public.controle_epi (
        projeto_id, colaborador_id, epi_catalogo_id, motivo_acao, status
      ) VALUES (
        v_projeto_id, p_colaborador_id, v_epi_id, 'LANÇAMENTO INICIAL', true
      );
      v_inseridos := v_inseridos + 1;
    ELSIF v_existente.status IS DISTINCT FROM true THEN
      UPDATE public.controle_epi
      SET status = true,
          motivo_acao = COALESCE(NULLIF(v_existente.motivo_acao, ''), 'LANÇAMENTO INICIAL')
      WHERE id = v_existente.id;
      v_reativados := v_reativados + 1;
    ELSE
      v_inalterados := v_inalterados + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'inseridos', v_inseridos,
    'reativados', v_reativados,
    'inalterados', v_inalterados
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_garantir_epis_obrigatorios_colaborador(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_garantir_epis_obrigatorios_colaborador(uuid) IS
  'Garante que todos os EPIs obrigatórios da função do colaborador existam ativos em controle_epi.';

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
  WHERE id = p_historico_id;

  IF v_hist.id IS NULL THEN
    RAISE EXCEPTION 'Registro de fornecimento não encontrado';
  END IF;

  IF NOT public.checar_acesso_projeto(v_hist.projeto_id) THEN
    RAISE EXCEPTION 'Sem permissão neste projeto';
  END IF;

  -- Somente o último fornecimento do par colaborador × catálogo pode ser estornado
  SELECT h.id INTO v_latest_id
  FROM public.historico_controle_epi h
  WHERE h.colaborador_id = v_hist.colaborador_id
    AND h.epi_catalogo_id = v_hist.epi_catalogo_id
  ORDER BY h.data_fornecimento DESC NULLS LAST, h.id DESC
  LIMIT 1;

  IF v_latest_id IS DISTINCT FROM p_historico_id THEN
    RAISE EXCEPTION 'Somente o último fornecimento deste EPI pode ser estornado';
  END IF;

  -- 1) Retorno ao estoque (quando controle de estoque ativo)
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
      v_saldo, v_novo,
      'Estorno: ' || v_motivo || ' — fornecimento ' || COALESCE(v_hist.motivo_acao, ''),
      v_hist.colaborador_id, v_hist.id
    );
  END IF;

  -- 2) Localiza o registro anterior no histórico (mesmo colaborador × catálogo)
  SELECT * INTO v_anterior
  FROM public.historico_controle_epi h
  WHERE h.colaborador_id = v_hist.colaborador_id
    AND h.epi_catalogo_id = v_hist.epi_catalogo_id
    AND h.id <> p_historico_id
  ORDER BY h.data_fornecimento DESC NULLS LAST, h.id DESC
  LIMIT 1;

  -- 3) Repreenche controle_epi com o registro anterior (antes de apagar o estornado)
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

  -- 4) Remove do histórico o fornecimento estornado (o mais recente).
  -- A movimentação ESTORNO_FORNECIMENTO permanece; FK historico_controle_epi_id fica NULL (ON DELETE SET NULL).
  DELETE FROM public.historico_controle_epi WHERE id = p_historico_id;

  -- 5) Integridade: EPIs obrigatórios da função continuam controlados
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

GRANT EXECUTE ON FUNCTION public.fn_estornar_fornecimento_epi(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.fn_estornar_fornecimento_epi(uuid, text) IS
  'Estorna o último fornecimento: devolve estoque, restaura controle_epi do histórico anterior, exclui o histórico estornado e verifica EPIs obrigatórios.';
