-- Plano TESTE-DESENVOLVIMENTO (módulo eSocial)

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
        'DESENVOLVIMENTO'::text,
        'TESTE-DIARIO'::text,
        'TESTE-DESENVOLVIMENTO'::text
      ]
    )
  );
