import { useCallback, useEffect, useRef, useState } from 'react';
import { useProjeto } from '../ProjetoContext';
import {
  buscarLimitesPlanoComFallback,
  contarProjetosAssinatura,
  limiteConsumoAtingido,
} from '../../lib/limitesPlanoUtils';

export function useLimitePlano() {
  const { assinatura, projetoId } = useProjeto();
  const assinaturaRef = useRef(assinatura);
  assinaturaRef.current = assinatura;

  const [uso, setUso] = useState(0);
  const [limite, setLimite] = useState(0);
  const [carregando, setCarregando] = useState(true);

  const assinaturaId = assinatura?.id ?? null;
  const planoRegraId = assinatura?.plano_regra_id ?? assinatura?.stripe_price_id ?? null;

  const carregarLimites = useCallback(async (signal: { cancelado: boolean }) => {
    const assinaturaAtual = assinaturaRef.current;

    if (!assinaturaAtual?.id) {
      setUso(0);
      setLimite(0);
      setCarregando(false);
      return;
    }

    setCarregando(true);

    try {
      const limites = await buscarLimitesPlanoComFallback(assinaturaAtual);
      const usoAtual = await contarProjetosAssinatura(assinaturaAtual.id, projetoId);

      if (signal.cancelado) return;

      setLimite(limites.quantidade_projetos);
      setUso(usoAtual);
    } catch (err) {
      console.error('Erro ao carregar limites do plano:', err);
    } finally {
      if (!signal.cancelado) setCarregando(false);
    }
  }, [projetoId]);

  useEffect(() => {
    const signal = { cancelado: false };
    carregarLimites(signal);
    return () => {
      signal.cancelado = true;
    };
  }, [carregarLimites, assinaturaId, planoRegraId]);

  const planoTipo = assinatura?.plano_tipo || 'INICIANTE';

  return {
    uso,
    limite,
    planoTipo,
    carregando,
    limiteAtingido: limiteConsumoAtingido(uso, limite),
    atualizar: () => carregarLimites({ cancelado: false }),
  };
}
