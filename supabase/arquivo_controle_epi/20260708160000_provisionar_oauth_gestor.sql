-- Provisiona gestor (dono) após login/cadastro via OAuth quando o trigger auth.users
-- não recebeu user_metadata (caso Google). Chamada pelo próprio usuário autenticado.

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
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF EXISTS (SELECT 1 FROM public.usuarios WHERE id = v_user_id) THEN
    RETURN v_user_id;
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
  v_nome := COALESCE(NULLIF(trim(p_nome_completo), ''), 'Meu Projeto');

  v_assinatura_id := p_assinatura_id;

  IF v_assinatura_id IS NULL THEN
    INSERT INTO public.assinaturas (plano_status, assinatura_tipo, plano_tipo, proprietario_id)
    VALUES ('active', COALESCE(NULLIF(trim(p_assinatura_tipo), ''), 'AUTONOMO'), 'INICIANTE', v_user_id)
    RETURNING id INTO v_assinatura_id;
  ELSE
    UPDATE public.assinaturas
    SET proprietario_id = v_user_id
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

GRANT EXECUTE ON FUNCTION public.fn_provisionar_gestor_oauth(text, text, text, uuid, text, text) TO authenticated;
