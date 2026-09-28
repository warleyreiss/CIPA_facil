-- Corrige fn_validar_limite_epis_stmt: PostgreSQL não possui min(uuid).
-- Usa (array_agg(...))[1] para obter um projeto_id representativo do lote.

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
