-- Colaboradores: trigger único, RLS, unicidade inscrição/CPF

-- ── 1. Remover triggers duplicados ──
DROP TRIGGER IF EXISTS trg_gerenciar_mudanca_cargo ON public.colaboradores;
DROP TRIGGER IF EXISTS trg_depois_salvar_colaborador ON public.colaboradores;

-- ── 2. Função unificada (histórico + controle_epi com status boolean) ──
CREATE OR REPLACE FUNCTION public.fn_colaborador_mudanca_cargo_epi()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ids_antigos UUID[] := '{}';
  ids_novos UUID[] := '{}';
  id_epi_aux UUID;
  v_motivo TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.cargo_funcao_id IS NOT DISTINCT FROM NEW.cargo_funcao_id THEN
    RETURN NEW;
  END IF;

  IF NEW.cargo_funcao_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_motivo := CASE WHEN TG_OP = 'INSERT' THEN 'LANÇAMENTO INICIAL' ELSE 'TROCA DE FUNÇÃO' END;

  INSERT INTO public.historico_cargos (
    projeto_id, colaborador_id, cargo_funcao_id_anterior, cargo_funcao_id_novo, motivo
  ) VALUES (
    NEW.projeto_id,
    NEW.id,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.cargo_funcao_id END,
    NEW.cargo_funcao_id,
    v_motivo
  );

  IF TG_OP = 'UPDATE' AND OLD.cargo_funcao_id IS NOT NULL THEN
    SELECT COALESCE(epi_catalogo_ids, '{}'::uuid[]) INTO ids_antigos
    FROM public.cargo_funcoes WHERE id = OLD.cargo_funcao_id;
  END IF;

  SELECT COALESCE(epi_catalogo_ids, '{}'::uuid[]) INTO ids_novos
  FROM public.cargo_funcoes WHERE id = NEW.cargo_funcao_id;

  IF TG_OP = 'UPDATE' THEN
    UPDATE public.controle_epi
    SET status = false,
        observacao = COALESCE(observacao, '') || ' [Inativado: troca de função]'
    WHERE colaborador_id = NEW.id
      AND status IS DISTINCT FROM false
      AND epi_catalogo_id = ANY(
        ARRAY(
          SELECT unnest(ids_antigos)
          EXCEPT
          SELECT unnest(ids_novos)
        )
      );
  END IF;

  IF ids_novos <> '{}'::uuid[] THEN
    FOREACH id_epi_aux IN ARRAY ids_novos LOOP
      INSERT INTO public.controle_epi (
        projeto_id, colaborador_id, epi_catalogo_id, motivo_acao, status, observacao
      ) VALUES (
        NEW.projeto_id,
        NEW.id,
        id_epi_aux,
        v_motivo,
        true,
        CASE WHEN TG_OP = 'UPDATE' THEN 'Atualizado por troca de função' ELSE NULL END
      )
      ON CONFLICT (colaborador_id, epi_catalogo_id) DO UPDATE SET
        status = true,
        motivo_acao = EXCLUDED.motivo_acao,
        observacao = CASE
          WHEN public.controle_epi.status IS DISTINCT FROM true THEN COALESCE(public.controle_epi.observacao, '') || COALESCE(EXCLUDED.observacao, '')
          ELSE public.controle_epi.observacao
        END
      WHERE public.controle_epi.status IS DISTINCT FROM true;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_colaborador_mudanca_cargo_epi
  AFTER INSERT OR UPDATE OF cargo_funcao_id ON public.colaboradores
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_colaborador_mudanca_cargo_epi();

GRANT EXECUTE ON FUNCTION public.fn_colaborador_mudanca_cargo_epi() TO authenticated, service_role;

-- ── 3. Unicidade inscrição e CPF por projeto (ativos) ──
CREATE UNIQUE INDEX IF NOT EXISTS uk_colaboradores_projeto_inscricao_ativo
  ON public.colaboradores (projeto_id, inscricao)
  WHERE status = true AND inscricao IS NOT NULL AND btrim(inscricao) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS uk_colaboradores_projeto_cpf_ativo
  ON public.colaboradores (projeto_id, cpf)
  WHERE status = true AND cpf IS NOT NULL AND btrim(cpf) <> '';

-- ── 4. RLS ──
ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_cargos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "colaboradores_select_membro" ON public.colaboradores;
CREATE POLICY "colaboradores_select_membro"
  ON public.colaboradores FOR SELECT TO authenticated
  USING (public.checar_acesso_projeto(projeto_id));

DROP POLICY IF EXISTS "colaboradores_insert_membro" ON public.colaboradores;
CREATE POLICY "colaboradores_insert_membro"
  ON public.colaboradores FOR INSERT TO authenticated
  WITH CHECK (public.checar_acesso_projeto(projeto_id));

DROP POLICY IF EXISTS "colaboradores_update_membro" ON public.colaboradores;
CREATE POLICY "colaboradores_update_membro"
  ON public.colaboradores FOR UPDATE TO authenticated
  USING (public.checar_acesso_projeto(projeto_id))
  WITH CHECK (public.checar_acesso_projeto(projeto_id));

DROP POLICY IF EXISTS "historico_cargos_select_membro" ON public.historico_cargos;
CREATE POLICY "historico_cargos_select_membro"
  ON public.historico_cargos FOR SELECT TO authenticated
  USING (public.checar_acesso_projeto(projeto_id));

DROP POLICY IF EXISTS "historico_cargos_insert_membro" ON public.historico_cargos;
CREATE POLICY "historico_cargos_insert_membro"
  ON public.historico_cargos FOR INSERT TO authenticated
  WITH CHECK (public.checar_acesso_projeto(projeto_id));

REVOKE ALL ON TABLE public.colaboradores FROM anon;
REVOKE ALL ON TABLE public.historico_cargos FROM anon;

GRANT SELECT, INSERT, UPDATE ON TABLE public.colaboradores TO authenticated;
GRANT SELECT, INSERT ON TABLE public.historico_cargos TO authenticated;
