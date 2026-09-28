-- Escopo correto na inativação de EPI:
-- - conta outras variações ativas só no mesmo projeto
-- - bloqueia última variação se o tipo ainda estiver em cargo_funcoes do mesmo projeto
CREATE OR REPLACE FUNCTION public.fn_validar_e_inativar_epi(
  p_epi_id uuid,
  p_catalogo_id uuid
)
RETURNS TABLE(sucesso boolean, mensagem text)
LANGUAGE plpgsql
AS $$
DECLARE
  v_projeto_id uuid;
  v_catalogo_id uuid;
  v_existe_outro boolean;
  v_vinculado_cargo boolean;
  v_funcoes text;
BEGIN
  SELECT e.projeto_id, e.epi_catalogo_id
    INTO v_projeto_id, v_catalogo_id
  FROM public.epis e
  WHERE e.id = p_epi_id;

  IF v_projeto_id IS NULL THEN
    RETURN QUERY SELECT false, 'Equipamento não encontrado.'::text;
    RETURN;
  END IF;

  -- Prefere o catálogo persistido no registro (p_catalogo_id mantido por compatibilidade)
  IF v_catalogo_id IS NULL THEN
    v_catalogo_id := p_catalogo_id;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.epis e
    WHERE e.projeto_id = v_projeto_id
      AND e.epi_catalogo_id = v_catalogo_id
      AND e.id <> p_epi_id
      AND e.status = true
  ) INTO v_existe_outro;

  IF NOT v_existe_outro THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.cargo_funcoes cf
      WHERE cf.projeto_id = v_projeto_id
        AND v_catalogo_id = ANY (cf.epi_catalogo_ids)
        AND cf.status = true
    ) INTO v_vinculado_cargo;
  ELSE
    v_vinculado_cargo := false;
  END IF;

  IF v_existe_outro OR NOT v_vinculado_cargo THEN
    UPDATE public.epis
    SET status = false
    WHERE id = p_epi_id
      AND projeto_id = v_projeto_id;

    RETURN QUERY SELECT true, 'Equipamento inativado com sucesso.'::text;
  ELSE
    SELECT string_agg(cf.nomenclatura, ', ' ORDER BY cf.nomenclatura)
      INTO v_funcoes
    FROM public.cargo_funcoes cf
    WHERE cf.projeto_id = v_projeto_id
      AND v_catalogo_id = ANY (cf.epi_catalogo_ids)
      AND cf.status = true;

    RETURN QUERY SELECT
      false,
      (
        'Não é possível excluir: esta é a última variação deste tipo no projeto'
        || CASE
             WHEN v_funcoes IS NOT NULL AND length(v_funcoes) > 0
             THEN ' e ainda é exigida na(s) função(ões): ' || v_funcoes
             ELSE ' e ainda é exigida em cargos/funções'
           END
        || '. Cadastre outra variação ou remova o EPI das funções antes de excluir.'
      )::text;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_validar_e_inativar_epi(uuid, uuid) TO authenticated, service_role;
