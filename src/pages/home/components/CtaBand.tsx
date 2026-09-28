import React from 'react';

// Interface para garantir a tipagem correta da função de abertura do modal
interface CtaBandProps {
  onOpenModal: (mode: 'login' | 'cadastro') => void;
}

const CtaBand: React.FC<CtaBandProps> = ({ onOpenModal }) => {
  return (
    <div className="cta-band">
      <h2 data-aos="fade-up">
        Mais de <span style={{ color: 'rgba(255,255,255,.85)' }}>2.400 EPIs</span> gerenciados<br />
        com zero esforço manual
      </h2>
      
      <p data-aos="fade-up" data-aos-delay="80">
        Junte-se às empresas que já tomaram o controle da sua gestão de segurança.
      </p>

      <p className="cta-band-extra" data-aos="fade-up" data-aos-delay="120">
        Alertas por e-mail (Pro), WhatsApp (Gestor), validação digital e histórico avançado —
        conforme o plano. Comece grátis no Iniciante, sem cartão de crédito.
      </p>

      {/* Alterado de 'register' para 'cadastro' para sincronizar com o estado da LandingPage[cite: 10, 11] */}
      <button 
        className="btn btn-dark btn-xl" 
        onClick={() => onOpenModal('cadastro')} 
        data-aos="fade-up" 
        data-aos-delay="160"
      >
        <svg 
          width="18" 
          height="18" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.5"
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <path d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        Quero começar agora
      </button>
    </div>
  );
};

export default CtaBand;