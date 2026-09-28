-- =============================================================================
-- Patch: orientação de suporte — histórico de fornecimento
-- Execute no Supabase SQL Editor (não apaga outras orientações)
-- =============================================================================

DELETE FROM public.suporte_orientacoes
WHERE titulo = 'Como consultar o histórico de fornecimento de EPI?';

INSERT INTO public.suporte_orientacoes (titulo, descricao, link_materiais, link_video)
VALUES (
  'Como consultar o histórico de fornecimento de EPI?',
  $$No painel Controle EPI, clique em Histórico (cabeçalho da tabela) ou acesse Controle EPI → Histórico.

Antes de exibir os registros, defina os critérios da consulta:

• Período — intervalo de datas (inicia com o 1º e o último dia do mês corrente).
• Colaboradores — deixe vazio para incluir todos.
• Equipamentos (catálogo) — deixe vazio para incluir todos.
• Motivo / ação — ex.: lançamento inicial, troca periódica, emergencial; vazio = todos.

Clique em Gerar histórico. A tabela mostra entregas já registradas no período, com colaborador, EPI, CA, quantidade e observação.

Na tela de resultados você pode:
• Filtrar por motivo ou buscar texto na tabela.
• Exportar CSV (ícone de planilha).
• Gerar comprovante PDF por linha (mesmo recibo do registro de entrega).
• Nova consulta — volta aos critérios sem sair da página.

O histórico reflete cada fornecimento salvo no sistema; exclusões feitas com rollback removem o registro correspondente.$$,
  '/controleEPI/historico',
  NULL
);
