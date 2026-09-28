-- Pente fino pré-deploy: endurece claim de checkout, convite CONVIDADO,
-- INSERT aberto em assinaturas, UPDATE de colunas sensíveis em usuarios,
-- helper de assinatura_id baseado na tabela (não JWT metadata),
-- e revoga EXECUTE de RPCs mutáveis para anon.

-- ── 1) Helper: assinatura do usuário autenticado (tabela, não user_metadata) ──
CREATE OR REPLACE FUNCTION public.fn_auth_assinatura_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT assinatura_id FROM public.usuarios WHERE id = auth.uid() LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.fn_auth_assinatura_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_auth_assinatura_id() TO authenticated;

-- ── 2) Claim de checkout órfão: só incomplete recente OU pago sem dono recente ──
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

  -- Só permite claim de órfãos recentes (reduz takeover por UUID vazado)
  IF v_ass.created_at IS NOT NULL AND v_ass.created_at < (now() - interval '72 hours') THEN
    RAISE EXCEPTION 'Assinatura de checkout expirada para vínculo automático';
  END IF;

  IF v_ass.proprietario_id IS NULL THEN
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

-- ── 3) Convite: só provisiona CONVIDADO se veio de invite (invited_at) ────────
CREATE OR REPLACE FUNCTION public.novo_registro_usuario_colaborador_depois_da_edge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_assinatura_id uuid;
    v_nome_completo text;
    v_role text;
BEGIN
    IF COALESCE(NEW.raw_user_meta_data->>'origem_cadastro', '') <> 'CONVIDADO' THEN
        RETURN NEW;
    END IF;

    -- Self-signup com metadata forjada não tem invited_at (só inviteUserByEmail)
    IF NEW.invited_at IS NULL THEN
        RAISE WARNING 'CONVIDADO ignorado: usuário % sem invited_at', NEW.id;
        RETURN NEW;
    END IF;

    IF EXISTS (SELECT 1 FROM public.usuarios WHERE id = NEW.id) THEN
        RETURN NEW;
    END IF;

    v_assinatura_id := (NEW.raw_user_meta_data->>'assinatura_id')::uuid;
    v_nome_completo := COALESCE(NEW.raw_user_meta_data->>'nome_completo', 'Usuário');
    v_role          := COALESCE(NEW.raw_user_meta_data->>'role', 'COLABORADOR');

    IF v_assinatura_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Só vincula projetos que realmente pertencem à assinatura
    INSERT INTO public.usuarios (id, assinatura_id, email, nome_completo, status, status_cadastro)
    VALUES (NEW.id, v_assinatura_id, NEW.email, v_nome_completo, true, 'PENDENTE');

    IF NEW.raw_user_meta_data->'projeto_ids' IS NOT NULL THEN
        INSERT INTO public.membro_projetos (assinatura_id, usuario_id, projeto_id, funcao, status)
        SELECT
            v_assinatura_id,
            NEW.id,
            p_id::uuid,
            v_role,
            true
        FROM jsonb_array_elements_text(NEW.raw_user_meta_data->'projeto_ids') AS p_id
        WHERE EXISTS (
            SELECT 1 FROM public.projetos pr
            WHERE pr.id = p_id::uuid AND pr.assinatura_id = v_assinatura_id
        )
        ON CONFLICT (usuario_id, projeto_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;

-- ── 4) Trava UPDATE sensível em usuarios (assinatura_id) ─────────────────────
CREATE OR REPLACE FUNCTION public.fn_usuarios_bloquear_cols_sensiveis()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND auth.uid() IS NOT NULL AND auth.uid() = OLD.id THEN
    IF NEW.assinatura_id IS DISTINCT FROM OLD.assinatura_id THEN
      RAISE EXCEPTION 'Não é permitido alterar assinatura_id pelo cliente';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_usuarios_cols_sensiveis ON public.usuarios;
CREATE TRIGGER trg_usuarios_cols_sensiveis
  BEFORE UPDATE ON public.usuarios
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_usuarios_bloquear_cols_sensiveis();

-- ── 5) Fecha INSERT público em assinaturas ───────────────────────────────────
DROP POLICY IF EXISTS "assinaturas_insert_public" ON public.assinaturas;
DROP POLICY IF EXISTS "Permitir criacao de assinatura no cadastro" ON public.assinaturas;

-- Cadastro DONO continua via trigger SECURITY DEFINER (novo_registro_usuario_gestor)
-- Checkout incomplete: apenas service role / edge

CREATE POLICY assinaturas_insert_service_only
  ON public.assinaturas
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- ── 6) Revoga EXECUTE de RPCs mutáveis para anon ─────────────────────────────
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND (
        p.proname LIKE 'fn_%'
        OR p.proname LIKE 'novo_registro%'
      )
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', r.sig);
  END LOOP;
END $$;

-- Mantém helpers de leitura úteis se existirem
GRANT EXECUTE ON FUNCTION public.fn_auth_assinatura_id() TO authenticated;
