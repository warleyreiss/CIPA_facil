-- Auditoria de inativação de colaboradores (histórico de desligados).

ALTER TABLE public.colaboradores
  ADD COLUMN IF NOT EXISTS data_inativacao timestamptz,
  ADD COLUMN IF NOT EXISTS motivo_inativacao text,
  ADD COLUMN IF NOT EXISTS inativado_por uuid;

COMMENT ON COLUMN public.colaboradores.data_inativacao IS
  'Momento em que o colaborador foi inativado (status = false).';
COMMENT ON COLUMN public.colaboradores.motivo_inativacao IS
  'Motivo formal informado pelo usuário na confirmação de inativação.';
COMMENT ON COLUMN public.colaboradores.inativado_por IS
  'auth.users.id do usuário que confirmou a inativação.';

CREATE INDEX IF NOT EXISTS idx_colaboradores_projeto_inativos
  ON public.colaboradores (projeto_id, data_inativacao DESC)
  WHERE status = false;
