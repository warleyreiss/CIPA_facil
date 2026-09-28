-- Agendamento semanal: segunda-feira às 11h (horário de Brasília, 14h UTC)
-- Execute no SQL Editor do Supabase após habilitar extensões pg_cron e pg_net.
-- Substitua PROJECT_REF e CRON_SECRET pelos valores do seu projeto.

/*
SELECT cron.schedule(
  'notificar-vencimentos-epi-semanal',
  '0 14 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://PROJECT_REF.supabase.co/functions/v1/notificar-vencimentos-epi',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'SEU_CRON_SECRET'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
*/

-- Variáveis de ambiente na Edge Function notificar-vencimentos-epi:
-- RESEND_API_KEY          — envio de e-mail (já usado em cotações)
-- CRON_SECRET             — protege chamadas agendadas
-- WHATSAPP_WEBHOOK_URL    — opcional: POST { phone, message } para seu provedor WhatsApp
-- NOTIFICACAO_FROM_EMAIL  — remetente (ex.: alertas@seudominio.com)
