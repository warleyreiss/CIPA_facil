-- Ferramenta administrativa / suporte (Controle_EPI_Admin)
-- RLS de nível administrador + views/RPCs de diagnóstico

-- ---------------------------------------------------------------------------
-- 1) Função: is_admin_suporte()
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin_suporte()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    lower(auth.jwt() ->> 'email') IN (
      'contato@proativaweb.com.br', 
    ),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin_suporte() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_suporte() TO authenticated, service_role;

COMMENT ON FUNCTION public.is_admin_suporte() IS
  'Retorna true quando o JWT autenticado é de um e-mail da equipe de suporte/admin.';

-- Alinha comunicados ao mesmo critério de suporte
CREATE OR REPLACE FUNCTION public.is_comunicado_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin_suporte();
$$;

-- ---------------------------------------------------------------------------
-- 2) Políticas RLS — leitura ampla para suporte
-- ---------------------------------------------------------------------------

-- assinaturas
DROP POLICY IF EXISTS "admin_suporte_select_assinaturas" ON public.assinaturas;
CREATE POLICY "admin_suporte_select_assinaturas"
  ON public.assinaturas FOR SELECT TO authenticated
  USING (public.is_admin_suporte());

DROP POLICY IF EXISTS "admin_suporte_update_assinaturas" ON public.assinaturas;
CREATE POLICY "admin_suporte_update_assinaturas"
  ON public.assinaturas FOR UPDATE TO authenticated
  USING (public.is_admin_suporte())
  WITH CHECK (public.is_admin_suporte());

-- usuarios
DROP POLICY IF EXISTS "admin_suporte_select_usuarios" ON public.usuarios;
CREATE POLICY "admin_suporte_select_usuarios"
  ON public.usuarios FOR SELECT TO authenticated
  USING (public.is_admin_suporte());

DROP POLICY IF EXISTS "admin_suporte_update_usuarios" ON public.usuarios;
CREATE POLICY "admin_suporte_update_usuarios"
  ON public.usuarios FOR UPDATE TO authenticated
  USING (public.is_admin_suporte())
  WITH CHECK (public.is_admin_suporte());

-- projetos
DROP POLICY IF EXISTS "admin_suporte_select_projetos" ON public.projetos;
CREATE POLICY "admin_suporte_select_projetos"
  ON public.projetos FOR SELECT TO authenticated
  USING (public.is_admin_suporte());

-- membro_projetos
DROP POLICY IF EXISTS "admin_suporte_select_membro_projetos" ON public.membro_projetos;
CREATE POLICY "admin_suporte_select_membro_projetos"
  ON public.membro_projetos FOR SELECT TO authenticated
  USING (public.is_admin_suporte());

-- colaboradores
DROP POLICY IF EXISTS "admin_suporte_select_colaboradores" ON public.colaboradores;
CREATE POLICY "admin_suporte_select_colaboradores"
  ON public.colaboradores FOR SELECT TO authenticated
  USING (public.is_admin_suporte());

-- epis (se existir)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'epis'
  ) THEN
    EXECUTE $p$
      DROP POLICY IF EXISTS "admin_suporte_select_epis" ON public.epis;
      CREATE POLICY "admin_suporte_select_epis"
        ON public.epis FOR SELECT TO authenticated
        USING (public.is_admin_suporte());
    $p$;
  END IF;
END $$;

-- log_assinaturas_auditoria
DROP POLICY IF EXISTS "admin_suporte_select_log_assinaturas" ON public.log_assinaturas_auditoria;
CREATE POLICY "admin_suporte_select_log_assinaturas"
  ON public.log_assinaturas_auditoria FOR SELECT TO authenticated
  USING (public.is_admin_suporte());

DROP POLICY IF EXISTS "admin_suporte_insert_log_assinaturas" ON public.log_assinaturas_auditoria;
CREATE POLICY "admin_suporte_insert_log_assinaturas"
  ON public.log_assinaturas_auditoria FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_suporte());

-- log_webhooks
DROP POLICY IF EXISTS "admin_suporte_select_log_webhooks" ON public.log_webhooks;
CREATE POLICY "admin_suporte_select_log_webhooks"
  ON public.log_webhooks FOR SELECT TO authenticated
  USING (public.is_admin_suporte());

-- ---------------------------------------------------------------------------
-- 3) View de insights (resumo por assinatura)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_admin_assinaturas_resumo
WITH (security_invoker = true)
AS
SELECT
  a.id,
  a.plano_tipo,
  a.plano_status,
  a.assinatura_tipo,
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

-- ---------------------------------------------------------------------------
-- 4) RPC: diagnóstico completo de uma assinatura
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_admin_diagnostico_assinatura(p_assinatura_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.is_admin_suporte() THEN
    RAISE EXCEPTION 'Acesso negado: apenas equipe de suporte administrativo.';
  END IF;

  SELECT jsonb_build_object(
    'assinatura', to_jsonb(a),
    'proprietario', (
      SELECT to_jsonb(u) FROM public.usuarios u WHERE u.id = a.proprietario_id
    ),
    'plano_regra', (
      SELECT to_jsonb(pr) FROM public.plano_regras pr
      WHERE pr.stripe_price_id = a.plano_regra_id
    ),
    'projetos', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'nome', p.nome,
          'status', p.status,
          'cnpj', p.cnpj,
          'cidade', p.cidade,
          'estado', p.estado,
          'created_at', p.created_at,
          'controle_estoque', p.controle_estoque,
          'periodicidade_troca', p.periodicidade_troca,
          'validacao_digital', p.validacao_digital,
          'assinatura_digital_modo', p.assinatura_digital_modo,
          'qtd_colaboradores', (
            SELECT COUNT(*) FROM public.colaboradores c
            WHERE c.projeto_id = p.id AND COALESCE(c.status, true)
          ),
          'qtd_epis', (
            SELECT COUNT(*) FROM public.epis e
            WHERE e.projeto_id = p.id AND COALESCE(e.status, true)
          )
        )
        ORDER BY p.created_at
      )
      FROM public.projetos p
      WHERE p.assinatura_id = a.id
    ), '[]'::jsonb),
    'membros', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', mp.id,
          'usuario_id', mp.usuario_id,
          'projeto_id', mp.projeto_id,
          'funcao', mp.funcao,
          'status', mp.status,
          'email', u.email,
          'nome_completo', u.nome_completo,
          'usuario_status', u.status
        )
      )
      FROM public.membro_projetos mp
      LEFT JOIN public.usuarios u ON u.id = mp.usuario_id
      WHERE mp.assinatura_id = a.id
    ), '[]'::jsonb),
    'auditoria_recente', COALESCE((
      SELECT jsonb_agg(to_jsonb(l) ORDER BY l.created_at DESC)
      FROM (
        SELECT * FROM public.log_assinaturas_auditoria
        WHERE assinatura_id = a.id
        ORDER BY created_at DESC
        LIMIT 30
      ) l
    ), '[]'::jsonb),
    'webhooks_relacionados', COALESCE((
      SELECT jsonb_agg(to_jsonb(w) ORDER BY w.created_at DESC)
      FROM (
        SELECT id, event_id, event_type, status, erro_mensagem, created_at
        FROM public.log_webhooks
        WHERE
          (payload #>> '{data,object,customer}') = a.stripe_customer_id
          OR (payload #>> '{data,object,id}') = a.stripe_subscription_id
          OR payload::text ILIKE '%' || COALESCE(a.stripe_customer_id, '___') || '%'
          OR payload::text ILIKE '%' || COALESCE(a.stripe_subscription_id, '___') || '%'
        ORDER BY created_at DESC
        LIMIT 20
      ) w
    ), '[]'::jsonb)
  )
  INTO v_result
  FROM public.assinaturas a
  WHERE a.id = p_assinatura_id;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Assinatura não encontrada: %', p_assinatura_id;
  END IF;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_admin_diagnostico_assinatura(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_admin_diagnostico_assinatura(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5) RPC: ações de suporte na assinatura (com auditoria)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_admin_atualizar_assinatura(
  p_assinatura_id uuid,
  p_plano_tipo text DEFAULT NULL,
  p_plano_status text DEFAULT NULL,
  p_plano_regra_id text DEFAULT NULL,
  p_dias_tolerancia integer DEFAULT NULL,
  p_data_falha_pagamento timestamptz DEFAULT NULL,
  p_limpar_falha boolean DEFAULT false,
  p_cancel_at_period_end boolean DEFAULT NULL,
  p_motivo text DEFAULT NULL
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
BEGIN
  IF NOT public.is_admin_suporte() THEN
    RAISE EXCEPTION 'Acesso negado: apenas equipe de suporte administrativo.';
  END IF;

  SELECT * INTO v_old FROM public.assinaturas WHERE id = p_assinatura_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assinatura não encontrada: %', p_assinatura_id;
  END IF;

  v_actor := COALESCE(auth.jwt() ->> 'email', 'admin_suporte');

  PERFORM set_config('app.alterado_por', v_actor || COALESCE(' | ' || p_motivo, ''), true);

  UPDATE public.assinaturas SET
    plano_tipo = COALESCE(p_plano_tipo, plano_tipo),
    plano_status = COALESCE(p_plano_status, plano_status),
    plano_regra_id = COALESCE(p_plano_regra_id, plano_regra_id),
    dias_tolerancia = COALESCE(p_dias_tolerancia, dias_tolerancia),
    data_falha_pagamento = CASE
      WHEN p_limpar_falha THEN NULL
      WHEN p_data_falha_pagamento IS NOT NULL THEN p_data_falha_pagamento
      ELSE data_falha_pagamento
    END,
    motivo_falha = CASE
      WHEN p_limpar_falha THEN NULL
      ELSE motivo_falha
    END,
    cancel_at_period_end = COALESCE(p_cancel_at_period_end, cancel_at_period_end)
  WHERE id = p_assinatura_id
  RETURNING * INTO v_new;

  -- Se o trigger de status não disparar (mesmo status), registra ação manual
  IF v_old.plano_status IS NOT DISTINCT FROM v_new.plano_status THEN
    INSERT INTO public.log_assinaturas_auditoria (
      assinatura_id, status_antigo, status_novo, alterado_por
    ) VALUES (
      p_assinatura_id,
      v_old.plano_status,
      v_new.plano_status,
      v_actor || ' [ação suporte]' || COALESCE(': ' || p_motivo, '')
    );
  END IF;

  RETURN v_new;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_admin_atualizar_assinatura(
  uuid, text, text, text, integer, timestamptz, boolean, boolean, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_admin_atualizar_assinatura(
  uuid, text, text, text, integer, timestamptz, boolean, boolean, text
) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6) RPC: métricas agregadas do dashboard admin
-- ---------------------------------------------------------------------------
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
      ),
      'canceladas', (
        SELECT COUNT(*) FROM public.assinaturas WHERE plano_status = 'canceled'
      ),
      'ativas', (
        SELECT COUNT(*) FROM public.assinaturas
        WHERE plano_status IN ('active', 'trialing')
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

REVOKE ALL ON FUNCTION public.fn_admin_metricas_gerais() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_admin_metricas_gerais() TO authenticated, service_role;
