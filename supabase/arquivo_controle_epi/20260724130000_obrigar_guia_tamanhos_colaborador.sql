-- Torna opcional exigir o preenchimento dos guias de tamanho no cadastro do colaborador.
-- Padrão: ativo (true).

ALTER TABLE public.projetos
  ADD COLUMN IF NOT EXISTS obrigar_guia_tamanhos_colaborador boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.projetos.obrigar_guia_tamanhos_colaborador IS
  'Quando true (padrão), o cadastro/edição de colaborador exige preenchimento de todos os guias de tamanho.';
