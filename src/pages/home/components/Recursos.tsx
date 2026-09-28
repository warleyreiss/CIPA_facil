import React from 'react';

// Definição da interface para os itens de recursos
interface RecursoItem {
  delay: number;
  title: string;
  desc: string;
  tag: string;
  tagStyle: React.CSSProperties;
  icon: React.ReactNode;
  tagIcon: React.ReactNode;
}

const Recursos: React.FC = () => {
  const recursos: RecursoItem[] = [
    {
      delay: 0,
      title: "Validação de CA",
      desc: "Consulte o Certificado de Aprovação no cadastro do MTE. A consulta avulsa de CA está disponível a partir do plano Pro.",
      tag: "Pro+",
      tagStyle: { background: 'rgba(99,102,241,.1)', color: '#6366F1' },
      icon: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
      tagIcon: <polyline points="20 6 9 17 4 12" />
    },
    {
      delay: 60,
      title: "Alertas de Vencimento",
      desc: "Alertas no painel em todos os planos. Resumo semanal por e-mail a partir do Pro; WhatsApp com OTP no plano Gestor.",
      tag: "Pro / Gestor",
      tagStyle: { background: 'rgba(251,191,36,.1)', color: '#D97706' },
      icon: <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></>,
      tagIcon: <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    },
    {
      delay: 120,
      title: "Controle de Estoque",
      desc: "Gerencie o estoque em tempo real. Pedido de compras e PDF em todos os planos; NF-e, estorno e e-mails a fornecedores a partir do Pro.",
      tag: "Integrado",
      tagStyle: {},
      icon: <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />,
      tagIcon: <polyline points="20 6 9 17 4 12" />
    },
    {
      delay: 60,
      title: "Monitoramento de Mudanças",
      desc: "Rastreie mudanças de cargo e setor. Históricos de trocas e alterações de função liberados a partir do Pro.",
      tag: "Pro+",
      tagStyle: { background: 'rgba(99,102,241,.1)', color: '#6366F1' },
      icon: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
      tagIcon: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    },
    {
      delay: 120,
      title: "Relatórios e histórico",
      desc: "Histórico avançado de fornecimento e exportações para auditoria a partir do Pro. Gabarito eSocial no plano Gestor.",
      tag: "Pro / Gestor",
      tagStyle: {},
      icon: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></>,
      tagIcon: <polyline points="20 6 9 17 4 12" />
    },
    {
      delay: 180,
      title: "KPI de Custos",
      desc: "Dashboard de gestão e redução de custos por projeto e consumo — exclusivo do plano Gestor.",
      tag: "Plano Gestor",
      tagStyle: { background: 'rgba(37, 99, 235,.1)', color: '#1d4ed8' },
      icon: <><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></>,
      tagIcon: <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    },
    {
      delay: 0,
      title: "Validação digital no fornecimento",
      desc: "Código de barras e RFID a partir do Pro. Biometria e agente Windows no plano Gestor — prova técnica além do papel.",
      tag: "Pro / Gestor",
      tagStyle: { background: 'rgba(139,92,246,.12)', color: '#6d28d9' },
      icon: <><path d="M12 11c1.66 0 3-1.34 3-3S13.66 5 12 5 9 6.34 9 8s1.34 3 3 3z" /><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /></>,
      tagIcon: <polyline points="20 6 9 17 4 12" />
    },
    {
      delay: 60,
      title: "Histórico auditável de fornecimentos",
      desc: "Registro básico de entregas em todos os planos. Consulta avançada com filtros e estorno contextual a partir do Pro.",
      tag: "Compliance",
      tagStyle: {},
      icon: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /></>,
      tagIcon: <polyline points="20 6 9 17 4 12" />
    },
    {
      delay: 120,
      title: "Dashboard em tempo real",
      desc: "Gestão básica em todos os planos; indicadores avançados no Pro; visão de custos e redução no Gestor.",
      tag: "Todos os planos",
      tagStyle: { background: 'rgba(99,102,241,.1)', color: '#6366F1' },
      icon: <><rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" /><rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" /></>,
      tagIcon: <polyline points="20 6 9 17 4 12" />
    }
  ];

  return (
    <section id="recursos" style={{ position: 'relative' }}>
      {/* Decoração de Background */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at 70% 30%, rgba(37, 99, 235,.1) 0%, transparent 60%)',
        zIndex: 0
      }}></div>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '3px',
        background: 'linear-gradient(90deg, transparent, var(--primary), transparent)'
      }}></div>

      <div className="section-inner" style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center' }} data-aos="fade-up">
          <span className="section-label">Funcionalidades</span>
          <h2 className="section-h2">Recursos pensados<br />para <span style={{ color: 'var(--primary)' }}>SST</span></h2>
          <p className="section-sub" style={{ margin: '0 auto', maxWidth: '700px' }}>
            Cada funcionalidade foi criada por especialistas em Segurança do Trabalho para resolver problemas reais.
            {' '}Recursos avançados (validação digital, histórico, eSocial, WhatsApp) variam conforme o plano.
          </p>
        </div>

        <div className="recursos-grid recursos-grid--extended">
          {recursos.map((item, index) => (
            <div 
              key={index} 
              className="recurso-card" 
              data-aos="fade-up" 
              data-aos-delay={item.delay}
            >
              <div className="recurso-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {item.icon}
                </svg>
              </div>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
              <span className="recurso-tag" style={item.tagStyle}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  {item.tagIcon}
                </svg>
                {item.tag}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Recursos;