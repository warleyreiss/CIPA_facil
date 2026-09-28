import type { ReactNode } from 'react';
import { BRAND } from '../../lib/brandAssets';
import ProvaSocialLogin from './ProvaSocialLogin';
import '../../pages/home/components/css/Login.css';
import '../../pages/home/components/css/FormCadastro.css';

interface AuthShellProps {
  title: string;
  subtitle: string;
  commercialTitle?: string;
  commercialText?: ReactNode;
  children: ReactNode;
}

/** Shell visual compartilhado com a página de Login (fundo, marca e card). */
export default function AuthShell({
  title,
  subtitle,
  commercialTitle = 'A gestão da CIPA com o prazo na frente.',
  commercialText = (
    <>
      Mandato, reuniões, membros e a eleição da NR-05 no mesmo calendário.
      <br />
      Entre para ver o que vence agora.
    </>
  ),
  children,
}: AuthShellProps) {
  return (
    <div className="page-login-background-section">
      {[...Array(400)].map((_, index) => (
        <span key={index} className="page-login-background-section-span" />
      ))}

      <div className="login-page-brand">
        <img src={BRAND.logomarca} alt={BRAND.name} />
      </div>

      <div className="login-container">
        <aside className="login-commercial-side" aria-hidden="true">
          <div className="commercial-content">
            <h1>{commercialTitle}</h1>
            <p>{commercialText}</p>
            <ProvaSocialLogin />
          </div>
        </aside>

        <main className="login-auth-side">
          <div className="login-card">
            <header className="login-card-header">
              <div className="login-card-logo" aria-hidden="true">
                <img src={BRAND.logomarca} alt="" />
              </div>
              <h2 className="login-card-title">{title}</h2>
              <p className="login-card-subtitle">{subtitle}</p>
            </header>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
