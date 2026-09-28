import React from 'react';

const stats = [
  { value: '100%', label: 'Rastreio de entregas', detail: 'Histórico auditável por colaborador' },
  { value: '2 canais', label: 'Alertas proativos', detail: 'E-mail + WhatsApp toda segunda-feira' },
  { value: '1 clique', label: 'CA validado', detail: 'Consulta automática na base do MTE' },
  { value: '0', label: 'Planilhas', detail: 'Tudo centralizado na nuvem' },
];

const ProvaSocial: React.FC = () => {
  return (
    <section id="prova-social" className="landing-stats-band">
      <div className="section-inner">
        <div className="landing-stats-grid">
          {stats.map((stat, index) => (
            <div key={stat.label} className="landing-stat-card" data-aos="fade-up" data-aos-delay={index * 60}>
              <span className="landing-stat-value">{stat.value}</span>
              <span className="landing-stat-label">{stat.label}</span>
              <span className="landing-stat-detail">{stat.detail}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProvaSocial;
