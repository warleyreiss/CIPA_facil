-- Vincula assinatura de checkout (sem dono) a usuário OAuth/e-mail já existente.
-- Evita pagamento órfão quando a conta Google/e-mail já tinha perfil.

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

  -- Marca o dono do pagamento (mesmo se o usuário já tiver outra assinatura ativa)
  UPDATE public.assinaturas
  SET proprietario_id = v_user_id
  WHERE id = p_assinatura_id
    AND (proprietario_id IS NULL OR proprietario_id = v_user_id);

  -- Se a conta ainda não tem Stripe ativo, promove para a assinatura paga
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

GRANT EXECUTE ON FUNCTION public.fn_vincular_assinatura_checkout_pendente(uuid) TO authenticated;
