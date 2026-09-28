-- Cadastro gratuito: vincula plano_regra_id do INICIANTE e backfill de assinaturas órfãs.
-- Alinha provisão (trigger + OAuth) à nomenclatura oficial INICIANTE/PRO/GESTOR/DESENVOLVIMENTO.

CREATE OR REPLACE FUNCTION public.fn_price_id_plano_iniciante()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT stripe_price_id
  FROM public.plano_regras
  WHERE upper(trim(nome_plano)) = 'INICIANTE'
  ORDER BY stripe_price_id
  LIMIT 1;
$$;

-- Backfill: INICIANTE sem vínculo de regra
UPDATE public.assinaturas a
SET plano_regra_id = public.fn_price_id_plano_iniciante()
WHERE a.plano_tipo = 'INICIANTE'
  AND a.plano_regra_id IS NULL
  AND public.fn_price_id_plano_iniciante() IS NOT NULL;

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
BEGIN
    IF COALESCE(NEW.raw_user_meta_data->>'origem_cadastro', '') <> 'DONO' THEN
        RETURN NEW;
    END IF;

    IF EXISTS (SELECT 1 FROM public.usuarios WHERE id = NEW.id) THEN
        RETURN NEW;
    END IF;

    v_assinatura_id := (NEW.raw_user_meta_data->>'assinatura_id')::uuid;
    v_nome_completo := COALESCE(NEW.raw_user_meta_data->>'nome_completo', 'Meu Projeto');
    v_cnpj          := NEW.raw_user_meta_data->>'cnpj';
    v_assinatura_tipo := COALESCE(NEW.raw_user_meta_data->>'assinatura_tipo', 'AUTONOMO');
    v_parceiro_codigo := NULLIF(trim(NEW.raw_user_meta_data->>'parceiro_codigo'), '');
    v_price_iniciante := public.fn_price_id_plano_iniciante();

    IF v_assinatura_id IS NULL THEN
        INSERT INTO public.assinaturas (
          plano_status, assinatura_tipo, plano_tipo, plano_regra_id, proprietario_id
        )
        VALUES (
          'active',
          v_assinatura_tipo,
          'INICIANTE',
          v_price_iniciante,
          NEW.id
        )
        RETURNING id INTO v_assinatura_id;
    ELSE
        UPDATE public.assinaturas
        SET
          proprietario_id = NEW.id,
          plano_regra_id = COALESCE(plano_regra_id, v_price_iniciante),
          plano_tipo = COALESCE(NULLIF(trim(plano_tipo), ''), 'INICIANTE')
        WHERE id = v_assinatura_id AND proprietario_id IS NULL;
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

  v_assinatura_id := p_assinatura_id;

  IF v_assinatura_id IS NULL THEN
    INSERT INTO public.assinaturas (
      plano_status, assinatura_tipo, plano_tipo, plano_regra_id, proprietario_id
    )
    VALUES (
      'active',
      COALESCE(NULLIF(trim(p_assinatura_tipo), ''), 'AUTONOMO'),
      'INICIANTE',
      v_price_iniciante,
      v_user_id
    )
    RETURNING id INTO v_assinatura_id;
  ELSE
    UPDATE public.assinaturas
    SET
      proprietario_id = v_user_id,
      plano_regra_id = COALESCE(plano_regra_id, v_price_iniciante),
      plano_tipo = COALESCE(NULLIF(trim(plano_tipo), ''), 'INICIANTE')
    WHERE id = v_assinatura_id
      AND (proprietario_id IS NULL OR proprietario_id = v_user_id);

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Assinatura inválida ou já vinculada a outro usuário';
    END IF;
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

GRANT EXECUTE ON FUNCTION public.fn_price_id_plano_iniciante() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_provisionar_gestor_oauth(text, text, text, uuid, text, text) TO authenticated;
