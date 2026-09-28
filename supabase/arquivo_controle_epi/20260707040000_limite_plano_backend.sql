-- Bloqueio de limites do plano no backend (colaboradores e equipamentos/EPIs).
-- Convenção: quantidade_* = 0 em plano_regras significa ilimitado (igual ao front).

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
    v_limite_colab := CASE WHEN COALESCE(v_plano_tipo, 'INICIANTE') = 'INICIANTE' THEN 10 ELSE 0 END;
  END IF;

  IF v_limite_epis IS NULL THEN
    v_limite_epis := CASE WHEN COALESCE(v_plano_tipo, 'INICIANTE') = 'INICIANTE' THEN 50 ELSE 0 END;
  END IF;

  limite_colaboradores := COALESCE(v_limite_colab, 0);
  limite_epis := COALESCE(v_limite_epis, 0);
  nome_plano := COALESCE(v_nome_plano, 'Plano');
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.contar_colaboradores_ativos_projeto(p_projeto_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer
  FROM public.colaboradores
  WHERE projeto_id = p_projeto_id
    AND status IS TRUE;
$$;

CREATE OR REPLACE FUNCTION public.contar_epis_ativos_projeto(p_projeto_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer
  FROM public.epis
  WHERE projeto_id = p_projeto_id
    AND status IS TRUE;
$$;

CREATE OR REPLACE FUNCTION public.fn_validar_limite_colaboradores()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limite integer;
  v_uso integer;
  v_nome_plano text;
  v_vagas integer;
BEGIN
  IF NEW.projeto_id IS NULL OR NEW.status IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS TRUE THEN
    RETURN NEW;
  END IF;

  SELECT l.limite_colaboradores, l.nome_plano
  INTO v_limite, v_nome_plano
  FROM public.obter_limites_plano_projeto(NEW.projeto_id) l;

  IF v_limite IS NULL OR v_limite <= 0 THEN
    RETURN NEW;
  END IF;

  v_uso := public.contar_colaboradores_ativos_projeto(NEW.projeto_id);

  IF TG_OP = 'UPDATE' AND OLD.status IS NOT TRUE THEN
    -- reativação
    IF v_uso + 1 > v_limite THEN
      v_vagas := GREATEST(0, v_limite - v_uso);
      RAISE EXCEPTION
        'LIMITE_PLANO: Limite do plano % atingido. Seu plano permite até % colaborador(es) por projeto (uso atual: %). Faça upgrade para ampliar o limite.',
        v_nome_plano, v_limite, v_uso
        USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
  END IF;

  IF v_uso + 1 > v_limite THEN
    v_vagas := GREATEST(0, v_limite - v_uso);
    RAISE EXCEPTION
      'LIMITE_PLANO: Limite do plano % atingido. Seu plano permite até % colaborador(es) por projeto (uso atual: %). Faça upgrade para ampliar o limite.',
      v_nome_plano, v_limite, v_uso
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
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
  SELECT count(DISTINCT n.projeto_id), min(n.projeto_id)
  INTO v_distinct_projetos, v_projeto_id
  FROM new_rows n;

  IF v_projeto_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF v_distinct_projetos > 1 THEN
    RAISE EXCEPTION 'Operação inválida: cadastro em lote com projetos diferentes.'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT count(*) INTO v_novos
  FROM new_rows n
  WHERE n.status IS TRUE;

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
      'LIMITE_PLANO: Limite do plano % atingido. Seu plano permite até % equipamento(s) por projeto (uso atual: %). Você está tentando cadastrar % e restam apenas % vaga(s). Faça upgrade para ampliar o limite.',
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

  IF NEW.status IS NOT TRUE OR OLD.status IS TRUE THEN
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
      'LIMITE_PLANO: Limite do plano % atingido. Seu plano permite até % equipamento(s) por projeto (uso atual: %). Faça upgrade para ampliar o limite.',
      v_nome_plano, v_limite, v_uso
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_limite_colaboradores ON public.colaboradores;
CREATE TRIGGER trg_validar_limite_colaboradores
  BEFORE INSERT OR UPDATE ON public.colaboradores
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_validar_limite_colaboradores();

DROP TRIGGER IF EXISTS trg_validar_limite_epis_insert ON public.epis;
CREATE TRIGGER trg_validar_limite_epis_insert
  AFTER INSERT ON public.epis
  REFERENCING NEW TABLE AS new_rows
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.fn_validar_limite_epis_stmt();

DROP TRIGGER IF EXISTS trg_validar_limite_epis_update ON public.epis;
CREATE TRIGGER trg_validar_limite_epis_update
  BEFORE UPDATE ON public.epis
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_validar_limite_epis_update();

GRANT EXECUTE ON FUNCTION public.obter_limites_plano_projeto(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.contar_colaboradores_ativos_projeto(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.contar_epis_ativos_projeto(uuid) TO authenticated;
