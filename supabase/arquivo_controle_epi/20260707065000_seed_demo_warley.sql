-- Seed demo: projeto Warley (warleyreiss@gmail.com)
-- 10 EPIs, 4 funções, 10 colaboradores, fornecimentos e históricos (45 dias)

CREATE OR REPLACE FUNCTION pg_temp.seed_demo_warley()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_proj   uuid;
  v_ass    uuid;
  v_tam_u  uuid;
  v_tam_l  uuid;
  v_tam_c  uuid;
  v_tam_vs uuid;

  ghe_prod uuid;
  ghe_man  uuid;
  ghe_adm  uuid;

  fn_op   uuid;
  fn_sold uuid;
  fn_elet uuid;
  fn_alm  uuid;

  c_cap uuid; c_ocu uuid; c_luv uuid; c_cal uuid; c_msc uuid;
  c_avt uuid; c_iso uuid; c_col uuid; c_aur uuid; c_cin uuid;

  e_cap uuid; e_ocu uuid; e_luv uuid; e_cal uuid; e_msc uuid;
  e_avt uuid; e_iso uuid; e_col uuid; e_aur uuid; e_cin uuid;

  col_ana  uuid; col_bru uuid; col_car uuid; col_dig uuid; col_fer uuid;
  col_gus uuid; col_hel uuid; col_igo uuid; col_jul uuid; col_mar uuid;

  v_d date;
BEGIN
  SELECT p.id, p.assinatura_id
    INTO v_proj, v_ass
  FROM public.projetos p
  JOIN public.assinaturas a ON a.id = p.assinatura_id
  JOIN public.usuarios u ON u.assinatura_id = a.id
  WHERE lower(u.email) = lower('warleyreiss@gmail.com')
    AND p.nome ILIKE 'Warley'
  ORDER BY p.created_at DESC
  LIMIT 1;

  IF v_proj IS NULL THEN
    RAISE EXCEPTION 'Projeto "Warley" não encontrado para warleyreiss@gmail.com';
  END IF;

  ALTER TABLE public.epis DISABLE TRIGGER USER;
  ALTER TABLE public.colaboradores DISABLE TRIGGER USER;

  UPDATE public.assinaturas
  SET plano_tipo = 'TESTE-DIARIO'
  WHERE id = v_ass;

  -- Limpeza execução anterior
  DELETE FROM public.historico_controle_epi
  WHERE projeto_id = v_proj
    AND colaborador_id IN (
      SELECT id FROM public.colaboradores WHERE projeto_id = v_proj AND inscricao LIKE '900%'
    );

  DELETE FROM public.controle_epi
  WHERE projeto_id = v_proj
    AND colaborador_id IN (
      SELECT id FROM public.colaboradores WHERE projeto_id = v_proj AND inscricao LIKE '900%'
    );

  DELETE FROM public.historico_cargos
  WHERE projeto_id = v_proj
    AND colaborador_id IN (
      SELECT id FROM public.colaboradores WHERE projeto_id = v_proj AND inscricao LIKE '900%'
    );

  DELETE FROM public.colaboradores WHERE projeto_id = v_proj AND inscricao LIKE '900%';

  DELETE FROM public.historico_alteracao_em_cargo_funcoes
  WHERE cargo_funcao_id IN (
    SELECT id FROM public.cargo_funcoes WHERE projeto_id = v_proj AND nomenclatura LIKE 'DEMO %'
  );

  DELETE FROM public.cargo_funcoes WHERE projeto_id = v_proj AND nomenclatura LIKE 'DEMO %';

  DELETE FROM public.epis
  WHERE projeto_id = v_proj
    AND epi_catalogo_id IN (SELECT id FROM public.epi_catalogo WHERE descricao LIKE 'DEMO %');

  DELETE FROM public.ghe WHERE projeto_id = v_proj AND descricao LIKE 'DEMO %';

  DELETE FROM public.epi_catalogo ec
  WHERE ec.descricao LIKE 'DEMO %'
    AND NOT EXISTS (SELECT 1 FROM public.epis e WHERE e.epi_catalogo_id = ec.id)
    AND NOT EXISTS (SELECT 1 FROM public.controle_epi ce WHERE ce.epi_catalogo_id = ec.id);

  SELECT id INTO v_tam_u  FROM public.catalogo_tamanhos WHERE guia_tamanho = 1 ORDER BY descricao LIMIT 1;
  SELECT id INTO v_tam_l  FROM public.catalogo_tamanhos WHERE guia_tamanho = 2 ORDER BY descricao LIMIT 1;
  SELECT id INTO v_tam_c  FROM public.catalogo_tamanhos WHERE guia_tamanho = 5 ORDER BY descricao LIMIT 1;
  SELECT id INTO v_tam_vs FROM public.catalogo_tamanhos WHERE guia_tamanho = 3 ORDER BY descricao LIMIT 1;
  IF v_tam_u IS NULL THEN SELECT id INTO v_tam_u FROM public.catalogo_tamanhos LIMIT 1; END IF;

  INSERT INTO public.ghe (projeto_id, descricao, status) VALUES (v_proj, 'DEMO GHE Produção Industrial', true) RETURNING id INTO ghe_prod;
  INSERT INTO public.ghe (projeto_id, descricao, status) VALUES (v_proj, 'DEMO GHE Manutenção Elétrica', true) RETURNING id INTO ghe_man;
  INSERT INTO public.ghe (projeto_id, descricao, status) VALUES (v_proj, 'DEMO GHE Administrativo', true) RETURNING id INTO ghe_adm;

  INSERT INTO public.epi_catalogo (descricao, classificacao, guia_tamanho_catalogo, obrigatorio_ca) VALUES ('DEMO Capacete de Segurança', 'Proteção craniana', 1, true) RETURNING id INTO c_cap;
  INSERT INTO public.epi_catalogo (descricao, classificacao, guia_tamanho_catalogo, obrigatorio_ca) VALUES ('DEMO Óculos de Proteção', 'Proteção ocular', 1, true) RETURNING id INTO c_ocu;
  INSERT INTO public.epi_catalogo (descricao, classificacao, guia_tamanho_catalogo, obrigatorio_ca) VALUES ('DEMO Luva de Raspa', 'Proteção mãos', 2, true) RETURNING id INTO c_luv;
  INSERT INTO public.epi_catalogo (descricao, classificacao, guia_tamanho_catalogo, obrigatorio_ca) VALUES ('DEMO Calçado de Segurança', 'Proteção pés', 5, true) RETURNING id INTO c_cal;
  INSERT INTO public.epi_catalogo (descricao, classificacao, guia_tamanho_catalogo, obrigatorio_ca) VALUES ('DEMO Máscara de Solda', 'Proteção facial', 1, true) RETURNING id INTO c_msc;
  INSERT INTO public.epi_catalogo (descricao, classificacao, guia_tamanho_catalogo, obrigatorio_ca) VALUES ('DEMO Avental de Raspa', 'Proteção tronco', 1, true) RETURNING id INTO c_avt;
  INSERT INTO public.epi_catalogo (descricao, classificacao, guia_tamanho_catalogo, obrigatorio_ca) VALUES ('DEMO Luva Isolante Classe 00', 'Proteção elétrica', 2, true) RETURNING id INTO c_iso;
  INSERT INTO public.epi_catalogo (descricao, classificacao, guia_tamanho_catalogo, obrigatorio_ca) VALUES ('DEMO Colete Refletivo', 'Alta visibilidade', 3, false) RETURNING id INTO c_col;
  INSERT INTO public.epi_catalogo (descricao, classificacao, guia_tamanho_catalogo, obrigatorio_ca) VALUES ('DEMO Protetor Auricular', 'Proteção auditiva', 1, true) RETURNING id INTO c_aur;
  INSERT INTO public.epi_catalogo (descricao, classificacao, guia_tamanho_catalogo, obrigatorio_ca) VALUES ('DEMO Cinta de Segurança', 'Trabalho em altura', 4, true) RETURNING id INTO c_cin;

  INSERT INTO public.epis (projeto_id, epi_catalogo_id, catalogo_tamanho_id, prazo_troca_dias, estoque_minimo, estoque_ideal, estoque_atual, valor_unitario_atual, status) VALUES (v_proj, c_cap, v_tam_u, 720, 5, 20, 120, 45.90, true) RETURNING id INTO e_cap;
  INSERT INTO public.epis (projeto_id, epi_catalogo_id, catalogo_tamanho_id, prazo_troca_dias, estoque_minimo, estoque_ideal, estoque_atual, valor_unitario_atual, status) VALUES (v_proj, c_ocu, v_tam_u, 180, 10, 30, 95, 12.50, true) RETURNING id INTO e_ocu;
  INSERT INTO public.epis (projeto_id, epi_catalogo_id, catalogo_tamanho_id, prazo_troca_dias, estoque_minimo, estoque_ideal, estoque_atual, valor_unitario_atual, status) VALUES (v_proj, c_luv, COALESCE(v_tam_l, v_tam_u), 90, 20, 60, 200, 8.75, true) RETURNING id INTO e_luv;
  INSERT INTO public.epis (projeto_id, epi_catalogo_id, catalogo_tamanho_id, prazo_troca_dias, estoque_minimo, estoque_ideal, estoque_atual, valor_unitario_atual, status) VALUES (v_proj, c_cal, COALESCE(v_tam_c, v_tam_u), 365, 8, 25, 80, 89.00, true) RETURNING id INTO e_cal;
  INSERT INTO public.epis (projeto_id, epi_catalogo_id, catalogo_tamanho_id, prazo_troca_dias, estoque_minimo, estoque_ideal, estoque_atual, valor_unitario_atual, status) VALUES (v_proj, c_msc, v_tam_u, 365, 4, 12, 45, 35.00, true) RETURNING id INTO e_msc;
  INSERT INTO public.epis (projeto_id, epi_catalogo_id, catalogo_tamanho_id, prazo_troca_dias, estoque_minimo, estoque_ideal, estoque_atual, valor_unitario_atual, status) VALUES (v_proj, c_avt, v_tam_u, 180, 5, 15, 55, 42.00, true) RETURNING id INTO e_avt;
  INSERT INTO public.epis (projeto_id, epi_catalogo_id, catalogo_tamanho_id, prazo_troca_dias, estoque_minimo, estoque_ideal, estoque_atual, valor_unitario_atual, status) VALUES (v_proj, c_iso, COALESCE(v_tam_l, v_tam_u), 180, 6, 18, 60, 55.00, true) RETURNING id INTO e_iso;
  INSERT INTO public.epis (projeto_id, epi_catalogo_id, catalogo_tamanho_id, prazo_troca_dias, estoque_minimo, estoque_ideal, estoque_atual, valor_unitario_atual, status) VALUES (v_proj, c_col, COALESCE(v_tam_vs, v_tam_u), 365, 5, 15, 70, 22.00, true) RETURNING id INTO e_col;
  INSERT INTO public.epis (projeto_id, epi_catalogo_id, catalogo_tamanho_id, prazo_troca_dias, estoque_minimo, estoque_ideal, estoque_atual, valor_unitario_atual, status) VALUES (v_proj, c_aur, v_tam_u, 180, 10, 30, 110, 6.50, true) RETURNING id INTO e_aur;
  INSERT INTO public.epis (projeto_id, epi_catalogo_id, catalogo_tamanho_id, prazo_troca_dias, estoque_minimo, estoque_ideal, estoque_atual, valor_unitario_atual, status) VALUES (v_proj, c_cin, v_tam_u, 365, 3, 10, 25, 210.00, true) RETURNING id INTO e_cin;

  INSERT INTO public.cargo_funcoes (projeto_id, nomenclatura, ghe_id, epi_catalogo_ids, status)
  VALUES (v_proj, 'DEMO Operador de Máquinas', ghe_prod, ARRAY[c_cap, c_ocu, c_luv, c_cal, c_aur], true) RETURNING id INTO fn_op;
  INSERT INTO public.cargo_funcoes (projeto_id, nomenclatura, ghe_id, epi_catalogo_ids, status)
  VALUES (v_proj, 'DEMO Soldador', ghe_prod, ARRAY[c_cap, c_msc, c_luv, c_avt, c_cal], true) RETURNING id INTO fn_sold;
  INSERT INTO public.cargo_funcoes (projeto_id, nomenclatura, ghe_id, epi_catalogo_ids, status)
  VALUES (v_proj, 'DEMO Eletricista de Manutenção', ghe_man, ARRAY[c_cap, c_ocu, c_iso, c_cal], true) RETURNING id INTO fn_elet;
  INSERT INTO public.cargo_funcoes (projeto_id, nomenclatura, ghe_id, epi_catalogo_ids, status)
  VALUES (v_proj, 'DEMO Almoxarife', ghe_adm, ARRAY[c_cal, c_col, c_luv], true) RETURNING id INTO fn_alm;

  INSERT INTO public.historico_alteracao_em_cargo_funcoes (cargo_funcao_id, epi_catalogo_epis, data_alteracao) VALUES
    (fn_op,   ARRAY[c_cap, c_ocu, c_luv, c_cal, c_aur], (CURRENT_DATE - 44)),
    (fn_sold, ARRAY[c_cap, c_msc, c_luv, c_avt, c_cal], (CURRENT_DATE - 44)),
    (fn_elet, ARRAY[c_cap, c_ocu, c_iso, c_cal],       (CURRENT_DATE - 44)),
    (fn_alm,  ARRAY[c_cal, c_col, c_luv],             (CURRENT_DATE - 44));

  INSERT INTO public.colaboradores (projeto_id, nome, cpf, inscricao, data_admissao, cargo_funcao_id, status) VALUES (v_proj, 'Ana Paula Ferreira',    '52998224725', '900001', CURRENT_DATE - 44, fn_op,   true) RETURNING id INTO col_ana;
  INSERT INTO public.colaboradores (projeto_id, nome, cpf, inscricao, data_admissao, cargo_funcao_id, status) VALUES (v_proj, 'Bruno Costa Silva',     '39053344705', '900002', CURRENT_DATE - 42, fn_op,   true) RETURNING id INTO col_bru;
  INSERT INTO public.colaboradores (projeto_id, nome, cpf, inscricao, data_admissao, cargo_funcao_id, status) VALUES (v_proj, 'Carla Mendes Rocha',    '23100299900', '900003', CURRENT_DATE - 40, fn_sold, true) RETURNING id INTO col_car;
  INSERT INTO public.colaboradores (projeto_id, nome, cpf, inscricao, data_admissao, cargo_funcao_id, status) VALUES (v_proj, 'Diego Alves Pereira',   '15350946056', '900004', CURRENT_DATE - 38, fn_sold, true) RETURNING id INTO col_dig;
  INSERT INTO public.colaboradores (projeto_id, nome, cpf, inscricao, data_admissao, cargo_funcao_id, status) VALUES (v_proj, 'Fernanda Lima Duarte',  '11144477735', '900005', CURRENT_DATE - 36, fn_elet, true) RETURNING id INTO col_fer;
  INSERT INTO public.colaboradores (projeto_id, nome, cpf, inscricao, data_admissao, cargo_funcao_id, status) VALUES (v_proj, 'Gustavo Ribeiro Nunes', '22255588846', '900006', CURRENT_DATE - 34, fn_elet, true) RETURNING id INTO col_gus;
  INSERT INTO public.colaboradores (projeto_id, nome, cpf, inscricao, data_admissao, cargo_funcao_id, status) VALUES (v_proj, 'Helena Souza Martins',  '33366699957', '900007', CURRENT_DATE - 30, fn_alm,  true) RETURNING id INTO col_hel;
  INSERT INTO public.colaboradores (projeto_id, nome, cpf, inscricao, data_admissao, cargo_funcao_id, status) VALUES (v_proj, 'Igor Pinto Cardoso',    '44477711168', '900008', CURRENT_DATE - 41, fn_op,   true) RETURNING id INTO col_igo;
  INSERT INTO public.colaboradores (projeto_id, nome, cpf, inscricao, data_admissao, cargo_funcao_id, status) VALUES (v_proj, 'Juliana Torres Melo',   '55588822279', '900009', CURRENT_DATE - 39, fn_elet, true) RETURNING id INTO col_jul;
  INSERT INTO public.colaboradores (projeto_id, nome, cpf, inscricao, data_admissao, cargo_funcao_id, status) VALUES (v_proj, 'Marcos Vieira Lopes',   '66699933380', '900010', CURRENT_DATE - 5,  fn_op,   true) RETURNING id INTO col_mar;

  -- Histórico de cargos (triggers desabilitados)
  INSERT INTO public.historico_cargos (projeto_id, colaborador_id, cargo_funcao_id_anterior, cargo_funcao_id_novo, motivo, data_alteracao)
  VALUES
    (v_proj, col_ana, NULL, fn_op,   'LANÇAMENTO INICIAL', (CURRENT_DATE - 44)::timestamptz),
    (v_proj, col_bru, NULL, fn_op,   'LANÇAMENTO INICIAL', (CURRENT_DATE - 42)::timestamptz),
    (v_proj, col_car, NULL, fn_sold, 'LANÇAMENTO INICIAL', (CURRENT_DATE - 40)::timestamptz),
    (v_proj, col_dig, NULL, fn_sold, 'LANÇAMENTO INICIAL', (CURRENT_DATE - 38)::timestamptz),
    (v_proj, col_fer, NULL, fn_elet, 'LANÇAMENTO INICIAL', (CURRENT_DATE - 36)::timestamptz),
    (v_proj, col_gus, NULL, fn_elet, 'LANÇAMENTO INICIAL', (CURRENT_DATE - 34)::timestamptz),
    (v_proj, col_hel, NULL, fn_alm,  'LANÇAMENTO INICIAL', (CURRENT_DATE - 30)::timestamptz),
    (v_proj, col_igo, NULL, fn_op,   'LANÇAMENTO INICIAL', (CURRENT_DATE - 41)::timestamptz),
    (v_proj, col_jul, NULL, fn_elet, 'LANÇAMENTO INICIAL', (CURRENT_DATE - 39)::timestamptz),
    (v_proj, col_mar, NULL, fn_op,   'LANÇAMENTO INICIAL', (CURRENT_DATE - 5)::timestamptz);

  -- Controle EPI base (triggers desabilitados)
  INSERT INTO public.controle_epi (projeto_id, colaborador_id, epi_catalogo_id, motivo_acao, status)
  SELECT v_proj, c.id, unnest(cf.epi_catalogo_ids), 'LANÇAMENTO INICIAL', true
  FROM public.colaboradores c
  JOIN public.cargo_funcoes cf ON cf.id = c.cargo_funcao_id
  WHERE c.projeto_id = v_proj AND c.inscricao LIKE '900%'
  ON CONFLICT (colaborador_id, epi_catalogo_id) DO NOTHING;

  SELECT id INTO col_ana FROM public.colaboradores WHERE projeto_id = v_proj AND inscricao = '900001';
  SELECT id INTO col_bru FROM public.colaboradores WHERE projeto_id = v_proj AND inscricao = '900002';
  SELECT id INTO col_car FROM public.colaboradores WHERE projeto_id = v_proj AND inscricao = '900003';
  SELECT id INTO col_dig FROM public.colaboradores WHERE projeto_id = v_proj AND inscricao = '900004';
  SELECT id INTO col_fer FROM public.colaboradores WHERE projeto_id = v_proj AND inscricao = '900005';
  SELECT id INTO col_gus FROM public.colaboradores WHERE projeto_id = v_proj AND inscricao = '900006';
  SELECT id INTO col_hel FROM public.colaboradores WHERE projeto_id = v_proj AND inscricao = '900007';
  SELECT id INTO col_igo FROM public.colaboradores WHERE projeto_id = v_proj AND inscricao = '900008';
  SELECT id INTO col_jul FROM public.colaboradores WHERE projeto_id = v_proj AND inscricao = '900009';
  SELECT id INTO col_mar FROM public.colaboradores WHERE projeto_id = v_proj AND inscricao = '900010';

  -- Fornecimentos iniciais por colaborador
  PERFORM pg_temp.demo_fornecer(v_proj, col_ana, ARRAY[e_cap, e_ocu, e_luv, e_cal, e_aur], ARRAY[c_cap, c_ocu, c_luv, c_cal, c_aur], ARRAY['31469','11223','44556','77889','33445'], CURRENT_DATE - 43);
  PERFORM pg_temp.demo_fornecer(v_proj, col_bru, ARRAY[e_cap, e_ocu, e_luv, e_cal, e_aur], ARRAY[c_cap, c_ocu, c_luv, c_cal, c_aur], ARRAY['31470','11224','44557','77890','33446'], CURRENT_DATE - 41);
  PERFORM pg_temp.demo_fornecer(v_proj, col_car, ARRAY[e_cap, e_msc, e_luv, e_avt, e_cal], ARRAY[c_cap, c_msc, c_luv, c_avt, c_cal], ARRAY['31471','55667','44558','88990','77891'], CURRENT_DATE - 39);
  PERFORM pg_temp.demo_fornecer(v_proj, col_dig, ARRAY[e_cap, e_msc, e_luv, e_avt, e_cal], ARRAY[c_cap, c_msc, c_luv, c_avt, c_cal], ARRAY['31472','55668','44559','88991','77892'], CURRENT_DATE - 37);
  PERFORM pg_temp.demo_fornecer(v_proj, col_fer, ARRAY[e_cap, e_ocu, e_iso, e_cal], ARRAY[c_cap, c_ocu, c_iso, c_cal], ARRAY['31473','11225','66778','77893'], CURRENT_DATE - 35);
  PERFORM pg_temp.demo_fornecer(v_proj, col_gus, ARRAY[e_cap, e_ocu, e_iso, e_cal], ARRAY[c_cap, c_ocu, c_iso, c_cal], ARRAY['31474','11226','66779','77894'], CURRENT_DATE - 33);
  PERFORM pg_temp.demo_fornecer(v_proj, col_hel, ARRAY[e_cal, e_col, e_luv], ARRAY[c_cal, c_col, c_luv], ARRAY['77895','99001','44560'], CURRENT_DATE - 29);
  PERFORM pg_temp.demo_fornecer(v_proj, col_igo, ARRAY[e_cap, e_ocu, e_luv, e_cal, e_aur], ARRAY[c_cap, c_ocu, c_luv, c_cal, c_aur], ARRAY['31475','11227','44561','77896','33447'], CURRENT_DATE - 40);
  PERFORM pg_temp.demo_fornecer(v_proj, col_jul, ARRAY[e_cap, e_ocu, e_iso, e_cal], ARRAY[c_cap, c_ocu, c_iso, c_cal], ARRAY['31476','11228','66780','77897'], CURRENT_DATE - 38);
  PERFORM pg_temp.demo_fornecer(v_proj, col_mar, ARRAY[e_cap, e_ocu, e_luv, e_cal, e_aur], ARRAY[c_cap, c_ocu, c_luv, c_cal, c_aur], ARRAY['31477','11229','44562','77898','33448'], CURRENT_DATE - 4);

  -- Movimentações extras
  PERFORM pg_temp.demo_evento(v_proj, col_ana, e_luv, c_luv, '44580', CURRENT_DATE - 35, 'TROCA PERIODICA');
  PERFORM pg_temp.demo_evento(v_proj, col_car, e_luv, c_luv, '44581', CURRENT_DATE - 10, 'TROCA PREMATURA');
  PERFORM pg_temp.demo_evento(v_proj, col_bru, e_cap, c_cap, '31490', CURRENT_DATE - 3,  'EMERGENCIAL');
  PERFORM pg_temp.demo_evento(v_proj, col_dig, e_msc, c_msc, '55690', CURRENT_DATE - 7,  'PERCA OU EXTRAVIO');

  -- Alteração de EPIs na função Operador (+ cinta) dia 28
  v_d := CURRENT_DATE - 28;
  UPDATE public.cargo_funcoes SET epi_catalogo_ids = ARRAY[c_cap, c_ocu, c_luv, c_cal, c_aur, c_cin], updated_at = now() WHERE id = fn_op;
  INSERT INTO public.historico_alteracao_em_cargo_funcoes (cargo_funcao_id, epi_catalogo_epis, data_alteracao)
  VALUES (fn_op, ARRAY[c_cap, c_ocu, c_luv, c_cal, c_aur, c_cin], v_d::timestamptz);
  PERFORM pg_temp.demo_evento(v_proj, col_ana, e_cin, c_cin, '12340', v_d, 'ADIÇÃO PARA FUNÇÃO');
  PERFORM pg_temp.demo_evento(v_proj, col_bru, e_cin, c_cin, '12341', v_d, 'ADIÇÃO PARA FUNÇÃO');

  -- Troca de função Juliana (Eletricista -> Operador) dia 15
  v_d := CURRENT_DATE - 15;
  UPDATE public.colaboradores SET cargo_funcao_id = fn_op, updated_at = now() WHERE id = col_jul;
  INSERT INTO public.historico_cargos (projeto_id, colaborador_id, cargo_funcao_id_anterior, cargo_funcao_id_novo, motivo, data_alteracao)
  VALUES (v_proj, col_jul, fn_elet, fn_op, 'TROCA DE FUNÇÃO — realocação produção [DEMO]', v_d::timestamptz);
  INSERT INTO public.controle_epi (projeto_id, colaborador_id, epi_catalogo_id, motivo_acao, status)
  VALUES (v_proj, col_jul, c_aur, 'TROCA DE FUNÇÃO', true)
  ON CONFLICT (colaborador_id, epi_catalogo_id) DO UPDATE SET status = true, motivo_acao = 'TROCA DE FUNÇÃO';
  PERFORM pg_temp.demo_evento(v_proj, col_jul, e_aur, c_aur, '33460', v_d, 'TROCA DE FUNÇÃO');

  -- Troca de função Igor (Operador -> Soldador) dia 20
  v_d := CURRENT_DATE - 20;
  UPDATE public.colaboradores SET cargo_funcao_id = fn_sold, updated_at = now() WHERE id = col_igo;
  INSERT INTO public.historico_cargos (projeto_id, colaborador_id, cargo_funcao_id_anterior, cargo_funcao_id_novo, motivo, data_alteracao)
  VALUES (v_proj, col_igo, fn_op, fn_sold, 'TROCA DE FUNÇÃO — promoção soldador [DEMO]', v_d::timestamptz);
  INSERT INTO public.controle_epi (projeto_id, colaborador_id, epi_catalogo_id, motivo_acao, status)
  VALUES
    (v_proj, col_igo, c_msc, 'TROCA DE FUNÇÃO', true),
    (v_proj, col_igo, c_avt, 'TROCA DE FUNÇÃO', true)
  ON CONFLICT (colaborador_id, epi_catalogo_id) DO UPDATE SET status = true, motivo_acao = 'TROCA DE FUNÇÃO';
  PERFORM pg_temp.demo_evento(v_proj, col_igo, e_msc, c_msc, '55680', v_d, 'TROCA DE FUNÇÃO');
  PERFORM pg_temp.demo_evento(v_proj, col_igo, e_avt, c_avt, '88995', v_d, 'TROCA DE FUNÇÃO');
  UPDATE public.controle_epi SET status = false, observacao = '[DEMO] inativo pós troca função'
  WHERE colaborador_id = col_igo AND epi_catalogo_id IN (c_ocu, c_aur);

  ALTER TABLE public.epis ENABLE TRIGGER USER;
  ALTER TABLE public.colaboradores ENABLE TRIGGER USER;

  RAISE NOTICE 'Seed DEMO concluído — projeto %', v_proj;
EXCEPTION WHEN OTHERS THEN
  ALTER TABLE public.epis ENABLE TRIGGER USER;
  ALTER TABLE public.colaboradores ENABLE TRIGGER USER;
  RAISE;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.demo_fornecer(
  p_proj uuid, p_col uuid,
  p_epi_ids uuid[], p_cat_ids uuid[], p_cas text[], p_data date
) RETURNS void LANGUAGE plpgsql AS $$
DECLARE i int;
BEGIN
  FOR i IN 1..array_length(p_epi_ids, 1) LOOP
    PERFORM pg_temp.demo_evento(p_proj, p_col, p_epi_ids[i], p_cat_ids[i], p_cas[i], p_data, 'LANÇAMENTO INICIAL');
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.demo_evento(
  p_proj uuid, p_col uuid, p_epi uuid, p_cat uuid,
  p_ca text, p_data date, p_motivo text
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.controle_epi SET
    epi_id = p_epi, ca_numero = p_ca, data_fornecimento = p_data,
    quantidade = 1, motivo_acao = p_motivo, status = true, observacao = '[DEMO]'
  WHERE colaborador_id = p_col AND epi_catalogo_id = p_cat;

  IF NOT FOUND THEN
    INSERT INTO public.controle_epi (projeto_id, colaborador_id, epi_catalogo_id, epi_id, ca_numero, data_fornecimento, quantidade, motivo_acao, status, observacao)
    VALUES (p_proj, p_col, p_cat, p_epi, p_ca, p_data, 1, p_motivo, true, '[DEMO]');
  END IF;

  INSERT INTO public.historico_controle_epi (projeto_id, colaborador_id, epi_id, epi_catalogo_id, ca_numero, data_fornecimento, motivo_acao, quantidade, observacao)
  VALUES (p_proj, p_col, p_epi, p_cat, p_ca, p_data, p_motivo, 1, '[DEMO]');
END;
$$;

SELECT pg_temp.seed_demo_warley();

DROP FUNCTION pg_temp.seed_demo_warley();
DROP FUNCTION pg_temp.demo_fornecer(uuid, uuid, uuid[], uuid[], text[], date);
DROP FUNCTION pg_temp.demo_evento(uuid, uuid, uuid, uuid, text, date, text);
