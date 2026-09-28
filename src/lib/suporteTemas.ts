/**
 * Slugs estáveis para deep-link na Central de Ajuda (?tema=slug).
 * Cada slug corresponde ao titulo exato em suporte_orientacoes (seed/migrations).
 */
export const SUPORTE_TEMAS = {
  primeiros_passos: 'Por onde começo após criar minha conta?',
  tour_onboarding: 'O que é o tour de boas-vindas (onboarding)?',
  email_confirmacao: 'Não recebi o e-mail de confirmação de cadastro',
  esqueci_senha: 'Esqueci minha senha — como recuperar?',
  selecionar_projeto: 'Tela "Seus Projetos" não fecha / preciso escolher um projeto',
  criar_projeto: 'Como criar um novo projeto?',
  alternar_projeto: 'Como alternar entre projetos?',
  limites_iniciante: 'Quais são os limites do plano Iniciante (gratuito)?',
  limite_botao_novo: 'Botão "Novo" desabilitado — limite atingido',
  upgrade_plano: 'Como fazer upgrade do plano?',
  downgrade_plano: 'Como fazer downgrade ou voltar ao plano gratuito?',
  faturas_cobranca: 'Onde vejo faturas e dados de cobrança?',
  pagamento_pendente: 'Pagamento pendente — ainda consigo usar o sistema?',
  tela_bloqueada: 'Tela bloqueada — assinatura pausada ou inadimplente',
  dashboard_uso: 'Como usar a Dashboard analítica?',
  dashboard_indices: 'O que significam os índices executivos?',
  dashboard_indices_cepi: 'O que significam os índices executivos?',
  dashboard_exportar_csv: 'Como exportar dados da Dashboard (CSV)?',
  dashboard_indicadores_vazios: 'Por que meus indicadores estão zerados?',
  central_alertas: 'O que são os alertas do sino (Central de alertas)?',
  cadastro_epi: 'Como cadastrar equipamentos (EPIs)?',
  cadastro_epi_variacoes: 'Cadastro simples vs. múltiplo de equipamentos',
  entrada_estoque_pedido: 'O que é Entrada de estoque e Pedido de compras?',
  inativar_equipamento: 'Não consigo inativar um equipamento',
  estoque_tags: 'Tags Crítico, Baixo e Alto no estoque',
  funcoes_ghe: 'O que são Funções e como vincular EPIs?',
  menu_funcoes_bloqueado: 'Menu Funções bloqueado no plano Iniciante',
  funcao_sem_epi: 'Posso salvar uma função sem EPI vinculado?',
  inativar_funcao: 'Não consigo inativar uma função',
  cadastro_colaborador: 'Como cadastrar colaboradores?',
  menu_colaboradores_bloqueado: 'Menu Colaboradores bloqueado no plano Iniciante',
  colaborador_vs_usuario: 'Colaborador vs. usuário convidado — qual a diferença?',
  alterar_cargo: 'Alterei o cargo do colaborador — o que acontece?',
  controle_epi: 'O que é Controle EPI?',
  historico_fornecimento: 'Como consultar o histórico de fornecimento de EPI?',
  registrar_entrega: 'Como registrar entrega (fornecimento) de EPI?',
  status_prazo: 'Status Vencido, Iminente, Pendente e No prazo',
  erro_ca: 'Erro ao validar CA (Certificado de Aprovação)',
  ca_vencido_confirmar: 'CA vencido — posso confirmar mesmo assim?',
  lancamento_retroativo: 'Lançamento retroativo — o que muda no sistema?',
  estorno_fornecimento: 'Como estornar um fornecimento de EPI?',
  estorno_entrada_estoque: 'Como estornar uma entrada de estoque?',
  periodicidade_estoque: 'Periodicidade de troca e Controle de estoque',
  validacao_digital: 'Validação digital no fornecimento de EPI',
  esocial_s2240: 'Como exportar o gabarito S-2240 para o eSocial?',
  esocial_cpf_pendente: 'CPF pendente no gabarito S-2240',
  esocial_lista_vazia: 'Por que a lista S-2240 está vazia?',
  esocial_admissao_alteracao: 'Admissão vs Alteração no S-2240',
  esocial_checklist_sim: 'Checklist pré-preenchido — o que revisar antes de transmitir?',
  comunicados_sistema: 'Comunicados do sistema — o que significam?',
  convidar_usuario: 'Como convidar outro usuário para o projeto?',
  excluir_projeto: 'Posso excluir um projeto?',
  importacao_wizard: 'Como importar dados iniciais do projeto?',
  consulta_ca_avulsa: 'Como consultar um CA (Certificado de Aprovação)?',
  matriz_epi_colaborador: 'O que é a matriz de EPIs por colaborador?',
  historico_trocas_funcao: 'Como ver o histórico de trocas de função?',
  historico_inativados: 'Como consultar colaboradores inativados?',
  colaboradores_sem_cpf: 'Colaboradores sem CPF — o que fazer?',
  historico_alteracao_funcoes: 'Histórico de alterações de EPIs por função',
  modo_emergencial: 'O que é o modo emergencial no fornecimento?',
  inativar_colaborador: 'Como inativar um colaborador?',
  recurso_bloqueado_plano: 'Recurso bloqueado — preciso fazer upgrade?',
  importar_epi_outro_projeto: 'Como importar equipamentos de outro projeto?',
  nfe_xml_entrada: 'Como importar NF-e (XML) na entrada de estoque?',
  pedido_emails_fornecedores: 'Como disparar e-mails do pedido de compras?',
  logo_padrao_assinatura: 'O que é logo padrão da assinatura?',
  definir_senha: 'Como definir ou redefinir minha senha?',
  informacoes_assinatura: 'Onde vejo dados do plano e da assinatura?',
} as const;

export type SuporteTemaSlug = keyof typeof SUPORTE_TEMAS;

export function tituloSuporteTema(slug: SuporteTemaSlug): string {
  return SUPORTE_TEMAS[slug];
}

export function urlSuportePorTema(slug: SuporteTemaSlug): string {
  return `/suporte?tema=${encodeURIComponent(slug)}`;
}
