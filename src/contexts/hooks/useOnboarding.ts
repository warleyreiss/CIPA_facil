import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import type { StatusOnboarding } from '../types/projetoContext.types';
import { statusOnboardingIgual } from '../utils/contextStateUtils';

const REALTIME_DEBOUNCE_MS = 120;

async function buscarStatusOnboarding(uId: string, pId: string | null): Promise<StatusOnboarding | null> {
  const { data: userTable } = await supabase
    .from('usuarios')
    .select('onboarding_concluido')
    .eq('id', uId)
    .single();

  const onboardingConcluido = !!userTable?.onboarding_concluido;

  if (!pId) {
    return {
      temEquipamento: false,
      temCargo: false,
      temColaborador: false,
      onboardingConcluido,
      isNovato: !onboardingConcluido,
      periodicidadeTroca: false,
      controleEstoque: false,
      diasIminenciaTroca: 3,
      guiaTamanhosAtiva: false,
    };
  }

  return {
    temEquipamento: false,
    temCargo: false,
    temColaborador: false,
    onboardingConcluido,
    isNovato: !onboardingConcluido,
    periodicidadeTroca: false,
    controleEstoque: false,
    diasIminenciaTroca: 3,
    guiaTamanhosAtiva: false,
  };
}

export function useOnboarding(userId: string | null, projetoId: string | null) {
  const [statusOnboarding, setStatusOnboarding] = useState<StatusOnboarding | null>(null);
  /** Projeto ao qual o status atual se refere — evita decisão com status stale. */
  const [statusProjetoId, setStatusProjetoId] = useState<string | null>(null);
  const inflightRef = useRef<Map<string, Promise<void>>>(new Map());
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchGenRef = useRef(0);

  const aplicarStatus = useCallback((next: StatusOnboarding, pId: string | null) => {
    setStatusProjetoId(pId);
    setStatusOnboarding((prev) => (statusOnboardingIgual(prev, next) ? prev : next));
  }, []);

  const verificarStatusOnboarding = useCallback(
    async (uId: string, pId: string | null, forcar = false) => {
      if (!uId) return;

      const chave = `${uId}:${pId ?? ''}`;
      const gen = ++fetchGenRef.current;

      if (!forcar) {
        const emAndamento = inflightRef.current.get(chave);
        if (emAndamento) return emAndamento;
      }

      let promessa!: Promise<void>;
      promessa = (async () => {
        try {
          const next = await buscarStatusOnboarding(uId, pId);
          // Descarta resposta se outro fetch (troca de projeto) já começou
          if (gen !== fetchGenRef.current) return;
          if (next) aplicarStatus(next, pId);
        } catch (err) {
          console.error('Erro ao processar mapeamento de onboarding:', err);
        } finally {
          if (inflightRef.current.get(chave) === promessa) {
            inflightRef.current.delete(chave);
          }
        }
      })();

      inflightRef.current.set(chave, promessa);
      return promessa;
    },
    [aplicarStatus]
  );

  const verificarRef = useRef(verificarStatusOnboarding);
  verificarRef.current = verificarStatusOnboarding;

  // Troca de projeto: invalida status e busca de novo (senão o fetch anterior
  // pode ser apagado pelo clear e o Layout fica sem status → nenhum modal abre).
  useEffect(() => {
    setStatusOnboarding(null);
    setStatusProjetoId(null);
    if (!userId || !projetoId) return;
    void verificarRef.current(userId, projetoId, true);
  }, [userId, projetoId]);

  useEffect(() => {
    if (!userId || !projetoId) return;

    const agendarAtualizacao = () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        verificarRef.current(userId, projetoId, true);
      }, REALTIME_DEBOUNCE_MS);
    };

    const canal = supabase
      .channel(`onboarding_projeto_${projetoId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'epis', filter: `projeto_id=eq.${projetoId}` },
        agendarAtualizacao
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cargo_funcoes', filter: `projeto_id=eq.${projetoId}` },
        agendarAtualizacao
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'colaboradores', filter: `projeto_id=eq.${projetoId}` },
        agendarAtualizacao
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'projetos', filter: `id=eq.${projetoId}` },
        agendarAtualizacao
      )
      .subscribe();

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      supabase.removeChannel(canal);
    };
  }, [userId, projetoId]);

  return { statusOnboarding, statusProjetoId, verificarStatusOnboarding };
}
