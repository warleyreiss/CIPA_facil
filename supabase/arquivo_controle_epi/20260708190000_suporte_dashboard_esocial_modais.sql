-- Suporte: Dashboard analítica, eSocial S-2240, central de alertas e modais críticos

-- Remove artigo obsoleto (Dashboard "vazia")
DELETE FROM public.suporte_orientacoes
WHERE titulo = 'Por que a Dashboard está vazia?';

-- ─── Dashboard ───────────────────────────────────────────────────────────────

DELETE FROM public.suporte_orientacoes
WHERE titulo IN (
  'Como usar a Dashboard analítica?',
  'O que significam os Índices ControleEPI?',
  'Como exportar dados da Dashboard (CSV)?',
  'Por que meus indicadores estão zerados?',
  'O que são os alertas do sino (Central de alertas)?'
);

INSERT INTO public.suporte_orientacoes (titulo, descricao, link_materiais, link_video) VALUES
(
  'Como usar a Dashboard analítica?',
  E'A Dashboard consolida indicadores do projeto ativo em três abas:\n\n'
  || E'• Gestão básica — volume de entregas, status de prazo, conformidade por GHE, Índices ControleEPI e gráficos de distribuição.\n'
  || E'• Gestão avançada — desvios (trocas prematuras, extravios), score por GHE, previsão de ruptura, insights automáticos e curva de demanda.\n'
  || E'• Economia & Finanças — gastos em compras, custo por GHE, variação de preços, oportunidades de economia e curva ABC.\n\n'
  || E'No topo, selecione o Período de análise (intervalo de datas) e clique em Atualizar. A maioria dos blocos usa entregas e compras dentro desse intervalo; o gráfico de status de prazo reflete o snapshot atual do Controle EPI (não filtrado por período).\n\n'
  || E'Passe o mouse no ícone de informação (ℹ) em cada bloco para ver a metodologia de cálculo. Use o ícone de download para exportar CSV daquele bloco.\n\n'
  || E'Dica: se o projeto é novo, cadastre equipamentos, funções, colaboradores e registre fornecimentos antes de esperar gráficos preenchidos.',
  '/dashboard',
  NULL
),
(
  'O que significam os Índices ControleEPI?',
  E'Os índices executivos aparecem no banner da aba Gestão básica:\n\n'
  || E'• Índice de Risco SST (0–100) — quanto maior, pior. Pondera fornecimentos vencidos, pendências, não conformidade, desperdício nas entregas e estoque crítico. Acima de 70: atenção imediata; acima de 40: monitorar.\n'
  || E'• Índice de Maturidade da gestão (0–100) — combina conformidade, disciplina de troca, eficiência financeira e gestão de estoque. Quanto maior, mais madura a operação.\n'
  || E'• Custo por colaborador ativo — custo estimado de fornecimentos no período dividido pelo número de colaboradores ativos.\n\n'
  || E'O radar de maturidade cruza cinco eixos: conformidade, disciplina de troca, maturidade, eficiência financeira e gestão de estoque. O mapa de risco por GHE classifica cada grupo (excelente, bom, atenção, crítico) com base no score ControleEPI de eficiência.\n\n'
  || E'Os valores dependem do período selecionado e da qualidade dos cadastros (prazos de troca, estoque mínimo, motivos de fornecimento).',
  '/dashboard',
  NULL
),
(
  'Como exportar dados da Dashboard (CSV)?',
  E'Cada bloco da Dashboard com dados numéricos oferece exportação CSV no canto superior direito (ícone de download).\n\n'
  || E'O arquivo traz as mesmas métricas exibidas na tela — por exemplo, Índices ControleEPI, ranking de GHEs, top EPIs fornecidos ou lista de insights. O nome do arquivo segue o bloco (ex.: dashboard-indices-cepi).\n\n'
  || E'Se o botão avisar "Sem dados", amplie o período ou registre movimentações no Controle EPI e entradas de estoque antes de exportar.\n\n'
  || E'A exportação é para análise interna e auditoria; não substitui relatórios legais do eSocial ou fichas de entrega.',
  '/dashboard',
  NULL
),
(
  'Por que meus indicadores estão zerados?',
  E'Indicadores vazios ou zerados costumam ter estas causas:\n\n'
  || E'• Período sem movimentação — nenhum fornecimento ou compra registrado nas datas selecionadas. Amplie o intervalo ou registre entregas no Controle EPI.\n'
  || E'• Projeto recém-criado — cadastre equipamentos, funções com EPIs, colaboradores e ao menos um fornecimento.\n'
  || E'• Controle de estoque desligado — tags e blocos de estoque crítico dependem da configuração em Configurar Projeto → Dados do Projeto.\n'
  || E'• Periodicidade de troca desligada — status Vencido/Iminente/No prazo exigem prazo em dias nos EPIs.\n'
  || E'• Colaboradores inativos — contagens usam colaboradores ativos vinculados a funções.\n\n'
  || E'O gráfico de status (rosca) mostra o estado atual do Controle EPI, independente do período. Se ele também estiver vazio, ainda não há matriz de EPI montada para os colaboradores.',
  '/dashboard',
  NULL
),
(
  'O que são os alertas do sino (Central de alertas)?',
  E'O ícone de sino no cabeçalho abre a Central de alertas do projeto ativo. Ela monitora três situações:\n\n'
  || E'• Estoque abaixo do mínimo — EPI com saldo menor que o estoque mínimo configurado. Clique no alerta para abrir Equipamentos com sugestão de entrada.\n'
  || E'• Fornecimento vencido — colaborador com EPI além do prazo de troca. Clique para ir ao Controle EPI com filtro Vencido e abrir o registro.\n'
  || E'• Fornecimento pendente — EPI obrigatório ainda não entregue. Clique para registrar a entrega no Controle EPI.\n\n'
  || E'A lista atualiza automaticamente a cada dois minutos e ao abrir o painel. O botão X dispensa o alerta apenas na sua sessão/navegador — a condição continua até ser resolvida (reposição, nova entrega etc.).\n\n'
  || E'Alertas dispensados voltam se o problema persistir com novo identificador. Status Iminente (próximo da troca) aparece no Controle EPI, mas ainda não gera alerta no sino.',
  NULL,
  NULL
);

-- ─── eSocial (expandir + novos) ────────────────────────────────────────────

DELETE FROM public.suporte_orientacoes
WHERE titulo IN (
  'Como exportar o gabarito S-2240 para o eSocial?',
  'CPF pendente no gabarito S-2240',
  'Por que a lista S-2240 está vazia?',
  'Admissão vs Alteração no S-2240',
  'Checklist pré-preenchido — o que revisar antes de transmitir?'
);

INSERT INTO public.suporte_orientacoes (titulo, descricao, link_materiais, link_video) VALUES
(
  'Como exportar o gabarito S-2240 para o eSocial?',
  E'O eSocial exige o evento S-2240 na admissão ou quando há alteração relevante de EPI, função ou CA. O ControleEPI gera um gabarito para importação — não transmite diretamente ao portal gov.br.\n\n'
  || E'Passo a passo:\n'
  || E'1. Menu eSocial → selecione o período de movimentação e clique em Atualizar.\n'
  || E'2. Revise a tabela (dtIniCond, CPF, função, GHE, tipo de evento, CAs).\n'
  || E'3. Baixe Excel gabarito (planilha formatada) ou CSV lote (integradores).\n'
  || E'4. Importe no sistema de folha (Alterdata, Domínio, Prosoft etc.) ou use como guia no portal eSocial.\n\n'
  || E'O arquivo pode conter vários trabalhadores; o eSocial processa por CPF e gera recibo individual. Cadastre CPF válido em Colaboradores antes da transmissão oficial. O histórico de exportações na própria tela registra data, período e formato para auditoria interna.',
  'https://www.gov.br/esocial/pt-br',
  NULL
),
(
  'CPF pendente no gabarito S-2240',
  E'Linhas com CPF inválido ou ausente aparecem destacadas na tabela e no contador de alerta amarelo.\n\n'
  || E'Como corrigir:\n'
  || E'1. Vá em Colaboradores → edite o funcionário da linha.\n'
  || E'2. Preencha o CPF com 11 dígitos (somente números ou formatado).\n'
  || E'3. Salve e volte ao eSocial → Atualizar.\n\n'
  || E'O gabarito pode ser exportado mesmo com CPF pendente para conferência interna, mas o upload oficial no eSocial exige CPF válido por trabalhador. A matrícula/inscrição do colaborador também é exportada quando cadastrada.',
  '/colaboradores',
  NULL
),
(
  'Por que a lista S-2240 está vazia?',
  E'A mensagem "Nenhuma movimentação S-2240 no período" significa que não houve eventos elegíveis nas datas filtradas.\n\n'
  || E'O S-2240 lista apenas alterações relevantes, não a rotina diária sem mudança. Entram movimentações com motivos como:\n'
  || E'• Lançamento inicial (admissão de EPIs)\n'
  || E'• Troca de função\n'
  || E'• Adição de EPI para a função\n'
  || E'• Troca periódica, prematura, extravio ou emergencial (quando registradas no Controle EPI)\n\n'
  || E'Verifique: período correto, fornecimentos já salvos no Controle EPI, colaboradores ativos com função/GHE. Amplie o intervalo (ex.: últimos 90 dias) se as entregas foram feitas antes.',
  '/esocial',
  NULL
),
(
  'Admissão vs Alteração no S-2240',
  E'A coluna Tipo na tabela eSocial indica o tipo de evento S-2240:\n\n'
  || E'• Admissão — primeiro fornecimento do colaborador com motivo "Lançamento inicial". Representa a condição inicial de EPI na admissão ou primeiro registro no sistema.\n'
  || E'• Alteração — qualquer mudança posterior: troca de função, inclusão de EPI na função, troca de CA, troca periódica/prematura, extravio ou emergencial.\n\n'
  || E'A data dtIniCond é a data do fornecimento que originou o evento. Troca de função pelo cadastro de Colaboradores também pode gerar alterações quando a matriz de EPIs é reprocessada.',
  '/esocial',
  NULL
),
(
  'Checklist pré-preenchido — o que revisar antes de transmitir?',
  E'O Excel/CSV exporta campos de conformidade pré-preenchidos como SIM: EPI eficaz, higienização, periodicidade de troca, validade do CA e condições de funcionamento.\n\n'
  || E'Isso acelera a importação, mas a responsabilidade pela veracidade é da empresa. Antes de transmitir ao eSocial, confirme na prática:\n\n'
  || E'• O EPI entregue é adequado ao risco da função/GHE\n'
  || E'• O CA está válido e corresponde ao produto entregue\n'
  || E'• Há política de higienização e troca conforme NR-6\n'
  || E'• O colaborador foi treinado e o EPI está em condições de uso\n\n'
  || E'Se algum item não se aplicar, ajuste manualmente no sistema de folha antes do envio oficial.',
  'https://www.gov.br/esocial/pt-br',
  NULL
);

-- ─── Modais e confirmações ───────────────────────────────────────────────────

DELETE FROM public.suporte_orientacoes
WHERE titulo IN (
  'Como estornar um fornecimento de EPI?',
  'Lançamento retroativo — o que muda no sistema?',
  'CA vencido — posso confirmar mesmo assim?',
  'Como estornar uma entrada de estoque?',
  'Comunicados do sistema — o que significam?',
  'Alterei o cargo do colaborador — o que acontece?'
);

INSERT INTO public.suporte_orientacoes (titulo, descricao, link_materiais, link_video) VALUES
(
  'Como estornar um fornecimento de EPI?',
  E'O estorno remove um fornecimento registrado por engano e reverte seus efeitos no Controle EPI e no histórico.\n\n'
  || E'Onde estornar:\n'
  || E'• Controle EPI — menu de ações da linha → Estornar\n'
  || E'• Histórico de fornecimento — mesma ação na linha do registro\n\n'
  || E'O sistema pede um motivo (mínimo 3 caracteres) para auditoria. Após confirmar, o registro sai do histórico e a matriz do colaborador volta ao estado anterior quando aplicável.\n\n'
  || E'Use para lançamento duplicado, colaborador errado ou quantidade incorreta. Para corrigir data retroativa sem estornar, veja "Lançamento retroativo". Estorno não substitui devolução física do EPI — registre observação quando necessário.',
  '/controleEPI',
  NULL
),
(
  'Lançamento retroativo — o que muda no sistema?',
  E'Quando a data de fornecimento é anterior à situação atual do colaborador, o sistema pode salvar apenas no histórico de movimentações, sem alterar o Controle EPI ativo.\n\n'
  || E'Isso evita que um lançamento no passado sobrescreva prazos e status vigentes. O modal "Lançamento retroativo" explica o que foi feito em cada caso.\n\n'
  || E'O registro retroativo:\n'
  || E'• Aparece no Histórico de fornecimento e pode entrar no gabarito S-2240 se o período e o motivo forem elegíveis\n'
  || E'• Não muda status Vencido/Pendente/No prazo da matriz atual quando a regra de retroativo se aplica\n\n'
  || E'Para forçar atualização da matriz com data passada, avalie com o RH/SST se o estorno e um novo lançamento na data correta é mais adequado.',
  '/controleEPI',
  NULL
),
(
  'CA vencido — posso confirmar mesmo assim?',
  E'Ao registrar fornecimento, se o CA consultado estiver vencido ou inválido, o sistema exibe o modal "Aviso de Risco" antes de salvar.\n\n'
  || E'Confirmar mesmo assim:\n'
  || E'• Registra a entrega com observação de que o CA vencido foi validado pelo usuário\n'
  || E'• Pode gerar não conformidade legal — use apenas com justificativa documentada (ex.: CA em renovação, produto em estoque legado)\n\n'
  || E'Recomendação: prefira atualizar o CA para um certificado válido antes de entregar. Se o serviço de consulta falhar temporariamente, tente novamente antes de forçar a confirmação.\n\n'
  || E'Veja também "Erro ao validar CA" na Central de Ajuda.',
  '/controleEPI',
  NULL
),
(
  'Como estornar uma entrada de estoque?',
  E'Em Equipamentos → Entrada de estoque → Estornar, selecione a entrada registrada por NF e informe o motivo.\n\n'
  || E'O estorno:\n'
  || E'• Remove o registro da entrada\n'
  || E'• Subtrai a quantidade do saldo atual do EPI\n'
  || E'• Pode falhar se o saldo ficaria negativo (já houve saídas/consumo além do estornado)\n\n'
  || E'Use para NF duplicada, quantidade errada ou entrada no EPI/tamanho incorreto. Não confundir com estorno de fornecimento ao colaborador — esse está no Controle EPI.',
  '/equipamentos',
  NULL
),
(
  'Comunicados do sistema — o que significam?',
  E'Comunicados são avisos exibidos em modal ao entrar no sistema, gerenciados pela equipe ControleEPI.\n\n'
  || E'Tipos:\n'
  || E'• info — informativo, pode fechar clicando fora\n'
  || E'• aviso — atenção recomendada\n'
  || E'• manutencao — janela de manutenção programada (modal bloqueante até "Entendi")\n'
  || E'• critico — situação urgente (modal bloqueante)\n\n'
  || E'Ao clicar "Entendi", o sistema registra que você leu aquele comunicado e não exibe novamente. Se houver fila (+N avisos), os próximos aparecem em sequência.\n\n'
  || E'Comunicados não substituem alertas operacionais do sino (estoque, vencidos, pendências).',
  NULL,
  NULL
),
(
  'Alterei o cargo do colaborador — o que acontece?',
  E'Ao editar um colaborador e mudar a função, o sistema exibe confirmação porque a matriz de EPIs pode mudar.\n\n'
  || E'Após confirmar:\n'
  || E'• EPIs exclusivos da função anterior são inativados no Controle EPI\n'
  || E'• EPIs comuns entre as funções são mantidos\n'
  || E'• Novos obrigatórios da nova função entram como Pendentes\n'
  || E'• Histórico de cargos e Ficha de EPI são atualizados com o novo GHE\n\n'
  || E'Entregas já registradas permanecem no histórico. Revise pendências e vencidos após a mudança. A alteração pode gerar evento de Alteração no gabarito S-2240.',
  '/colaboradores',
  NULL
);

-- Atualiza primeiros passos (menciona Dashboard e eSocial)
DELETE FROM public.suporte_orientacoes
WHERE titulo = 'Por onde começo após criar minha conta?';

INSERT INTO public.suporte_orientacoes (titulo, descricao, link_materiais, link_video)
VALUES (
  'Por onde começo após criar minha conta?',
  E'Depois de confirmar seu e-mail e entrar no sistema, siga esta ordem recomendada:\n\n'
  || E'1. Equipamentos — cadastre os EPIs do seu catálogo (capacete, luva, etc.) com os tamanhos disponíveis.\n'
  || E'2. Funções — crie os cargos e vincule cada função a um GHE (Grupo Homogêneo de Exposição), definindo quais EPIs são exigidos.\n'
  || E'3. Colaboradores — cadastre os funcionários (com CPF para eSocial) e associe cada um a uma função.\n'
  || E'4. Controle EPI — registre as entregas de EPI aos colaboradores e acompanhe prazos de troca.\n'
  || E'5. Dashboard — acompanhe indicadores de conformidade, risco e custos após ter movimentações.\n'
  || E'6. eSocial — exporte o gabarito S-2240 quando houver admissões ou alterações de EPI no período.\n\n'
  || E'No plano Iniciante (gratuito), o menu lateral só libera Funções depois de ter ao menos 1 equipamento, e Colaboradores depois de ter ao menos 1 função. Passe o mouse sobre itens bloqueados para ver a orientação.\n\n'
  || E'Dica: use Configurar Projeto (ícone de engrenagem no cabeçalho) para ajustar nome, logo e regras de estoque do projeto.',
  '/treinamentos',
  NULL
);
