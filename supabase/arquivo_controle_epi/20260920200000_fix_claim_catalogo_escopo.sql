-- Fecha hijack de claim, catálogo sem escopo e alinhamento signup↔INSERT client.

-- ── 1) E-mail de checkout amarra o claim ──────────────────────────────────────
ALTER TABLE public.assinaturas
  ADD COLUMN IF NOT EXISTS checkout_email text;

COMMENT ON COLUMN public.assinaturas.checkout_email IS
  'E-mail informado no checkout Stripe (signup). Claim só com e-mail autenticado correspondente.';

CREATE OR REPLACE FUNCTION public.fn_vincular_assinatura_checkout_pendente(
  p_assinatura_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_ass public.assinaturas%ROWTYPE;
  v_user public.usuarios%ROWTYPE;
  v_email text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF p_assinatura_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT * INTO v_user FROM public.usuarios WHERE id = v_user_id;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  v_email := lower(trim(COALESCE(v_user.email, auth.jwt() ->> 'email', '')));
  IF v_email = '' OR position('@' in v_email) = 0 THEN
    RAISE EXCEPTION 'E-mail do usuário inválido para vínculo de checkout';
  END IF;

  SELECT * INTO v_ass
  FROM public.assinaturas
  WHERE id = p_assinatura_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assinatura não encontrada';
  END IF;

  IF v_ass.proprietario_id IS NOT NULL AND v_ass.proprietario_id <> v_user_id THEN
    RAISE EXCEPTION 'Assinatura já vinculada a outro usuário';
  END IF;

  IF v_ass.created_at IS NOT NULL AND v_ass.created_at < (now() - interval '72 hours') THEN
    RAISE EXCEPTION 'Assinatura de checkout expirada para vínculo automático';
  END IF;

  -- Claim de órfão exige checkout_email = e-mail autenticado (anti-hijack por UUID)
  IF v_ass.proprietario_id IS NULL THEN
    IF v_ass.checkout_email IS NULL OR length(trim(v_ass.checkout_email)) = 0 THEN
      RAISE EXCEPTION 'Assinatura sem e-mail de checkout — vínculo automático bloqueado';
    END IF;

    IF lower(trim(v_ass.checkout_email)) <> v_email THEN
      RAISE EXCEPTION 'E-mail autenticado não confere com o checkout desta assinatura';
    END IF;

    IF NOT (
      v_ass.plano_status = 'incomplete'
      OR (
        v_ass.stripe_subscription_id IS NOT NULL
        AND v_ass.plano_status IN ('active', 'trialing', 'incomplete')
      )
    ) THEN
      RAISE EXCEPTION 'Assinatura não está disponível para vínculo de checkout';
    END IF;
  END IF;

  UPDATE public.assinaturas
  SET proprietario_id = v_user_id
  WHERE id = p_assinatura_id
    AND (proprietario_id IS NULL OR proprietario_id = v_user_id);

  IF v_user.assinatura_id IS DISTINCT FROM p_assinatura_id THEN
    IF EXISTS (
      SELECT 1
      FROM public.assinaturas a
      WHERE a.id = v_user.assinatura_id
        AND a.stripe_subscription_id IS NULL
        AND COALESCE(a.plano_tipo, 'INICIANTE') = 'INICIANTE'
    ) OR v_user.assinatura_id IS NULL THEN
      UPDATE public.usuarios
      SET assinatura_id = p_assinatura_id
      WHERE id = v_user_id;

      UPDATE public.projetos
      SET assinatura_id = p_assinatura_id
      WHERE assinatura_id = v_user.assinatura_id;

      UPDATE public.membro_projetos
      SET assinatura_id = p_assinatura_id
      WHERE assinatura_id = v_user.assinatura_id
        AND usuario_id = v_user_id;
    END IF;
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_vincular_assinatura_checkout_pendente(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_vincular_assinatura_checkout_pendente(uuid) TO authenticated, service_role;

-- ── 2) Catálogo: upsert só com gestor do projeto ────────────────────────────
DROP FUNCTION IF EXISTS public.fn_upsert_epi_catalogo(text, integer, text);

CREATE OR REPLACE FUNCTION public.fn_upsert_epi_catalogo(
  p_descricao text,
  p_guia_tamanho integer DEFAULT 1,
  p_classificacao text DEFAULT NULL,
  p_projeto_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_desc text := TRIM(COALESCE(p_descricao, ''));
  v_guia integer := COALESCE(NULLIF(p_guia_tamanho, 0), 1);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF p_projeto_id IS NULL OR NOT public.checar_gestor_projeto(p_projeto_id) THEN
    RAISE EXCEPTION 'Sem permissão de gestor neste projeto para alterar o catálogo';
  END IF;

  IF length(v_desc) < 2 THEN
    RAISE EXCEPTION 'Descrição de EPI inválida';
  END IF;

  SELECT id INTO v_id
  FROM public.epi_catalogo
  WHERE lower(descricao) = lower(v_desc)
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  INSERT INTO public.epi_catalogo (descricao, guia_tamanho_catalogo, classificacao)
  VALUES (v_desc, v_guia, p_classificacao)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_upsert_epi_catalogo(text, integer, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_upsert_epi_catalogo(text, integer, text, uuid) TO authenticated, service_role;
