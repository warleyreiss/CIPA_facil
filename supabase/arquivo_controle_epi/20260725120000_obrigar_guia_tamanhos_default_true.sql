-- Guia de tamanhos obrigatório ativo por padrão em novos e existentes projetos.

ALTER TABLE public.projetos
  ALTER COLUMN obrigar_guia_tamanhos_colaborador SET DEFAULT true;

UPDATE public.projetos
SET obrigar_guia_tamanhos_colaborador = true
WHERE obrigar_guia_tamanhos_colaborador IS DISTINCT FROM true;

COMMENT ON COLUMN public.projetos.obrigar_guia_tamanhos_colaborador IS
  'Quando true (padrão), o cadastro/edição de colaborador exige preenchimento de todos os guias de tamanho.';
