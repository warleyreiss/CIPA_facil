import { createContext } from 'react';
import type { ProjetoContextType } from './types/projetoContext.types';

/**
 * Instância isolada do Context — arquivo estável para o Fast Refresh
 * não recriar o objeto Context ao editar a lógica do Provider (causa
 * "useProjeto deve ser usado dentro de um ProjetoProvider" com tela branca).
 */
export const ProjetoContext = createContext<ProjetoContextType | undefined>(undefined);
