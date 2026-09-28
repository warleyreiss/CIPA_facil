-- Terminologia: setores → GHE (Grupo Homogêneo de Exposição)

ALTER TABLE public.setores RENAME TO ghe;

ALTER TABLE public.cargo_funcoes RENAME COLUMN setor_id TO ghe_id;

ALTER TABLE public.cargo_funcoes
  RENAME CONSTRAINT cargo_funcoes_setor_id_fkey TO cargo_funcoes_ghe_id_fkey;

COMMENT ON TABLE public.ghe IS 'Grupos Homogêneos de Exposição (GHE) vinculados ao projeto.';

DROP FUNCTION IF EXISTS public.fn_gerenciar_mudanca_no_cargo_funcao(
  text, uuid, uuid, text, uuid, uuid[]
);

CREATE OR REPLACE FUNCTION public.fn_gerenciar_mudanca_no_cargo_funcao(
  p_modo text,
  p_id uuid,
  p_projeto_id uuid,
  p_nomenclatura text DEFAULT NULL,
  p_ghe_id uuid DEFAULT NULL,
  p_epi_catalogo_ids uuid[] DEFAULT '{}'::uuid[]
) RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_old_epis UUID[];
  v_colab RECORD;
  v_epi_id UUID;
  v_count_colaboradores INTEGER;
  v_afetados JSON;
BEGIN
  IF p_modo = 'EXCLUIR' THEN
    SELECT count(*) INTO v_count_colaboradores FROM public.colaboradores
    WHERE cargo_funcao_id = p_id AND status = true;

    IF v_count_colaboradores > 0 THEN
      RETURN json_build_object('success', false, 'error', 'Bloqueado: Existem colaboradores ativos nesta função.');
    END IF;

    UPDATE public.cargo_funcoes SET status = false WHERE id = p_id;
    RETURN json_build_object('success', true);
  END IF;

  IF p_id IS NOT NULL THEN
    SELECT epi_catalogo_ids INTO v_old_epis FROM public.cargo_funcoes WHERE id = p_id;
  ELSE
    v_old_epis := '{}'::uuid[];
  END IF;

  IF p_id IS NOT NULL THEN
    UPDATE public.cargo_funcoes SET
      nomenclatura = p_nomenclatura,
      ghe_id = p_ghe_id,
      epi_catalogo_ids = p_epi_catalogo_ids,
      updated_at = NOW()
    WHERE id = p_id;
  ELSE
    INSERT INTO public.cargo_funcoes (projeto_id, nomenclatura, ghe_id, epi_catalogo_ids)
    VALUES (p_projeto_id, p_nomenclatura, p_ghe_id, p_epi_catalogo_ids)
    RETURNING id INTO p_id;
  END IF;

  IF v_old_epis IS DISTINCT FROM p_epi_catalogo_ids THEN
    INSERT INTO public.historico_alteracao_em_cargo_funcoes (cargo_funcao_id, epi_catalogo_epis)
    VALUES (p_id, p_epi_catalogo_ids);

    FOR v_colab IN (SELECT id FROM public.colaboradores WHERE cargo_funcao_id = p_id AND status = true) LOOP
      FOREACH v_epi_id IN ARRAY p_epi_catalogo_ids LOOP
        IF NOT (v_epi_id = ANY(v_old_epis)) THEN
          INSERT INTO public.controle_epi (
            projeto_id,
            colaborador_id,
            epi_catalogo_id,
            motivo_acao
          )
          VALUES (
            p_projeto_id,
            v_colab.id,
            v_epi_id,
            'ADIÇÃO PARA FUNÇÃO'
          );
        END IF;
      END LOOP;

      FOREACH v_epi_id IN ARRAY v_old_epis LOOP
        IF NOT (v_epi_id = ANY(p_epi_catalogo_ids)) THEN
          DELETE FROM public.controle_epi
          WHERE colaborador_id = v_colab.id
            AND epi_catalogo_id = v_epi_id;
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

GRANT ALL ON FUNCTION public.fn_gerenciar_mudanca_no_cargo_funcao(
  text, uuid, uuid, text, uuid, uuid[]
) TO anon, authenticated, service_role;

DROP VIEW IF EXISTS public.v_controle_epi;

CREATE VIEW public.v_controle_epi AS
 SELECT ce.id AS controle_id,
    ce.projeto_id,
    ce.data_fornecimento,
    ce.quantidade,
    ce.ca_numero,
    ce.motivo_acao,
    ce.observacao,
    ce.epi_catalogo_id,
    c.id AS colaborador_id,
    c.nome AS colaborador_nome,
    c.inscricao AS colaborador_matricula,
    cf.nomenclatura AS cargo_funcao_nome,
    g.descricao AS ghe_nome,
    ec.descricao AS epi_nome,
    ec.classificacao AS epi_classificacao,
    e.prazo_troca_dias,
        CASE
            WHEN (ce.epi_id IS NULL) THEN NULL::date
            ELSE ((ce.data_fornecimento + ((COALESCE(e.prazo_troca_dias, 90) || ' days'::text))::interval))::date
        END AS prazo_previsto,
        CASE
            WHEN (ce.epi_id IS NULL) THEN NULL::integer
            ELSE (((ce.data_fornecimento + ((COALESCE(e.prazo_troca_dias, 90) || ' days'::text))::interval))::date - CURRENT_DATE)
        END AS prazo_restante_dias,
        CASE
            WHEN (ce.epi_id IS NULL) THEN 'PENDENTE'::text
            WHEN ((((ce.data_fornecimento + ((COALESCE(e.prazo_troca_dias, 90) || ' days'::text))::interval))::date - CURRENT_DATE) < 0) THEN 'VENCIDO'::text
            WHEN (((((ce.data_fornecimento + ((COALESCE(e.prazo_troca_dias, 90) || ' days'::text))::interval))::date - CURRENT_DATE) >= 0) AND ((((ce.data_fornecimento + ((COALESCE(e.prazo_troca_dias, 90) || ' days'::text))::interval))::date - CURRENT_DATE) <= 3)) THEN 'IMINENTE'::text
            ELSE 'NO PRAZO'::text
        END AS status_prazo,
    ce.metodo,
    ce.validacao_digital
   FROM ((((public.controle_epi ce
     JOIN public.colaboradores c ON ((ce.colaborador_id = c.id)))
     LEFT JOIN public.cargo_funcoes cf ON ((c.cargo_funcao_id = cf.id)))
     LEFT JOIN public.ghe g ON ((cf.ghe_id = g.id)))
     JOIN public.epi_catalogo ec ON ((ce.epi_catalogo_id = ec.id)))
     LEFT JOIN public.epis e ON ((ce.epi_id = e.id));

GRANT ALL ON TABLE public.v_controle_epi TO anon, authenticated, service_role;
