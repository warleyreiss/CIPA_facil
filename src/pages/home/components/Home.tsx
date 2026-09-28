import React from 'react';
import Hero from './Hero.tsx'
// Interface definida para receber as funções da LandingPage
interface HomeProps {
  onOpenModal: (mode: 'login' | 'cadastro') => void;
  onScrollToSection: (id: string) => void;
}

const Home: React.FC<HomeProps> = ({ onOpenModal, onScrollToSection }) => {
  // O AOS.init foi removido daqui pois agora reside na LandingPage.tsx[cite: 5, 10]

  return (
    <section id="home">
      {/* Background Squares */}
      <div className="bg-squares" id="bgSquares"></div>

      <div className="hero-inner">
        <div className="hero-content">
          <h1 className="hero-h1" data-aos="fade-up" data-aos-delay="80">
            Abandone as<br />planilhas.<br />
            <span>Evolua sua gestão</span><br />de EPI.
          </h1>

          <p className="hero-sub" data-aos="fade-up" data-aos-delay="160">
            CIPA Fácil centraliza o cadastro, o acesso e a assinatura da plataforma.
          </p>

          <div className="hero-actions" data-aos-offset="0" data-aos="fade-up" data-aos-delay="80">
            {/* Ajustado para passar o modo correto 'cadastro' para o modal */}
            <button className="btn btn-primary btn-xl " onClick={() => onOpenModal('cadastro')}>
              Iniciar minha gestão
            </button>
            <button className="btn btn-outline btn-xl btn-home-correcao" onClick={() => onScrollToSection('por-que')}>
              Quero conhecer
            </button>
          </div>
{/*
          <div className="hero-tags" data-aos="fade-up" data-aos-delay="240">
            <span className="hero-tag"><span className="dot" />Alertas WhatsApp</span>
            <span className="hero-tag"><span className="dot" />Validação digital</span>
            <span className="hero-tag"><span className="dot" />Histórico auditável</span>
            <span className="hero-tag"><span className="dot" />Multiprojetos</span>
          </div>
*/}
          <p className="hero-trust" data-aos="fade-up" data-aos-delay="280">
            <strong>Gratuito!</strong> Contrate um plano somente caso queira evoluir ainda mais sua operação.
          </p>
        </div>

       <Hero/>
      </div>
    </section>
  );
};

export default Home;