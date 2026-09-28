-- Limite de EPIs do plano passa a contar TIPOS (epi_catalogo_id distintos),
-- não cada variação de guia/tamanho.

CREATE OR REPLACE FUNCTION public.contar_epis_ativos_projeto(p_projeto_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(DISTINCT e.epi_catalogo_id)::integer
  FROM public.epis e
  WHERE e.projeto_id = p_projeto_id
    AND e.status IS TRUE
    AND e.epi_catalogo_id IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.fn_validar_limite_epis_stmt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_projeto_id uuid;
  v_limite integer;
  v_uso integer;
  v_uso_antes integer;
  v_novos integer;
  v_nome_plano text;
  v_vagas integer;
  v_distinct_projetos integer;
BEGIN
  SELECT count(DISTINCT n.projeto_id), (array_agg(DISTINCT n.projeto_id))[1]
  INTO v_distinct_projetos, v_projeto_id
  FROM new_rows n;

  IF v_projeto_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF v_distinct_projetos > 1 THEN
    RAISE EXCEPTION 'Operação inválida: cadastro em lote com projetos diferentes.'
      USING ERRCODE = 'P0001';
  END IF;

  -- Tipos novos neste statement (ainda não existiam ativos no projeto)
  SELECT count(*)::integer INTO v_novos
  FROM (
    SELECT DISTINCT n.epi_catalogo_id
    FROM new_rows n
    WHERE n.status IS TRUE
      AND n.epi_catalogo_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.epis e
        WHERE e.projeto_id = v_projeto_id
          AND e.epi_catalogo_id = n.epi_catalogo_id
          AND e.status IS TRUE
          AND e.id NOT IN (SELECT nr.id FROM new_rows nr)
      )
  ) t;

  IF v_novos = 0 THEN
    RETURN NULL;
  END IF;

  SELECT l.limite_epis, l.nome_plano
  INTO v_limite, v_nome_plano
  FROM public.obter_limites_plano_projeto(v_projeto_id) l;

  IF v_limite IS NULL OR v_limite <= 0 THEN
    RETURN NULL;
  END IF;

  v_uso := public.contar_epis_ativos_projeto(v_projeto_id);

  IF v_uso > v_limite THEN
    v_uso_antes := GREATEST(0, v_uso - v_novos);
    v_vagas := GREATEST(0, v_limite - v_uso_antes);
    RAISE EXCEPTION
      'LIMITE_PLANO: Limite do plano % atingido. Seu plano permite até % tipo(s) de equipamento por projeto (uso atual: %). Você está tentando cadastrar % tipo(s) novo(s) e restam apenas % vaga(s). Variações de tamanho do mesmo tipo não consomem vagas extras. Faça upgrade para ampliar o limite.',
      v_nome_plano, v_limite, v_uso_antes, v_novos, v_vagas
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_validar_limite_epis_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limite integer;
  v_uso integer;
  v_nome_plano text;
BEGIN
  IF NEW.projeto_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Só valida reativação (inativo → ativo)
  IF NEW.status IS NOT TRUE OR OLD.status IS TRUE THEN
    RETURN NEW;
  END IF;

  -- Já existe outra variação ativa do mesmo tipo → não consome vaga nova
  IF NEW.epi_catalogo_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.epis e
    WHERE e.projeto_id = NEW.projeto_id
      AND e.epi_catalogo_id = NEW.epi_catalogo_id
      AND e.status IS TRUE
      AND e.id IS DISTINCT FROM NEW.id
  ) THEN
    RETURN NEW;
  END IF;

  SELECT l.limite_epis, l.nome_plano
  INTO v_limite, v_nome_plano
  FROM public.obter_limites_plano_projeto(NEW.projeto_id) l;

  IF v_limite IS NULL OR v_limite <= 0 THEN
    RETURN NEW;
  END IF;

  v_uso := public.contar_epis_ativos_projeto(NEW.projeto_id);

  IF v_uso + 1 > v_limite THEN
    RAISE EXCEPTION
      'LIMITE_PLANO: Limite do plano % atingido. Seu plano permite até % tipo(s) de equipamento por projeto (uso atual: %). Faça upgrade para ampliar o limite.',
      v_nome_plano, v_limite, v_uso
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

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

    v_qtd_epi := public.contar_epis_ativos_projeto(v_projeto.id);

    IF v_limite_epis > 0 AND v_qtd_epi > v_limite_epis THEN
      RETURN false;
    END IF;
  END LOOP;

  RETURN true;
END;
$$;
