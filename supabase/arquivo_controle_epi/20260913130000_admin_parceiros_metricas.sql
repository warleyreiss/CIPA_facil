-- Métricas admin: entradas de estoque vinculadas a fornecedores de parceiros

DROP POLICY IF EXISTS "admin_suporte_select_registro_entradas" ON public.registro_entradas;
CREATE POLICY "admin_suporte_select_registro_entradas"
  ON public.registro_entradas FOR SELECT TO authenticated
  USING (public.is_admin_suporte());
