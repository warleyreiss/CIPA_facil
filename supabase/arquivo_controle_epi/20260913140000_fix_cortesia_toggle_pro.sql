-- Fix: ativar cortesia não pode ser bloqueada pelo form que ainda manda plano_tipo=INICIANTE.
-- Toggle de cortesia define o plano (PRO / INICIANTE); o guard só vale quando NÃO está togglando.

CREATE OR REPLACE FUNCTION public.fn_admin_atualizar_assinatura(
  p_assinatura_id uuid,
  p_plano_tipo text DEFAULT NULL,
  p_plano_status text DEFAULT NULL,
  p_plano_regra_id text DEFAULT NULL,
  p_dias_tolerancia integer DEFAULT NULL,
  p_data_falha_pagamento timestamptz DEFAULT NULL,
  p_limpar_falha boolean DEFAULT false,
  p_cancel_at_period_end boolean DEFAULT NULL,
  p_motivo text DEFAULT NULL,
  p_cortesia boolean DEFAULT NULL
)
RETURNS public.assinaturas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old public.assinaturas;
  v_new public.assinaturas;
  v_actor text;
  v_audit_note text;
  v_price_pro text;
  v_price_iniciante text;
  v_plano_final text;
  v_regra_final text;
BEGIN
  IF NOT public.is_admin_suporte() THEN
    RAISE EXCEPTION 'Acesso negado: apenas equipe de suporte administrativo.';
  END IF;

  SELECT * INTO v_old FROM public.assinaturas WHERE id = p_assinatura_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assinatura não encontrada: %', p_assinatura_id;
  END IF;

  v_actor := COALESCE(auth.jwt() ->> 'email', 'admin_suporte');
  v_audit_note := v_actor || ' [ação suporte]' || COALESCE(': ' || p_motivo, '');

  SELECT stripe_price_id INTO v_price_pro
  FROM public.plano_regras
  WHERE upper(trim(nome_plano)) = 'PRO'
  ORDER BY stripe_price_id
  LIMIT 1;

  SELECT stripe_price_id INTO v_price_iniciante
  FROM public.plano_regras
  WHERE upper(trim(nome_plano)) = 'INICIANTE'
  ORDER BY stripe_price_id
  LIMIT 1;

  IF v_price_pro IS NULL THEN
    RAISE EXCEPTION 'Plano PRO não encontrado em plano_regras.';
  END IF;
  IF v_price_iniciante IS NULL THEN
    RAISE EXCEPTION 'Plano INICIANTE não encontrado em plano_regras.';
  END IF;

  -- Ativar só a partir de INICIANTE (sem plano pago), exceto se já estiver em cortesia
  IF p_cortesia IS TRUE THEN
    IF upper(trim(COALESCE(v_old.plano_tipo, ''))) IS DISTINCT FROM 'INICIANTE'
       AND COALESCE(v_old.cortesia, false) IS FALSE THEN
      RAISE EXCEPTION
        'Cortesia só pode ser ativada a partir de INICIANTE (atual: %).',
        COALESCE(v_old.plano_tipo, 'n/d');
    END IF;
  END IF;

  -- Só bloqueia alteração manual de plano enquanto cortesia permanece ligada.
  -- Quando p_cortesia IS TRUE/FALSE o próprio toggle define PRO/INICIANTE.
  IF p_cortesia IS NULL
     AND COALESCE(v_old.cortesia, false) IS TRUE
     AND p_plano_tipo IS NOT NULL
     AND upper(trim(p_plano_tipo)) IS DISTINCT FROM 'PRO' THEN
    RAISE EXCEPTION
      'Assinatura em cortesia opera como PRO. Remova a cortesia para alterar o plano.';
  END IF;

  PERFORM set_config('app.alterado_por', v_actor || COALESCE(' | ' || p_motivo, ''), true);

  IF p_cortesia IS TRUE THEN
    v_plano_final := 'PRO';
    v_regra_final := v_price_pro;
  ELSIF p_cortesia IS FALSE THEN
    v_plano_final := 'INICIANTE';
    v_regra_final := v_price_iniciante;
  ELSE
    v_plano_final := COALESCE(NULLIF(trim(p_plano_tipo), ''), v_old.plano_tipo);
    v_regra_final := COALESCE(NULLIF(trim(p_plano_regra_id), ''), v_old.plano_regra_id);
  END IF;

  UPDATE public.assinaturas SET
    plano_tipo = v_plano_final,
    plano_status = CASE
      WHEN p_cortesia IS TRUE OR p_cortesia IS FALSE THEN COALESCE(p_plano_status, 'active')
      ELSE COALESCE(p_plano_status, plano_status)
    END,
    plano_regra_id = v_regra_final,
    stripe_price_id = CASE
      WHEN p_cortesia IS TRUE THEN v_price_pro
      WHEN p_cortesia IS FALSE THEN NULL
      ELSE stripe_price_id
    END,
    stripe_subscription_id = CASE
      WHEN p_cortesia IS TRUE OR p_cortesia IS FALSE THEN NULL
      ELSE stripe_subscription_id
    END,
    dias_tolerancia = COALESCE(p_dias_tolerancia, dias_tolerancia),
    data_falha_pagamento = CASE
      WHEN p_limpar_falha OR p_cortesia IS TRUE OR p_cortesia IS FALSE THEN NULL
      WHEN p_data_falha_pagamento IS NOT NULL THEN p_data_falha_pagamento
      ELSE data_falha_pagamento
    END,
    motivo_falha = CASE
      WHEN p_limpar_falha OR p_cortesia IS TRUE OR p_cortesia IS FALSE THEN NULL
      ELSE motivo_falha
    END,
    cancel_at_period_end = CASE
      WHEN p_cortesia IS TRUE OR p_cortesia IS FALSE THEN false
      ELSE COALESCE(p_cancel_at_period_end, cancel_at_period_end)
    END,
    cancel_at = CASE
      WHEN p_cortesia IS TRUE OR p_cortesia IS FALSE THEN NULL
      ELSE cancel_at
    END,
    proxima_fatura = CASE
      WHEN p_cortesia IS TRUE OR p_cortesia IS FALSE THEN NULL
      ELSE proxima_fatura
    END,
    plano_fim_periodo = CASE
      WHEN p_cortesia IS TRUE OR p_cortesia IS FALSE THEN NULL
      ELSE plano_fim_periodo
    END,
    stripe_latest_invoice_url = CASE
      WHEN p_cortesia IS TRUE OR p_cortesia IS FALSE THEN NULL
      ELSE stripe_latest_invoice_url
    END,
    cortesia = COALESCE(p_cortesia, cortesia),
    cortesia_em = CASE
      WHEN p_cortesia IS TRUE THEN COALESCE(cortesia_em, now())
      WHEN p_cortesia IS FALSE THEN NULL
      ELSE cortesia_em
    END,
    cortesia_motivo = CASE
      WHEN p_cortesia IS TRUE THEN COALESCE(p_motivo, cortesia_motivo)
      WHEN p_cortesia IS FALSE THEN NULL
      ELSE cortesia_motivo
    END
  WHERE id = p_assinatura_id
  RETURNING * INTO v_new;

  IF p_cortesia IS TRUE THEN
    UPDATE public.usuarios
    SET status = true
    WHERE assinatura_id = p_assinatura_id
       OR id = v_new.proprietario_id;
  END IF;

  IF v_old.cortesia IS DISTINCT FROM v_new.cortesia
     OR v_old.plano_tipo IS DISTINCT FROM v_new.plano_tipo THEN
    INSERT INTO public.log_assinaturas_auditoria (
      assinatura_id, status_antigo, status_novo, alterado_por
    ) VALUES (
      p_assinatura_id,
      COALESCE(v_old.plano_tipo, 'n/d') || CASE WHEN v_old.cortesia THEN '+cortesia' ELSE '' END,
      COALESCE(v_new.plano_tipo, 'n/d') || CASE WHEN v_new.cortesia THEN '+cortesia' ELSE '' END,
      v_audit_note || CASE
        WHEN v_new.cortesia THEN ' [cortesia ON → PRO]'
        WHEN v_old.cortesia AND NOT COALESCE(v_new.cortesia, false) THEN ' [cortesia OFF → INICIANTE]'
        ELSE ''
      END
    );
  ELSIF v_old.plano_status IS DISTINCT FROM v_new.plano_status
     OR v_old.dias_tolerancia IS DISTINCT FROM v_new.dias_tolerancia THEN
    INSERT INTO public.log_assinaturas_auditoria (
      assinatura_id, status_antigo, status_novo, alterado_por
    ) VALUES (
      p_assinatura_id,
      v_old.plano_status,
      v_new.plano_status,
      v_audit_note
    );
  END IF;

  RETURN v_new;
END;
$$;

-- Repara linhas inconsistentes (flag cortesia sem plano PRO)
DO $$
DECLARE
  v_price_pro text;
BEGIN
  SELECT stripe_price_id INTO v_price_pro
  FROM public.plano_regras
  WHERE upper(trim(nome_plano)) = 'PRO'
  ORDER BY stripe_price_id
  LIMIT 1;

  IF v_price_pro IS NULL THEN
    RAISE NOTICE 'Skip backfill cortesia: PRO não encontrado em plano_regras';
    RETURN;
  END IF;

  UPDATE public.assinaturas a
  SET
    plano_tipo = 'PRO',
    plano_regra_id = v_price_pro,
    stripe_price_id = v_price_pro,
    stripe_subscription_id = NULL,
    plano_status = COALESCE(NULLIF(a.plano_status, ''), 'active'),
    cancel_at_period_end = false,
    cancel_at = NULL,
    proxima_fatura = NULL,
    plano_fim_periodo = NULL,
    data_falha_pagamento = NULL,
    motivo_falha = NULL
  WHERE a.cortesia IS TRUE
    AND upper(trim(COALESCE(a.plano_tipo, ''))) IS DISTINCT FROM 'PRO';
END $$;

ALTER TABLE public.assinaturas
  DROP CONSTRAINT IF EXISTS assinaturas_cortesia_plano_check;

ALTER TABLE public.assinaturas
  ADD CONSTRAINT assinaturas_cortesia_plano_check
  CHECK (NOT cortesia OR plano_tipo = 'PRO');
