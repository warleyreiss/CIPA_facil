-- Lançamento retroativo, índice histórico, estorno com motivo, notificações semanais

-- ── 1. Índice composto para histórico (rollback + retroativo) ──
CREATE INDEX IF NOT EXISTS idx_historico_epi_colab_cat_data
  ON public.historico_controle_epi (colaborador_id, epi_catalogo_id, data_fornecimento DESC, id DESC);

-- ── 2. Preferências de notificação por projeto ──
ALTER TABLE public.projetos
  ADD COLUMN IF NOT EXISTS notificar_vencimentos_email boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notificar_vencimentos_whatsapp boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS telefone_whatsapp_notificacao text;

COMMENT ON COLUMN public.projetos.notificar_vencimentos_email IS
  'Envia resumo semanal de EPIs vencidos/iminentes por e-mail aos gestores do projeto.';
COMMENT ON COLUMN public.projetos.notificar_vencimentos_whatsapp IS
  'Envia o mesmo resumo semanal via WhatsApp (requer integração configurada no servidor).';
COMMENT ON COLUMN public.projetos.telefone_whatsapp_notificacao IS
  'Telefone com DDI/DDD para alertas WhatsApp (ex.: 5511999999999).';

CREATE TABLE IF NOT EXISTS public.notificacoes_vencimentos_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  projeto_id uuid NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  canal text NOT NULL CHECK (canal IN ('EMAIL', 'WHATSAPP')),
  destinatario text,
  total_vencidos integer DEFAULT 0,
  total_iminentes integer DEFAULT 0,
  status text NOT NULL DEFAULT 'ENVIADO',
  detalhe text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notif_venc_log_projeto ON public.notificacoes_vencimentos_log(projeto_id);

ALTER TABLE public.notificacoes_vencimentos_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notif_venc_log_select_membro"
  ON public.notificacoes_vencimentos_log FOR SELECT TO authenticated
  USING (public.checar_acesso_projeto(projeto_id));

-- ── 3. Salvar fornecimento com regra retroativa ──
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

  IF v_controle_estoque AND v_saldo < p_quantidade THEN
    RAISE EXCEPTION 'Estoque insuficiente. Disponível: %, solicitado: %', v_saldo, p_quantidade;
  END IF;

  IF v_atualizar_controle THEN
    INSERT INTO public.controle_epi (
      projeto_id, colaborador_id, epi_catalogo_id, epi_id,
      data_fornecimento, ca_numero, quantidade, motivo_acao, observacao,
      validacao_digital, metodo, status
    ) VALUES (
      p_projeto_id, p_colaborador_id, p_epi_catalogo_id, p_epi_id,
      p_data_fornecimento, p_ca_numero, p_quantidade, p_motivo_acao, v_obs,
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
    p_quantidade, p_data_fornecimento, p_motivo_acao, p_ca_numero, v_obs,
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
      COALESCE(p_motivo_acao, 'Fornecimento') || COALESCE(' — ' || NULLIF(v_obs, ''), ''),
      p_colaborador_id, v_hist.id
    );
  END IF;

  RETURN to_jsonb(v_hist) || jsonb_build_object(
    'retroativo', v_retroativo,
    'apenas_historico', v_apenas_historico,
    'atualizou_controle', v_atualizar_controle AND NOT p_emergencial,
    'mensagem_retroativo',
      CASE
        WHEN v_apenas_historico THEN
          'O registro foi salvo com sucesso, mas identificamos um lançamento retroativo com data anterior ou igual ao último fornecimento deste equipamento. Por isso, ele constará somente no histórico — o controle de periodicidade permanece baseado no fornecimento mais recente.'
        WHEN v_retroativo AND v_atualizar_controle THEN
          'Lançamento retroativo salvo. Como a data informada é posterior ao último registro deste equipamento, ela passou a orientar o controle de periodicidade.'
        ELSE NULL
      END
  );
END;
$$;

-- ── 4. Estorno com motivo obrigatório ──
DROP FUNCTION IF EXISTS public.fn_estornar_fornecimento_epi(uuid);

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
BEGIN
  v_motivo := TRIM(COALESCE(p_motivo_estorno, ''));
  IF v_motivo = '' THEN
    RAISE EXCEPTION 'Informe o motivo do estorno para auditoria';
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

  RETURN jsonb_build_object('ok', true, 'historico_id', p_historico_id, 'motivo_estorno', v_motivo);
END;
$$;

-- ── 5. View auxiliar para notificações ──
CREATE OR REPLACE VIEW public.v_vencimentos_notificacao AS
SELECT
  v.projeto_id,
  p.nome AS projeto_nome,
  p.notificar_vencimentos_email,
  p.notificar_vencimentos_whatsapp,
  p.telefone_whatsapp_notificacao,
  v.colaborador_id,
  v.colaborador_nome,
  v.epi_nome,
  v.tamanho_desc,
  v.status_prazo,
  v.prazo_previsto,
  v.prazo_restante_dias
FROM public.v_controle_epi v
JOIN public.projetos p ON p.id = v.projeto_id
WHERE v.status_prazo IN ('VENCIDO', 'IMINENTE')
  AND p.status IS DISTINCT FROM false;

GRANT SELECT ON public.v_vencimentos_notificacao TO service_role;

GRANT EXECUTE ON FUNCTION public.fn_salvar_fornecimento_epi(
  uuid, uuid, uuid, uuid, integer, date, text, text, text, boolean, boolean, text
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.fn_estornar_fornecimento_epi(uuid, text) TO authenticated;
