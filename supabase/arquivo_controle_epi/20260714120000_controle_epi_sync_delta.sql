-- Retorna delta da sincronização controle_epi (inseridos / reativados / inalterados).
-- DROP necessário: muda o tipo de retorno (integer → jsonb).
DROP FUNCTION IF EXISTS public.fn_sincronizar_controle_epi_projeto(uuid);

CREATE OR REPLACE FUNCTION public.fn_sincronizar_controle_epi_projeto(p_projeto_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_colab RECORD;
  v_epi_id uuid;
  v_inseridos integer := 0;
  v_reativados integer := 0;
  v_inalterados integer := 0;
  v_existente public.controle_epi%ROWTYPE;
BEGIN
  IF p_projeto_id IS NULL THEN
    RETURN jsonb_build_object(
      'processados', 0, 'inseridos', 0, 'reativados', 0, 'inalterados', 0
    );
  END IF;

  IF NOT public.checar_acesso_projeto(p_projeto_id) THEN
    RAISE EXCEPTION 'Sem permissão para sincronizar controle EPI neste projeto';
  END IF;

  FOR v_colab IN
    SELECT
      c.id AS colaborador_id,
      c.projeto_id,
      COALESCE(cf.epi_catalogo_ids, '{}'::uuid[]) AS epi_catalogo_ids
    FROM public.colaboradores c
    INNER JOIN public.cargo_funcoes cf ON cf.id = c.cargo_funcao_id
    WHERE c.projeto_id = p_projeto_id
      AND c.status = true
      AND c.cargo_funcao_id IS NOT NULL
      AND cf.epi_catalogo_ids IS NOT NULL
      AND cf.epi_catalogo_ids <> '{}'::uuid[]
  LOOP
    FOREACH v_epi_id IN ARRAY v_colab.epi_catalogo_ids LOOP
      SELECT * INTO v_existente
      FROM public.controle_epi ce
      WHERE ce.colaborador_id = v_colab.colaborador_id
        AND ce.epi_catalogo_id = v_epi_id
      LIMIT 1;

      IF NOT FOUND THEN
        INSERT INTO public.controle_epi (
          projeto_id,
          colaborador_id,
          epi_catalogo_id,
          motivo_acao,
          status
        ) VALUES (
          v_colab.projeto_id,
          v_colab.colaborador_id,
          v_epi_id,
          'LANÇAMENTO INICIAL',
          true
        );
        v_inseridos := v_inseridos + 1;
      ELSIF v_existente.status IS DISTINCT FROM true THEN
        UPDATE public.controle_epi
        SET status = true, motivo_acao = 'LANÇAMENTO INICIAL'
        WHERE id = v_existente.id;
        v_reativados := v_reativados + 1;
      ELSE
        v_inalterados := v_inalterados + 1;
      END IF;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'processados', v_inseridos + v_reativados + v_inalterados,
    'inseridos', v_inseridos,
    'reativados', v_reativados,
    'inalterados', v_inalterados
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_sincronizar_controle_epi_projeto(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_sincronizar_controle_epi_projeto(uuid) IS
  'Sincroniza controle_epi e retorna delta: inseridos, reativados, inalterados.';
