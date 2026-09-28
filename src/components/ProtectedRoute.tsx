import { useEffect, useState, type ReactElement } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useProjeto } from '../contexts/ProjetoContext';
import SelecaoProjeto from '../components/SelecaoProjeto';
import LoadingOverlay, { BOOT_VIGNETTE_EXIT_MS } from '../components/LoadingOverlay';
import { rotaSemProjeto } from '../lib/rotasSemProjeto';

/**
 * Gate de autenticação.
 * Aceita `children` (Layout) OU renderiza <Outlet /> — um único nível de Outlet
 * para as páginas (evita Outlet aninhado vazio no RR7).
 */
export default function ProtectedRoute({ children }: { children?: ReactElement }) {
  const {
    userData,
    isOverlayVisible,
    authResolvido,
    emailConfirmado,
    projetoId,
  } = useProjeto();
  const location = useLocation();

  const gateBusy = !authResolvido || isOverlayVisible;
  const [showVignette, setShowVignette] = useState(gateBusy);

  useEffect(() => {
    if (gateBusy) {
      setShowVignette(true);
      return;
    }
    const t = window.setTimeout(() => setShowVignette(false), BOOT_VIGNETTE_EXIT_MS + 40);
    return () => window.clearTimeout(t);
  }, [gateBusy]);

  let body = null;

  if (authResolvido) {
    if (!userData) {
      body = <Navigate to="/login" state={{ from: location }} replace />;
    } else if (userData.status_cadastro === 'PENDENTE') {
      body = <Navigate to="/definir-senha" replace />;
    } else if (!emailConfirmado) {
      body = <Navigate to="/verificar-email" replace />;
    } else {
      const estaEmRotaSemProjeto = rotaSemProjeto(location.pathname);
      const precisaSelecionarProjeto = !projetoId && !estaEmRotaSemProjeto;
      if (precisaSelecionarProjeto) {
        body = <SelecaoProjeto obrigatorio />;
      } else {
        // Preferir children (Layout) quando passado — um só Outlet nas páginas.
        body = children ?? <Outlet />;
      }
    }
  }

  return (
    <>
      {body}
      {showVignette && (
        <LoadingOverlay
          visible={gateBusy}
          mode="hold"
          message={!authResolvido ? 'Validando sessão…' : 'Entrando no ambiente…'}
        />
      )}
    </>
  );
}
