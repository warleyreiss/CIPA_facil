-- Cargos/Funções: inativação segura, RLS e GHE

-- ── 1. RPC cargo/função: inativar controle_epi em vez de DELETE ──
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
    SELECT count(*) INTO v_count_colaboradores FROM public.colaboradores
    WHERE cargo_funcao_id = p_id AND status = true;

    IF v_count_colaboradores > 0 THEN
      RETURN json_build_object('success', false, 'error', 'Bloqueado: Existem colaboradores ativos nesta função.');
    END IF;

    UPDATE public.cargo_funcoes SET status = false, updated_at = NOW()
    WHERE id = p_id AND projeto_id = p_projeto_id;
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

-- ── 2. Inativar GHE (bloqueia se houver funções ativas) ──
CREATE OR REPLACE FUNCTION public.fn_inativar_ghe(
  p_ghe_id uuid,
  p_projeto_id uuid
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF NOT public.checar_acesso_projeto(p_projeto_id) THEN
    RETURN json_build_object('success', false, 'error', 'Sem permissão neste projeto.');
  END IF;

  SELECT count(*) INTO v_count
  FROM public.cargo_funcoes
  WHERE ghe_id = p_ghe_id AND projeto_id = p_projeto_id AND status = true;

  IF v_count > 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', format('Existem %s função(ões) ativa(s) vinculada(s) a este GHE.', v_count)
    );
  END IF;

  UPDATE public.ghe SET status = false
  WHERE id = p_ghe_id AND projeto_id = p_projeto_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'GHE não encontrado.');
  END IF;

  RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_inativar_ghe(uuid, uuid) TO authenticated, service_role;

-- ── 3. View controle: apenas registros ativos ──
CREATE OR REPLACE VIEW public.v_controle_epi AS
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
   FROM public.controle_epi ce
     JOIN public.colaboradores c ON ce.colaborador_id = c.id AND c.status = true
     LEFT JOIN public.cargo_funcoes cf ON c.cargo_funcao_id = cf.id
     LEFT JOIN public.ghe g ON cf.ghe_id = g.id
     JOIN public.epi_catalogo ec ON ce.epi_catalogo_id = ec.id
     LEFT JOIN public.epis e ON ce.epi_id = e.id
  WHERE ce.status IS DISTINCT FROM false;

GRANT SELECT ON TABLE public.v_controle_epi TO authenticated, service_role;

-- ── 4. RLS cargo_funcoes, ghe, historico_alteracao ──
ALTER TABLE public.cargo_funcoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ghe ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_alteracao_em_cargo_funcoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir tudo para autenticados" ON public.ghe;

DROP POLICY IF EXISTS "cargo_funcoes_select_membro" ON public.cargo_funcoes;
CREATE POLICY "cargo_funcoes_select_membro"
  ON public.cargo_funcoes FOR SELECT TO authenticated
  USING (public.checar_acesso_projeto(projeto_id));

DROP POLICY IF EXISTS "cargo_funcoes_insert_membro" ON public.cargo_funcoes;
CREATE POLICY "cargo_funcoes_insert_membro"
  ON public.cargo_funcoes FOR INSERT TO authenticated
  WITH CHECK (public.checar_acesso_projeto(projeto_id));

DROP POLICY IF EXISTS "cargo_funcoes_update_membro" ON public.cargo_funcoes;
CREATE POLICY "cargo_funcoes_update_membro"
  ON public.cargo_funcoes FOR UPDATE TO authenticated
  USING (public.checar_acesso_projeto(projeto_id))
  WITH CHECK (public.checar_acesso_projeto(projeto_id));

DROP POLICY IF EXISTS "ghe_select_membro" ON public.ghe;
CREATE POLICY "ghe_select_membro"
  ON public.ghe FOR SELECT TO authenticated
  USING (public.checar_acesso_projeto(projeto_id));

DROP POLICY IF EXISTS "ghe_insert_membro" ON public.ghe;
CREATE POLICY "ghe_insert_membro"
  ON public.ghe FOR INSERT TO authenticated
  WITH CHECK (public.checar_acesso_projeto(projeto_id));

DROP POLICY IF EXISTS "ghe_update_membro" ON public.ghe;
CREATE POLICY "ghe_update_membro"
  ON public.ghe FOR UPDATE TO authenticated
  USING (public.checar_acesso_projeto(projeto_id))
  WITH CHECK (public.checar_acesso_projeto(projeto_id));

DROP POLICY IF EXISTS "hist_cargo_funcao_select_membro" ON public.historico_alteracao_em_cargo_funcoes;
CREATE POLICY "hist_cargo_funcao_select_membro"
  ON public.historico_alteracao_em_cargo_funcoes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cargo_funcoes cf
      WHERE cf.id = historico_alteracao_em_cargo_funcoes.cargo_funcao_id
        AND public.checar_acesso_projeto(cf.projeto_id)
    )
  );

DROP POLICY IF EXISTS "hist_cargo_funcao_insert_membro" ON public.historico_alteracao_em_cargo_funcoes;
CREATE POLICY "hist_cargo_funcao_insert_membro"
  ON public.historico_alteracao_em_cargo_funcoes FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cargo_funcoes cf
      WHERE cf.id = historico_alteracao_em_cargo_funcoes.cargo_funcao_id
        AND public.checar_acesso_projeto(cf.projeto_id)
    )
  );

REVOKE ALL ON TABLE public.cargo_funcoes FROM anon;
REVOKE ALL ON TABLE public.ghe FROM anon;
REVOKE ALL ON TABLE public.historico_alteracao_em_cargo_funcoes FROM anon;

GRANT SELECT, INSERT, UPDATE ON TABLE public.cargo_funcoes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.ghe TO authenticated;
GRANT SELECT, INSERT ON TABLE public.historico_alteracao_em_cargo_funcoes TO authenticated;
