-- =============================================================================
-- Seed: suporte_orientacoes
-- Execute no Supabase: SQL Editor → New query → cole e rode este arquivo
-- =============================================================================
-- Limpa registros anteriores (opcional — remova o DELETE se quiser acumular)
DELETE FROM public.suporte_orientacoes;

INSERT INTO public.suporte_orientacoes (titulo, descricao, link_materiais, link_video) VALUES

-- ─── 1. PRIMEIROS PASSOS ───────────────────────────────────────────────────

(
  'Por onde começo após criar minha conta?',
  $$Depois de confirmar seu e-mail e entrar no sistema, siga esta ordem recomendada:

1. Equipamentos — cadastre os EPIs do seu catálogo (capacete, luva, etc.) com os tamanhos disponíveis.
2. Funções — crie os cargos e vincule cada função a um GHE (Grupo Homogêneo de Exposição), definindo quais EPIs são exigidos.
3. Colaboradores — cadastre os funcionários (com CPF para eSocial) e associe cada um a uma função.
4. Controle EPI — registre as entregas de EPI aos colaboradores e acompanhe prazos de troca.
5. Dashboard — acompanhe indicadores de conformidade, risco e custos após ter movimentações.
6. eSocial — exporte o gabarito S-2240 quando houver admissões ou alterações de EPI no período.

No plano Iniciante (gratuito), o menu lateral só libera Funções depois de ter ao menos 1 equipamento, e Colaboradores depois de ter ao menos 1 função. Passe o mouse sobre itens bloqueados para ver a orientação.

Dica: use Configurar Projeto (ícone de engrenagem no cabeçalho) para ajustar nome, logo e regras de estoque do projeto.$$,
  '/treinamentos',
  NULL
),

(
  'O que é o tour de boas-vindas (onboarding)?',
  $$Ao entrar pela primeira vez, pode aparecer um guia em etapas explicando o fluxo EPI → Funções → Colaboradores → Controle EPI.

Esse tour é informativo: ele não cadastra dados automaticamente. Você precisa concluir cada etapa manualmente nas telas correspondentes.

O tour só deixa de aparecer quando você clicar em "Entendi, vamos começar!" na última etapa. Se fechar o navegador antes, ele pode voltar na próxima entrada até que o onboarding seja marcado como concluído no sistema.$$,
  NULL,
  NULL
),

(
  'Como usar a Dashboard analítica?',
  $$A Dashboard consolida indicadores do projeto ativo em três abas:

• Gestão básica — volume de entregas, status de prazo, conformidade por GHE, Índices ControleEPI e gráficos de distribuição.
• Gestão avançada — desvios (trocas prematuras, extravios), score por GHE, previsão de ruptura, insights automáticos e curva de demanda.
• Economia & Finanças — gastos em compras, custo por GHE, variação de preços, oportunidades de economia e curva ABC.

No topo, selecione o Período de análise (intervalo de datas) e clique em Atualizar. A maioria dos blocos usa entregas e compras dentro desse intervalo; o gráfico de status de prazo reflete o snapshot atual do Controle EPI (não filtrado por período).

Passe o mouse no ícone de informação (ℹ) em cada bloco para ver a metodologia de cálculo. Use o ícone de download para exportar CSV daquele bloco.

Dica: se o projeto é novo, cadastre equipamentos, funções, colaboradores e registre fornecimentos antes de esperar gráficos preenchidos.$$,
  '/dashboard',
  NULL
),

(
  'O que significam os Índices ControleEPI?',
  $$Os índices executivos aparecem no banner da aba Gestão básica:

• Índice de Risco SST (0–100) — quanto maior, pior. Pondera fornecimentos vencidos, pendências, não conformidade, desperdício nas entregas e estoque crítico. Acima de 70: atenção imediata; acima de 40: monitorar.
• Índice de Maturidade da gestão (0–100) — combina conformidade, disciplina de troca, eficiência financeira e gestão de estoque. Quanto maior, mais madura a operação.
• Custo por colaborador ativo — custo estimado de fornecimentos no período dividido pelo número de colaboradores ativos.

O radar de maturidade cruza cinco eixos: conformidade, disciplina de troca, maturidade, eficiência financeira e gestão de estoque. O mapa de risco por GHE classifica cada grupo (excelente, bom, atenção, crítico) com base no score ControleEPI de eficiência.

Os valores dependem do período selecionado e da qualidade dos cadastros (prazos de troca, estoque mínimo, motivos de fornecimento).$$,
  '/dashboard',
  NULL
),

(
  'Como exportar dados da Dashboard (CSV)?',
  $$Cada bloco da Dashboard com dados numéricos oferece exportação CSV no canto superior direito (ícone de download).

O arquivo traz as mesmas métricas exibidas na tela — por exemplo, Índices ControleEPI, ranking de GHEs, top EPIs fornecidos ou lista de insights. O nome do arquivo segue o bloco (ex.: dashboard-indices-cepi).

Se o botão avisar "Sem dados", amplie o período ou registre movimentações no Controle EPI e entradas de estoque antes de exportar.

A exportação é para análise interna e auditoria; não substitui relatórios legais do eSocial ou fichas de entrega.$$,
  '/dashboard',
  NULL
),

(
  'Por que meus indicadores estão zerados?',
  $$Indicadores vazios ou zerados costumam ter estas causas:

• Período sem movimentação — nenhum fornecimento ou compra registrado nas datas selecionadas. Amplie o intervalo ou registre entregas no Controle EPI.
• Projeto recém-criado — cadastre equipamentos, funções com EPIs, colaboradores e ao menos um fornecimento.
• Controle de estoque desligado — tags e blocos de estoque crítico dependem da configuração em Configurar Projeto → Dados do Projeto.
• Periodicidade de troca desligada — status Vencido/Iminente/No prazo exigem prazo em dias nos EPIs.
• Colaboradores inativos — contagens usam colaboradores ativos vinculados a funções.

O gráfico de status (rosca) mostra o estado atual do Controle EPI, independente do período. Se ele também estiver vazio, ainda não há matriz de EPI montada para os colaboradores.$$,
  '/dashboard',
  NULL
),

(
  'O que são os alertas do sino (Central de alertas)?',
  $$O ícone de sino no cabeçalho abre a Central de alertas do projeto ativo. Ela monitora três situações:

• Estoque abaixo do mínimo — EPI com saldo menor que o estoque mínimo configurado. Clique no alerta para abrir Equipamentos com sugestão de entrada.
• Fornecimento vencido — colaborador com EPI além do prazo de troca. Clique para ir ao Controle EPI com filtro Vencido e abrir o registro.
• Fornecimento pendente — EPI obrigatório ainda não entregue. Clique para registrar a entrega no Controle EPI.

A lista atualiza automaticamente a cada dois minutos e ao abrir o painel. O botão X dispensa o alerta apenas na sua sessão/navegador — a condição continua até ser resolvida (reposição, nova entrega etc.).

Alertas dispensados voltam se o problema persistir com novo identificador. Status Iminente (próximo da troca) aparece no Controle EPI, mas ainda não gera alerta no sino.$$,
  NULL,
  NULL
),

-- ─── 2. CONTA, LOGIN E SENHA ─────────────────────────────────────────────

(
  'Não recebi o e-mail de confirmação de cadastro',
  $$Verifique estas situações:

• Caixa de spam ou lixo eletrônico — o remetente pode ser do serviço de autenticação do sistema.
• Aguarde alguns minutos e clique em "Reenviar link de confirmação" na tela Verificar e-mail.
• Confirme se o endereço exibido na tela está correto.
• Use "Já confirmei o e-mail" após clicar no link — a página não atualiza sozinha em tempo real.

Se persistir, entre em contato pelo Suporte (menu do seu perfil ou página /suporte) informando o e-mail cadastrado.$$,
  NULL,
  NULL
),

(
  'Esqueci minha senha — como recuperar?',
  $$Na tela de login, clique em "Esqueci minha senha", informe seu e-mail e envie.

Você receberá um link para redefinir a senha (página Definir senha). O link expira após um período; se expirar, solicite novamente.

Requisitos da nova senha: mínimo de 6 caracteres na tela de redefinição. No cadastro inicial, a senha exige 8 caracteres com letras e números — use uma senha forte em ambos os casos.$$,
  NULL,
  NULL
),

(
  'Entrei com Google — preciso de senha?',
  $$Contas criadas ou acessadas via Google usam autenticação social. Não é necessário definir senha local para entrar.

Em Meus Dados, a opção de alterar senha pode ficar oculta para login social. Para trocar de conta Google ou vincular e-mail, use as configurações da sua conta Google ou fale com o suporte.$$,
  NULL,
  NULL
),

(
  'Mensagem: conta desativada ou assinatura cancelada',
  $$Essas mensagens indicam bloqueio administrativo ou cancelamento definitivo da assinatura:

• Conta desativada — um administrador desativou seu usuário. Não há autoatendimento; contate o suporte ou o gestor da empresa.
• Assinatura cancelada — o plano foi encerrado de forma permanente. Será necessário novo cadastro ou reativação via suporte/comercial.

Se você acredita que é um erro, envie e-mail ao suporte com o e-mail da conta e print da mensagem.$$,
  NULL,
  NULL
),

-- ─── 3. PROJETOS ─────────────────────────────────────────────────────────

(
  'O que é um Projeto no sistema?',
  $$Projeto é o ambiente de trabalho onde ficam seus equipamentos, funções, colaboradores e entregas de EPI. Cada projeto tem nome, logo (opcional) e configurações próprias.

Usuários podem participar de um ou vários projetos, conforme o plano contratado. Tudo o que você cadastra (EPIs, colaboradores, etc.) fica vinculado ao projeto ativo exibido no cabeçalho ("Projeto Ativo").$$,
  NULL,
  NULL
),

(
  'Como alternar entre projetos?',
  $$Planos pagos (com mais de um projeto permitido):
• Clique na pílula "Projeto Ativo" no cabeçalho ou no ícone de alternar (setas) ao passar o mouse.
• Selecione o card do projeto desejado na janela que abrir.

Plano Iniciante (gratuito):
• Permite apenas 1 projeto. O seletor de troca não aparece — isso é esperado, não é falha do sistema.
• Para gerenciar vários projetos, faça upgrade do plano em Upgrade ou Configurar Projeto → Controle Financeiro.$$,
  NULL,
  NULL
),

(
  'Tela "Seus Projetos" não fecha / preciso escolher um projeto',
  $$Se você tem acesso a vários projetos e nenhum está selecionado, o sistema exibe a tela de seleção obrigatória até você clicar em um projeto.

Após clicar no card, a tela fecha e o ambiente carrega. Se estiver no cabeçalho (Alternar Projeto), a janela também fecha ao selecionar.

Se não aparecer nenhum projeto e você não é gestor, peça ao administrador da conta para convidá-lo em Configurar Projeto → Equipe e Colaboradores.$$,
  NULL,
  NULL
),

(
  'Como criar um novo projeto?',
  $$Somente usuários com perfil Gestor na assinatura podem criar projetos.

Na tela Seus Projetos, use o card "Criar Projeto", digite o nome e confirme.

Se o card estiver bloqueado com cadeado, você atingiu o limite de projetos do plano. Veja quantos projetos seu plano permite passando o mouse sobre o indicador de plano na barra lateral. Para ampliar, faça upgrade.$$,
  NULL,
  NULL
),

(
  'Posso excluir um projeto?',
  $$Em Configurar Projeto → Zona de Perigo → Deletar Projeto, você pode inativar um projeto digitando o nome exato para confirmar.

Restrições importantes:
• Não é possível excluir o único projeto restante da assinatura — crie outro antes ou entre em contato com o suporte.
• A exclusão inativa o projeto e vínculos de membros; não apaga sua conta de usuário.
• Isso não cancela a assinatura paga — use Controle Financeiro para faturamento.$$,
  NULL,
  NULL
),

-- ─── 4. PLANOS, LIMITES E UPGRADE ────────────────────────────────────────

(
  'Quais são os limites do plano Iniciante (gratuito)?',
  $$Valores padrão do plano Iniciante:

• 1 projeto por assinatura
• 10 colaboradores ativos por projeto
• 50 equipamentos/EPIs ativos por projeto (cada combinação equipamento + tamanho conta como 1)

Limites aparecem na barra lateral: passe o mouse sobre a área do plano (nome do plano e status) para ver barras de consumo.

Valor 0 (zero) em planos pagos significa ilimitado naquele item — não confunda com "nada permitido".$$,
  NULL,
  NULL
),

(
  'Botão "Novo" desabilitado — limite atingido',
  $$Quando o botão de cadastrar (Equipamentos ou Colaboradores) fica desabilitado, você atingiu o limite do plano para aquele recurso.

Clique sobre o botão ou na área bloqueada para ver um painel explicando uso atual vs. limite e opção de upgrade.

Para equipamentos: ao cadastrar várias variações de tamanho de uma vez, o formulário avisa antes de salvar se a seleção ultrapassaria o limite — reduza as variações marcadas ou faça upgrade.$$,
  NULL,
  NULL
),

(
  'Como fazer upgrade do plano?',
  $$Acesse Upgrade pelo menu, pelo painel do plano na sidebar ou por Configurar Projeto → Controle Financeiro.

Escolha um plano superior e conclua o pagamento no checkout seguro (Stripe). Após confirmação, os limites são ampliados conforme o plano escolhido.

Se tentar escolher um plano inferior na tela de Upgrade, você será direcionado ao fluxo de Downgrade, que valida se seu uso atual cabe nos limites do plano destino.$$,
  '/upgrade',
  NULL
),

(
  'Como fazer downgrade ou voltar ao plano gratuito?',
  $$Acesse Downgrade (via Upgrade ao selecionar plano inferior).

O sistema lista seus projetos e compara colaboradores e EPIs com os limites do plano desejado. Se algum projeto exceder, o downgrade é bloqueado até você inativar registros ou redistribuir.

Para voltar ao Iniciante: reduza para no máximo 1 projeto, 10 colaboradores e 50 EPIs ativos por projeto (somando todos os projetos conforme regra exibida na tela).$$,
  '/downgrade',
  NULL
),

(
  'O que significa "Ilimitado" no painel do plano?',
  $$No painel de consumo (sidebar), a barra mostra "Ilimitado" quando seu plano pago não impõe teto naquele recurso (projetos, colaboradores ou EPIs).

Isso é diferente de erro ou falta de dado. Planos superiores podem ter quantidade 0 no cadastro de regras, o que o sistema interpreta como sem limite prático.$$,
  NULL,
  NULL
),

-- ─── 5. PAGAMENTO E BLOQUEIO ─────────────────────────────────────────────

(
  'Pagamento pendente — ainda consigo usar o sistema?',
  $$Se sua assinatura está com status de inadimplência (ex.: past_due), o sistema pode conceder um período de tolerância (dias configurados no plano, padrão 15 dias).

Durante a tolerância:
• O indicador do plano na sidebar mostra aviso (ex.: "Pendência · X dias").
• O acesso aos módulos continua, mas regularize o pagamento pelo portal financeiro.

Após esgotar a tolerância, o acesso aos módulos principais é bloqueado até regularização. Rotas como Upgrade, Meus Dados e Suporte permanecem acessíveis.$$,
  NULL,
  NULL
),

(
  'Tela bloqueada — assinatura pausada ou inadimplente',
  $$A tela de pendência aparece quando:
• A tolerância de pagamento esgotou, ou
• A assinatura está pausada no gateway de pagamento.

Opções apresentadas:
• Acessar portal de pagamento (atualizar cartão ou pagar fatura)
• Falar com suporte
• Sair da conta

Assinatura pausada: reative pelo portal ou migre para plano gratuito conforme orientação na tela, se disponível.$$,
  '/upgrade',
  NULL
),

(
  'Onde vejo faturas e dados de cobrança?',
  $$Planos pagos: Configurar Projeto → Controle Financeiro → abrir portal do cliente (Stripe). Lá você vê faturas, cartão cadastrado e pode cancelar ou alterar plano conforme política comercial.

Plano Iniciante (gratuito): não há faturas. A mesma seção mostra opção de upgrade para planos pagos.$$,
  NULL,
  NULL
),

-- ─── 6. EQUIPAMENTOS (EPI) ───────────────────────────────────────────────

(
  'Como cadastrar equipamentos (EPIs)?',
  $$Vá em Equipamentos → Novo.

1. Escolha o item no catálogo (ex.: Capacete, Luva).
2. Selecione tamanho/variação:
   • Aba Simples: um tamanho por vez.
   • Aba Múltiplo: marque vários tamanhos para cadastrar de uma só vez (cada um vira um registro).
3. Informe prazo de troca (dias), se a periodicidade estiver ativa no projeto.
4. Informe estoques (mínimo, ideal, saldo inicial), se controle de estoque estiver ativo.

Tamanhos já cadastrados aparecem riscados como "Já cadastrado".$$,
  '/equipamentos',
  NULL
),

(
  'Cadastro simples vs. múltiplo de equipamentos',
  $$Simples: ideal para incluir um EPI com um único tamanho rapidamente.

Múltiplo: ideal quando o mesmo equipamento tem vários tamanhos (P, M, G, etc.) — você marca todos de uma vez e o sistema cria um registro por variação.

Atenção ao limite do plano: 5 variações selecionadas = 5 EPIs no contador de uso. Use "Marcar todos" com cuidado — o sistema respeita apenas as vagas restantes do plano.$$,
  NULL,
  NULL
),

(
  'O que é Entrada de estoque e Pedido de compras?',
  $$Entrada de estoque: registra compra/reposição de quantidades no inventário do EPI (sidebar Entradas ou botão rápido na linha).

Pedido de compras: monta sugestão de compra com base em estoque mínimo/ideal, escolhe fornecedores e permite enviar e-mail ou imprimir o pedido.

Ambos são módulos de gestão de inventário — diferentes de "Controle EPI", que registra entrega ao colaborador.$$,
  NULL,
  NULL
),

(
  'Não consigo inativar um equipamento',
  $$O sistema impede inativar EPI que ainda está vinculado a funções (GHE) ou colaboradores.

Remova ou substitua o vínculo em Funções (PickList de EPIs do cargo) ou ajuste colaboradores antes de inativar.

A mensagem de erro lista até 10 vínculos encontrados — use como guia.$$,
  NULL,
  NULL
),

(
  'Tags Crítico, Baixo e Alto no estoque',
  $$Com controle de estoque ativo, a listagem compara saldo atual com estoque mínimo e ideal:

• Crítico — abaixo ou no mínimo; risco de falta.
• Baixo — entre mínimo e ideal.
• Alto — acima do ideal (excesso).

Desative controle de estoque em Configurar Projeto → Dados do Projeto se sua operação não usar saldo em quantidade.$$,
  NULL,
  NULL
),

-- ─── 7. FUNÇÕES (GHE) ────────────────────────────────────────────────────

(
  'O que são Funções e como vincular EPIs?',
  $$Funções representam cargos ou papéis (ex.: Eletricista, Almoxarife) vinculados a um GHE (Grupo Homogêneo de Exposição).

Ao cadastrar ou editar uma função, use a lista dupla (PickList) para mover EPIs do catálogo do projeto para "EPIs obrigatórios" daquela função — isso forma a base do GHE (Grupo Homogêneo de Exposição).

Colaboradores herdam os EPIs da função atribuída. Sem função com EPIs, o Controle EPI terá poucas pendências automáticas.$$,
  '/funcoes',
  NULL
),

(
  'Menu Funções bloqueado no plano Iniciante',
  $$No plano gratuito, Funções só libera após existir ao menos 1 equipamento cadastrado.

Cadastre primeiro em Equipamentos. Passe o mouse sobre "Funções" na sidebar para ver o aviso com cadeado.

Planos pagos não aplicam essa trava progressiva no menu.$$,
  NULL,
  NULL
),

(
  'Posso salvar uma função sem EPI vinculado?',
  $$Sim, tecnicamente o sistema permite, após confirmação em modal — mas isso não é recomendado para conformidade.

Funções sem EPIs não geram exigências de entrega para colaboradores daquele cargo. Revise o GHE com seu responsável de SST antes de manter função vazia.$$,
  NULL,
  NULL
),

(
  'Não consigo inativar uma função',
  $$Funções com colaboradores ativos vinculados não podem ser inativadas.

Transfira os colaboradores para outra função ou inative-os antes. A listagem de colaboradores mostra o cargo atual de cada um.$$,
  NULL,
  NULL
),

-- ─── 8. COLABORADORES ────────────────────────────────────────────────────

(
  'Como cadastrar colaboradores?',
  $$Colaboradores → Novo.

Preencha nome, matrícula/inscrição, data de admissão e função (cargo). Opcionalmente informe tamanhos (calçado, luva, respirador, uniforme) para facilitar entregas.

Após salvar, você pode imprimir a ficha de EPI ou ir direto ao Controle EPI filtrado para aquele colaborador.

Limite do plano Iniciante: 10 colaboradores ativos por projeto.$$,
  '/colaboradores',
  NULL
),

(
  'Menu Colaboradores bloqueado no plano Iniciante',
  $$Libera após existir ao menos 1 função cadastrada (com ou sem EPI, conforme regra de onboarding).

Fluxo: Equipamentos → Funções → Colaboradores.

Se a função já existe e o menu continua bloqueado, atualize a página ou aguarde alguns segundos — o status de onboarding sincroniza após cadastros.$$,
  NULL,
  NULL
),

(
  'Colaborador vs. usuário convidado — qual a diferença?',
  $$São conceitos diferentes:

• Colaborador (módulo Colaboradores): pessoa que recebe EPI — ficha, matrícula, função, entregas. Não necessariamente acessa o sistema.
• Usuário convidado (Configurar Projeto → Equipe): pessoa com login e-mail/senha ou Google, com papel Gestor ou Colaborador no app, podendo acessar um ou mais projetos.

Convidar alguém como usuário "Colaborador" não cria automaticamente registro no módulo Colaboradores de EPI.$$,
  NULL,
  NULL
),

(
  'Alterei o cargo do colaborador — o que acontece?',
  $$Ao editar um colaborador e mudar a função, o sistema exibe confirmação porque a matriz de EPIs pode mudar.

Após confirmar:
• EPIs exclusivos da função anterior são inativados no Controle EPI
• EPIs comuns entre as funções são mantidos
• Novos obrigatórios da nova função entram como Pendentes
• Histórico de cargos e Ficha de EPI são atualizados com o novo GHE

Entregas já registradas permanecem no histórico. Revise pendências e vencidos após a mudança. A alteração pode gerar evento de Alteração no gabarito S-2240.$$,
  '/colaboradores',
  NULL
),

(
  'Inativar colaborador gera backup?',
  $$Sim. Ao inativar, o sistema pode gerar exportação Excel com dados do colaborador como respaldo.

Inativar não apaga histórico de entregas de EPI — consulte Controle EPI ou movimentações para registros passados.$$,
  NULL,
  NULL
),

-- ─── 9. CONTROLE EPI (ENTREGAS) ──────────────────────────────────────────

(
  'O que é Controle EPI?',
  $$É o módulo de entregas e devoluções de EPI aos colaboradores, com controle de:

• Certificado de Aprovação (CA)
• Data de entrega e validade/prazo de troca
• Status: No prazo, Iminente, Vencido, Pendente

"Pendente" aqui significa EPI ainda não entregue ao colaborador — não confundir com pagamento pendente da assinatura.$$,
  '/controleEPI',
  NULL
),

(
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
),

(
  'Como registrar entrega (fornecimento) de EPI?',
  $$Controle EPI → Registrar fornecimento (ou ícone de ação na linha).

Selecione colaborador, EPI (filtrado pela função), informe CA válido, quantidade, data e motivo. O sistema valida o CA externamente — CAs inválidos impedem salvar.

Após salvar, você pode imprimir recibo PDF conforme preferência (imprimir, baixar ou nenhum — salva no navegador).$$,
  NULL,
  NULL
),

(
  'Status Vencido, Iminente, Pendente e No prazo',
  $$• No prazo — entrega feita e dentro do prazo de troca configurado.
• Iminente — aproximando da data de troca (alerta preventivo).
• Vencido — prazo de troca ultrapassado; providenciar substituição.
• Pendente — EPI exigido pela função ainda não registrado como entregue.

Use os filtros no topo da tela para localizar vencidos ou pendentes rapidamente.$$,
  NULL,
  NULL
),

(
  'Erro ao validar CA (Certificado de Aprovação)',
  $$O CA informado passa por consulta a serviço externo. Falhas comuns:

• CA digitado incorretamente ou expirado
• Serviço temporariamente indisponível — tente novamente
• EPI sem CA obrigatório para o tipo de entrega — verifique norma interna

Confira o CA na nota fiscal ou etiqueta do produto antes de registrar.$$,
  NULL,
  NULL
),

(
  'Recibos e fichas — logo e plano gratuito',
  $$Impressões de ficha de colaborador e recibo de entrega podem usar logo padrão ControleEPI no plano Iniciante, mesmo que seu projeto tenha logo customizado.

Planos pagos tendem a refletir identidade do projeto conforme configuração. Rodapé pode incluir aviso legal sobre validade documental.$$,
  NULL,
  NULL
),

-- ─── 10. CONFIGURAÇÕES DO PROJETO ────────────────────────────────────────

(
  'Periodicidade de troca e Controle de estoque',
  $$Em Configurar Projeto → Dados do Projeto, dois interruptores definem comportamento global:

• Periodicidade de troca — exige prazo em dias nos cadastros de EPI e alimenta vencimentos no Controle EPI.
• Controle de estoque — exibe campos de estoque mínimo, ideal e saldo; habilita tags e entradas de estoque.

Alterações afetam formulários novos e edições — salve após mudar.$$,
  '/configurar-projeto',
  NULL
),

(
  'Validação digital no fornecimento de EPI',
  $$Recurso para planos elegíveis (Gestor). Comprova o recebimento do EPI por cartão RFID ou leitor biométrico, sem assinatura em papel.

Onde ativar:
Configurar Projeto → Dados do Projeto → interruptor "Validação digital". Ao ligar, um guia de 60 segundos explica RFID e biometria antes de confirmar. Depois, clique em Salvar Configurações.

Fluxo no fornecimento:
1. Preencha colaborador, EPI, CA, quantidade e motivo.
2. Clique em "Assinar digitalmente".
3. Na segunda etapa, aproxime o cartão ou capture a digital.
4. Quando o sistema identificar a leitura, Concluir é liberado.
5. O comprovante registra o método (RFID ou Biometria).

Cartão RFID — leitor USB em modo teclado (HID), sem driver: MIFARE, 125 kHz etc. Cadastre o UID de cada colaborador previamente.

Biometria — instale o agente ControleEPI (Windows) se o leitor não operar em modo teclado. Marcas sugeridas: ZKTeco, Intelbras, Control iD, Nitgen.

Para desativar, desligue o interruptor e salve o projeto.$$,
  '/downloads/ControleEPI-Agente-Biometria.exe',
  NULL
),

-- ─── 10b. eSocial S-2240 ───────────────────────────────────────────────────

(
  'Como exportar o gabarito S-2240 para o eSocial?',
  $$O eSocial exige o evento S-2240 na admissão ou quando há alteração relevante de EPI, função ou CA. O ControleEPI gera um gabarito para importação — não transmite diretamente ao portal gov.br.

Passo a passo:
1. Menu eSocial → selecione o período de movimentação e clique em Atualizar.
2. Revise a tabela (dtIniCond, CPF, função, GHE, tipo de evento, CAs).
3. Baixe Excel gabarito (planilha formatada) ou CSV lote (integradores).
4. Importe no sistema de folha (Alterdata, Domínio, Prosoft etc.) ou use como guia no portal eSocial.

O arquivo pode conter vários trabalhadores; o eSocial processa por CPF e gera recibo individual. Cadastre CPF válido em Colaboradores antes da transmissão oficial. O histórico de exportações na própria tela registra data, período e formato para auditoria interna.$$,
  'https://www.gov.br/esocial/pt-br',
  NULL
),

(
  'CPF pendente no gabarito S-2240',
  $$Linhas com CPF inválido ou ausente aparecem destacadas na tabela e no contador de alerta amarelo.

Como corrigir:
1. Vá em Colaboradores → edite o funcionário da linha.
2. Preencha o CPF com 11 dígitos (somente números ou formatado).
3. Salve e volte ao eSocial → Atualizar.

O gabarito pode ser exportado mesmo com CPF pendente para conferência interna, mas o upload oficial no eSocial exige CPF válido por trabalhador. A matrícula/inscrição do colaborador também é exportada quando cadastrada.$$,
  '/colaboradores',
  NULL
),

(
  'Por que a lista S-2240 está vazia?',
  $$A mensagem "Nenhuma movimentação S-2240 no período" significa que não houve eventos elegíveis nas datas filtradas.

O S-2240 lista apenas alterações relevantes, não a rotina diária sem mudança. Entram movimentações com motivos como:
• Lançamento inicial (admissão de EPIs)
• Troca de função
• Adição de EPI para a função
• Troca periódica, prematura, extravio ou emergencial (quando registradas no Controle EPI)

Verifique: período correto, fornecimentos já salvos no Controle EPI, colaboradores ativos com função/GHE. Amplie o intervalo (ex.: últimos 90 dias) se as entregas foram feitas antes.$$,
  '/esocial',
  NULL
),

(
  'Admissão vs Alteração no S-2240',
  $$A coluna Tipo na tabela eSocial indica o tipo de evento S-2240:

• Admissão — primeiro fornecimento do colaborador com motivo "Lançamento inicial". Representa a condição inicial de EPI na admissão ou primeiro registro no sistema.
• Alteração — qualquer mudança posterior: troca de função, inclusão de EPI na função, troca de CA, troca periódica/prematura, extravio ou emergencial.

A data dtIniCond é a data do fornecimento que originou o evento. Troca de função pelo cadastro de Colaboradores também pode gerar alterações quando a matriz de EPIs é reprocessada.$$,
  '/esocial',
  NULL
),

(
  'Checklist pré-preenchido — o que revisar antes de transmitir?',
  $$O Excel/CSV exporta campos de conformidade pré-preenchidos como SIM: EPI eficaz, higienização, periodicidade de troca, validade do CA e condições de funcionamento.

Isso acelera a importação, mas a responsabilidade pela veracidade é da empresa. Antes de transmitir ao eSocial, confirme na prática:

• O EPI entregue é adequado ao risco da função/GHE
• O CA está válido e corresponde ao produto entregue
• Há política de higienização e troca conforme NR-6
• O colaborador foi treinado e o EPI está em condições de uso

Se algum item não se aplicar, ajuste manualmente no sistema de folha antes do envio oficial.$$,
  'https://www.gov.br/esocial/pt-br',
  NULL
),

-- ─── 10c. Modais e confirmações críticas ───────────────────────────────────

(
  'Como estornar um fornecimento de EPI?',
  $$O estorno remove um fornecimento registrado por engano e reverte seus efeitos no Controle EPI e no histórico.

Onde estornar:
• Controle EPI — menu de ações da linha → Estornar
• Histórico de fornecimento — mesma ação na linha do registro

O sistema pede um motivo (mínimo 3 caracteres) para auditoria. Após confirmar, o registro sai do histórico e a matriz do colaborador volta ao estado anterior quando aplicável.

Use para lançamento duplicado, colaborador errado ou quantidade incorreta. Para corrigir data retroativa sem estornar, veja "Lançamento retroativo". Estorno não substitui devolução física do EPI — registre observação quando necessário.$$,
  '/controleEPI',
  NULL
),

(
  'Lançamento retroativo — o que muda no sistema?',
  $$Quando a data de fornecimento é anterior à situação atual do colaborador, o sistema pode salvar apenas no histórico de movimentações, sem alterar o Controle EPI ativo.

Isso evita que um lançamento no passado sobrescreva prazos e status vigentes. O modal "Lançamento retroativo" explica o que foi feito em cada caso.

O registro retroativo:
• Aparece no Histórico de fornecimento e pode entrar no gabarito S-2240 se o período e o motivo forem elegíveis
• Não muda status Vencido/Pendente/No prazo da matriz atual quando a regra de retroativo se aplica

Para forçar atualização da matriz com data passada, avalie com o RH/SST se o estorno e um novo lançamento na data correta é mais adequado.$$,
  '/controleEPI',
  NULL
),

(
  'CA vencido — posso confirmar mesmo assim?',
  $$Ao registrar fornecimento, se o CA consultado estiver vencido ou inválido, o sistema exibe o modal "Aviso de Risco" antes de salvar.

Confirmar mesmo assim:
• Registra a entrega com observação de que o CA vencido foi validado pelo usuário
• Pode gerar não conformidade legal — use apenas com justificativa documentada (ex.: CA em renovação, produto em estoque legado)

Recomendação: prefira atualizar o CA para um certificado válido antes de entregar. Se o serviço de consulta falhar temporariamente, tente novamente antes de forçar a confirmação.

Veja também "Erro ao validar CA" na Central de Ajuda.$$,
  '/controleEPI',
  NULL
),

(
  'Como estornar uma entrada de estoque?',
  $$Em Equipamentos → Entrada de estoque → Estornar, selecione a entrada registrada por NF e informe o motivo.

O estorno:
• Remove o registro da entrada
• Subtrai a quantidade do saldo atual do EPI
• Pode falhar se o saldo ficaria negativo (já houve saídas/consumo além do estornado)

Use para NF duplicada, quantidade errada ou entrada no EPI/tamanho incorreto. Não confundir com estorno de fornecimento ao colaborador — esse está no Controle EPI.$$,
  '/equipamentos',
  NULL
),

(
  'Comunicados do sistema — o que significam?',
  $$Comunicados são avisos exibidos em modal ao entrar no sistema, gerenciados pela equipe ControleEPI.

Tipos:
• info — informativo, pode fechar clicando fora
• aviso — atenção recomendada
• manutencao — janela de manutenção programada (modal bloqueante até "Entendi")
• critico — situação urgente (modal bloqueante)

Ao clicar "Entendi", o sistema registra que você leu aquele comunicado e não exibe novamente. Se houver fila (+N avisos), os próximos aparecem em sequência.

Comunicados não substituem alertas operacionais do sino (estoque, vencidos, pendências).$$,
  NULL,
  NULL
),

(
  'Como convidar outro usuário para o projeto?',
  $$Configurar Projeto → Equipe e Colaboradores → convidar por e-mail.

Defina papel:
• Gestor — gerencia projeto, pode criar projetos (se plano permitir) e convidar outros.
• Colaborador — acesso operacional conforme permissões.

O convidado recebe e-mail para definir senha ou entrar via Google. Você pode reenviar convite ou remover acesso.$$,
  NULL,
  NULL
),

(
  'Onde altero meus dados pessoais e senha?',
  $$Meus Dados (rota /meus-dados) — foto, nome, telefone e senha (contas e-mail/senha).

Também acessível quando a assinatura está bloqueada por pagamento.

Menu "Painel da Conta" no cabeçalho deve levar ao perfil; se não abrir, use diretamente Meus Dados ou Suporte.$$,
  '/meus-dados',
  NULL
),

-- ─── 11. INTERFACE E NAVEGAÇÃO ───────────────────────────────────────────

(
  'Como fixar ou expandir o menu lateral?',
  $$A sidebar expande ao passar o mouse (comportamento padrão) ou permanece aberta se você clicar no ícone de cadeado/fixar no topo.

A preferência "sidebar-locked" fica salva no navegador. Em telas menores, use o ícone de menu (☰) no cabeçalho.$$,
  NULL,
  NULL
),

(
  'O que é o botão "Colaborar" no painel do plano?',
  $$"Colaborar" leva à página de colaboração/doação (apoio ao projeto ControleEPI via PIX) — não está relacionado a cadastro de colaboradores nem a convites de equipe.

Para adicionar funcionários ao EPI, use o módulo Colaboradores. Para convidar usuários com login, use Configurar Projeto → Equipe.$$,
  '/colaboracao',
  NULL
),

(
  'Precisando de ajuda? nos formulários',
  $$Links "Precisando de ajuda?" nos rodapés de formulários levam à Central de Suporte (/suporte), onde você encontra temas por assunto e formulário para enviar dúvida por e-mail.

Use a sidebar → Suporte ou menu do perfil → Suporte para o mesmo destino.$$,
  '/suporte',
  NULL
),

-- ─── 12. GLOSSÁRIO RÁPIDO ────────────────────────────────────────────────

(
  'Glossário: EPI, GHE, CA e Fornecimento',
  $$• EPI — Equipamento de Proteção Individual (capacete, luvas, etc.).
• GHE — Grupo Homogêneo de Exposição; no sistema, representado pela função + EPIs obrigatórios.
• CA — Certificado de Aprovação do MTE; obrigatório em muitos EPIs registrados.
• Fornecimento — ato de entregar EPI ao colaborador com registro legal (data, CA, quantidade).
• Inativar — desliga registro do uso corrente sem apagar histórico (soft delete).
• Projeto ativo — ambiente selecionado no cabeçalho; todos os cadastros vão para ele.$$,
  NULL,
  NULL
);

-- Verificação
SELECT count(*) AS total_orientacoes FROM public.suporte_orientacoes;
