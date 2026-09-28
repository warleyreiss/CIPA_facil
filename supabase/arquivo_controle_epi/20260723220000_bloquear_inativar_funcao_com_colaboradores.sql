-- Garante inativação de função apenas sem colaboradores ativos no projeto.
CREATE OR REPLACE FUNCTION public.fn_gerenciar_mudanca_no_cargo_funcao(
  p_modo text,
  p_id uuid,
  p_projeto_id uuid,
  p_nomenclatura text DEFAULT NULL,
  p_ghe_id uuid DEFAULT NULL,
  p_epi_catalogo_ids uuid[] DEFAULT '{}'::uuid[]
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_epis UUID[];
  v_colab RECORD;
  v_epi_id UUID;
  v_count_colaboradores INTEGER;
  v_afetados JSON;
BEGIN
  IF NOT public.checar_acesso_projeto(p_projeto_id) THEN
    RETURN json_build_object('success', false, 'error', 'Sem permissão neste projeto.');
  END IF;

  IF p_modo = 'EXCLUIR' THEN
    SELECT count(*) INTO v_count_colaboradores
    FROM public.colaboradores
    WHERE cargo_funcao_id = p_id
      AND projeto_id = p_projeto_id
      AND status = true;

    IF v_count_colaboradores > 0 THEN
      RETURN json_build_object(
        'success', false,
        'error', format(
          'Não é possível inativar esta função: %s colaborador(es) ativo(s) ainda a exercem.',
          v_count_colaboradores
        ),
        'qtd_colaboradores', v_count_colaboradores
      );
    END IF;

    UPDATE public.cargo_funcoes
    SET status = false, updated_at = NOW()
    WHERE id = p_id AND projeto_id = p_projeto_id AND status = true;

    IF NOT FOUND THEN
      RETURN json_build_object('success', false, 'error', 'Função não encontrada ou já inativa neste projeto.');
    END IF;

    RETURN json_build_object('success', true);
  END IF;

  IF p_id IS NOT NULL THEN
    SELECT epi_catalogo_ids INTO v_old_epis FROM public.cargo_funcoes WHERE id = p_id AND projeto_id = p_projeto_id;
    IF NOT FOUND THEN
      RETURN json_build_object('success', false, 'error', 'Função não encontrada neste projeto.');
    END IF;
  ELSE
    v_old_epis := '{}'::uuid[];
  END IF;

  IF p_id IS NOT NULL THEN
    UPDATE public.cargo_funcoes SET
      nomenclatura = p_nomenclatura,
      ghe_id = p_ghe_id,
      epi_catalogo_ids = p_epi_catalogo_ids,
      updated_at = NOW()
    WHERE id = p_id AND projeto_id = p_projeto_id;
  ELSE
    INSERT INTO public.cargo_funcoes (projeto_id, nomenclatura, ghe_id, epi_catalogo_ids)
    VALUES (p_projeto_id, p_nomenclatura, p_ghe_id, p_epi_catalogo_ids)
    RETURNING id INTO p_id;
  END IF;

  IF v_old_epis IS DISTINCT FROM p_epi_catalogo_ids THEN
    INSERT INTO public.historico_alteracao_em_cargo_funcoes (cargo_funcao_id, epi_catalogo_epis)
    VALUES (p_id, p_epi_catalogo_ids);

    FOR v_colab IN (
      SELECT id FROM public.colaboradores
      WHERE cargo_funcao_id = p_id AND status = true AND projeto_id = p_projeto_id
    ) LOOP
      FOREACH v_epi_id IN ARRAY p_epi_catalogo_ids LOOP
        IF NOT (v_epi_id = ANY(v_old_epis)) THEN
          UPDATE public.controle_epi
          SET status = true,
              motivo_acao = 'ADIÇÃO PARA FUNÇÃO',
              observacao = COALESCE(observacao, '') || ' [Reativado: incluído na função]'
          WHERE colaborador_id = v_colab.id
            AND epi_catalogo_id = v_epi_id;

          IF NOT FOUND THEN
            INSERT INTO public.controle_epi (
              projeto_id, colaborador_id, epi_catalogo_id, motivo_acao, status
            ) VALUES (
              p_projeto_id, v_colab.id, v_epi_id, 'ADIÇÃO PARA FUNÇÃO', true
            );
          END IF;
        END IF;
      END LOOP;

      FOREACH v_epi_id IN ARRAY v_old_epis LOOP
        IF NOT (v_epi_id = ANY(p_epi_catalogo_ids)) THEN
          UPDATE public.controle_epi
          SET status = false,
              observacao = COALESCE(observacao, '') || ' [Inativado: removido da função]'
          WHERE colaborador_id = v_colab.id
            AND epi_catalogo_id = v_epi_id
            AND status IS DISTINCT FROM false;
        END IF;
      END LOOP;
    END LOOP;
  END IF;

  SELECT json_agg(json_build_object('id', id, 'nome', nome)) INTO v_afetados
  FROM public.colaboradores WHERE cargo_funcao_id = p_id AND status = true;

  RETURN json_build_object(
    'success', true,
    'id', p_id,
    'afetados', COALESCE(v_afetados, '[]'::json)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_gerenciar_mudanca_no_cargo_funcao(
  text, uuid, uuid, text, uuid, uuid[]
) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.fn_gerenciar_mudanca_no_cargo_funcao(
  text, uuid, uuid, text, uuid, uuid[]
) FROM anon;
