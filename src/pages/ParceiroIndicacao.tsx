import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { registrarIndicacaoSeValida } from '../lib/parceiroService';

/**
 * Link curto de indicação: /ref/CODIGO ou /r/CODIGO
 * Valida o parceiro antes de gravar na sessão.
 */
export default function ParceiroIndicacao() {
  const { codigo } = useParams<{ codigo: string }>();
  const [destino, setDestino] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!codigo) {
        if (alive) setDestino('/?indicacao=falha');
        return;
      }
      const result = await registrarIndicacaoSeValida(codigo);
      if (!alive) return;
      if (result.ok) {
        setDestino(
          `/?indicacao=ok&parceiro=${encodeURIComponent(result.parceiro.razao_social)}`
        );
      } else {
        setDestino(
          `/?indicacao=falha&codigo=${encodeURIComponent(result.codigoTentado || codigo)}`
        );
      }
    })();
    return () => {
      alive = false;
    };
  }, [codigo]);

  if (!destino) {
    return (
      <div
        style={{
          minHeight: '40vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#64748b',
          fontSize: '0.9rem',
        }}
      >
        Validando indicação do fornecedor…
      </div>
    );
  }

  return <Navigate to={destino} replace />;
}
