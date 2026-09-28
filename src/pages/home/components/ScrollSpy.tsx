import { useState, useEffect } from 'react';

// Seções sincronizadas com a LandingPage e Cabecalho
const sections = [
  { id: 'home', label: 'Home' },
  { id: 'por-que', label: 'Por Que' },
  { id: 'recursos', label: 'Recursos' },
  { id: 'planos', label: 'Planos' },
  { id: 'passo-a-passo', label: 'Como Funciona ?' },
  { id: 'footer-section', label: 'Contato' },
];

interface ScrollSpyProps {
  onScrollToSection: (id: string) => void;
}

const ScrollSpy: React.FC<ScrollSpyProps> = ({ onScrollToSection }) => {
  const [activeSection, setActiveSection] = useState('home');

  useEffect(() => {
    const observerOptions = {
      root: null,
      // Ajustado para -20% para uma detecção mais natural durante a rolagem
      rootMargin: '-20% 0px -60% 0px', 
      threshold: 0,
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    sections.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    onScrollToSection(id); // Usa a função centralizada da LandingPage
  };

  return (
    <nav className="scrollspy" id="scrollspy">
      {sections.map((section) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          className={activeSection === section.id ? 'active' : ''}
          onClick={(e) => handleLinkClick(e, section.id)}
          title={section.label}
        >
          <span className="scrollspy-dot"></span>
          <span className="scrollspy-label">{section.label}</span>
        </a>
      ))}
    </nav>
  );
};

export default ScrollSpy;