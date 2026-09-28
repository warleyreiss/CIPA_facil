import  { useState, useEffect, useRef, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import RouteFallback from './RouteFallback';
import Perfil from '../pages/configuracao/usuario/Perfil';
import '../assets/css/especificos/sidebar-app.css';
import '../assets/css/especificos/cabecalho-app.css';
import '../assets/css/especificos/layout-responsivo.css';
import '../assets/css/especificos/status-plano.css';
import Cabecalho from './Cabecalho';
import { BRAND } from '../lib/brandAssets';
import { useProjeto } from '../contexts/ProjetoContext';
import { calcularDiasRestantesTolerancia } from '../lib/assinaturaService';
import { rotaSemProjeto } from '../lib/rotasSemProjeto';
import OverlayStatusPlano from './OverlayStatusPlano';
import { isPlanoGratuito } from '../lib/recursosPlano';
import AdSenseGate from './AdSenseGate';
import { AlertaPendencia } from './AlertaPendencia';
import { SidebarLockIcon } from './icons/SidebarLockIcon';
import { useThemeMode } from '../hooks/useThemeMode';
import { useMediaQuery, BP_MOBILE } from '../hooks/useMediaQuery';
import { lerSidebarLocked, salvarSidebarLocked } from '../lib/storageService';
import MobileNavBar from './MobileNavBar';
import ModalComunicadoSistema from './ModalComunicadoSistema';
import SelecaoProjeto from './SelecaoProjeto';
import { cn } from '../lib/cn';

const Layout: React.FC = () => {

  const { isDarkMode, toggleThemeMode } = useThemeMode();
  const isMobile = useMediaQuery(BP_MOBILE);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [isLocked, setIsLocked] = useState(() => lerSidebarLocked());

  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const {
    assinatura,
    planoStatus,
    statusAcesso,
    userData,
    projetoId,
    isModalSelecaoOpen,
    setIsModalSelecaoOpen,
  } = useProjeto();

  const [planoPopoverAberto, setPlanoPopoverAberto] = useState(false);
  const overlayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const statusPendentes = ['past_due', 'unpaid', 'incomplete', 'incomplete_expired'];
  const estaComPendenciaPagamento =
    !assinatura?.cortesia &&
    !!assinatura?.plano_status &&
    statusPendentes.includes(assinatura.plano_status);

  const isBloqueadoForte =
    statusAcesso === 'ASSINATURA_INADIMPLENTE_BLOQUEADO' ||
    statusAcesso === 'ASSINATURA_CANCELADA';
  const isPausado = !assinatura?.cortesia && planoStatus === 'paused';
  const mostrarTelaBloqueio =
    (isBloqueadoForte || isPausado) && !rotaSemProjeto(location.pathname);
  const diasRestantesTolerancia = calcularDiasRestantesTolerancia(assinatura);

  const regraPlano = Array.isArray(assinatura?.plano_regras)
    ? assinatura.plano_regras[0]
    : assinatura?.plano_regras;

  const nomePlano =
    regraPlano?.nome_plano?.trim() ||
    assinatura?.plano_tipo ||
    'Carregando...';

  type EstadoPlanoIndicador = 'ok' | 'pendencia' | 'bloqueado';

  const estadoPlanoIndicador: EstadoPlanoIndicador = (() => {
    if (isBloqueadoForte || isPausado) {
      return 'bloqueado';
    }
    if (
      statusAcesso === 'ASSINATURA_INADIMPLENTE_TOLERANCIA' ||
      estaComPendenciaPagamento
    ) {
      return 'pendencia';
    }
    return 'ok';
  })();

  const iconePlanoIndicador = {
    ok: 'pi-check-circle',
    pendencia: 'pi-exclamation-triangle',
    bloqueado: 'pi-lock',
  }[estadoPlanoIndicador];

  const tituloIconePlano = {
    ok: 'Plano em dia — ver configurações',
    pendencia: 'Pendência de pagamento — ver configurações',
    bloqueado: 'Assinatura bloqueada — ver configurações',
  }[estadoPlanoIndicador];

  const rotuloStatusPlano = (() => {
    if (estadoPlanoIndicador === 'bloqueado') {
      if (isPausado) return 'Pausado';
      if (statusAcesso === 'ASSINATURA_CANCELADA') return 'Cancelado';
      return 'Bloqueado';
    }
    if (estadoPlanoIndicador === 'pendencia') {
      return diasRestantesTolerancia > 0
        ? `Pendência · ${diasRestantesTolerancia} dia${diasRestantesTolerancia !== 1 ? 's' : ''}`
        : 'Pagamento pendente';
    }
    const rotulos: Record<string, string> = {
      active: 'Ativo',
      trialing: 'Período de teste',
      paused: 'Pausado',
    };
    return rotulos[planoStatus ?? ''] ?? 'Ativo';
  })();

  const irParaConfiguracaoPlano = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate('/configurar-projeto');
  };

  const billingUrl = assinatura?.billing_portal_url || null;

  useEffect(() => {
    document.documentElement.classList.add('app-shell');
    return () => document.documentElement.classList.remove('app-shell');
  }, []);

  useEffect(() => {
    salvarSidebarLocked(isLocked);
  }, [isLocked]);

  useEffect(() => {
    return () => {
      if (overlayTimer.current) clearTimeout(overlayTimer.current);
    };
  }, []);

  useEffect(() => {
    setPlanoPopoverAberto(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobile) {
      setMobileMenuOpen(false);
    }
  }, [isMobile]);

  useEffect(() => {
    document.body.classList.toggle('mobile-nav-open', isMobile && mobileMenuOpen);
    return () => document.body.classList.remove('mobile-nav-open');
  }, [isMobile, mobileMenuOpen]);

  const isSidebarVisualOpen = isLocked || isHovered;

  type MenuItem = {
    name: string;
    path: string;
    icon: string;
  };

  const menuItems: MenuItem[] = [
    { name: 'Início', path: '/inicio', icon: 'pi-home' },
    { name: 'Ações', path: '/acoes', icon: 'pi-check-square' },
    { name: 'Eleições', path: '/eleicoes', icon: 'pi-flag' },
    { name: 'Configurações', path: '/configurar-projeto', icon: 'pi-cog' },
    { name: 'Suporte', path: '/suporte', icon: 'pi-question-circle' },
  ];

  const handleMouseEnterPlano = () => {
    if (overlayTimer.current) clearTimeout(overlayTimer.current);
    setPlanoPopoverAberto(true);
  };

  const handleMouseLeavePlano = () => {
    overlayTimer.current = setTimeout(() => setPlanoPopoverAberto(false), 280);
  };

  const handleOverlayMouseEnter = () => {
    if (overlayTimer.current) clearTimeout(overlayTimer.current);
  };

  const handleOverlayMouseLeave = () => {
    overlayTimer.current = setTimeout(() => setPlanoPopoverAberto(false), 280);
  };

  const fecharMenuMobile = () => setMobileMenuOpen(false);

  const navegarMenu = (path: string) => {
    navigate(path);
    fecharMenuMobile();
  };

  const renderMobileNavLinks = () =>
    menuItems.map((item, index) => {
      const isActive = location.pathname === item.path;
      return (
        <button
          key={item.path}
          type="button"
          className={[
            'mobile-nav-link',
            isActive ? 'mobile-nav-link--active' : '',
            index === 0 ? 'mobile-nav-link--dashboard' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={() => navegarMenu(item.path)}
        >
          <i className={`pi ${item.icon}`} aria-hidden />
          <span>{item.name}</span>
        </button>
      );
    });

  const permitirAdsApp = Boolean(assinatura) && isPlanoGratuito(assinatura?.plano_tipo);

  return (
    <div className="app_layout">
      <AdSenseGate allow={permitirAdsApp} />
      {!isMobile && (
      <div
        className={`sidebar ${isSidebarVisualOpen ? 'open' : ''} ${isLocked ? 'sidebar--pinned' : ''}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="logo-details-background">
          <div className="logo-details">
            <img src={BRAND.logotipo} alt={BRAND.name} className="icon logo-img-menu" />
            <div className="logo_name">{BRAND.name}</div>
            <div className="sidebar-controls">
              <button
                type="button"
                className="sidebar-control-btn"
                onClick={toggleThemeMode}
                aria-label={isDarkMode ? 'Ativar modo claro' : 'Ativar modo escuro'}
                title={isDarkMode ? 'Modo claro' : 'Modo escuro'}
              >
                <i className={`pi ${isDarkMode ? 'pi-sun' : 'pi-moon'}`} aria-hidden />
              </button>
              <button
                type="button"
                className="sidebar-control-btn sidebar-control-btn--lock"
                onClick={() => setIsLocked(!isLocked)}
                aria-label={isLocked ? 'Desafixar menu lateral' : 'Fixar menu lateral'}
                aria-pressed={isLocked}
                title={isLocked ? 'Desafixar menu lateral' : 'Fixar menu lateral'}
              >
                <SidebarLockIcon locked={isLocked} size={14} />
              </button>
            </div>
          </div>
        </div>
        <ul className="nav-list">
          {menuItems.map((item) => {
            return (
              <li
                key={item.path}
                onClick={() => navegarMenu(item.path)}
              >
                <a className={location.pathname === item.path ? 'active' : ''}>
                  <i className={`pi ${item.icon}`} />
                  <span className="links_name">{item.name}</span>
                </a>
                <span className="tooltip">{item.name}</span>
              </li>
            );
          })}

          <li
            className={cn(
              'assinatura plano-indicador',
              `plano-indicador--${estadoPlanoIndicador}`,
            )}
            onMouseEnter={handleMouseEnterPlano}
            onMouseLeave={handleMouseLeavePlano}
          >
            <div className="assinatura-details plano-indicador-corpo">
              <button
                type="button"
                className={`plano-indicador-icone plano-indicador-icone--${estadoPlanoIndicador}`}
                onClick={irParaConfiguracaoPlano}
                title={tituloIconePlano}
                aria-label={tituloIconePlano}
              >
                <i className={`pi ${iconePlanoIndicador}`} />
              </button>
              <div className="plano-indicador-info">
                <span className="plano-indicador-nome">{nomePlano}</span>
                <span className={`plano-indicador-status plano-indicador-status--${estadoPlanoIndicador}`}>
                  {rotuloStatusPlano}
                </span>
              </div>
              <span className={`plano-indicador-dot plano-indicador-dot--${estadoPlanoIndicador}`} aria-hidden />
            </div>
          </li>

          {planoPopoverAberto &&
            typeof document !== 'undefined' &&
            createPortal(
              <div
                className={cn(
                  'plano-popover',
                  isSidebarVisualOpen && 'plano-popover--sidebar-open',
                )}
                role="dialog"
                aria-label="Resumo da assinatura"
                onMouseEnter={handleOverlayMouseEnter}
                onMouseLeave={handleOverlayMouseLeave}
              >
                <OverlayStatusPlano />
              </div>,
              document.body,
            )}
        </ul>
      </div>
      )}

      {isMobile && (
        <MobileNavBar
          isOpen={mobileMenuOpen}
          onToggle={() => setMobileMenuOpen((v) => !v)}
          onOpen={() => setMobileMenuOpen(true)}
          onClose={fecharMenuMobile}
          planoSlot={
            <button
              type="button"
              className="mobile-nav-plano"
              onClick={() => {
                navigate('/configurar-projeto');
                fecharMenuMobile();
              }}
            >
              <span className={`mobile-nav-plano__icon mobile-nav-plano__icon--${estadoPlanoIndicador}`}>
                <i className={`pi ${iconePlanoIndicador}`} aria-hidden />
              </span>
              <span className="mobile-nav-plano__text">
                <span className="mobile-nav-plano__nome">{nomePlano}</span>
                <span className="mobile-nav-plano__status">{rotuloStatusPlano}</span>
              </span>
            </button>
          }
          footerSlot={
            <button
              type="button"
              className="mobile-nav-footer-btn"
              onClick={toggleThemeMode}
            >
              <i className={`pi ${isDarkMode ? 'pi-sun' : 'pi-moon'}`} aria-hidden />
              {isDarkMode ? 'Modo claro' : 'Modo escuro'}
            </button>
          }
        >
          {renderMobileNavLinks()}
        </MobileNavBar>
      )}

      <section className={`home-section ${isLocked ? 'sidebar-locked' : ''} ${isDarkMode ? 'tema-escuro' : ''}`}>
        <main className="content-area">
          <Cabecalho />
          <div className="content-area-util">
            <div className="content-outlet-host">
              <Suspense fallback={<RouteFallback />}>
                {['/perfil', '/Perfil', '/meus-dados'].includes(location.pathname) ? (
                  <Perfil />
                ) : (
                  <Outlet />
                )}
              </Suspense>
            </div>
          </div>
        </main>
      </section>

      <AlertaPendencia
        visible={mostrarTelaBloqueio}
        status={planoStatus || 'default'}
        diasRestantes={diasRestantesTolerancia}
        esgotouTolerancia={isBloqueadoForte}
        billingUrl={billingUrl || undefined}
      />

      <ModalComunicadoSistema
        usuarioId={userData?.id}
        pausado={mostrarTelaBloqueio}
        planoTipo={assinatura?.plano_tipo}
        assinaturaTipo={assinatura?.assinatura_tipo}
      />

      {projetoId && isModalSelecaoOpen ? (
        <SelecaoProjeto
          obrigatorio={false}
          onProjetoSelecionado={() => setIsModalSelecaoOpen(false)}
          onUpgradeClick={() => {
            setIsModalSelecaoOpen(false);
            navigate('/upgrade');
          }}
        />
      ) : null}
    </div>
  );
};

export default Layout;
