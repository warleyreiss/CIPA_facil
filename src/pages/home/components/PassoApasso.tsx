import React from 'react';

// Interface definida para garantir a tipagem correta das props
interface PassoApassoProps {
  // Adicione aqui futuras propriedades, ex: title?: string;
}

const PassoApasso: React.FC<PassoApassoProps> = () => {
  const steps = [
    {
      num: 1,
      label: "Configuração",
      title: "Cadastre seu Projeto",
      text: "Crie sua conta, configure sua empresa ou projeto e defina os setores e cargos que serão gerenciados.",
      icon: (
        <>
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </>
      ),
    },
    {
      num: 2,
      label: "Inventário",
      title: "Registre seu Catálogo de EPI",
      text: "Cadastre todos os equipamentos com CA, validade e fornecedor. O sistema valida o CA automaticamente.",
      icon: <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />,
    },
    {
      num: 3,
      label: "Integração",
      title: "Vincule EPIs a Cargos e Riscos",
      text: "Associe quais equipamentos são obrigatórios para cada cargo. O sistema gerencia entregas conforme o perfil.",
      icon: (
        <>
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </>
      ),
    },
    {
      num: 4,
      label: "Operação",
      title: "Comece a Registrar com Segurança",
      text: "Registre entregas, colete assinaturas digitais, acompanhe vencimentos e gere relatórios completos.",
      icon: (
        <>
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </>
      ),
    },
    {
      num: 5,
      label: "Monitoramento",
      title: "Receba alertas e durma tranquilo",
      text: "O sistema avisa por e-mail e WhatsApp antes do vencimento. Você age proativo, não reativo.",
      icon: (
        <>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </>
      ),
    },
  ];

  return (
    <section id="passo-a-passo" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Background Glow */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at 50% 0%, rgba(37, 99, 235, .05) 0%, transparent 60%)',
        zIndex: 0
      }}></div>

      <div className="section-inner" style={{ paddingTop: '96px', paddingBottom: '96px', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center' }} data-aos="fade-up">
          <span className="section-label">Como funciona</span>
          <h2 className="section-h2" style={{ color: '#fff' }}>
            Implementação<br />
            <span style={{ color: 'var(--primary)' }}>em minutos</span>
          </h2>
          <p className="section-sub" style={{ margin: '0 auto', color: '#94a3b8', maxWidth: '600px' }}>
            Não precisa de TI, não precisa de consultoria. Em 4 passos simples sua gestão de EPI está rodando.
            {' '}Com monitoramento automático de alertas como quinto passo, você mantém tudo sob controle.
          </p>
        </div>

        <div className="steps-timeline steps-timeline--extended">
          {steps.map((step, index) => (
            <div 
              key={step.num} 
              className="step-card" 
              data-aos="fade-up" 
              data-aos-delay={index * 80}
            >
              <div className="step-num">{step.num}</div>
              <span className="step-label">{step.label}</span>
              <div className="step-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {step.icon}
                </svg>
              </div>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PassoApasso;