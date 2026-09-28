-- Status Stripe incomplete_expired + flag de encerramento definitivo de conta

ALTER TABLE public.assinaturas
  DROP CONSTRAINT IF EXISTS check_plano_status;

ALTER TABLE public.assinaturas
  ADD CONSTRAINT check_plano_status CHECK (
    plano_status = ANY (ARRAY[
      'active'::text,
      'past_due'::text,
      'unpaid'::text,
      'canceled'::text,
      'incomplete'::text,
      'incomplete_expired'::text,
      'trialing'::text,
      'paused'::text
    ])
  );

ALTER TABLE public.assinaturas
  ADD COLUMN IF NOT EXISTS encerrar_conta_agendado boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.assinaturas.encerrar_conta_agendado IS
  'true quando o titular agendou encerramento definitivo (cancelar-assinatura). No customer.subscription.deleted vira canceled + usuários inativos — não cai para INICIANTE.';
