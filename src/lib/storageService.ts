/**
 * Centraliza chaves e operações de localStorage / sessionStorage do app.
 */

export const STORAGE_KEYS = {
  theme: 'app-theme-mode',
  sidebarLocked: 'sidebar-locked',
  lgpdAceite: 'lgpd_aceite',
  prefReciboEpi: 'pref_recibo_epi',
  projetoId: 'projetoAtivoId',
  projetoNome: 'projetoAtivoNome',
  projetoLogo: 'projetoAtivoLogo',
  projetoUserId: 'projetoAtivoUserId',
} as const;

export const SESSION_KEYS = {
  throttleUltimoAcesso: 'cepi_ultimo_acesso_registrado',
  tempNome: 'temp_nome',
  tempEmpresa: 'temp_empresa',
  pendingRegistration: 'pending_registration_data',
  /** E-mail aguardando confirmação (signup sem sessão) */
  pendingEmailConfirm: 'cepi_pending_email_confirm',
  targetPlan: 'targetPlan',
  /** 'upgrade' | 'downgrade' — tela /sucesso-upgrade */
  planoChangeMode: 'plano_change_mode',
  parceiroCodigo: 'parceiro_indicacao_codigo',
} as const;

export const PREFIXO_ALERTAS_DISMISS = 'cepi_alertas_dismiss_';
const PREFIXO_PROJETO_ULTIMO_ACESSO = 'projeto_ultimo_acesso_';

export function chaveDismissAlertas(projetoId: string): string {
  return `${PREFIXO_ALERTAS_DISMISS}${projetoId}`;
}

export function chaveUltimoAcessoProjeto(projetoId: string): string {
  return `${PREFIXO_PROJETO_ULTIMO_ACESSO}${projetoId}`;
}

export function marcarUltimoAcessoProjeto(projetoId: string): void {
  if (!projetoId) return;
  safeSetItem(localStorage, chaveUltimoAcessoProjeto(projetoId), new Date().toISOString());
}

export function lerUltimoAcessoProjeto(projetoId: string): string | null {
  if (!projetoId) return null;
  return safeGetItem(localStorage, chaveUltimoAcessoProjeto(projetoId));
}

/** Ex.: "agora", "há 2 h", "há 3 d", "12/03/26" */
export function formatarUltimoAcessoRelativo(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return null;
  const diffMs = Date.now() - dt.getTime();
  if (diffMs < 0) return 'agora';
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 14) return `há ${d} d`;
  return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function safeGetItem(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(storage: Storage, key: string, value: string): void {
  try {
    storage.setItem(key, value);
  } catch {
    /* quota / modo privado */
  }
}

function safeRemoveItem(storage: Storage, key: string): void {
  try {
    storage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function lerProjetoIdBruto(): string | null {
  const id = safeGetItem(localStorage, STORAGE_KEYS.projetoId);
  if (!id || id === 'null' || id === 'undefined') return null;
  return id;
}

export function limparProjetoPersistido(): void {
  safeRemoveItem(localStorage, STORAGE_KEYS.projetoId);
  safeRemoveItem(localStorage, STORAGE_KEYS.projetoNome);
  safeRemoveItem(localStorage, STORAGE_KEYS.projetoLogo);
  safeRemoveItem(localStorage, STORAGE_KEYS.projetoUserId);
}

export function salvarProjetoPersistido(params: {
  id: string;
  nome: string;
  logo?: string | null;
  userId: string;
}): void {
  const { id, nome, logo, userId } = params;
  if (!id || id === 'null' || id === 'undefined' || !userId) return;

  safeSetItem(localStorage, STORAGE_KEYS.projetoId, id);
  safeSetItem(localStorage, STORAGE_KEYS.projetoNome, nome);
  safeSetItem(localStorage, STORAGE_KEYS.projetoUserId, userId);

  if (logo) {
    safeSetItem(localStorage, STORAGE_KEYS.projetoLogo, logo);
  } else {
    safeRemoveItem(localStorage, STORAGE_KEYS.projetoLogo);
  }
}

/**
 * Valida projeto salvo para o usuário atual.
 * Remove dados incompletos ou de outro usuário (ex.: troca de conta no mesmo navegador).
 */
export function sanitizarProjetoPersistido(usuarioId: string): string | null {
  const id = lerProjetoIdBruto();
  if (!id) return null;

  const donoSalvo = safeGetItem(localStorage, STORAGE_KEYS.projetoUserId);
  const nome = safeGetItem(localStorage, STORAGE_KEYS.projetoNome);

  if (!donoSalvo || !nome || donoSalvo !== usuarioId) {
    limparProjetoPersistido();
    return null;
  }

  return id;
}

export function lerProjetoSalvoParaUsuario(
  usuarioId: string | null | undefined
): string | null {
  if (!usuarioId) return null;
  return sanitizarProjetoPersistido(usuarioId);
}

/** Limpa dados temporários de sessão (sessionStorage). Mantém projeto no localStorage para o mesmo usuário. */
export function limparDadosSessaoAplicacao(): void {
  if (typeof window === 'undefined') return;

  safeRemoveItem(sessionStorage, SESSION_KEYS.throttleUltimoAcesso);
  safeRemoveItem(sessionStorage, SESSION_KEYS.tempNome);
  safeRemoveItem(sessionStorage, SESSION_KEYS.tempEmpresa);
  safeRemoveItem(sessionStorage, SESSION_KEYS.pendingRegistration);
  safeRemoveItem(localStorage, 'cepi_pending_registration_backup');
  safeRemoveItem(sessionStorage, SESSION_KEYS.pendingEmailConfirm);
  safeRemoveItem(sessionStorage, SESSION_KEYS.targetPlan);
  safeRemoveItem(sessionStorage, SESSION_KEYS.planoChangeMode);
  safeRemoveItem(sessionStorage, SESSION_KEYS.parceiroCodigo);
}

export function lerSidebarLocked(): boolean {
  return safeGetItem(localStorage, STORAGE_KEYS.sidebarLocked) === 'true';
}

export function salvarSidebarLocked(locked: boolean): void {
  safeSetItem(localStorage, STORAGE_KEYS.sidebarLocked, String(locked));
}

export function lerLgpdAceite(): boolean {
  return safeGetItem(localStorage, STORAGE_KEYS.lgpdAceite) === 'true';
}

export function salvarLgpdAceite(): void {
  safeSetItem(localStorage, STORAGE_KEYS.lgpdAceite, 'true');
}

export function lerPrefReciboEpi(): string {
  return safeGetItem(localStorage, STORAGE_KEYS.prefReciboEpi) || 'imprimir';
}

export function salvarPrefReciboEpi(valor: string): void {
  safeSetItem(localStorage, STORAGE_KEYS.prefReciboEpi, valor);
}

// ── Importação / onboarding por projeto ─────────────────────────────────────

const PREFIXO_WIZARD_VISTO = 'importacao_wizard_visto_';
const PREFIXO_WIZARD_PENDENTE = 'importacao_wizard_pendente_';
const PREFIXO_IMPORTACAO_REALIZADA = 'importacao_realizada_';

export function chaveWizardImportacaoVisto(projetoId: string): string {
  return `${PREFIXO_WIZARD_VISTO}${projetoId}`;
}

export function chaveWizardImportacaoPendente(projetoId: string): string {
  return `${PREFIXO_WIZARD_PENDENTE}${projetoId}`;
}

export function chaveImportacaoRealizada(projetoId: string): string {
  return `${PREFIXO_IMPORTACAO_REALIZADA}${projetoId}`;
}

export function marcarWizardImportacaoVisto(projetoId: string): void {
  safeSetItem(localStorage, chaveWizardImportacaoVisto(projetoId), '1');
  safeRemoveItem(localStorage, chaveWizardImportacaoPendente(projetoId));
}

export function wizardImportacaoJaVisto(projetoId: string): boolean {
  return safeGetItem(localStorage, chaveWizardImportacaoVisto(projetoId)) === '1';
}

/** Marca que o wizard deve abrir na próxima entrada neste projeto (criação / 1º cadastro). */
export function marcarWizardImportacaoPendente(projetoId: string): void {
  if (!projetoId) return;
  // Garante reabertura mesmo se uma flag "visto" foi gravada por race de status antigo
  safeRemoveItem(localStorage, chaveWizardImportacaoVisto(projetoId));
  safeSetItem(localStorage, chaveWizardImportacaoPendente(projetoId), '1');
}

export function wizardImportacaoPendente(projetoId: string): boolean {
  return safeGetItem(localStorage, chaveWizardImportacaoPendente(projetoId)) === '1';
}

export function marcarImportacaoRealizada(projetoId: string): void {
  safeSetItem(localStorage, chaveImportacaoRealizada(projetoId), '1');
}

/** Importação já concluída neste projeto (flag local ou dados mínimos no banco). */
export function importacaoJaRealizadaNoProjeto(
  projetoId: string,
  status?: {
    temEquipamento: boolean;
    temCargo: boolean;
    temColaborador: boolean;
  } | null,
): boolean {
  if (safeGetItem(localStorage, chaveImportacaoRealizada(projetoId)) === '1') return true;
  if (status?.temEquipamento && status.temCargo && status.temColaborador) return true;
  return false;
}

type StatusDadosBase = {
  temEquipamento: boolean;
  temCargo: boolean;
  temColaborador: boolean;
};

/** Projeto ainda sem dados base — típico de novo cadastro ou projeto recém-criado. */
export function projetoSemDadosBase(
  status?: StatusDadosBase | null,
): boolean {
  if (!status) return false;
  return !status.temEquipamento && !status.temCargo && !status.temColaborador;
}

/**
 * Sequência de onboarding:
 * 1) Wizard importação — novo usuário e projeto novo (vazio + pendente/novato)
 * 2) Apresentacao — só novo usuário (onboarding_concluido = false)
 * 3) Tour config (DadosPrincipais) — novo usuário e projeto novo
 */

/**
 * Wizard de importação inicial:
 * - só em projeto ainda vazio
 * - e somente após criar um projeto novo (flag pendente) OU no 1º cadastro (novato)
 * - nunca ao só selecionar um projeto existente em outro navegador
 */
export function deveExibirWizardImportacao(
  projetoId: string,
  status?: StatusDadosBase | null,
  isNovato = false,
): boolean {
  if (!projetoId || !status) return false;
  if (wizardImportacaoJaVisto(projetoId)) return false;
  if (!projetoSemDadosBase(status)) return false;
  return wizardImportacaoPendente(projetoId) || isNovato;
}

/** Modal Apresentacao — apenas novo usuário (independente de ter importado ou não). */
export function deveExibirOrientacaoOnboarding(isNovato: boolean): boolean {
  return isNovato;
}

// ── Tour de configuração do projeto (spotlight) ───────────────────────────────

const PREFIXO_CONFIG_TOUR_PENDENTE = 'config_tour_pendente_';
const PREFIXO_CONFIG_TOUR_VISTO = 'config_tour_visto_';

export function chaveConfigTourPendente(projetoId: string): string {
  return `${PREFIXO_CONFIG_TOUR_PENDENTE}${projetoId}`;
}

export function chaveConfigTourVisto(projetoId: string): string {
  return `${PREFIXO_CONFIG_TOUR_VISTO}${projetoId}`;
}

/** Agenda o tour obrigatório ao chegar em /configurar-projeto (pós-cadastro / projeto novo). */
export function marcarConfigTourPendente(projetoId: string): void {
  if (!projetoId) return;
  if (safeGetItem(localStorage, chaveConfigTourVisto(projetoId)) === '1') return;
  safeSetItem(localStorage, chaveConfigTourPendente(projetoId), '1');
}

export function configTourPendente(projetoId: string): boolean {
  if (!projetoId) return false;
  if (safeGetItem(localStorage, chaveConfigTourVisto(projetoId)) === '1') return false;
  return safeGetItem(localStorage, chaveConfigTourPendente(projetoId)) === '1';
}

export function marcarConfigTourVisto(projetoId: string): void {
  if (!projetoId) return;
  safeSetItem(localStorage, chaveConfigTourVisto(projetoId), '1');
  safeRemoveItem(localStorage, chaveConfigTourPendente(projetoId));
}

export function deveExibirConfigTour(projetoId: string | null | undefined): boolean {
  if (!projetoId) return false;
  return configTourPendente(projetoId);
}
