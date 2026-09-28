-- Planos oficiais: INICIANTE, PRO, GESTOR, DESENVOLVIMENTO
-- Remove TESTE-DIARIO / TESTE-DESENVOLVIMENTO e aliases legados

-- 1) Migra dados legados (se ainda existirem)
UPDATE public.assinaturas
SET plano_tipo = 'DESENVOLVIMENTO'
WHERE upper(trim(plano_tipo)) IN (
  'TESTE-DIARIO',
  'TESTE-DESENVOLVIMENTO',
  'DESENV. INTERNO',
  'DESENV INTERNO'
);

UPDATE public.plano_regras
SET nome_plano = 'DESENVOLVIMENTO'
WHERE upper(trim(nome_plano)) IN (
  'TESTE-DIARIO',
  'TESTE-DESENVOLVIMENTO',
  'TESTE DIARIO',
  'DESENV. INTERNO',
  'DESENV INTERNO'
);

-- 2) Remove regras órfãs de planos que não existem mais
DELETE FROM public.plano_regras
WHERE upper(trim(nome_plano)) NOT IN (
  'INICIANTE',
  'PRO',
  'GESTOR',
  'DESENVOLVIMENTO'
);

-- 3) Restringe o check constraint aos 4 planos
ALTER TABLE public.assinaturas
  DROP CONSTRAINT IF EXISTS assinaturas_plano_tipo_check;

ALTER TABLE public.assinaturas
  ADD CONSTRAINT assinaturas_plano_tipo_check
  CHECK (
    plano_tipo = ANY (
      ARRAY[
        'INICIANTE'::text,
        'PRO'::text,
        'GESTOR'::text,
        'DESENVOLVIMENTO'::text
      ]
    )
  );
