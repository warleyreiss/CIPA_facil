-- =============================================================================
-- RLS: comunicados_sistema + comunicados_dismiss
-- Supabase → SQL Editor → New query → cole e execute
-- =============================================================================
-- Pré-requisito: tabelas já criadas com usuario_id referenciando usuarios(id),
-- onde usuarios.id = auth.users.id (padrão deste projeto).
-- =============================================================================

-- ── 1. Habilitar RLS ────────────────────────────────────────────────────────

ALTER TABLE public.comunicados_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comunicados_dismiss ENABLE ROW LEVEL SECURITY;

-- ── 2. Permissões base (role authenticated) ─────────────────────────────────

GRANT SELECT ON public.comunicados_sistema TO authenticated;
GRANT SELECT, INSERT ON public.comunicados_dismiss TO authenticated;

-- INSERT/UPDATE/DELETE em comunicados_sistema: apenas admins (política abaixo)
-- ou via SQL Editor / service_role (ignora RLS).

-- ── 3. Função auxiliar: e-mails admin (ajuste a lista) ──────────────────────

CREATE OR REPLACE FUNCTION public.is_comunicado_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (auth.jwt() ->> 'email') IN (
      'contato@proativaweb.com.br'
      -- adicione outros e-mails admin aqui, separados por vírgula:
      -- , 'seu@email.com'
    ),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.is_comunicado_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_comunicado_admin() TO authenticated;

-- ── 4. comunicados_sistema ──────────────────────────────────────────────────

-- Usuários logados: só leem comunicados ativos e dentro do prazo
DROP POLICY IF EXISTS "comunicados_select_ativos" ON public.comunicados_sistema;
CREATE POLICY "comunicados_select_ativos"
  ON public.comunicados_sistema
  FOR SELECT
  TO authenticated
  USING (
    ativo IS TRUE
    AND inicia_em <= now()
    AND (expira_em IS NULL OR expira_em > now())
  );

-- Admins: leem todos (inclui inativos/expirados — útil para painel futuro)
DROP POLICY IF EXISTS "comunicados_select_admin" ON public.comunicados_sistema;
CREATE POLICY "comunicados_select_admin"
  ON public.comunicados_sistema
  FOR SELECT
  TO authenticated
  USING (public.is_comunicado_admin());

-- Admins: criar comunicados
DROP POLICY IF EXISTS "comunicados_insert_admin" ON public.comunicados_sistema;
CREATE POLICY "comunicados_insert_admin"
  ON public.comunicados_sistema
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_comunicado_admin());

-- Admins: editar comunicados
DROP POLICY IF EXISTS "comunicados_update_admin" ON public.comunicados_sistema;
CREATE POLICY "comunicados_update_admin"
  ON public.comunicados_sistema
  FOR UPDATE
  TO authenticated
  USING (public.is_comunicado_admin())
  WITH CHECK (public.is_comunicado_admin());

-- Admins: excluir comunicados
DROP POLICY IF EXISTS "comunicados_delete_admin" ON public.comunicados_sistema;
CREATE POLICY "comunicados_delete_admin"
  ON public.comunicados_sistema
  FOR DELETE
  TO authenticated
  USING (public.is_comunicado_admin());

-- ── 5. comunicados_dismiss ──────────────────────────────────────────────────

-- Usuário vê apenas os próprios registros de "já li"
DROP POLICY IF EXISTS "dismiss_select_own" ON public.comunicados_dismiss;
CREATE POLICY "dismiss_select_own"
  ON public.comunicados_dismiss
  FOR SELECT
  TO authenticated
  USING (usuario_id = auth.uid());

-- Usuário registra dismiss só para si mesmo
DROP POLICY IF EXISTS "dismiss_insert_own" ON public.comunicados_dismiss;
CREATE POLICY "dismiss_insert_own"
  ON public.comunicados_dismiss
  FOR INSERT
  TO authenticated
  WITH CHECK (
    usuario_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.comunicados_sistema c
      WHERE c.id = comunicado_id
        AND c.ativo IS TRUE
        AND c.inicia_em <= now()
        AND (c.expira_em IS NULL OR c.expira_em > now())
    )
  );

-- Admins podem consultar dismiss (estatísticas / suporte)
DROP POLICY IF EXISTS "dismiss_select_admin" ON public.comunicados_dismiss;
CREATE POLICY "dismiss_select_admin"
  ON public.comunicados_dismiss
  FOR SELECT
  TO authenticated
  USING (public.is_comunicado_admin());

-- Sem UPDATE/DELETE para usuários comuns (dismiss é imutável)

-- ── 6. (Opcional) Índices de performance ────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_comunicados_sistema_ativo_vigencia
  ON public.comunicados_sistema (ativo, inicia_em, expira_em)
  WHERE ativo IS TRUE;

CREATE INDEX IF NOT EXISTS idx_comunicados_dismiss_usuario
  ON public.comunicados_dismiss (usuario_id);

CREATE INDEX IF NOT EXISTS idx_comunicados_dismiss_comunicado
  ON public.comunicados_dismiss (comunicado_id);
