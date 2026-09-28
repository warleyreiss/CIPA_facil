-- Assinatura cortesia: acesso liberado sem bloqueio financeiro (suporte)

ALTER TABLE public.assinaturas
  ADD COLUMN IF NOT EXISTS cortesia boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cortesia_em timestamptz,
  ADD COLUMN IF NOT EXISTS cortesia_motivo text;

COMMENT ON COLUMN public.assinaturas.cortesia IS
  'Flag interna: concede recursos do plano PRO sem Stripe. Ativada a partir de INICIANTE. Não é produto comercial.';
COMMENT ON COLUMN public.assinaturas.cortesia_em IS
  'Momento em que a cortesia foi ativada pelo suporte.';
COMMENT ON COLUMN public.assinaturas.cortesia_motivo IS
  'Motivo / ticket da cortesia.';

CREATE INDEX IF NOT EXISTS idx_assinaturas_cortesia
  ON public.assinaturas (cortesia)
  WHERE cortesia = true;

-- View admin com coluna cortesia
DROP VIEW IF EXISTS public.v_admin_assinaturas_resumo;

CREATE OR REPLACE VIEW public.v_admin_assinaturas_resumo
WITH (security_invoker = true)
AS
SELECT
  a.id,
  a.plano_tipo,
  a.plano_status,
  a.assinatura_tipo,
  a.cortesia,
  a.cortesia_em,
  a.cortesia_motivo,
  a.stripe_customer_id,
  a.stripe_subscription_id,
  a.stripe_price_id,
  a.plano_regra_id,
  a.dias_tolerancia,
  a.cancel_at_period_end,
  a.cancel_at,
  a.data_inicio,
  a.proxima_fatura,
  a.plano_fim_periodo,
  a.data_falha_pagamento,
  a.motivo_falha,
  a.created_at,
  u.nome_completo AS proprietario_nome,
  u.email AS proprietario_email,
  u.status AS proprietario_status,
  pr.nome_plano AS plano_regra_nome,
  pr.quantidade_projetos AS limite_projetos,
  pr.quantidade_colaboradores AS limite_colaboradores,
  pr.quantidade_epis AS limite_epis,
  (
    SELECT COUNT(*)::integer
    FROM public.projetos p
    WHERE p.assinatura_id = a.id
  ) AS qtd_projetos,
  (
    SELECT COUNT(*)::integer
    FROM public.projetos p
    WHERE p.assinatura_id = a.id AND COALESCE(p.status, true) = true
  ) AS qtd_projetos_ativos,
  (
    SELECT COUNT(DISTINCT mp.usuario_id)::integer
    FROM public.membro_projetos mp
    WHERE mp.assinatura_id = a.id AND COALESCE(mp.status, true) = true
  ) AS qtd_membros,
  (
    SELECT COUNT(*)::integer
    FROM public.colaboradores c
    JOIN public.projetos p ON p.id = c.projeto_id
    WHERE p.assinatura_id = a.id AND COALESCE(c.status, true) = true
  ) AS qtd_colaboradores_ativos
FROM public.assinaturas a
LEFT JOIN public.usuarios u ON u.id = a.proprietario_id
LEFT JOIN public.plano_regras pr ON pr.stripe_price_id = a.plano_regra_id;

GRANT SELECT ON public.v_admin_assinaturas_resumo TO authenticated, service_role;

-- Recria RPC de atualização com suporte a cortesia
DROP FUNCTION IF EXISTS public.fn_admin_atualizar_assinatura(
  uuid, text, text, text, integer, timestamptz, boolean, boolean, text
);

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

  -- Cortesia só para INICIANTE (evita conflito com cobrança/Stripe de planos pagos)
  IF p_cortesia IS TRUE THEN
    IF upper(trim(COALESCE(p_plano_tipo, v_old.plano_tipo, ''))) IS DISTINCT FROM 'INICIANTE' THEN
      RAISE EXCEPTION
        'Cortesia só pode ser ativada em assinaturas INICIANTE (plano atual: %).',
        COALESCE(v_old.plano_tipo, 'n/d');
    END IF;
  END IF;

  -- Com cortesia ativa, não permite subir para plano pago via suporte
  IF COALESCE(p_cortesia, v_old.cortesia, false) IS TRUE
     AND p_plano_tipo IS NOT NULL
     AND upper(trim(p_plano_tipo)) IS DISTINCT FROM 'INICIANTE' THEN
    RAISE EXCEPTION
      'Assinatura em cortesia deve permanecer INICIANTE. Remova a cortesia antes de alterar o plano.';
  END IF;

  PERFORM set_config('app.alterado_por', v_actor || COALESCE(' | ' || p_motivo, ''), true);

  UPDATE public.assinaturas SET
    plano_tipo = COALESCE(p_plano_tipo, plano_tipo),
    -- Ao ativar cortesia, garante status ativo no produto (Stripe pode continuar diferente)
    plano_status = CASE
      WHEN p_cortesia IS TRUE THEN COALESCE(p_plano_status, 'active')
      ELSE COALESCE(p_plano_status, plano_status)
    END,
    plano_regra_id = COALESCE(p_plano_regra_id, plano_regra_id),
    dias_tolerancia = COALESCE(p_dias_tolerancia, dias_tolerancia),
    data_falha_pagamento = CASE
      WHEN p_limpar_falha OR p_cortesia IS TRUE THEN NULL
      WHEN p_data_falha_pagamento IS NOT NULL THEN p_data_falha_pagamento
      ELSE data_falha_pagamento
    END,
    motivo_falha = CASE
      WHEN p_limpar_falha OR p_cortesia IS TRUE THEN NULL
      ELSE motivo_falha
    END,
    cancel_at_period_end = COALESCE(p_cancel_at_period_end, cancel_at_period_end),
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

  -- Reativa usuários da assinatura ao conceder cortesia
  IF p_cortesia IS TRUE THEN
    UPDATE public.usuarios
    SET status = true
    WHERE assinatura_id = p_assinatura_id
       OR id = v_new.proprietario_id;
  END IF;

  IF v_old.plano_status IS NOT DISTINCT FROM v_new.plano_status
     AND v_old.cortesia IS NOT DISTINCT FROM v_new.cortesia THEN
    INSERT INTO public.log_assinaturas_auditoria (
      assinatura_id, status_antigo, status_novo, alterado_por
    ) VALUES (
      p_assinatura_id,
      v_old.plano_status,
      v_new.plano_status,
      v_audit_note
    );
  ELSIF v_old.cortesia IS DISTINCT FROM v_new.cortesia THEN
    INSERT INTO public.log_assinaturas_auditoria (
      assinatura_id, status_antigo, status_novo, alterado_por
    ) VALUES (
      p_assinatura_id,
      CASE WHEN v_old.cortesia THEN 'cortesia' ELSE COALESCE(v_old.plano_status, 'n/d') END,
      CASE WHEN v_new.cortesia THEN 'cortesia' ELSE COALESCE(v_new.plano_status, 'n/d') END,
      v_audit_note || CASE WHEN v_new.cortesia THEN ' [cortesia ON]' ELSE ' [cortesia OFF]' END
    );
  END IF;

  RETURN v_new;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_admin_atualizar_assinatura(
  uuid, text, text, text, integer, timestamptz, boolean, boolean, text, boolean
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_admin_atualizar_assinatura(
  uuid, text, text, text, integer, timestamptz, boolean, boolean, text, boolean
) TO authenticated, service_role;

-- Métricas: inclui cortesias
CREATE OR REPLACE FUNCTION public.fn_admin_metricas_gerais()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_suporte() THEN
    RAISE EXCEPTION 'Acesso negado: apenas equipe de suporte administrativo.';
  END IF;

  RETURN (
    SELECT jsonb_build_object(
      'total_assinaturas', (SELECT COUNT(*) FROM public.assinaturas),
      'por_status', COALESCE((
        SELECT jsonb_object_agg(COALESCE(plano_status, 'null'), cnt)
        FROM (
          SELECT plano_status, COUNT(*)::integer AS cnt
          FROM public.assinaturas
          GROUP BY plano_status
        ) s
      ), '{}'::jsonb),
      'por_plano', COALESCE((
        SELECT jsonb_object_agg(COALESCE(plano_tipo, 'null'), cnt)
        FROM (
          SELECT plano_tipo, COUNT(*)::integer AS cnt
          FROM public.assinaturas
          GROUP BY plano_tipo
        ) p
      ), '{}'::jsonb),
      'por_tipo', COALESCE((
        SELECT jsonb_object_agg(COALESCE(assinatura_tipo, 'null'), cnt)
        FROM (
          SELECT assinatura_tipo, COUNT(*)::integer AS cnt
          FROM public.assinaturas
          GROUP BY assinatura_tipo
        ) t
      ), '{}'::jsonb),
      'inadimplentes', (
        SELECT COUNT(*) FROM public.assinaturas
        WHERE plano_status IN ('past_due', 'unpaid', 'paused', 'incomplete')
          AND COALESCE(cortesia, false) = false
      ),
      'canceladas', (
        SELECT COUNT(*) FROM public.assinaturas WHERE plano_status = 'canceled'
      ),
      'ativas', (
        SELECT COUNT(*) FROM public.assinaturas
        WHERE plano_status IN ('active', 'trialing') OR cortesia = true
      ),
      'cortesias', (
        SELECT COUNT(*) FROM public.assinaturas WHERE cortesia = true
      ),
      'total_projetos', (SELECT COUNT(*) FROM public.projetos),
      'total_usuarios', (SELECT COUNT(*) FROM public.usuarios),
      'webhooks_erro_7d', (
        SELECT COUNT(*) FROM public.log_webhooks
        WHERE created_at >= now() - interval '7 days'
          AND (status ILIKE '%error%' OR status ILIKE '%fail%' OR erro_mensagem IS NOT NULL)
      ),
      'novas_assinaturas_30d', (
        SELECT COUNT(*) FROM public.assinaturas
        WHERE created_at >= now() - interval '30 days'
      )
    )
  );
END;
$$;
