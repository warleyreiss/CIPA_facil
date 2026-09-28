import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useProjeto } from './contexts/ProjetoContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LgpdBanner from './components/LgpdBanner';
import RouteFallback from './components/RouteFallback';
import NovaHome from './pages/home/NovaHome';
import { lerPendingEmailConfirm } from './lib/pendingEmailConfirm';
/** Eager: evita área branca se o chunk lazy de /perfil falhar ou o Suspense engolir o Outlet. */
import Perfil from './pages/configuracao/usuario/Perfil';

const Login = lazy(() => import('./pages/home/Login'));
const IndexConfiguracao = lazy(() => import('./pages/configuracao/IndexConfiguracao'));
const EmailVerificacao = lazy(() => import('./components/EmailVerificacao'));
const TermosDeUso = lazy(() => import('./pages/TermosDeUso'));
const PoliticaPrivacidade = lazy(() => import('./pages/PoliticaPrivacidade'));
const PoliticaCookies = lazy(() => import('./pages/PoliticaCookies'));
const Upgrade = lazy(() => import('./pages/assinatura/Upgrade'));
const Downgrade = lazy(() => import('./pages/assinatura/Downgrade'));
const Suporte = lazy(() => import('./pages/Suporte'));
const GestaoEleicoes = lazy(() => import('./pages/eleicoes/GestaoEleicoes'));
const GestaoAcoes = lazy(() => import('./pages/acoes/GestaoAcoes'));
const PaginaPrincipal = lazy(() => import('./pages/inicio/PaginaPrincipal'));
const Treinamentos = lazy(() => import('./pages/Treinamentos'));
const SucessoUpgrade = lazy(() => import('./components/SucessoUpgrade'));
const Colaboracao = lazy(() => import('./components/Colaboracao'));
const DefinirSenha = lazy(() => import('./pages/configuracao/usuario/DefinirSenha'));
const EsqueciSenha = lazy(() => import('./pages/configuracao/usuario/EsqueciSenha'));
const ParceiroIndicacao = lazy(() => import('./pages/ParceiroIndicacao'));
const AgendaReuniao = lazy(() => import('./pages/AgendaReuniao'));

function AppContent() {
  const { userData, emailConfirmado } = useProjeto();
  const aguardandoConfirmacaoEmail =
    (Boolean(userData) && !emailConfirmado) ||
    (!userData && Boolean(lerPendingEmailConfirm()));

  return (
    <div className="app-container">
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<NovaHome />} />
          <Route path="/ref/:codigo" element={<ParceiroIndicacao />} />
          <Route path="/r/:codigo" element={<ParceiroIndicacao />} />

          <Route
            path="/login"
            element={
              !userData ? (
                <Login />
              ) : userData.status_cadastro === 'PENDENTE' ? (
                <Navigate to="/definir-senha" replace />
              ) : (
                <Navigate to={emailConfirmado ? '/inicio' : '/verificar-email'} replace />
              )
            }
          />

          <Route path="/termos-de-uso" element={<TermosDeUso />} />
          <Route path="/agenda/:token" element={<AgendaReuniao />} />
          <Route path="/politica-privacidade" element={<PoliticaPrivacidade />} />
          <Route path="/politica-cookies" element={<PoliticaCookies />} />
          <Route path="/treinamentos" element={<Treinamentos />} />
          <Route
            path="/verificar-email"
            element={
              aguardandoConfirmacaoEmail ? (
                <EmailVerificacao />
              ) : userData ? (
                <Navigate to="/inicio" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route path="/definir-senha" element={<DefinirSenha />} />
          <Route path="/recuperacao-senha" element={<EsqueciSenha />} />

          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/inicio" element={<PaginaPrincipal />} />
            <Route path="/bem-vindo" element={<Navigate to="/inicio" replace />} />
            <Route path="/eleicoes" element={<GestaoEleicoes />} />
            <Route path="/acoes" element={<GestaoAcoes />} />
            <Route path="/configurar-projeto" element={<IndexConfiguracao />} />
            <Route path="/meus-dados" element={<Navigate to="/perfil" replace />} />
            <Route path="/Perfil" element={<Navigate to="/perfil" replace />} />
            <Route path="/perfil" element={<Perfil />} />
            <Route path="/upgrade" element={<Upgrade />} />
            <Route path="/downgrade" element={<Downgrade />} />
            <Route path="/sucesso-upgrade" element={<SucessoUpgrade />} />
            <Route path="/colaboracao" element={<Colaboracao />} />
            <Route path="/suporte" element={<Suporte />} />
          </Route>

          <Route
            path="*"
            element={
              <Navigate
                to={userData ? (emailConfirmado ? '/inicio' : '/verificar-email') : '/login'}
                replace
              />
            }
          />
        </Routes>
      </Suspense>

      <LgpdBanner />
    </div>
  );
}

function App() {
  return <AppContent />;
}

export default App;
