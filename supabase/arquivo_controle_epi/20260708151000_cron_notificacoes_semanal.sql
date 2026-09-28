-- Agendamento semanal: segunda-feira 11h BRT (14h UTC)
-- Requer extensões pg_cron e pg_net habilitadas no painel Supabase (Database > Extensions)

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $cron$
DECLARE
  v_job_id bigint;
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'notificar-vencimentos-epi-semanal') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'notificar-vencimentos-epi-semanal';
  END IF;

  SELECT cron.schedule(
    'notificar-vencimentos-epi-semanal',
    '0 14 * * 1',
    $job$
    SELECT net.http_post(
      url := 'https://ndcpitpvaphhwoidcdhs.supabase.co/functions/v1/notificar-vencimentos-epi',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := '{}'::jsonb,
      timeout_milliseconds := 120000
    ) AS request_id;
    $job$
  ) INTO v_job_id;

  RAISE NOTICE 'Cron notificar-vencimentos-epi-semanal agendado (job_id=%)', v_job_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Não foi possível agendar pg_cron (habilite pg_cron/pg_net no painel): %', SQLERRM;
END;
$cron$;
