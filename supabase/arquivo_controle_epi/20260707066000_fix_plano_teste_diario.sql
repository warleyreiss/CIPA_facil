-- Corrige plano da assinatura de teste (eSocial = TESTE-DIARIO)

UPDATE public.assinaturas a
SET plano_tipo = 'TESTE-DIARIO'
FROM public.usuarios u
WHERE u.assinatura_id = a.id
  AND lower(u.email) = lower('warleyreiss@gmail.com')
  AND a.plano_tipo = 'TESTE-DESENVOLVIMENTO';
