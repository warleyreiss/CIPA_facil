-- Admin: CRUD de fornecedores parceiros (indicação) + normalização de código

COMMENT ON TABLE public.parceiros IS
  'Lojas de EPI parceiras do programa de indicação (gestão via Controle_EPI_Admin).';

-- ---------------------------------------------------------------------------
-- RLS: equipe de suporte pode gerenciar todos os parceiros (ativos e inativos)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "admin_suporte_select_parceiros" ON public.parceiros;
CREATE POLICY "admin_suporte_select_parceiros"
  ON public.parceiros FOR SELECT TO authenticated
  USING (public.is_admin_suporte());

DROP POLICY IF EXISTS "admin_suporte_insert_parceiros" ON public.parceiros;
CREATE POLICY "admin_suporte_insert_parceiros"
  ON public.parceiros FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_suporte());

DROP POLICY IF EXISTS "admin_suporte_update_parceiros" ON public.parceiros;
CREATE POLICY "admin_suporte_update_parceiros"
  ON public.parceiros FOR UPDATE TO authenticated
  USING (public.is_admin_suporte())
  WITH CHECK (public.is_admin_suporte());

DROP POLICY IF EXISTS "admin_suporte_delete_parceiros" ON public.parceiros;
CREATE POLICY "admin_suporte_delete_parceiros"
  ON public.parceiros FOR DELETE TO authenticated
  USING (public.is_admin_suporte());

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.parceiros TO authenticated;

-- Contagem de indicações no admin (fornecedores.parceiro_id)
DROP POLICY IF EXISTS "admin_suporte_select_fornecedores" ON public.fornecedores;
CREATE POLICY "admin_suporte_select_fornecedores"
  ON public.fornecedores FOR SELECT TO authenticated
  USING (public.is_admin_suporte());

-- ---------------------------------------------------------------------------
-- Normaliza codigo para lowercase (evita ProtSP vs protsp)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.parceiros_normalizar_codigo()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.codigo := lower(trim(NEW.codigo));
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_parceiros_normalizar_codigo ON public.parceiros;
CREATE TRIGGER trg_parceiros_normalizar_codigo
  BEFORE INSERT OR UPDATE OF codigo ON public.parceiros
  FOR EACH ROW
  EXECUTE FUNCTION public.parceiros_normalizar_codigo();

-- Backfill códigos existentes
UPDATE public.parceiros
SET codigo = lower(trim(codigo))
WHERE codigo IS DISTINCT FROM lower(trim(codigo));
