-- Atualiza limites comerciais em plano_regras
-- INICIANTE: 30 colaboradores, 15 tipos de EPI
-- PRO: 150 colaboradores, EPIs ilimitados
-- GESTOR: 500 colaboradores, EPIs ilimitados
-- (quantidade_* = 0 → ilimitado; projetos inalterados)

UPDATE public.plano_regras
SET
  quantidade_colaboradores = 30,
  quantidade_epis = 15
WHERE stripe_price_id = 'price_1TjqDrA5Kdos07snj0r1cTO7'
   OR upper(trim(nome_plano)) = 'INICIANTE';

UPDATE public.plano_regras
SET
  quantidade_colaboradores = 150,
  quantidade_epis = 0
WHERE stripe_price_id = 'price_1TjqJvA5Kdos07sngKXrIQVo'
   OR upper(trim(nome_plano)) = 'PRO';

UPDATE public.plano_regras
SET
  quantidade_colaboradores = 500,
  quantidade_epis = 0
WHERE stripe_price_id = 'price_1TjqMHA5Kdos07snx0sxHCvw'
   OR upper(trim(nome_plano)) = 'GESTOR';

-- Fallback da RPC quando plano_regras não resolve (alinha ao Iniciante novo)
CREATE OR REPLACE FUNCTION public.obter_limites_plano_projeto(p_projeto_id uuid)
RETURNS TABLE (
  limite_colaboradores integer,
  limite_epis integer,
  nome_plano text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plano_tipo text;
  v_nome_plano text;
  v_limite_colab integer;
  v_limite_epis integer;
BEGIN
  SELECT
    a.plano_tipo,
    COALESCE(pr.nome_plano, a.plano_tipo, 'INICIANTE'),
    pr.quantidade_colaboradores,
    pr.quantidade_epis
  INTO v_plano_tipo, v_nome_plano, v_limite_colab, v_limite_epis
  FROM public.projetos p
  JOIN public.assinaturas a ON a.id = p.assinatura_id
  LEFT JOIN public.plano_regras pr ON pr.stripe_price_id = a.plano_regra_id
  WHERE p.id = p_projeto_id;

  IF NOT FOUND THEN
    limite_colaboradores := 0;
    limite_epis := 0;
    nome_plano := 'Plano';
    RETURN NEXT;
    RETURN;
  END IF;

  IF v_limite_colab IS NULL THEN
    v_limite_colab := CASE WHEN COALESCE(v_plano_tipo, 'INICIANTE') = 'INICIANTE' THEN 30 ELSE 0 END;
  END IF;

  IF v_limite_epis IS NULL THEN
    v_limite_epis := CASE WHEN COALESCE(v_plano_tipo, 'INICIANTE') = 'INICIANTE' THEN 15 ELSE 0 END;
  END IF;

  limite_colaboradores := COALESCE(v_limite_colab, 0);
  limite_epis := COALESCE(v_limite_epis, 0);
  nome_plano := COALESCE(v_nome_plano, 'Plano');
  RETURN NEXT;
END;
$$;
