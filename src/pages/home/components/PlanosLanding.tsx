import React from 'react';
import {
  DESTAQUES_COMERCIAIS_PLANO,
  DESCRICAO_COMERCIAL_PLANO,
  type PlanoCodigo,
} from '../../../lib/recursosPlano';

interface PlanosLandingProps {
  onOpenModal: () => void;
}

const planosMeta: Array<{
  codigo: PlanoCodigo;
  preco: string;
  periodo: string;
  destaque: boolean;
  cta: string;
}> = [
  {
    codigo: 'INICIANTE',
    preco: 'Grátis',
    periodo: 'para sempre',
    destaque: false,
    cta: 'Criar conta grátis',
  },
  {
    codigo: 'PRO',
    preco: 'Sob medida',
    periodo: 'conforme uso',
    destaque: true,
    cta: 'Começar no Pro',
  },
  {
    codigo: 'GESTOR',
    preco: 'Completo',
    periodo: 'operação séria',
    destaque: false,
    cta: 'Quero o plano Gestor',
  },
];

const PlanosLanding: React.FC<PlanosLandingProps> = ({ onOpenModal }) => {
  return (
    <section id="planos" className="landing-planos-section">
      <div className="landing-section-accent landing-section-accent--top" />
      <div className="section-inner">
        <div className="landing-section-head" data-aos="fade-up">
          <span className="section-label">Planos</span>
          <h2 className="section-h2">
            Comece grátis.<br />
            <span className="landing-text-accent">Escale quando precisar.</span>
          </h2>
          <p className="section-sub landing-section-sub--center">
            Sem surpresas: você testa no Iniciante e evolui para Pro ou Gestor conforme
            projetos, validação digital, eSocial e equipe crescem.
          </p>
        </div>

        <div className="landing-planos-grid">
          {planosMeta.map((plano, index) => {
            const nome =
              plano.codigo === 'INICIANTE' ? 'Iniciante' : plano.codigo === 'PRO' ? 'Pro' : 'Gestor';
            const features = DESTAQUES_COMERCIAIS_PLANO[plano.codigo];
            return (
              <article
                key={plano.codigo}
                className={`landing-plano-card${plano.destaque ? ' landing-plano-card--featured' : ''}`}
                data-aos="fade-up"
                data-aos-delay={index * 80}
              >
                {plano.destaque && <span className="landing-plano-badge">Mais escolhido</span>}
                <h3 className="landing-plano-nome">{nome}</h3>
                <div className="landing-plano-preco">
                  <span className="landing-plano-valor">{plano.preco}</span>
                  <span className="landing-plano-periodo">{plano.periodo}</span>
                </div>
                <p className="landing-plano-desc">{DESCRICAO_COMERCIAL_PLANO[plano.codigo]}</p>
                <ul className="landing-plano-features">
                  {features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  className={`btn ${plano.destaque ? 'btn-primary' : 'btn-outline'} btn-lg landing-plano-cta`}
                  onClick={onOpenModal}
                >
                  {plano.cta}
                </button>
              </article>
            );
          })}
        </div>

        <p className="landing-planos-footnote" data-aos="fade-up" data-aos-delay="200">
          Limites de projetos, colaboradores e tipos de EPI seguem as regras do plano contratado.
          Recursos listados refletem a matriz comercial vigente; valores dos planos pagos aparecem
          no checkout após o cadastro.
        </p>
      </div>
    </section>
  );
};

export default PlanosLanding;
