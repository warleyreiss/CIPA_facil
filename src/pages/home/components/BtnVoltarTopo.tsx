import { useState, useEffect } from 'react';

const BtnVoltarTopo: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  // Lógica para mostrar/esconder o botão conforme o scroll
  useEffect(() => {
    const toggleVisibility = () => {
      // Aparece após rolar 300px para baixo
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <>
      {isVisible && (
        <button 
          className="back-top" 
          onClick={scrollToTop} 
          title="Voltar ao topo"
          aria-label="Voltar ao topo"
          style={{ cursor: 'pointer' }} // Garante o feedback visual de clique[cite: 12]
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
            <polyline points="18 15 12 9 6 15"></polyline>
          </svg>
        </button>
      )}
    </>
  );
};

export default BtnVoltarTopo;