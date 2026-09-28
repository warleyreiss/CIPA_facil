import { useState } from 'react';

const Hero: React.FC = () => {
  const [rotate, setRotate] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, clientY, currentTarget } = e;
    const { clientWidth, clientHeight, offsetLeft, offsetTop } = currentTarget;

    const x = (clientX - (offsetLeft + clientWidth / 2)) / 25;
    const y = (clientY - (offsetTop + clientHeight / 2)) / 25;

    setRotate({ x: -y, y: x });
  };

  const handleMouseLeave = () => {
    setRotate({ x: 0, y: 0 });
  };

  return (
    <div 
      className="hero-visual-wrapper" 
      data-aos="fade-left" 
      data-aos-delay="200"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div 
        className="hero-dashboard-card"
        style={{
          transform: `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)`
        }}
      >
        {/* Cabeçalho Premium do Mockup */}
        <div className="card-header-premium">
          <div className="header-left">
            <div className="mac-dots">
              <span className="dot-red"></span>
              <span className="dot-amber"></span>
              <span className="dot-green"></span>
            </div>
            <div className="header-divider"></div>
            <div className="header-breadcrumb">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              </svg>
              <span>Dashboard / Visão Geral</span>
            </div>
          </div>
          <div className="header-right">
            <span className="hero-mockup-live">● Ao vivo</span>
            <div className="user-avatar-mini"></div>
          </div>
        </div>

        <div className="hero-mockup-alert">
          <i className="pi pi-whatsapp" aria-hidden />
          <div>
            <strong>3 EPIs vencidos</strong> · resumo enviado à gestão
          </div>
        </div>
        
        <div className="card-table-content">
          <table className="hero-table">
            <thead>
              <tr>
                <th>Colaborador</th>
                <th>Equipamento</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Carlos Silva</td>
                <td>Capacete Classe B</td>
                <td><span className="badge-v2 vencido">Vencido</span></td>
              </tr>
              <tr>
                <td>Ana Mendes</td>
                <td>Luva de Vaqueta</td>
                <td><span className="badge-v2 pendente">Pendente</span></td>
              </tr>
              <tr>
                <td>Roberto Dias</td>
                <td>Botina de Segurança</td>
                <td><span className="badge-v2 iminente">Iminente</span></td>
              </tr>
              <tr>
                <td>Yasmin Reis</td>
                <td>Óculos proteção</td>
                <td><span className="badge-v2 no-prazo">No prazo</span></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Tags Coloridas com Flutuação Independente */}
        <div className="hero-tag-v2 tag-green">
          <div className="tag-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
          <span>NR-06</span>
        </div>
        
        <div className="hero-tag-v2 tag-blue">
          <div className="tag-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg></div>
          <span>Multiprojetos</span>
        </div>

        <div className="hero-tag-v2 tag-purple">
          <div className="tag-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div>
          <span>Multiusuários</span>
        </div>

        <div className="hero-tag-v2 tag-amber">
          <div className="tag-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg></div>
          <span>Gestão Visual</span>
        </div>
      </div>
    </div>
  );
};

export default Hero;