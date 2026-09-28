
const Porque = () => {
  const problems = [
    {
      delay: 0,
      title: "Fórmulas complexas que quebram",
      text: "Planilhas Excel com centenas de fórmulas condicionais falham silenciosamente. Uma célula errada compromete todo o controle.",
      icon: <circle cx="12" cy="12" r="10" />
    },
    {
      delay: 80,
      title: "Zero rastreabilidade de entregas",
      text: "Sem assinatura digital, sem histórico auditável. Na fiscalização, você não consegue provar a entrega correta.",
      icon: <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    },
    {
      delay: 160,
      title: "Tempo desperdiçado em atualização manual",
      text: "Horas por semana atualizando datas e verificando vencimentos. Um recurso valioso jogado fora em tarefas repetitivas.",
      icon: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>
    }
  ];

  const advantages = [
    { title: "Confiabilidade Total", icon: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />, delay: 0, extra: "Histórico de fornecimentos; consulta avançada a partir do Pro." },
    { title: "Economia de Tempo", icon: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>, delay: 60, extra: "Alertas no painel; resumo por e-mail no Pro e WhatsApp no Gestor." },
    { title: "Gestão Visual", icon: <><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></>, delay: 120, extra: "Dashboard básica em todos os planos; avançada no Pro; custos no Gestor." },
    { title: "Relatórios Precisos", icon: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></>, delay: 180, extra: "Exportações e gabarito eSocial conforme o plano." },
    { title: "Gestão Ativa", icon: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />, delay: 240, extra: "E-mail semanal no Pro; WhatsApp no Gestor." },
    { title: "Multi-Validações", icon: <><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>, delay: 300, extra: "Código de barras/RFID no Pro; biometria no Gestor." }
  ];

  return (
    <section id="por-que" style={{ position: 'relative', overflow: 'hidden' }}>
      <div className="bg-squares" id="bgSquaresDark" style={{ opacity: 0.3 }}></div>
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at 30% 70%, rgba(37, 99, 235, .08) 0%, transparent 60%)',
        zIndex: 0
      }}></div>

      <div className="section-inner" style={{ paddingTop: '96px', paddingBottom: '96px', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '16px' }} data-aos="fade-up">
          <span className="section-label">Por que usar</span>
          <h2 className="section-h2" style={{ color: '#fff' }}>
            A planilha que<br /><span style={{ color: 'var(--primary)' }}>te expõe ao risco.</span>
          </h2>
          <p className="section-sub" style={{ margin: '0 auto', color: '#94a3b8', maxWidth: '600px' }}>
            Milhares de empresas ainda gerenciam EPIs em planilhas, sem perceber o custo invisível desse modelo.
          </p>
        </div>

        <div className="why-grid">
          {/* Coluna da Esquerda: Problemas e Solução */}
          <div>
            {problems.map((prob, i) => (
              <div key={i} className="problem-card" data-aos="fade-right" data-aos-delay={prob.delay}>
                <h4>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    {prob.icon}
                  </svg>
                  {prob.title}
                </h4>
                <p>{prob.text}</p>
              </div>
            ))}

            <div className="vs-divider">
              <span className="vs-badge">Com CIPA Fácil é diferente</span>
            </div>

            <div className="solution-card" data-aos="fade-right" data-aos-delay="240">
              <h4>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Plataforma pronta, sem configuração complexa
              </h4>
              <p>Em minutos você tem um sistema completo. Cadastre projetos, EPIs e colaboradores.</p>
            </div>

            <div className="solution-card" data-aos="fade-right" data-aos-delay="320">
              <h4>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                </svg>
                Alertas proativos conforme o plano
              </h4>
              <p>Resumo semanal por e-mail a partir do Pro; WhatsApp com verificação no plano Gestor — além dos alertas no painel.</p>
            </div>

            <div className="solution-card" data-aos="fade-right" data-aos-delay="400">
              <h4>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                </svg>
                Histórico auditável e validação digital
              </h4>
              <p>Cada fornecimento fica registrado. No Pro, código de barras e RFID; no Gestor, biometria e eSocial.</p>
            </div>
          </div>

          {/* Coluna da Direita: Vantagens */}
          <div>
            <div className="advantages-grid">
              {advantages.map((adv, i) => (
                <div key={i} className="adv-card" data-aos="fade-left" data-aos-delay={adv.delay}>
                  <div className="adv-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      {adv.icon}
                    </svg>
                  </div>
                  <h4>{adv.title}</h4>
                  <p>Gestão eficiente e automatizada para SST.</p>
                  {adv.extra && <p className="adv-extra">{adv.extra}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Porque;