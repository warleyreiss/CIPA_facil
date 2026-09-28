import React from 'react';
import { Link } from 'react-router-dom'; 
import { BRAND } from '../../../lib/brandAssets';

// Interface para garantir a comunicação correta com o LandingPage_2.tsx
interface CabecalhoProps {
  onOpenRegister: () => void;
  onOpenLogin: () => void;
  onScrollToSection: (id: string) => void; 
}

const Cabecalho: React.FC<CabecalhoProps> = ({ onOpenRegister, onOpenLogin, onScrollToSection }) => {
  
  // Função auxiliar para navegação suave entre as seções[cite: 10, 13]
  const handleNavClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    onScrollToSection(id);
  };

  return (
    <nav id="navbar">
      <a 
        href="#home" 
        className="nav-logo" 
        onClick={(e) => handleNavClick(e, 'home')}
      >
        <div className="nav-logo-icon">
         <img
                      className=""
                      src={BRAND.logomarca}
                    />
        </div>
      </a>

      {/* Links de navegação ancorados[cite: 10, 13] */}
      <ul className="nav-links" id="navLinks">
        <li><a href="#home" onClick={(e) => handleNavClick(e, 'home')}>Home</a></li>
        <li><a href="#por-que" onClick={(e) => handleNavClick(e, 'por-que')}>Por Que Usar</a></li>
        <li><a href="#recursos" onClick={(e) => handleNavClick(e, 'recursos')}>Recursos</a></li>
        <li><a href="#planos" onClick={(e) => handleNavClick(e, 'planos')}>Planos</a></li>
        <li><a href="#passo-a-passo" onClick={(e) => handleNavClick(e, 'passo-a-passo')}>Como Funciona</a></li>
        <li><a href="#footer-section" onClick={(e) => handleNavClick(e, 'footer-section')}>Contato</a></li>
      </ul>

      {/* Botões de Ação que disparam o Modal[cite: 10, 13] */}
      <div className="nav-cta">
        <Link to="/login">
         <button 
          className="btn btn-outline btn-header-correcao" 
          onClick={onOpenLogin}
        >
          Já sou cadastrado
        </button>
        </Link>
       
        
        <button 
          className="btn btn-primary nav-btn-cadastro" 
          onClick={onOpenRegister}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="19" y1="8" x2="19" y2="14" />
            <line x1="22" y1="11" x2="16" y2="11" />
          </svg>
          Começar grátis
        </button>
      </div>
    </nav>
  );
};

export default Cabecalho;