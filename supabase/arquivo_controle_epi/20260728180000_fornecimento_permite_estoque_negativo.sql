-- Permite fornecimento mesmo quando o estoque fica negativo.
-- Remove o bloqueio de "estoque insuficiente" e deixa de usar GREATEST(0, ...).

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
BEGIN
  IF p_quantidade IS NULL OR p_quantidade < 1 THEN
    RAISE EXCEPTION 'Quantidade inválida';
  END IF;

  IF p_data_fornecimento IS NULL THEN
    RAISE EXCEPTION 'Data de fornecimento obrigatória';
  END IF;

  IF COALESCE(p_validacao_digital, false) AND p_metodo IS NULL THEN
    RAISE EXCEPTION 'Método de autenticação obrigatório quando validação digital está ativa';
  END IF;

  IF NOT COALESCE(p_validacao_digital, false) AND (p_metodo IS NOT NULL OR p_autenticacao_leitura IS NOT NULL) THEN
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
  FROM public.epis WHERE id = p_epi_id;

  -- Estoque negativo permitido: não bloqueia quando quantidade > saldo.

  IF v_atualizar_controle THEN
    INSERT INTO public.controle_epi (
      projeto_id, colaborador_id, epi_catalogo_id, epi_id,
      data_fornecimento, ca_numero, quantidade, motivo_acao, observacao,
      validacao_digital, metodo, autenticacao_leitura, status
    ) VALUES (
      p_projeto_id, p_colaborador_id, p_epi_catalogo_id, p_epi_id,
      p_data_fornecimento, p_ca_numero, p_quantidade, p_motivo_acao, v_obs,
      COALESCE(p_validacao_digital, false), p_metodo, p_autenticacao_leitura, true
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
    COALESCE(p_validacao_digital, false), p_metodo, p_autenticacao_leitura
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

GRANT EXECUTE ON FUNCTION public.fn_salvar_fornecimento_epi(
  uuid, uuid, uuid, uuid, integer, date, text, text, text, boolean, boolean, text, text
) TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_salvar_fornecimento_epi(
  uuid, uuid, uuid, uuid, integer, date, text, text, text, boolean, boolean, text, text
) IS
  'Registra fornecimento de EPI. Permite estoque negativo quando controle de estoque está ativo.';
