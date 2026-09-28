import { Link } from 'react-router-dom';
import '../assets/css/especificos/suporte.css';

const materiais = [
  {
    nome: 'Logo Proativa Web™ (PNG)',
    tipo: 'Imagem',
    desc: 'Identidade visual da marca de serviços para apresentações e divulgação.',
    link: '#',
  },
  {
    nome: 'Apresentação Comercial',
    tipo: 'PPTX',
    desc: 'Slides para capacitar equipes e apresentar o produto.',
    link: '#',
  },
  {
    nome: 'Vídeo Demonstrativo HD',
    tipo: 'Vídeo',
    desc: 'Tour visual do fluxo completo para onboarding.',
    link: '#',
  },
  {
    nome: 'Manual de Identidade Visual',
    tipo: 'PDF',
    desc: 'Guia de uso das marcas CIPA Fácil™ e Proativa Web™.',
    link: '#',
  },
];

export default function Treinamentos() {
  return (
    <div className="suporte-page treinamentos-page">
      <header className="suporte-hero">
        <div className="suporte-hero__mesh" aria-hidden />
        <div className="suporte-hero__inner">
          <div className="suporte-hero__copy">
            <h1 className="suporte-hero__title">Materiais e treinamentos</h1>
            <p className="suporte-hero__subtitle">
              Conteúdos oficiais para divulgar e capacitar times.
            </p>
          </div>
          <Link
            to="/suporte"
            className="p-button p-button-sm p-button-outlined no-underline align-self-start"
            style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.35)' }}
          >
            <i className="pi pi-arrow-left mr-2" />
            Central de Ajuda
          </Link>
        </div>
      </header>

      <section aria-label="Materiais disponíveis">
        <div className="treinamentos-grid">
          {materiais.map((item) => (
            <article key={item.nome} className="treinamentos-card">
              <span className="treinamentos-card__tipo">{item.tipo}</span>
              <p className="treinamentos-card__nome">{item.nome}</p>
              <p className="suporte-trilha__desc">{item.desc}</p>
              <a href={item.link} download className="treinamentos-card__cta">
                <i className="pi pi-download" aria-hidden />
                Baixar
              </a>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
