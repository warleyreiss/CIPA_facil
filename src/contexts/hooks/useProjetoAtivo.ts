import { useState, useCallback, useRef } from 'react';
import {
  lerProjetoSalvoParaUsuario,
  limparProjetoPersistido,
  salvarProjetoPersistido,
} from '../../lib/storageService';

export { lerProjetoSalvoParaUsuario } from '../../lib/storageService';

export function useProjetoAtivo() {
  const [projetoId, setProjetoId] = useState<string | null>(null);
  const [projetoNome, setProjetoNome] = useState<string | null>(null);
  const [projetoLogo, setProjetoLogo] = useState<string | null>(null);

  const [funcaoUsuario, setFuncaoUsuarioState] = useState<string | null>(null);
  const [isModalSelecaoOpen, setIsModalSelecaoOpenState] = useState<boolean>(false);

  const estadoRef = useRef({ projetoId, projetoNome, projetoLogo });
  estadoRef.current = { projetoId, projetoNome, projetoLogo };

  const setFuncaoUsuario = useCallback((funcao: string | null) => {
    setFuncaoUsuarioState((prev) => (prev === funcao ? prev : funcao));
  }, []);

  const setIsModalSelecaoOpen = useCallback((open: boolean) => {
    setIsModalSelecaoOpenState((prev) => (prev === open ? prev : open));
  }, []);

  const selecionarProjeto = useCallback(
    (id: string, nome: string, logo: string | null = null, usuarioId?: string | null) => {
      if (!id || id === 'null' || id === 'undefined') return;
      if (!usuarioId) return;

      const atual = estadoRef.current;
      const mesmoProjeto =
        atual.projetoId === id &&
        atual.projetoNome === nome &&
        atual.projetoLogo === logo;

      if (mesmoProjeto) return;

      setProjetoId(id);
      setProjetoNome(nome);
      setProjetoLogo(logo);

      salvarProjetoPersistido({ id, nome, logo, userId: usuarioId });
    },
    []
  );

  const resetProjetoSessao = useCallback(() => {
    setProjetoId(null);
    setProjetoNome(null);
    setProjetoLogo(null);
    setFuncaoUsuarioState(null);
    setIsModalSelecaoOpenState(false);
  }, []);

  const limparProjeto = useCallback(() => {
    resetProjetoSessao();
    limparProjetoPersistido();
  }, [resetProjetoSessao]);

  return {
    projetoId,
    projetoNome,
    projetoLogo,
    funcaoUsuario,
    isModalSelecaoOpen,
    setFuncaoUsuario,
    setIsModalSelecaoOpen,
    selecionarProjeto,
    resetProjetoSessao,
    limparProjeto,
  };
};

export type VinculoProjeto = {
  projeto_id: string;
  funcao: string;
  projetos: { nome?: string; logo_url?: string | null } | { nome?: string; logo_url?: string | null }[] | null;
};

export function resolverProjetoAtivo(
  vinculos: VinculoProjeto[],
  usuarioId: string,
  planoGratuito: boolean
): {
  abrirSelecao: boolean;
  vinculo?: VinculoProjeto;
  funcaoFallback?: string | null;
} {
  let projetoSalvoId = lerProjetoSalvoParaUsuario(usuarioId);

  if (projetoSalvoId && !vinculos.some((v) => v.projeto_id === projetoSalvoId)) {
    limparProjetoPersistido();
    projetoSalvoId = null;
  }

  if (vinculos.length === 0) {
    // Sem vínculo: só planos pagos precisam da tela de seleção/criação.
    // Plano gratuito cria o projeto no fluxo de cadastro — se chegar aqui vazio, ainda abre.
    return { abrirSelecao: true, funcaoFallback: 'GESTOR' };
  }

  // Plano gratuito (1 projeto) ou único vínculo: sempre auto-seleciona,
  // mesmo sem projeto no localStorage.
  if (vinculos.length === 1 || planoGratuito) {
    const vinculo =
      (projetoSalvoId
        ? vinculos.find((v) => v.projeto_id === projetoSalvoId)
        : undefined) ?? vinculos[0];

    return { abrirSelecao: false, vinculo };
  }

  const vinculoSalvo = projetoSalvoId
    ? vinculos.find((v) => v.projeto_id === projetoSalvoId)
    : undefined;

  if (vinculoSalvo) {
    return { abrirSelecao: false, vinculo: vinculoSalvo };
  }

  const vinculoGestor = vinculos.find((v) => v.funcao === 'GESTOR');
  return {
    abrirSelecao: true,
    funcaoFallback: vinculoGestor?.funcao ?? vinculos[0]?.funcao ?? null,
  };
}

export function dadosProjetoDeVinculo(vinculo: VinculoProjeto) {
  const dados = Array.isArray(vinculo.projetos) ? vinculo.projetos[0] : vinculo.projetos;
  return {
    id: vinculo.projeto_id,
    nome: dados?.nome || 'Meu Projeto',
    logo: dados?.logo_url ?? null,
    funcao: vinculo.funcao,
  };
}
