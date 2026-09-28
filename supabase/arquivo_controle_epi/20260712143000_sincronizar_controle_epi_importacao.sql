-- Sincroniza controle_epi após importação em lote (matriz aplicada antes ou depois dos colaboradores).
-- Replica a lógica do trigger fn_colaborador_mudanca_cargo_epi para cada colaborador ativo com cargo.

CREATE OR REPLACE FUNCTION public.fn_sincronizar_controle_epi_projeto(p_projeto_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_colab RECORD;
  v_epi_id uuid;
  v_count integer := 0;
BEGIN
  IF p_projeto_id IS NULL THEN
    RETURN 0;
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
      )
      ON CONFLICT (colaborador_id, epi_catalogo_id) DO UPDATE SET
        status = true,
        motivo_acao = EXCLUDED.motivo_acao
      WHERE public.controle_epi.status IS DISTINCT FROM true;

      v_count := v_count + 1;
    END LOOP;
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_sincronizar_controle_epi_projeto(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_sincronizar_controle_epi_projeto(uuid) IS
  'Cria/atualiza registros pendentes em controle_epi (colaborador × EPI do cargo) após importação em lote.';
