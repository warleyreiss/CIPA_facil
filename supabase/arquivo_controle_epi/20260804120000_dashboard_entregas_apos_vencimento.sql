-- Entregas cujo data_fornecimento é estritamente posterior ao prazo previsto
-- da entrega anterior (mesmo colaborador + tipo de EPI).
-- Usado pelo dashboard para quantificar renovação tardia / após vencimento.

CREATE OR REPLACE VIEW public.v_dashboard_entregas_apos_vencimento AS
WITH ordenado AS (
  SELECT
    h.id,
    h.projeto_id,
    h.colaborador_id,
    h.epi_catalogo_id,
    h.epi_id,
    h.data_fornecimento,
    h.motivo_acao,
    COALESCE(h.quantidade, 1) AS quantidade,
    LAG(h.data_fornecimento) OVER w AS data_fornecimento_ant,
    LAG(h.epi_id) OVER w AS epi_id_ant
  FROM public.historico_controle_epi h
  WINDOW w AS (
    PARTITION BY h.colaborador_id, h.epi_catalogo_id
    ORDER BY h.data_fornecimento NULLS LAST, h.id
  )
)
SELECT
  o.id AS historico_id,
  o.projeto_id,
  o.colaborador_id,
  o.epi_catalogo_id,
  o.epi_id,
  o.data_fornecimento,
  o.motivo_acao,
  o.quantidade,
  o.data_fornecimento_ant,
  (
    o.data_fornecimento_ant
    + ((COALESCE(e.prazo_troca_dias, 90) || ' days'::text))::interval
  )::date AS prazo_previsto_anterior,
  (
    o.data_fornecimento
    - (
      o.data_fornecimento_ant
      + ((COALESCE(e.prazo_troca_dias, 90) || ' days'::text))::interval
    )::date
  ) AS dias_apos_vencimento
FROM ordenado o
JOIN public.projetos p ON p.id = o.projeto_id
LEFT JOIN public.epis e ON e.id = o.epi_id_ant
WHERE COALESCE(p.periodicidade_troca, true) IS TRUE
  AND o.data_fornecimento_ant IS NOT NULL
  AND o.epi_id_ant IS NOT NULL
  AND o.data_fornecimento > (
    o.data_fornecimento_ant
    + ((COALESCE(e.prazo_troca_dias, 90) || ' days'::text))::interval
  )::date;

COMMENT ON VIEW public.v_dashboard_entregas_apos_vencimento IS
  'Fornecimentos realizados após o prazo previsto da entrega anterior (colaborador + epi_catalogo). Exige periodicidade_troca ativa.';

GRANT SELECT ON public.v_dashboard_entregas_apos_vencimento TO authenticated, service_role;
