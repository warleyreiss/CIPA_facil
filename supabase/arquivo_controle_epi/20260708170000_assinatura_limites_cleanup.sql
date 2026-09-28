-- Validação server-side de limites para downgrade/troca de plano
-- Convenção: quantidade_* = 0 significa ilimitado

CREATE OR REPLACE FUNCTION public.fn_validar_limites_plano_alvo(
  p_assinatura_id uuid,
  p_stripe_price_id text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limite_projetos integer;
  v_limite_colaboradores integer;
  v_limite_epis integer;
  v_qtd_projetos integer;
  v_projeto record;
  v_qtd_colab integer;
  v_qtd_epi integer;
BEGIN
  SELECT
    COALESCE(quantidade_projetos, 0),
    COALESCE(quantidade_colaboradores, 0),
    COALESCE(quantidade_epis, 0)
  INTO v_limite_projetos, v_limite_colaboradores, v_limite_epis
  FROM public.plano_regras
  WHERE stripe_price_id = p_stripe_price_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  SELECT COUNT(*)::integer INTO v_qtd_projetos
  FROM public.projetos
  WHERE assinatura_id = p_assinatura_id AND status = true;

  IF v_limite_projetos > 0 AND v_qtd_projetos > v_limite_projetos THEN
    RETURN false;
  END IF;

  FOR v_projeto IN
    SELECT id FROM public.projetos
    WHERE assinatura_id = p_assinatura_id AND status = true
  LOOP
    SELECT COUNT(*)::integer INTO v_qtd_colab
    FROM public.colaboradores
    WHERE projeto_id = v_projeto.id AND status = true;

    IF v_limite_colaboradores > 0 AND v_qtd_colab > v_limite_colaboradores THEN
      RETURN false;
    END IF;

    SELECT COUNT(*)::integer INTO v_qtd_epi
    FROM public.epis
    WHERE projeto_id = v_projeto.id AND status = true;

    IF v_limite_epis > 0 AND v_qtd_epi > v_limite_epis THEN
      RETURN false;
    END IF;
  END LOOP;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_validar_limites_plano_alvo(uuid, text) TO authenticated, service_role;

-- Funções legadas sem uso
DROP FUNCTION IF EXISTS public.fn_debitar_estoque_epi(uuid, integer);
DROP FUNCTION IF EXISTS public.fn_estornar_estoque_epi(uuid, integer);
DROP FUNCTION IF EXISTS public.fn_pode_desativar_epi(uuid, uuid);
DROP FUNCTION IF EXISTS public.check_membro_is_gestor(uuid);
DROP FUNCTION IF EXISTS public.check_membro_mesma_assinatura(uuid, uuid);
DROP FUNCTION IF EXISTS public.check_user_project_access(uuid, uuid);
DROP FUNCTION IF EXISTS public.fn_validar_membro_projeto_podem_ver_os_demais(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_user_assinatura_id();

-- Views de dashboard não consumidas pelo front
DROP VIEW IF EXISTS public.v_dashboard_custo_fornecimento;
DROP VIEW IF EXISTS public.v_dashboard_conformidade_resumo;
