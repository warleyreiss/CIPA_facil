-- RLS nas tabelas operacionais legadas + revogação anon em views sensíveis

-- ── controle_epi ──
ALTER TABLE public.controle_epi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "controle_epi_select_membro" ON public.controle_epi;
CREATE POLICY "controle_epi_select_membro"
  ON public.controle_epi FOR SELECT TO authenticated
  USING (public.checar_acesso_projeto(projeto_id));

DROP POLICY IF EXISTS "controle_epi_insert_membro" ON public.controle_epi;
CREATE POLICY "controle_epi_insert_membro"
  ON public.controle_epi FOR INSERT TO authenticated
  WITH CHECK (public.checar_acesso_projeto(projeto_id));

DROP POLICY IF EXISTS "controle_epi_update_membro" ON public.controle_epi;
CREATE POLICY "controle_epi_update_membro"
  ON public.controle_epi FOR UPDATE TO authenticated
  USING (public.checar_acesso_projeto(projeto_id))
  WITH CHECK (public.checar_acesso_projeto(projeto_id));

DROP POLICY IF EXISTS "controle_epi_delete_membro" ON public.controle_epi;
CREATE POLICY "controle_epi_delete_membro"
  ON public.controle_epi FOR DELETE TO authenticated
  USING (public.checar_acesso_projeto(projeto_id));

-- ── epis ──
ALTER TABLE public.epis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "epis_select_membro" ON public.epis;
CREATE POLICY "epis_select_membro"
  ON public.epis FOR SELECT TO authenticated
  USING (public.checar_acesso_projeto(projeto_id));

DROP POLICY IF EXISTS "epis_insert_membro" ON public.epis;
CREATE POLICY "epis_insert_membro"
  ON public.epis FOR INSERT TO authenticated
  WITH CHECK (public.checar_acesso_projeto(projeto_id));

DROP POLICY IF EXISTS "epis_update_membro" ON public.epis;
CREATE POLICY "epis_update_membro"
  ON public.epis FOR UPDATE TO authenticated
  USING (public.checar_acesso_projeto(projeto_id))
  WITH CHECK (public.checar_acesso_projeto(projeto_id));

DROP POLICY IF EXISTS "epis_delete_membro" ON public.epis;
CREATE POLICY "epis_delete_membro"
  ON public.epis FOR DELETE TO authenticated
  USING (public.checar_acesso_projeto(projeto_id));

-- ── fornecedores ──
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fornecedores_select_membro" ON public.fornecedores;
CREATE POLICY "fornecedores_select_membro"
  ON public.fornecedores FOR SELECT TO authenticated
  USING (public.checar_acesso_projeto(projeto_id));

DROP POLICY IF EXISTS "fornecedores_insert_membro" ON public.fornecedores;
CREATE POLICY "fornecedores_insert_membro"
  ON public.fornecedores FOR INSERT TO authenticated
  WITH CHECK (public.checar_acesso_projeto(projeto_id));

DROP POLICY IF EXISTS "fornecedores_update_membro" ON public.fornecedores;
CREATE POLICY "fornecedores_update_membro"
  ON public.fornecedores FOR UPDATE TO authenticated
  USING (public.checar_acesso_projeto(projeto_id))
  WITH CHECK (public.checar_acesso_projeto(projeto_id));

DROP POLICY IF EXISTS "fornecedores_delete_membro" ON public.fornecedores;
CREATE POLICY "fornecedores_delete_membro"
  ON public.fornecedores FOR DELETE TO authenticated
  USING (public.checar_acesso_projeto(projeto_id));

-- ── registro_entradas ──
ALTER TABLE public.registro_entradas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "registro_entradas_select_membro" ON public.registro_entradas;
CREATE POLICY "registro_entradas_select_membro"
  ON public.registro_entradas FOR SELECT TO authenticated
  USING (public.checar_acesso_projeto(projeto_id));

DROP POLICY IF EXISTS "registro_entradas_insert_membro" ON public.registro_entradas;
CREATE POLICY "registro_entradas_insert_membro"
  ON public.registro_entradas FOR INSERT TO authenticated
  WITH CHECK (public.checar_acesso_projeto(projeto_id));

DROP POLICY IF EXISTS "registro_entradas_update_membro" ON public.registro_entradas;
CREATE POLICY "registro_entradas_update_membro"
  ON public.registro_entradas FOR UPDATE TO authenticated
  USING (public.checar_acesso_projeto(projeto_id))
  WITH CHECK (public.checar_acesso_projeto(projeto_id));

DROP POLICY IF EXISTS "registro_entradas_delete_membro" ON public.registro_entradas;
CREATE POLICY "registro_entradas_delete_membro"
  ON public.registro_entradas FOR DELETE TO authenticated
  USING (public.checar_acesso_projeto(projeto_id));

-- ── Revogar anon em tabelas operacionais e views ──
REVOKE ALL ON TABLE public.controle_epi FROM anon;
REVOKE ALL ON TABLE public.epis FROM anon;
REVOKE ALL ON TABLE public.fornecedores FROM anon;
REVOKE ALL ON TABLE public.registro_entradas FROM anon;

REVOKE ALL ON TABLE public.v_dashboard_custo_fornecimento FROM anon;
GRANT SELECT ON TABLE public.v_dashboard_custo_fornecimento TO authenticated, service_role;
