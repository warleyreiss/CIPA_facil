import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import {
  avaliarStatusAcesso,
  isBloqueioFinanceiro,
  type AssinaturaModel,
} from '../../lib/assinaturaService';
import type { StatusAcesso } from '../types/projetoContext.types';
import {
  assinaturaSemanticamenteIgual,
  mesclarAssinatura,
} from '../utils/contextStateUtils';

function aplicarResultadoAcesso(
  statusUsuario: boolean,
  assData: Partial<AssinaturaModel> | null | undefined,
  setStatusAcesso: (s: StatusAcesso | ((prev: StatusAcesso) => StatusAcesso)) => void,
  setIsBlocked: (b: boolean | ((prev: boolean) => boolean)) => void,
  setPlanoStatus: (s: string | null | ((prev: string | null) => string | null)) => void
) {
  const novoStatusAcesso = avaliarStatusAcesso(statusUsuario, assData);
  const novoPlanoStatus = assData?.plano_status ?? null;
  const novoIsBlocked = statusUsuario === false || isBloqueioFinanceiro(novoStatusAcesso);

  setStatusAcesso((prev) => (prev === novoStatusAcesso ? prev : novoStatusAcesso));
  setPlanoStatus((prev) => (prev === novoPlanoStatus ? prev : novoPlanoStatus));
  setIsBlocked((prev) => (prev === novoIsBlocked ? prev : novoIsBlocked));

  return novoStatusAcesso;
}

export function useAssinatura(userId: string | null) {
  const [assinatura, setAssinaturaState] = useState<Partial<AssinaturaModel> | null>(null);
  const [planoStatus, setPlanoStatus] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [statusAcesso, setStatusAcesso] = useState<StatusAcesso>('ATIVO');

  const assinaturaRef = useRef(assinatura);
  const userAtivoRef = useRef(true);

  useEffect(() => {
    assinaturaRef.current = assinatura;
  }, [assinatura]);

  const setAssinatura = useCallback((next: Partial<AssinaturaModel> | null) => {
    setAssinaturaState((prev) => {
      if (assinaturaSemanticamenteIgual(prev, next)) return prev;
      const resolved = next ?? null;
      assinaturaRef.current = resolved;
      return resolved;
    });
  }, []);

  const avaliarAcesso = useCallback((statusUsuario: boolean, assData: Partial<AssinaturaModel> | null | undefined) => {
    userAtivoRef.current = statusUsuario !== false;
    return avaliarStatusAcesso(statusUsuario, assData);
  }, []);

  const sincronizarAcesso = useCallback((
    statusUsuario: boolean,
    assData: Partial<AssinaturaModel> | null | undefined
  ) => {
    userAtivoRef.current = statusUsuario !== false;
    return aplicarResultadoAcesso(statusUsuario, assData, setStatusAcesso, setIsBlocked, setPlanoStatus);
  }, []);

  useEffect(() => {
    if (!userId) return;

    const canalUsuario = supabase
      .channel(`status_usuarios_${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'usuarios', filter: `id=eq.${userId}` },
        (payload) => {
          const novoStatus = payload.new?.status;
          sincronizarAcesso(novoStatus !== false, assinaturaRef.current);
        }
      )
      .subscribe();

    const canalAssinatura = supabase
      .channel(`status_assinaturas_${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'assinaturas', filter: `proprietario_id=eq.${userId}` },
        (payload) => {
          const novaAss = mesclarAssinatura(assinaturaRef.current, payload.new as Record<string, unknown>);
          if (assinaturaSemanticamenteIgual(assinaturaRef.current, novaAss)) return;

          setAssinaturaState(novaAss);
          assinaturaRef.current = novaAss;
          sincronizarAcesso(userAtivoRef.current, novaAss);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canalUsuario);
      supabase.removeChannel(canalAssinatura);
    };
  }, [userId, sincronizarAcesso]);

  const limparAssinatura = useCallback(() => {
    setAssinaturaState(null);
    setPlanoStatus(null);
    setIsBlocked(false);
    setStatusAcesso('ATIVO');
    assinaturaRef.current = null;
    userAtivoRef.current = true;
  }, []);

  return {
    assinatura,
    planoStatus,
    isBlocked,
    statusAcesso,
    setAssinatura,
    setPlanoStatus,
    setIsBlocked,
    setStatusAcesso,
    avaliarAcesso,
    sincronizarAcesso,
    limparAssinatura,
  };
}
