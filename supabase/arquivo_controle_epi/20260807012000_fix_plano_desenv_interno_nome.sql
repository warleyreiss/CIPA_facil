-- Alinha nome comercial do plano interno ao valor permitido em assinaturas.plano_tipo
UPDATE public.plano_regras
SET nome_plano = 'DESENVOLVIMENTO'
WHERE stripe_price_id = 'price_1TkYgrA5Kdos07snobbn29TJ'
  AND upper(trim(nome_plano)) IN ('DESENV. INTERNO', 'DESENV INTERNO');

-- Corrige assinaturas que tenham ficado com rótulo inválido/antigo
UPDATE public.assinaturas
SET plano_tipo = 'DESENVOLVIMENTO'
WHERE upper(trim(plano_tipo)) IN ('DESENV. INTERNO', 'DESENV INTERNO')
   OR (
     plano_regra_id = 'price_1TkYgrA5Kdos07snobbn29TJ'
     AND plano_tipo IS DISTINCT FROM 'DESENVOLVIMENTO'
   );
