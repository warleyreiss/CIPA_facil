-- Janela configurável de iminência de troca de EPI (padrão: 3 dias).
-- Usada por v_controle_epi para status_prazo = IMINENTE.

ALTER TABLE public.projetos
  ADD COLUMN IF NOT EXISTS dias_iminencia_troca integer NOT NULL DEFAULT 3;

ALTER TABLE public.projetos
  DROP CONSTRAINT IF EXISTS projetos_dias_iminencia_troca_check;

ALTER TABLE public.projetos
  ADD CONSTRAINT projetos_dias_iminencia_troca_check
  CHECK (dias_iminencia_troca >= 1 AND dias_iminencia_troca <= 90);

COMMENT ON COLUMN public.projetos.dias_iminencia_troca IS
  'Dias restantes (inclusivos) para classificar o controle EPI como IMINENTE. Padrão 3.';

DROP VIEW IF EXISTS public.v_vencimentos_notificacao;
DROP VIEW IF EXISTS public.v_dashboard_conformidade_resumo;
DROP VIEW IF EXISTS public.v_controle_epi;

CREATE VIEW public.v_controle_epi AS
 SELECT ce.id AS controle_id,
    ce.projeto_id,
    ce.epi_id,
    ce.data_fornecimento,
    ce.quantidade,
    ce.ca_numero,
    ce.motivo_acao,
    ce.observacao,
    ce.epi_catalogo_id,
    c.id AS colaborador_id,
    c.nome AS colaborador_nome,
    c.inscricao AS colaborador_matricula,
    c.data_admissao AS colaborador_data_admissao,
    cf.nomenclatura AS cargo_funcao_nome,
    g.descricao AS ghe_nome,
    ec.descricao AS epi_nome,
    ec.classificacao AS epi_classificacao,
    ct.descricao AS tamanho_desc,
    e.prazo_troca_dias,
    COALESCE(p.dias_iminencia_troca, 3) AS dias_iminencia_troca,
        CASE
            WHEN (ce.epi_id IS NULL) THEN NULL::date
            ELSE ((ce.data_fornecimento + ((COALESCE(e.prazo_troca_dias, 90) || ' days'::text))::interval))::date
        END AS prazo_previsto,
        CASE
            WHEN (ce.epi_id IS NULL) THEN NULL::integer
            ELSE (
              ((ce.data_fornecimento + ((COALESCE(e.prazo_troca_dias, 90) || ' days'::text))::interval))::date
              - (timezone('America/Sao_Paulo', now()))::date
            )
        END AS prazo_restante_dias,
        CASE
            WHEN (ce.epi_id IS NULL) THEN 'PENDENTE'::text
            WHEN (
              ((ce.data_fornecimento + ((COALESCE(e.prazo_troca_dias, 90) || ' days'::text))::interval))::date
              - (timezone('America/Sao_Paulo', now()))::date
            ) < 0 THEN 'VENCIDO'::text
            WHEN (
              ((ce.data_fornecimento + ((COALESCE(e.prazo_troca_dias, 90) || ' days'::text))::interval))::date
              - (timezone('America/Sao_Paulo', now()))::date
            ) <= COALESCE(p.dias_iminencia_troca, 3) THEN 'IMINENTE'::text
            ELSE 'NO PRAZO'::text
        END AS status_prazo,
    ce.metodo,
    ce.validacao_digital,
    (
      SELECT h.id
      FROM public.historico_controle_epi h
      WHERE h.colaborador_id = ce.colaborador_id
        AND h.epi_catalogo_id = ce.epi_catalogo_id
      ORDER BY h.data_fornecimento DESC NULLS LAST, h.id DESC
      LIMIT 1
    ) AS ultimo_historico_id
   FROM public.controle_epi ce
     JOIN public.projetos p ON p.id = ce.projeto_id
     JOIN public.colaboradores c ON ce.colaborador_id = c.id AND c.status = true
     LEFT JOIN public.cargo_funcoes cf ON c.cargo_funcao_id = cf.id
     LEFT JOIN public.ghe g ON cf.ghe_id = g.id
     JOIN public.epi_catalogo ec ON ce.epi_catalogo_id = ec.id
     LEFT JOIN public.epis e ON ce.epi_id = e.id
     LEFT JOIN public.catalogo_tamanhos ct ON e.catalogo_tamanho_id = ct.id
  WHERE ce.status IS DISTINCT FROM false;

GRANT SELECT ON TABLE public.v_controle_epi TO authenticated, service_role;

CREATE VIEW public.v_dashboard_conformidade_resumo AS
SELECT
  projeto_id,
  status_prazo,
  COUNT(*)::bigint AS total
FROM public.v_controle_epi
GROUP BY projeto_id, status_prazo;

GRANT SELECT ON public.v_dashboard_conformidade_resumo TO authenticated, service_role;

CREATE VIEW public.v_vencimentos_notificacao AS
SELECT
  v.projeto_id,
  p.nome AS projeto_nome,
  p.notificar_vencimentos_email,
  p.notificar_vencimentos_whatsapp,
  p.telefone_whatsapp_notificacao,
  p.dias_iminencia_troca,
  v.colaborador_id,
  v.colaborador_nome,
  v.epi_nome,
  v.tamanho_desc,
  v.status_prazo,
  v.prazo_previsto,
  v.prazo_restante_dias
FROM public.v_controle_epi v
JOIN public.projetos p ON p.id = v.projeto_id
WHERE v.status_prazo IN ('VENCIDO', 'IMINENTE')
  AND p.status IS DISTINCT FROM false;

GRANT SELECT ON public.v_vencimentos_notificacao TO service_role;
