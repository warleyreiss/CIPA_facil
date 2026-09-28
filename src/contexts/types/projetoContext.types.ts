import type { AssinaturaModel } from '../../lib/assinaturaService';

export interface StatusOnboarding {
  temEquipamento: boolean;
  temCargo: boolean;
  temColaborador: boolean;
  onboardingConcluido: boolean;
  isNovato: boolean; 
  periodicidadeTroca: boolean; 
  controleEstoque: boolean;
  /** Janela de iminência (projetos.dias_iminencia_troca). Padrão 3. */
  diasIminenciaTroca: number;
  /** Projetos.obrigar_guia_tamanhos_colaborador — exibe/exige guias no colaborador. */
  guiaTamanhosAtiva: boolean;
}

export type StatusAcesso = 
  | 'ATIVO' 
  | 'INATIVO_ADMIN' 
  | 'ASSINATURA_CANCELADA' 
  | 'ASSINATURA_INADIMPLENTE_TOLERANCIA' 
  | 'ASSINATURA_INADIMPLENTE_BLOQUEADO';

export interface ProjetoContextType {
  userData: any;
  projetoId: string | null;
  projetoNome: string | null;
  projetoLogo: string | null;
  funcaoUsuario: string | null; 
  isBlocked: boolean;
  statusAcesso: StatusAcesso; // NOVO: Controle refinado de UX
  isOverlayVisible: boolean; 
  authResolvido: boolean;
  authError: string | null;
  emailConfirmado: boolean;
  planoStatus: string | null;
  assinatura: any | null;
  statusOnboarding: StatusOnboarding | null;
  /** ID do projeto ao qual statusOnboarding se refere (null se ainda carregando). */
  statusProjetoId: string | null;
  isModalSelecaoOpen: boolean; 
  setIsModalSelecaoOpen: (open: boolean) => void; 
  inicializarUsuario: (user: any, isSilent?: boolean, force?: boolean) => Promise<void>; 
  selecionarProjeto: (id: string, nome: string, logo: string | null, usuarioIdOverride?: string | null) => void;
  atualizarStatusOnboarding: () => Promise<void>;
  /** Atualiza a assinatura em memória (ex.: tipo de operação). */
  setAssinatura: (next: Partial<AssinaturaModel> | null) => void;
  planoGratuito: boolean;
}