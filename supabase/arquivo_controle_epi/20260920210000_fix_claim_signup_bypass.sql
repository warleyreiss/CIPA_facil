-- Fecha bypass de claim no cadastro DONO (trigger + OAuth) e imutabilidade de checkout_email.

-- ── Helper único: pode reivindicar assinatura órfã? ───────────────────────────
CREATE OR REPLACE FUNCTION public.fn_pode_claim_checkout_assinatura(
  p_assinatura_id uuid,
  p_email text,
  p_user_id uuid DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_ass public.assinaturas%ROWTYPE;
  v_email text := lower(trim(COALESCE(p_email, '')));
BEGIN
  IF p_assinatura_id IS NULL OR v_email = '' OR position('@' in v_email) = 0 THEN
    RETURN false;
  END IF;

  SELECT * INTO v_ass
  FROM public.assinaturas
  WHERE id = p_assinatura_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_ass.proprietario_id IS NOT NULL THEN
    RETURN p_user_id IS NOT NULL AND v_ass.proprietario_id = p_user_id;
  END IF;

  IF v_ass.created_at IS NOT NULL AND v_ass.created_at < (now() - interval '72 hours') THEN
    RETURN false;
  END IF;

  IF v_ass.checkout_email IS NULL OR length(trim(v_ass.checkout_email)) = 0 THEN
    RETURN false;
  END IF;

  IF lower(trim(v_ass.checkout_email)) <> v_email THEN
    RETURN false;
  END IF;

  -- incomplete (pago pendente), pago ativo, ou reserva gratuita INICIANTE
  IF v_ass.plano_status = 'incomplete' THEN
    RETURN true;
  END IF;

  IF v_ass.plano_status IN ('active', 'trialing') THEN
    IF v_ass.stripe_subscription_id IS NOT NULL THEN
      RETURN true;
    END IF;
    IF COALESCE(v_ass.plano_tipo, 'INICIANTE') = 'INICIANTE' THEN
      RETURN true;
    END IF;
  END IF;

  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_pode_claim_checkout_assinatura(uuid, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_pode_claim_checkout_assinatura(uuid, text, uuid) TO authenticated, service_role;

-- ── Claim RPC: usa o helper ───────────────────────────────────────────────────
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

  SELECT * INTO v_ass
  FROM public.assinaturas
  WHERE id = p_assinatura_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assinatura não encontrada';
  END IF;

  IF NOT public.fn_pode_claim_checkout_assinatura(p_assinatura_id, v_email, v_user_id) THEN
    RAISE EXCEPTION 'Assinatura não disponível para vínculo com este e-mail';
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

-- ── Trigger cadastro DONO: só claim se e-mail confere ─────────────────────────
CREATE OR REPLACE FUNCTION public.novo_registro_usuario_gestor() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_assinatura_id uuid;
    v_nome_completo text;
    v_cnpj text;
    v_projeto_id uuid;
    v_assinatura_tipo text;
    v_parceiro_codigo text;
    v_price_iniciante text;
    v_meta_ass uuid;
BEGIN
    IF COALESCE(NEW.raw_user_meta_data->>'origem_cadastro', '') <> 'DONO' THEN
        RETURN NEW;
    END IF;

    IF EXISTS (SELECT 1 FROM public.usuarios WHERE id = NEW.id) THEN
        RETURN NEW;
    END IF;

    v_meta_ass := NULLIF(NEW.raw_user_meta_data->>'assinatura_id', '')::uuid;
    v_nome_completo := COALESCE(NEW.raw_user_meta_data->>'nome_completo', 'Meu Projeto');
    v_cnpj          := NEW.raw_user_meta_data->>'cnpj';
    v_assinatura_tipo := COALESCE(NEW.raw_user_meta_data->>'assinatura_tipo', 'AUTONOMO');
    v_parceiro_codigo := NULLIF(trim(NEW.raw_user_meta_data->>'parceiro_codigo'), '');
    v_price_iniciante := public.fn_price_id_plano_iniciante();

    -- Só reivindica se checkout_email bate com NEW.email; senão cria assinatura nova
    IF v_meta_ass IS NOT NULL
       AND public.fn_pode_claim_checkout_assinatura(v_meta_ass, NEW.email, NEW.id) THEN
        UPDATE public.assinaturas
        SET
          proprietario_id = NEW.id,
          plano_regra_id = COALESCE(plano_regra_id, v_price_iniciante),
          plano_tipo = COALESCE(NULLIF(trim(plano_tipo), ''), 'INICIANTE')
        WHERE id = v_meta_ass AND proprietario_id IS NULL;
        IF FOUND THEN
          v_assinatura_id := v_meta_ass;
        END IF;
    END IF;

    IF v_assinatura_id IS NULL THEN
        INSERT INTO public.assinaturas (
          plano_status, assinatura_tipo, plano_tipo, plano_regra_id, proprietario_id,
          checkout_email
        )
        VALUES (
          'active',
          v_assinatura_tipo,
          'INICIANTE',
          v_price_iniciante,
          NEW.id,
          lower(trim(NEW.email))
        )
        RETURNING id INTO v_assinatura_id;
    END IF;

    INSERT INTO public.usuarios (id, assinatura_id, email, nome_completo, status)
    VALUES (NEW.id, v_assinatura_id, NEW.email, v_nome_completo, true);

    INSERT INTO public.projetos (assinatura_id, nome, cnpj, status)
    VALUES (v_assinatura_id, v_nome_completo, v_cnpj, true)
    RETURNING id INTO v_projeto_id;

    INSERT INTO public.membro_projetos (assinatura_id, usuario_id, projeto_id, funcao, status)
    VALUES (v_assinatura_id, NEW.id, v_projeto_id, 'GESTOR', true);

    IF v_parceiro_codigo IS NOT NULL THEN
        PERFORM public.criar_fornecedor_de_parceiro(v_projeto_id, v_parceiro_codigo);
    END IF;

    RETURN NEW;
END;
$$;

-- ── OAuth: mesma regra de claim ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_provisionar_gestor_oauth(
  p_nome_completo text DEFAULT NULL,
  p_assinatura_tipo text DEFAULT 'AUTONOMO',
  p_cnpj text DEFAULT NULL,
  p_assinatura_id uuid DEFAULT NULL,
  p_contato text DEFAULT NULL,
  p_parceiro_codigo text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_assinatura_id uuid;
  v_projeto_id uuid;
  v_email text;
  v_nome text;
  v_price_iniciante text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF EXISTS (SELECT 1 FROM public.usuarios WHERE id = v_user_id) THEN
    RETURN v_user_id;
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
  v_nome := COALESCE(NULLIF(trim(p_nome_completo), ''), 'Meu Projeto');
  v_price_iniciante := public.fn_price_id_plano_iniciante();

  IF p_assinatura_id IS NOT NULL
     AND public.fn_pode_claim_checkout_assinatura(p_assinatura_id, v_email, v_user_id) THEN
    UPDATE public.assinaturas
    SET
      proprietario_id = v_user_id,
      plano_regra_id = COALESCE(plano_regra_id, v_price_iniciante),
      plano_tipo = COALESCE(NULLIF(trim(plano_tipo), ''), 'INICIANTE')
    WHERE id = p_assinatura_id
      AND (proprietario_id IS NULL OR proprietario_id = v_user_id);

    IF FOUND THEN
      v_assinatura_id := p_assinatura_id;
    END IF;
  END IF;

  IF v_assinatura_id IS NULL THEN
    INSERT INTO public.assinaturas (
      plano_status, assinatura_tipo, plano_tipo, plano_regra_id, proprietario_id,
      checkout_email
    )
    VALUES (
      'active',
      COALESCE(NULLIF(trim(p_assinatura_tipo), ''), 'AUTONOMO'),
      'INICIANTE',
      v_price_iniciante,
      v_user_id,
      lower(trim(COALESCE(v_email, '')))
    )
    RETURNING id INTO v_assinatura_id;
  END IF;

  INSERT INTO public.usuarios (id, assinatura_id, email, nome_completo, telefone, status)
  VALUES (v_user_id, v_assinatura_id, v_email, v_nome, NULLIF(trim(p_contato), ''), true);

  INSERT INTO public.projetos (assinatura_id, nome, cnpj, status)
  VALUES (v_assinatura_id, v_nome, NULLIF(trim(p_cnpj), ''), true)
  RETURNING id INTO v_projeto_id;

  INSERT INTO public.membro_projetos (assinatura_id, usuario_id, projeto_id, funcao, status)
  VALUES (v_assinatura_id, v_user_id, v_projeto_id, 'GESTOR', true);

  IF p_parceiro_codigo IS NOT NULL AND trim(p_parceiro_codigo) <> '' THEN
    PERFORM public.criar_fornecedor_de_parceiro(v_projeto_id, trim(p_parceiro_codigo));
  END IF;

  RETURN v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_provisionar_gestor_oauth(text, text, text, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_provisionar_gestor_oauth(text, text, text, uuid, text, text) TO authenticated, service_role;
