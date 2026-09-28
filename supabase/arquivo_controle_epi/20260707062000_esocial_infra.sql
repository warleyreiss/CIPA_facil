-- eSocial — infraestrutura S-2240 (GHE / EPI)

ALTER TABLE public.colaboradores
  ADD COLUMN IF NOT EXISTS cpf text;

COMMENT ON COLUMN public.colaboradores.cpf IS
  'CPF do trabalhador (11 dígitos) para exportação eSocial S-2240.';

CREATE INDEX IF NOT EXISTS idx_colaboradores_cpf
  ON public.colaboradores (cpf)
  WHERE cpf IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.esocial_exportacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id uuid NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  periodo_inicio date NOT NULL,
  periodo_fim date NOT NULL,
  total_eventos integer NOT NULL DEFAULT 0,
  total_colaboradores integer NOT NULL DEFAULT 0,
  formato text NOT NULL CHECK (formato IN ('xlsx', 'csv')),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.esocial_exportacoes IS
  'Registro de exportações gabarito S-2240 geradas pelo Controle EPI.';

CREATE INDEX IF NOT EXISTS idx_esocial_exportacoes_projeto_data
  ON public.esocial_exportacoes (projeto_id, created_at DESC);

ALTER TABLE public.esocial_exportacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS esocial_exportacoes_select ON public.esocial_exportacoes;
CREATE POLICY esocial_exportacoes_select ON public.esocial_exportacoes
  FOR SELECT TO authenticated
  USING (public.checar_acesso_projeto(projeto_id));

DROP POLICY IF EXISTS esocial_exportacoes_insert ON public.esocial_exportacoes;
CREATE POLICY esocial_exportacoes_insert ON public.esocial_exportacoes
  FOR INSERT TO authenticated
  WITH CHECK (
    public.checar_acesso_projeto(projeto_id)
    AND usuario_id = auth.uid()
  );

GRANT SELECT, INSERT ON public.esocial_exportacoes TO authenticated;
