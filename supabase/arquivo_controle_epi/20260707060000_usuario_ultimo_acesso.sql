-- Registra o último acesso de cada usuário à plataforma

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS ultimo_acesso timestamptz;

COMMENT ON COLUMN public.usuarios.ultimo_acesso IS
  'Data e hora do último acesso confirmado à plataforma (atualizado no login/sessão).';

CREATE INDEX IF NOT EXISTS idx_usuarios_ultimo_acesso
  ON public.usuarios (ultimo_acesso DESC NULLS LAST);
