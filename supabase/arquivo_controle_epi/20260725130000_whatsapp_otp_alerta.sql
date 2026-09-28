-- Verificação OTP do WhatsApp de alertas semanais (projeto).

ALTER TABLE public.projetos
  ADD COLUMN IF NOT EXISTS telefone_whatsapp_verificado_em timestamptz NULL;

COMMENT ON COLUMN public.projetos.telefone_whatsapp_verificado_em IS
  'Quando preenchido, o telefone_whatsapp_notificacao foi confirmado via OTP. Limpar ao trocar o número.';

CREATE TABLE IF NOT EXISTS public.whatsapp_otp_desafios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id uuid NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  telefone text NOT NULL,
  codigo_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  tentativas integer NOT NULL DEFAULT 0,
  consumido_em timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_otp_projeto_aberto
  ON public.whatsapp_otp_desafios (projeto_id, created_at DESC)
  WHERE consumido_em IS NULL;

ALTER TABLE public.whatsapp_otp_desafios ENABLE ROW LEVEL SECURITY;

-- Sem políticas para authenticated: só service_role (Edge Function) acessa.
REVOKE ALL ON public.whatsapp_otp_desafios FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.whatsapp_otp_desafios TO service_role;

COMMENT ON TABLE public.whatsapp_otp_desafios IS
  'Desafios OTP para confirmar telefone de alertas WhatsApp. Acesso exclusivo via Edge Function.';
