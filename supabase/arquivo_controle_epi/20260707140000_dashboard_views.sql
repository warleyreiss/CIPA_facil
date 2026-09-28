-- View agregada para custo de fornecimentos (dashboard financeiro)
-- Facilita consultas futuras sem múltiplos joins no client

CREATE OR REPLACE VIEW public.v_dashboard_custo_fornecimento AS
SELECT
  h.projeto_id,
  h.id AS historico_id,
  h.colaborador_id,
  h.data_fornecimento,
  h.motivo_acao,
  COALESCE(h.quantidade, 1) AS quantidade,
  COALESCE(e.valor_unitario_atual, 0)::numeric(12,2) AS valor_unitario,
  (COALESCE(h.quantidade, 1) * COALESCE(e.valor_unitario_atual, 0))::numeric(14,2) AS custo_total,
  ec.descricao AS epi_nome,
  COALESCE(g.descricao, 'Não definido') AS ghe_nome
FROM public.historico_controle_epi h
LEFT JOIN public.epis e ON e.id = h.epi_id
LEFT JOIN public.epi_catalogo ec ON ec.id = h.epi_catalogo_id
LEFT JOIN public.colaboradores c ON c.id = h.colaborador_id
LEFT JOIN public.cargo_funcoes cf ON cf.id = c.cargo_funcao_id
LEFT JOIN public.ghe g ON g.id = cf.ghe_id;

COMMENT ON VIEW public.v_dashboard_custo_fornecimento IS
  'Custo estimado de fornecimentos por registro histórico (quantidade × valor unitário atual do EPI).';

GRANT SELECT ON public.v_dashboard_custo_fornecimento TO anon;
GRANT SELECT ON public.v_dashboard_custo_fornecimento TO authenticated;
GRANT SELECT ON public.v_dashboard_custo_fornecimento TO service_role;

-- Resumo de conformidade por projeto (status prazo)
CREATE OR REPLACE VIEW public.v_dashboard_conformidade_resumo AS
SELECT
  projeto_id,
  status_prazo,
  COUNT(*)::bigint AS total
FROM public.v_controle_epi
GROUP BY projeto_id, status_prazo;

COMMENT ON VIEW public.v_dashboard_conformidade_resumo IS
  'Contagem de registros de controle EPI agrupados por status de prazo.';

GRANT SELECT ON public.v_dashboard_conformidade_resumo TO anon;
GRANT SELECT ON public.v_dashboard_conformidade_resumo TO authenticated;
GRANT SELECT ON public.v_dashboard_conformidade_resumo TO service_role;
