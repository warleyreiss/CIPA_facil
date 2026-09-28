/**
 * Matriz de recursos por plano (fonte: matriz-recursos-planos.xlsx).
 * Limites numéricos (projetos / colaboradores / EPIs) continuam em plano_regras.
 */

export type PlanoCodigo = 'INICIANTE' | 'PRO' | 'GESTOR';

export type RecursoId =
  | 'dashboard_gestao_basica'
  | 'dashboard_gestao_avancada'
  | 'dashboard_gestao_custos'
  | 'shell_seletor_projeto'
  | 'shell_criar_projeto'
  | 'shell_alternar_projetos'
  | 'equipamentos_pedido_compras'
  | 'equipamentos_pedido_pdf'
  | 'equipamentos_pedido_emails'
  | 'equipamentos_nfe_xml'
  | 'equipamentos_estorno_nf'
  | 'equipamentos_importar_outro_projeto'
  | 'controle_historico_avancado'
  | 'controle_consulta_ca'
  | 'controle_validacao_codigo_barras'
  | 'controle_validacao_rfid'
  | 'controle_validacao_biometria'
  | 'controle_agente_biometria'
  | 'colab_historico_trocas'
  | 'colab_historico_inativos'
  | 'colab_matriz_epis'
  | 'colab_sem_cpf'
  | 'colab_cpf'
  | 'colab_cracha'
  | 'colab_rfid'
  | 'colab_biometria'
  | 'funcoes_historico_alteracoes'
  | 'esocial_modulo'
  | 'config_alertas_email'
  | 'config_alertas_whatsapp'
  | 'config_otp_whatsapp'
  | 'config_assinatura_modo_padrao'
  | 'config_assinatura_codigo_barras'
  | 'config_assinatura_rfid'
  | 'config_assinatura_biometria'
  | 'config_exigir_identificacao'
  | 'config_logo_padrao'
  | 'config_equipe'
  | 'config_excluir_projeto'
  | 'config_stripe_portal'
  | 'config_upgrade_plano'
  | 'alerta_colab_sem_identificacao'
  | 'conformidade_publicidade_gratuito';

export interface MetaRecurso {
  label: string;
  planos: PlanoCodigo[];
}

/**
 * Identificador do plano gratuito em plano_regras.
 * Troque pelo price do Stripe quando a conta de pagamento do CIPA Fácil existir.
 */
export const STRIPE_PRICE_ID_INICIANTE = 'price_cipa_iniciante';

/**
 * Marcações da planilha (X = liberado).
 */
export const RECURSOS_PLANO: Record<RecursoId, MetaRecurso> = {
  dashboard_gestao_basica: {
    label: 'Dashboard · Gestão básica',
    planos: ['INICIANTE', 'PRO', 'GESTOR'],
  },
  dashboard_gestao_avancada: {
    label: 'Dashboard · Gestão avançada',
    planos: ['PRO', 'GESTOR'],
  },
  dashboard_gestao_custos: {
    label: 'Dashboard · Gestão e redução de custos',
    planos: ['GESTOR'],
  },
  shell_seletor_projeto: {
    label: 'Shell · seletor de projeto ativo',
    planos: ['PRO', 'GESTOR'],
  },
  shell_criar_projeto: {
    label: 'Shell · criar novo projeto',
    planos: ['PRO', 'GESTOR'],
  },
  shell_alternar_projetos: {
    label: 'Shell · alternar entre projetos',
    planos: ['PRO', 'GESTOR'],
  },
  equipamentos_pedido_compras: {
    label: 'Equipamentos · pedido de compras / reposição',
    planos: ['INICIANTE', 'PRO', 'GESTOR'],
  },
  equipamentos_pedido_pdf: {
    label: 'Equipamentos · pedido de compras · imprimir PDF',
    planos: ['INICIANTE', 'PRO', 'GESTOR'],
  },
  equipamentos_pedido_emails: {
    label: 'Equipamentos · pedido de compras · disparar e-mails a fornecedores',
    planos: ['PRO', 'GESTOR'],
  },
  equipamentos_nfe_xml: {
    label: 'Equipamentos · importação de NF-e (XML) na entrada',
    planos: ['PRO', 'GESTOR'],
  },
  equipamentos_estorno_nf: {
    label: 'Equipamentos · estorno de entrada (NF)',
    planos: ['PRO', 'GESTOR'],
  },
  equipamentos_importar_outro_projeto: {
    label: 'Equipamentos · importar cadastro de outro projeto',
    planos: ['PRO', 'GESTOR'],
  },
  controle_historico_avancado: {
    label: 'Controle EPI · histórico de fornecimento (consulta avançada)',
    planos: ['PRO', 'GESTOR'],
  },
  controle_consulta_ca: {
    label: 'Controle EPI · consulta avulsa de CA',
    planos: ['PRO', 'GESTOR'],
  },
  controle_validacao_codigo_barras: {
    label: 'Controle EPI · validação digital (código de barras)',
    planos: ['PRO', 'GESTOR'],
  },
  controle_validacao_rfid: {
    label: 'Controle EPI · validação digital (RFID)',
    planos: ['PRO', 'GESTOR'],
  },
  controle_validacao_biometria: {
    label: 'Controle EPI · validação digital (biometria)',
    planos: ['GESTOR'],
  },
  controle_agente_biometria: {
    label: 'Controle EPI · agente Windows de biometria',
    planos: ['GESTOR'],
  },
  colab_historico_trocas: {
    label: 'Colaboradores · histórico de trocas de função',
    planos: ['PRO', 'GESTOR'],
  },
  colab_historico_inativos: {
    label: 'Colaboradores · histórico de inativados',
    planos: ['PRO', 'GESTOR'],
  },
  colab_matriz_epis: {
    label: 'Colaboradores · matriz de EPIs por colaborador',
    planos: ['PRO', 'GESTOR'],
  },
  colab_sem_cpf: {
    label: 'Colaboradores · consulta sem CPF (pendências eSocial)',
    planos: ['GESTOR'],
  },
  colab_cpf: {
    label: 'Colaboradores · CPF (pré-requisito eSocial)',
    planos: ['GESTOR'],
  },
  colab_cracha: {
    label: 'Colaboradores · número de crachá (validação digital)',
    planos: ['PRO', 'GESTOR'],
  },
  colab_rfid: {
    label: 'Colaboradores · número de cartão RFID',
    planos: ['PRO', 'GESTOR'],
  },
  colab_biometria: {
    label: 'Colaboradores · número de cartão biometria',
    planos: ['GESTOR'],
  },
  funcoes_historico_alteracoes: {
    label: 'Funções · histórico de alterações de EPIs por função',
    planos: ['PRO', 'GESTOR'],
  },
  esocial_modulo: {
    label: 'eSocial · módulo completo',
    planos: ['GESTOR'],
  },
  config_alertas_email: {
    label: 'Configurações · alertas semanais por e-mail',
    planos: ['PRO', 'GESTOR'],
  },
  config_alertas_whatsapp: {
    label: 'Configurações · alertas semanais por WhatsApp',
    planos: ['GESTOR'],
  },
  config_otp_whatsapp: {
    label: 'Configurações · verificação OTP do telefone WhatsApp',
    planos: ['GESTOR'],
  },
  config_assinatura_modo_padrao: {
    label: 'Configurações · assinatura digital · modo padrão',
    planos: ['INICIANTE', 'PRO', 'GESTOR'],
  },
  config_assinatura_codigo_barras: {
    label: 'Configurações · assinatura digital · código de barras',
    planos: ['PRO', 'GESTOR'],
  },
  config_assinatura_rfid: {
    label: 'Configurações · assinatura digital · RFID',
    planos: ['PRO', 'GESTOR'],
  },
  config_assinatura_biometria: {
    label: 'Configurações · assinatura digital · biometria',
    planos: ['GESTOR'],
  },
  config_exigir_identificacao: {
    label: 'Configurações · exigir crachá / cartão / biometria no cadastro',
    planos: ['PRO', 'GESTOR'],
  },
  config_logo_padrao: {
    label: 'Configurações · logo padrão da assinatura',
    planos: ['PRO', 'GESTOR'],
  },
  config_equipe: {
    label: 'Configurações · equipe (convidar / papéis / vínculos)',
    planos: ['GESTOR'],
  },
  config_excluir_projeto: {
    label: 'Configurações · excluir / inativar projeto',
    planos: ['PRO', 'GESTOR'],
  },
  config_stripe_portal: {
    label: 'Configurações · portal Stripe',
    planos: ['PRO', 'GESTOR'],
  },
  config_upgrade_plano: {
    label: 'Configurações · upgrade de plano',
    planos: ['PRO', 'GESTOR'],
  },
  alerta_colab_sem_identificacao: {
    label: 'Alertas · colaborador sem identificação digital',
    planos: ['PRO', 'GESTOR'],
  },
  conformidade_publicidade_gratuito: {
    label: 'Conformidade · publicidade no plano gratuito',
    planos: ['INICIANTE'],
  },
};

const ROTULO_PLANO: Record<PlanoCodigo, string> = {
  INICIANTE: 'Iniciante',
  PRO: 'Pro',
  GESTOR: 'Gestor',
};

export function rotuloPlano(plano: PlanoCodigo): string {
  return ROTULO_PLANO[plano];
}

/**
 * Plano interno (não comercial): DESENVOLVIMENTO / TESTE*.
 */
export function planoEhInterno(raw?: string | null): boolean {
  const t = (raw || '').toUpperCase().trim();
  if (!t) return false;
  return (
    t.includes('DESENVOLVIMENTO') ||
    t.includes('DESENV') ||
    t.includes('TESTE') ||
    t.includes('INTERNO')
  );
}

/**
 * Normaliza o plano comercial. DESENVOLVIMENTO equivale a GESTOR
 * para liberação de recursos.
 * Aliases legados: FREE/GRATUITO/BASICO → INICIANTE; PROFISSIONAL → PRO.
 */
export function normalizarPlanoTipo(raw?: string | null): PlanoCodigo {
  const t = (raw || 'INICIANTE').toUpperCase().trim();
  if (t === 'PRO' || t.startsWith('PRO ') || t.includes('PROFISSIONAL')) return 'PRO';
  if (t.includes('GESTOR')) return 'GESTOR';
  if (planoEhInterno(t)) return 'GESTOR';
  if (
    t.includes('INICIANTE') ||
    t.includes('FREE') ||
    t.includes('GRAT') ||
    t.includes('BASICO') ||
    t.includes('BÁSICO')
  ) {
    return 'INICIANTE';
  }
  return 'INICIANTE';
}

/** True se o código/nome do plano é o gratuito comercial (INICIANTE). */
export function isPlanoGratuito(raw?: string | null): boolean {
  return normalizarPlanoTipo(raw) === 'INICIANTE';
}

/** True se o card/produto de plano é gratuito (flag Stripe, valor 0 ou nome INICIANTE). */
export function isProdutoPlanoGratuito(plano: {
  e_gratuito?: boolean | null;
  valor_num?: number | null;
  valor?: number | string | null;
  nome?: string | null;
  nome_plano?: string | null;
}): boolean {
  if (plano.e_gratuito === true) return true;
  const valorNum = Number(plano.valor_num ?? plano.valor ?? NaN);
  if (Number.isFinite(valorNum) && valorNum === 0) return true;
  return isPlanoGratuito(plano.nome ?? plano.nome_plano);
}

/** Remove planos internos (DESENVOLVIMENTO) do listing comercial de upgrade. */
export function filtrarPlanosComerciais<T extends { nome?: string | null }>(planos: T[]): T[] {
  return planos.filter((p) => !planoEhInterno(p.nome));
}

/**
 * Recurso liberado no plano atual.
 * DESENVOLVIMENTO recebe os mesmos recursos do plano Gestor.
 */
export function temRecurso(planoTipo: string | null | undefined, recurso: RecursoId): boolean {
  const plano = normalizarPlanoTipo(planoTipo);
  return RECURSOS_PLANO[recurso].planos.includes(plano);
}

export function planosDisponiveisRecurso(recurso: RecursoId): PlanoCodigo[] {
  return RECURSOS_PLANO[recurso].planos;
}

export function rotulosPlanosDisponiveis(recurso: RecursoId): string {
  return planosDisponiveisRecurso(recurso).map(rotuloPlano).join(', ');
}

export function recursoPorModoAssinatura(
  modo: string | null | undefined,
): RecursoId {
  const m = (modo || 'PADRAO').toUpperCase();
  if (m === 'CODIGO_BARRAS') return 'config_assinatura_codigo_barras';
  if (m === 'RFID') return 'config_assinatura_rfid';
  if (m === 'BIOMETRIA') return 'config_assinatura_biometria';
  return 'config_assinatura_modo_padrao';
}

export function recursoValidacaoFornecimento(
  modo: string | null | undefined,
): RecursoId {
  const m = (modo || 'PADRAO').toUpperCase();
  if (m === 'CODIGO_BARRAS') return 'controle_validacao_codigo_barras';
  if (m === 'RFID') return 'controle_validacao_rfid';
  if (m === 'BIOMETRIA') return 'controle_validacao_biometria';
  return 'config_assinatura_modo_padrao';
}

/**
 * Destaques comerciais por plano (cards /upgrade, landing).
 * Limites numéricos vêm de plano_regras e entram à parte nos cards.
 */
export const DESTAQUES_COMERCIAIS_PLANO: Record<PlanoCodigo, string[]> = {
  INICIANTE: [
    'Dashboard de gestão básica',
    'Pedido de compras e impressão em PDF',
    'Fornecimento com comprovação padrão',
    'Controle de EPIs, funções e colaboradores',
    'Alertas operacionais no sistema',
    'Inclui publicidade no plano gratuito',
  ],
  PRO: [
    'Tudo do Iniciante, sem publicidade',
    'Múltiplos projetos na mesma assinatura',
    'Dashboard de gestão avançada',
    'Histórico avançado e consulta avulsa de CA',
    'Validação digital por código de barras e RFID',
    'NF-e (XML), estorno e e-mails a fornecedores',
    'Importar cadastros de outro projeto',
    'Alertas semanais por e-mail e matriz de EPIs',
  ],
  GESTOR: [
    'Tudo do Pro',
    'Dashboard de gestão e redução de custos',
    'Gabarito eSocial S-2240',
    'Validação por biometria + agente Windows',
    'CPF, pendências eSocial e identificação biométrica',
    'Equipe com convites, papéis e vínculos por projeto',
    'Alertas semanais por WhatsApp (com OTP)',
  ],
};

export const TAGLINE_COMERCIAL_PLANO: Record<PlanoCodigo, string> = {
  INICIANTE: 'Para começar a organizar',
  PRO: 'Para a maioria das equipes',
  GESTOR: 'Para conformidade e operação em escala',
};

export const DESCRICAO_COMERCIAL_PLANO: Record<PlanoCodigo, string> = {
  INICIANTE:
    'Ideal para conhecer a plataforma e organizar o primeiro ambiente. Limites de uso conforme regras do plano; inclui publicidade.',
  PRO: 'Para equipes que precisam escalar projetos, histórico avançado, validação digital (código de barras/RFID) e operações de estoque.',
  GESTOR:
    'Máxima conformidade: eSocial, biometria, equipe multi-usuário, dashboard de custos e alertas por WhatsApp.',
};

/** Resolve INICIANTE / PRO / GESTOR a partir de nome_plano, tipo ou rótulo de produto. */
export function planoCodigoDeProduto(raw?: string | null): PlanoCodigo {
  return normalizarPlanoTipo(raw);
}

/** Ordem fixa na tela de upgrade: Iniciante → Pro → Gestor → Desenvolvimento → demais. */
export function ordemExibicaoPlanoUpgrade(nomePlano?: string | null): number {
  const t = (nomePlano || '').toUpperCase().trim();
  if (t.includes('INICIANTE')) return 0;
  if (t === 'PRO' || t.startsWith('PRO ') || t.includes('PROFISSIONAL')) return 1;
  if (t.includes('GESTOR')) return 2;
  if (t.includes('DESENV') || t.includes('INTERNO')) return 3;
  return 90;
}

export function ordenarPlanosUpgrade<T extends { nome?: string | null; valor_num?: number | null }>(
  planos: T[],
): T[] {
  return [...planos].sort((a, b) => {
    const oa = ordemExibicaoPlanoUpgrade(a.nome);
    const ob = ordemExibicaoPlanoUpgrade(b.nome);
    if (oa !== ob) return oa - ob;
    return (a.valor_num ?? 0) - (b.valor_num ?? 0);
  });
}

export function destaquesComerciaisPlano(raw?: string | null): string[] {
  return DESTAQUES_COMERCIAIS_PLANO[planoCodigoDeProduto(raw)];
}

export function taglineComercialPlano(raw?: string | null): string {
  return TAGLINE_COMERCIAL_PLANO[planoCodigoDeProduto(raw)];
}

export function descricaoComercialPlano(raw?: string | null): string {
  return DESCRICAO_COMERCIAL_PLANO[planoCodigoDeProduto(raw)];
}
