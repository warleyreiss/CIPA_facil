-- Público-alvo dos comunicados do sistema
ALTER TABLE public.comunicados_sistema
  ADD COLUMN IF NOT EXISTS planos_alvo text[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS assinatura_tipos_alvo text[] DEFAULT NULL;

COMMENT ON COLUMN public.comunicados_sistema.planos_alvo IS
  'Planos que devem ver o comunicado (ex.: INICIANTE, PRO). NULL ou {} = todos.';
COMMENT ON COLUMN public.comunicados_sistema.assinatura_tipos_alvo IS
  'Tipos de assinatura (AUTONOMO, EMPRESARIAL). NULL ou {} = todos.';
