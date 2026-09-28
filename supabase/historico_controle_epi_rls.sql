-- =============================================================================
-- RLS: historico_controle_epi
-- Supabase → SQL Editor → New query → cole e execute
-- =============================================================================
-- Usa a função já existente no banco: checar_acesso_projeto(projeto_id)
-- (mesma de membro_projetos / membros_select_equipe).
-- Pré-requisito: checar_acesso_projeto(uuid) já criada e GRANT para authenticated.
-- =============================================================================

-- ── 1. Habilitar RLS e permissões ───────────────────────────────────────────

ALTER TABLE public.historico_controle_epi ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, DELETE ON public.historico_controle_epi TO authenticated;

-- ── 2. Políticas ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "historico_epi_select_membro" ON public.historico_controle_epi;
CREATE POLICY "historico_epi_select_membro"
  ON public.historico_controle_epi
  FOR SELECT
  TO authenticated
  USING (
    (projeto_id IS NOT NULL AND public.checar_acesso_projeto(projeto_id))
    OR (
      colaborador_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.colaboradores c
        WHERE c.id = historico_controle_epi.colaborador_id
          AND public.checar_acesso_projeto(c.projeto_id)
      )
    )
    OR (
      epi_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.epis e
        WHERE e.id = historico_controle_epi.epi_id
          AND public.checar_acesso_projeto(e.projeto_id)
      )
    )
  );

DROP POLICY IF EXISTS "historico_epi_insert_membro" ON public.historico_controle_epi;
CREATE POLICY "historico_epi_insert_membro"
  ON public.historico_controle_epi
  FOR INSERT
  TO authenticated
  WITH CHECK (
    historico_controle_epi.projeto_id IS NOT NULL
    AND public.checar_acesso_projeto(historico_controle_epi.projeto_id)
    AND historico_controle_epi.colaborador_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.colaboradores c
      WHERE c.id = historico_controle_epi.colaborador_id
        AND c.projeto_id = historico_controle_epi.projeto_id
    )
  );

DROP POLICY IF EXISTS "historico_epi_delete_membro" ON public.historico_controle_epi;
CREATE POLICY "historico_epi_delete_membro"
  ON public.historico_controle_epi
  FOR DELETE
  TO authenticated
  USING (
    (projeto_id IS NOT NULL AND public.checar_acesso_projeto(projeto_id))
    OR (
      colaborador_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.colaboradores c
        WHERE c.id = historico_controle_epi.colaborador_id
          AND public.checar_acesso_projeto(c.projeto_id)
      )
    )
    OR (
      epi_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.epis e
        WHERE e.id = historico_controle_epi.epi_id
          AND public.checar_acesso_projeto(e.projeto_id)
      )
    )
  );

-- ── 3. Índices (consultas por projeto e período) ─────────────────────────────

CREATE INDEX IF NOT EXISTS idx_historico_controle_epi_projeto_data
  ON public.historico_controle_epi (projeto_id, data_fornecimento DESC);

CREATE INDEX IF NOT EXISTS idx_historico_controle_epi_colaborador
  ON public.historico_controle_epi (colaborador_id);

CREATE INDEX IF NOT EXISTS idx_historico_controle_epi_catalogo
  ON public.historico_controle_epi (epi_catalogo_id);
