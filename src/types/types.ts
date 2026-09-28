// src/types/types.ts

export interface PlanoRegra {
  stripe_price_id: string;
  quantidade_projetos?: number;
  nome_plano?: string | null;
}

export interface Epi {
  id: string;
  status: boolean;
  projeto_id: string;
  epi_catalogo_id: string;
  catalogo_tamanho_id: string;
  prazo_troca_dias?: number;
  estoque_minimo?: number;
  estoque_ideal?: number;
  estoque_atual?: number;
  valor_unitario_atual?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Fornecedor {
  id: string;
  projeto_id?: string | null;
  razao_social: string;
  nome_contato?: string | null;
  email_contato?: string | null;
  telefone_contato?: string | null;
  status?: string;
  created_at?: string;
}

export interface RegistroEntrada {
  id: string;
  projeto_id?: string | null;
  fornecedor_id?: string | null;
  epi_id?: string | null;
  nota_fiscal?: string | null;
  quantidade: number;
  valor_unitario: number;
  data_entrada?: string;
  created_at?: string;
}

export interface CargoFuncao {
  id: string;
  status: boolean;
  projeto_id?: string | null;
  ghe_id?: string | null;
  nomenclatura: string;
  epi_catalogo_ids?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface Colaborador {
  id: string;
  projeto_id?: string | null;
  nome: string;
  cpf?: string | null;
  data_admissao: string;
  cargo_funcao_id?: string | null;
  inscricao?: string | null;
  validade_treinamento_altura?: string | null;
  tamanho_calcado_id?: string | null;
  tamanho_luva_id?: string | null;
  tamanho_respirador_id?: string | null;
  tamanho_vestimenta_inf_id?: string | null;
  tamanho_vestimenta_sup_id?: string | null;
  numero_cracha?: string | null;
  numero_cartao?: string | null;
  status: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ControleEpi {
  id: string;
  epi_catalogo_id: string;
  projeto_id?: string | null;
  colaborador_id?: string | null;
  epi_id?: string | null;
  ca_numero?: string | null;
  motivo_acao?: 'LANÇAMENTO INICIAL' | 'TROCA PERIODICA' | 'TROCA PREMATURA' | 'PERCA OU EXTRAVIO' | 'ADIÇÃO PARA FUNÇÃO' | 'TROCA DE FUNÇÃO' | 'EMERGENCIAL' | null;
  observacao?: string | null;
  quantidade?: number;
  data_fornecimento?: string | null;
  status?: boolean;
  created_at?: string;
}

export interface HistoricoControleEpi {
  id: string;
  epi_catalogo_id?: string | null;
  projeto_id?: string | null;
  colaborador_id?: string | null;
  epi_id?: string | null;
  ca_numero?: string | null;
  data_fornecimento?: string | null;
  motivo_acao?: string | null;
  quantidade?: number | null;
  observacao?: string | null;
}

export interface Ghe {
  id: string;
  status: boolean;
  projeto_id?: string | null;
  descricao: string;
  created_at?: string;
}

/** @deprecated Use Ghe */
export type Setor = Ghe;

export interface HistoricoCargo {
  id: string;
  projeto_id: string;
  colaborador_id: string;
  cargo_funcao_id_anterior?: string | null;
  cargo_funcao_id_novo: string;
  motivo?: string | null;
  data_alteracao?: string;
  created_at?: string;
}

export interface CatalogoTamanho {
  id: string;
  guia_tamanho: number;
  descricao: string;
  created_at?: string;
}

export interface EpiCatalogo {
  id: string;
  descricao: string;
  classificacao?: string | null;
  guia_tamanho_catalogo: number;
  obrigatorio_ca: boolean;
  created_at?: string;
}

export interface HistoricoAlteracaoCargoFuncao {
  id: string;
  cargo_funcao_id: string;
  epi_catalogo_epis: string[];
  data_alteracao?: string;
}

export interface Assinatura {
  id: string;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_price_id?: string | null;
  proprietario_id?: string | null;
  assinatura_tipo?: 'AUTONOMO' | 'EMPRESARIAL' | null;
  plano_tipo?: 'INICIANTE' | 'PRO' | 'GESTOR' | 'DESENVOLVIMENTO' | null;
  plano_status?: 'active' | 'past_due' | 'unpaid' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'trialing' | 'paused' | null;
  plano_regra_id?: string | null;
  proxima_fatura?: string | null;
  plano_fim_periodo?: string | null;
  data_falha_pagamento?: string | null;
  dias_tolerancia?: number;
  cancel_at_period_end?: boolean;
  data_inicio?: string;
  created_at?: string;
  stripe_latest_invoice_url?: string | null;
  cancel_at?: string | null;
  motivo_falha?: string | null;
  cortesia?: boolean;
  cortesia_em?: string | null;
  cortesia_motivo?: string | null;
}

export interface Usuario {
  id: string;
  email: string;
  nome_completo?: string | null;
  telefone?: string | null;
  foto_url?: string | null;
  status?: boolean;
  assinatura_id?: string | null;
  onboarding_concluido: boolean;
  status_cadastro?: string;
  created_at?: string;
}

export interface Projeto {
  id: string;
  assinatura_id: string;
  nome?: string | null;
  cnpj?: string | null;
  razao_social?: string | null;
  inscricao_estadual?: string | null;
  inscricao_municipal?: string | null;
  cnae?: string | null;
  regime_tributario?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  logo_url?: string | null;
  periodicidade_troca?: boolean;
  controle_estoque?: boolean;
  /** Dias (inclusivos) para status IMINENTE no controle EPI. Padrão 3. */
  dias_iminencia_troca?: number;
  notificar_vencimentos_email?: boolean;
  notificar_vencimentos_whatsapp?: boolean;
  telefone_whatsapp_notificacao?: string | null;
  /** Preenchido após OTP bem-sucedido (Edge Function verificar-whatsapp-alerta). */
  telefone_whatsapp_verificado_em?: string | null;
  assinatura_digital_modo?: 'PADRAO' | 'CODIGO_BARRAS' | 'RFID' | 'BIOMETRIA';
  obrigar_cracha_colaborador?: boolean;
  obrigar_cartao_colaborador?: boolean;
  obrigar_guia_tamanhos_colaborador?: boolean;
  validacao_digital?: boolean;
  status?: boolean;
  created_at?: string;
}

export interface MembroProjeto {
  id: string;
  assinatura_id: string;
  usuario_id: string;
  projeto_id: string;
  funcao: 'GESTOR' | 'COLABORADOR';
  status?: boolean;
  created_at?: string;
}

export interface LogWebhook {
  id: string;
  event_id?: string | null;
  event_type?: string | null;
  payload?: Record<string, any> | null;
  status?: string | null;
  created_at?: string;
}

export interface LogAssinaturaAuditoria {
  id: string;
  assinatura_id?: string | null;
  status_antigo?: string | null;
  status_novo?: string | null;
  alterado_por?: string | null;
  created_at?: string;
}

export type ComunicadoTipo = 'info' | 'aviso' | 'manutencao' | 'critico';

export interface ComunicadoSistema {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: ComunicadoTipo | string;
  ativo: boolean;
  prioridade: number;
  inicia_em: string;
  expira_em: string | null;
  created_at: string;
  /** NULL/vazio = todos os planos */
  planos_alvo?: string[] | null;
  /** NULL/vazio = todos os tipos (AUTONOMO / EMPRESARIAL) */
  assinatura_tipos_alvo?: string[] | null;
}