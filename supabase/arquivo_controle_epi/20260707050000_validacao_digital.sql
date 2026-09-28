-- Validação digital de fornecimento (plano GESTOR): configuração por projeto e registro nas entregas

ALTER TABLE public.projetos
  ADD COLUMN IF NOT EXISTS validacao_digital boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.projetos.validacao_digital IS
  'Quando true (plano GESTOR), exige assinatura digital (RFID ou biometria) no fornecimento de EPI.';

ALTER TABLE public.controle_epi
  ADD COLUMN IF NOT EXISTS metodo text,
  ADD COLUMN IF NOT EXISTS validacao_digital boolean NOT NULL DEFAULT false;

ALTER TABLE public.historico_controle_epi
  ADD COLUMN IF NOT EXISTS metodo text,
  ADD COLUMN IF NOT EXISTS validacao_digital boolean NOT NULL DEFAULT false;

ALTER TABLE public.controle_epi
  DROP CONSTRAINT IF EXISTS controle_epi_metodo_check;

ALTER TABLE public.controle_epi
  ADD CONSTRAINT controle_epi_metodo_check
  CHECK (metodo IS NULL OR metodo IN ('RFID', 'BIOMETRIA'));

ALTER TABLE public.historico_controle_epi
  DROP CONSTRAINT IF EXISTS historico_controle_epi_metodo_check;

ALTER TABLE public.historico_controle_epi
  ADD CONSTRAINT historico_controle_epi_metodo_check
  CHECK (metodo IS NULL OR metodo IN ('RFID', 'BIOMETRIA'));

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
    s.descricao AS setor_nome,
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
     LEFT JOIN public.setores s ON ((cf.setor_id = s.id)))
     JOIN public.epi_catalogo ec ON ((ce.epi_catalogo_id = ec.id)))
     LEFT JOIN public.epis e ON ((ce.epi_id = e.id));
