-- Orientacoes de suporte para telas/modais que geram duvida e ainda nao tinham artigo dedicado.
-- Titulos devem coincidir exatamente com SUPORTE_TEMAS em src/lib/suporteTemas.ts

DELETE FROM public.suporte_orientacoes
WHERE titulo IN (
  'Como importar dados iniciais do projeto?',
  'Como consultar um CA (Certificado de Aprovação)?',
  'O que é a matriz de EPIs por colaborador?',
  'Como ver o histórico de trocas de função?',
  'Como consultar colaboradores inativados?',
  'Colaboradores sem CPF — o que fazer?',
  'Histórico de alterações de EPIs por função',
  'O que é o modo emergencial no fornecimento?',
  'Como inativar um colaborador?',
  'Recurso bloqueado — preciso fazer upgrade?',
  'Como importar equipamentos de outro projeto?',
  'Como importar NF-e (XML) na entrada de estoque?',
  'Como disparar e-mails do pedido de compras?',
  'O que é logo padrão da assinatura?',
  'Como definir ou redefinir minha senha?',
  'Onde vejo dados do plano e da assinatura?'
);

INSERT INTO public.suporte_orientacoes (titulo, descricao, link_materiais, link_video) VALUES
(
  'Como importar dados iniciais do projeto?',
  E'O assistente de importação popula o projeto com equipamentos, funções e (quando o modelo incluir) colaboradores a partir de planilha Excel.\n\n'
  || E'Opções na introdução:\n'
  || E'• Modelo padrão — baixa o template oficial, preenche e sobe o arquivo.\n'
  || E'• Importar planilha própria — mapeia abas e colunas da sua planilha.\n'
  || E'• Começar do zero — pula a importação e cadastra manualmente.\n\n'
  || E'Fluxo típico: Upload → escolha das abas → mapeamento de colunas → nomenclatura → pré-visualização → importar.\n\n'
  || E'Dicas:\n'
  || E'• Use os templates oficiais quando possível (menos erros de coluna).\n'
  || E'• Na prévia, corrija linhas com erro antes de confirmar.\n'
  || E'• A importação respeita os limites do plano (tipos de EPI, colaboradores etc.).\n'
  || E'• Você pode reabrir o assistente depois pelo fluxo de onboarding/configuração, se ainda estiver pendente.\n\n'
  || E'Se a importação falhar no meio, confira o relatório de pendências gerado e complete o que faltou no cadastro manual.',
  NULL,
  NULL
),
(
  'Como consultar um CA (Certificado de Aprovação)?',
  E'A consulta avulsa de CA busca o certificado no cadastro oficial (MTE) para conferir validade, fabricante e descrição do equipamento.\n\n'
  || E'Passo a passo:\n'
  || E'1. Abra Controle EPI → extras → Consulta de CA (recurso a partir do plano Pro).\n'
  || E'2. Informe só os dígitos do CA e consulte.\n'
  || E'3. Revise validade, situação e dados do equipamento.\n'
  || E'4. Se vier do formulário de fornecimento, use “Usar este CA” para preencher o campo.\n\n'
  || E'A consulta não cadastra EPI automaticamente — ela só valida/informa. No cadastro de equipamento e no fornecimento, a validação de CA também pode ocorrer em tempo real.\n\n'
  || E'Se a API externa estiver indisponível, tente novamente em alguns minutos ou confira o número digitado.',
  '/controle-epi',
  NULL
),
(
  'O que é a matriz de EPIs por colaborador?',
  E'A matriz mostra, para o colaborador selecionado, os EPIs esperados pela função/GHE e o status de cada item no Controle EPI (vencido, iminente, pendente ou no prazo).\n\n'
  || E'Use para:\n'
  || E'• Ver o que ainda falta entregar.\n'
  || E'• Priorizar trocas vencidas ou iminentes.\n'
  || E'• Conferir se a função do colaborador está alinhada aos obrigatórios.\n\n'
  || E'Recurso tipicamente disponível a partir do plano Pro. Se estiver bloqueado, faça upgrade ou use o Controle EPI com filtros de status.\n\n'
  || E'A matriz é leitura operacional — entregas novas são registradas em Controle EPI → Fornecer EPI.',
  '/colaboradores',
  NULL
),
(
  'Como ver o histórico de trocas de função?',
  E'Este histórico registra cada mudança de função/GHE do colaborador (data, função anterior e nova).\n\n'
  || E'Quando aparece:\n'
  || E'• Ao cadastrar o colaborador com uma função.\n'
  || E'• Ao editar e confirmar alteração de cargo/função.\n\n'
  || E'Útil para auditoria interna e para entender por que a matriz de EPIs mudou. Disponível a partir do plano Pro.\n\n'
  || E'A troca de função pode gerar novos EPIs obrigatórios e eventos relevantes para o gabarito eSocial (plano Gestor).',
  '/colaboradores',
  NULL
),
(
  'Como consultar colaboradores inativados?',
  E'A lista de inativados mostra colaboradores que saíram do projeto ativo, com data e motivo da inativação.\n\n'
  || E'A partir daqui você pode:\n'
  || E'• Localizar quem foi desligado e quando.\n'
  || E'• Baixar o pacote de desligamento (ficha formal, históricos e dados de apoio ao eSocial), quando a ação estiver disponível.\n\n'
  || E'Recurso a partir do plano Pro. Inativações novas são feitas na listagem principal de colaboradores (ação Inativar), com confirmação formal do nome e motivo.',
  '/colaboradores',
  NULL
),
(
  'Colaboradores sem CPF — o que fazer?',
  E'Esta consulta lista colaboradores ativos sem CPF válido — pendência crítica para o gabarito eSocial S-2240.\n\n'
  || E'Como corrigir:\n'
  || E'1. Abra Colaboradores e edite o registro.\n'
  || E'2. Informe o CPF (recurso de CPF/eSocial no plano Gestor).\n'
  || E'3. Salve e volte ao eSocial → Atualizar.\n\n'
  || E'Sem CPF, a linha do trabalhador pode aparecer como pendente no gabarito e bloquear a transmissão no sistema de folha/portal.\n\n'
  || E'Se o CPF não estiver liberado no seu plano, faça upgrade para Gestor ou exporte só após adequar o cadastro.',
  '/colaboradores',
  NULL
),
(
  'Histórico de alterações de EPIs por função',
  E'Registra mudanças na lista de EPIs obrigatórios de cada função (inclusões e remoções), com data e usuário quando disponível.\n\n'
  || E'Use para auditar quem alterou a matriz da função e entender impacto nos colaboradores vinculados.\n\n'
  || E'Disponível a partir do plano Pro (menu Funções → extras → Histórico).\n\n'
  || E'Alterar EPIs da função pode gerar novos pendentes no Controle EPI e eventos de Alteração no eSocial.',
  '/funcoes',
  NULL
),
(
  'O que é o modo emergencial no fornecimento?',
  E'O modo emergencial permite registrar a entrega de um EPI fora da rotina da função — por exemplo sinistro, visita ou serviço pontual.\n\n'
  || E'Efeitos:\n'
  || E'• Você pode escolher qualquer EPI do estoque, mesmo fora da matriz da função.\n'
  || E'• O registro NÃO entra no controle periódico (não cria ciclo de troca nem pendência de renovação).\n'
  || E'• Fica no histórico como comprovação da proteção fornecida.\n\n'
  || E'Use com critério: emergencial em excesso dificulta a conformidade da matriz. Para entregas regulares, use o fluxo normal de fornecimento.',
  '/controle-epi',
  NULL
),
(
  'Como inativar um colaborador?',
  E'Inativar remove o colaborador da operação ativa do projeto, mantendo histórico para auditoria.\n\n'
  || E'Passo a passo:\n'
  || E'1. Em Colaboradores, abra a ação Inativar.\n'
  || E'2. Informe o motivo formal (mínimo 5 caracteres).\n'
  || E'3. Digite o nome completo exatamente como cadastrado.\n'
  || E'4. Marque a ciência e confirme.\n\n'
  || E'O sistema pode gerar o pacote de desligamento (ficha de EPI, históricos e dados de apoio ao S-2240).\n\n'
  || E'Inativar não apaga fornecimentos passados. Para reativar, use o fluxo disponível no histórico de inativados (quando liberado no plano).',
  '/colaboradores',
  NULL
),
(
  'Recurso bloqueado — preciso fazer upgrade?',
  E'Quando um botão, menu ou tela mostra cadeado, o recurso não está incluído no seu plano atual (Iniciante, Pro ou Gestor).\n\n'
  || E'O overlay/painel indica:\n'
  || E'• Qual recurso está bloqueado.\n'
  || E'• Em quais planos ele está disponível.\n'
  || E'• Ação para ver planos e fazer upgrade.\n\n'
  || E'Limites numéricos (quantidade de projetos, colaboradores ou tipos de EPI) são outra regra: mesmo com o recurso liberado, o botão Novo pode bloquear se o limite do plano foi atingido — nesse caso veja também a orientação de limite do plano.\n\n'
  || E'Planos internos de teste/desenvolvimento liberam recursos para homologação e não refletem a cobrança do cliente final.',
  '/upgrade',
  NULL
),
(
  'Como importar equipamentos de outro projeto?',
  E'Permite copiar cadastros de equipamentos (tipos/variações) de outro projeto da mesma assinatura para o projeto ativo — útil ao padronizar frota entre obras.\n\n'
  || E'Passo a passo:\n'
  || E'1. Em Equipamentos → extras → Importar de outro projeto (plano Pro+).\n'
  || E'2. Escolha o projeto de origem.\n'
  || E'3. Confirme a importação.\n\n'
  || E'A ação respeita o limite de tipos de EPI do plano. Itens já existentes podem ser ignorados ou tratados conforme a regra da tela.\n\n'
  || E'Estoque físico (saldo) não é transferido automaticamente — faça entradas no projeto destino se necessário.',
  '/epis',
  NULL
),
(
  'Como importar NF-e (XML) na entrada de estoque?',
  E'Na Entrada de estoque, o botão NF-e (XML) lê a nota fiscal eletrônica e sugere itens vinculados aos equipamentos cadastrados (plano Pro+).\n\n'
  || E'Passo a passo:\n'
  || E'1. Abra Entrada de estoque.\n'
  || E'2. Clique em NF-e (XML) e selecione o arquivo .xml da nota.\n'
  || E'3. Revise número/data preenchidos e a lista de itens.\n'
  || E'4. Ajuste vínculos manuais quando a descrição da nota não casar com o cadastro.\n'
  || E'5. Salve a entrada normalmente.\n\n'
  || E'Itens sem correspondência automática ficam destacados para você escolher o EPI certo. A importação não substitui a conferência fiscal/contábil da nota.',
  NULL,
  NULL
),
(
  'Como disparar e-mails do pedido de compras?',
  E'No Pedido de compras você monta a cotação e pode enviar e-mail aos fornecedores selecionados (plano Pro+).\n\n'
  || E'Pré-requisitos:\n'
  || E'• Itens válidos no pedido.\n'
  || E'• Fornecedores selecionados com e-mail de contato cadastrado.\n\n'
  || E'Clique em Disparar e-mails. O sistema envia a cotação; o PDF continua disponível para impressão em todos os planos.\n\n'
  || E'Se o botão estiver com cadeado, o recurso não está no seu plano. Se estiver liberado mas falhar o envio, confira os e-mails dos fornecedores e tente novamente.',
  NULL,
  NULL
),
(
  'O que é logo padrão da assinatura?',
  E'A opção “Usar em todos os projetos” define a logo do projeto ativo como padrão da assinatura (planos Pro+).\n\n'
  || E'Com a opção ligada, novos projetos (e a preferência da conta) podem herdar essa identidade visual em documentos e cabeçalho.\n\n'
  || E'Com a opção desligada, cada projeto usa apenas a própria logo.\n\n'
  || E'Faça upload de PNG/JPG (até 10 MB) antes de ativar. No plano Iniciante a opção fica bloqueada — use upgrade se precisar padronizar a marca em vários projetos.',
  '/configurar-projeto',
  NULL
),
(
  'Como definir ou redefinir minha senha?',
  E'Duas situações comuns:\n\n'
  || E'1) Convite / primeiro acesso — você recebe um e-mail com link para /definir-senha. Crie uma senha forte (mínimo 6 caracteres, maiúscula e número ou símbolo) e confirme.\n'
  || E'2) Esqueci a senha — em Recuperar senha, informe o e-mail da conta. Se estiver cadastrado, enviamos o link de redefinição (verifique spam).\n\n'
  || E'Se o link expirar ou for inválido, solicite um novo em Recuperar senha. Contas com login social (quando habilitado) seguem o provedor (ex.: Google) e podem não usar senha local.',
  '/recuperacao-senha',
  NULL
),
(
  'Onde vejo dados do plano e da assinatura?',
  E'Em Configurar projeto → Assinatura do Sistema (titular da conta) você consulta:\n'
  || E'• Plano e status.\n'
  || E'• Uso versus limites (projetos, colaboradores, tipos de EPI).\n'
  || E'• Tipo de operação e dados de cobrança/responsável.\n\n'
  || E'Faturas e portal Stripe ficam em Controle Financeiro. Upgrade/downgrade em /upgrade.\n\n'
  || E'Gestores convidados podem ver o plano, mas alterações de cobrança e tipo de operação são exclusivas do proprietário da assinatura.',
  '/configurar-projeto',
  NULL
);
