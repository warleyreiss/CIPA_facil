-- Remove marca Nexu/Nexus de conteúdo de suporte e allowlist admin.

CREATE OR REPLACE FUNCTION public.is_admin_suporte()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    lower(auth.jwt() ->> 'email') IN (
      'contato@proativaweb.com.br'
    ),
    false
  );
$$;

COMMENT ON FUNCTION public.is_admin_suporte() IS
  'Retorna true quando o JWT autenticado é de um e-mail da equipe de suporte/admin.';

CREATE OR REPLACE FUNCTION public.is_comunicado_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin_suporte();
$$;

-- Orientacoes de suporte (títulos e corpos já publicados)
UPDATE public.suporte_orientacoes
SET titulo = replace(titulo, 'Nexu', 'ControleEPI')
WHERE titulo ILIKE '%nexu%';

UPDATE public.suporte_orientacoes
SET descricao = replace(descricao, 'Nexu', 'ControleEPI')
WHERE descricao ILIKE '%nexu%';

UPDATE public.suporte_orientacoes
SET descricao = replace(descricao, 'dashboard-indices-nexu', 'dashboard-indices-cepi')
WHERE descricao ILIKE '%dashboard-indices-nexu%';

UPDATE public.suporte_orientacoes
SET descricao = replace(descricao, 'Nexus', 'ControleEPI')
WHERE descricao ILIKE '%nexus%';

UPDATE public.suporte_orientacoes
SET titulo = replace(titulo, 'Nexus', 'ControleEPI')
WHERE titulo ILIKE '%nexus%';
