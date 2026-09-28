import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Divider } from 'primereact/divider';
import { BRAND } from '../lib/brandAssets';
import { EMPRESA } from '../config/empresa';
import '../assets/css/especificos/paginaLegal.css';

export interface SecaoLegal {
  id: string;
  label: string;
}

interface PaginaLegalProps {
  titulo: string;
  subtitulo: string;
  secoes: SecaoLegal[];
  secaoInicial?: string;
  children: ReactNode;
}

const DOCS_RELACIONADOS = [
  { to: '/termos-de-uso', label: 'Termos de Uso' },
  { to: '/politica-privacidade', label: 'Privacidade' },
  { to: '/politica-cookies', label: 'Cookies' },
] as const;

export default function PaginaLegal({
  titulo,
  subtitulo,
  secoes,
  secaoInicial,
  children,
}: PaginaLegalProps) {
  const [activeId, setActiveId] = useState(secaoInicial ?? secoes[0]?.id ?? '');
  const location = useLocation();

  useEffect(() => {
    document.body.classList.add('pagina-legal-ativa');
    window.scrollTo(0, 0);

    const handleScroll = () => {
      const scrollPos = window.scrollY + 150;

      secoes.forEach((sec) => {
        const element = document.getElementById(sec.id);
        if (element) {
          const top = element.offsetTop;
          const height = element.offsetHeight;

          if (scrollPos >= top && scrollPos < top + height) {
            setActiveId(sec.id);
          }
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.body.classList.remove('pagina-legal-ativa');
    };
  }, [secoes]);

  return (
    <div className="pagina-legal">
      <div className="pagina-legal-atmosphere" aria-hidden />

      <header className="pagina-legal-navbar">
        <div className="pagina-legal-navbar-inner">
          <Link to="/" className="pagina-legal-brand" aria-label={`${BRAND.name} — página inicial`}>
            <img src={BRAND.logomarca} alt={BRAND.name} className="pagina-legal-brand__logo" />
          </Link>
          <div className="pagina-legal-actions">
            <Link to="/" className="pagina-legal-btn pagina-legal-btn--ghost">
              Voltar para Home
            </Link>
            <Link to="/login" className="pagina-legal-btn pagina-legal-btn--primary">
              Acessar Sistema
            </Link>
          </div>
        </div>
      </header>

      <div className="pagina-legal-banner">
        <div className="pagina-legal-container pagina-legal-banner__inner">
          <span className="pagina-legal-badge">
            <i className="pi pi-verified" aria-hidden />
            Documento oficial
          </span>
          <p className="pagina-legal-banner__tagline">{EMPRESA.slogan}</p>
        </div>
      </div>

      <div className="pagina-legal-layout pagina-legal-container">
        <aside className="pagina-legal-sidebar" aria-label="Índice do documento">
          <div className="pagina-legal-sidebar-sticky">
            <p className="pagina-legal-sidebar__label">Neste documento</p>
            <nav className="pagina-legal-nav">
              {secoes.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className={activeId === s.id ? 'active' : ''}
                >
                  {s.label}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        <div className="pagina-legal-toc-mobile" aria-label="Índice rápido">
          <div className="pagina-legal-toc-mobile__track">
            {secoes.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={`pagina-legal-toc-chip${activeId === s.id ? ' is-active' : ''}`}
              >
                {s.label}
              </a>
            ))}
          </div>
        </div>

        <main className="pagina-legal-main">
          <article className="pagina-legal-card">
            <header className="pagina-legal-card__head">
              <h1 className="pagina-legal-titulo">{titulo}</h1>
              <p className="pagina-legal-subtitulo">{subtitulo}</p>
              <div className="pagina-legal-meta">
                <span className="pagina-legal-meta__pill">
                  <i className="pi pi-building" aria-hidden />
                  {EMPRESA.marca}™
                </span>
                <span className="pagina-legal-meta__pill">
                  <i className="pi pi-id-card" aria-hidden />
                  CNPJ {EMPRESA.cnpj}
                </span>
              </div>
              <Divider className="pagina-legal-header-divider" />
            </header>
            {children}
          </article>

          <footer className="pagina-legal-footer">
            <div className="pagina-legal-footer__docs">
              <p className="pagina-legal-footer__label">Documentos relacionados</p>
              <div className="pagina-legal-footer__links">
                {DOCS_RELACIONADOS.map((doc) =>
                  doc.to === location.pathname ? (
                    <span key={doc.to} className="pagina-legal-footer__link is-current">
                      {doc.label}
                    </span>
                  ) : (
                    <Link key={doc.to} to={doc.to} className="pagina-legal-footer__link">
                      {doc.label}
                    </Link>
                  )
                )}
              </div>
            </div>
            <p className="pagina-legal-footer__copy">
              © {new Date().getFullYear()} {EMPRESA.marca}™ · {EMPRESA.marcaCasa}™ · CNPJ {EMPRESA.cnpj}
            </p>
            <a className="pagina-legal-footer__mail" href={`mailto:${EMPRESA.emailSuporte}`}>
              {EMPRESA.emailSuporte}
            </a>
          </footer>
        </main>
      </div>
    </div>
  );
}

export function SecaoLegal({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="pagina-legal-secao">
      {children}
    </section>
  );
}

export function AlertaLegal({
  titulo,
  children,
}: {
  titulo: string;
  children: ReactNode;
}) {
  return (
    <div className="pagina-legal-alerta">
      <div className="pagina-legal-alerta__icon" aria-hidden>
        <i className="pi pi-exclamation-triangle" />
      </div>
      <div className="pagina-legal-alerta__body">
        <strong>{titulo}</strong>
        {typeof children === 'string' ? <p>{children}</p> : children}
      </div>
    </div>
  );
}
