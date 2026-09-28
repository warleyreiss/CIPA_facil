import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabaseClient';
import { isErroEsperadoUsuario } from '../../../lib/alertaManutencaoService';
import { cnpj as cnpjValidator } from 'cpf-cnpj-validator';
import { limparCodigoParceiro, obterCodigoParceiro } from '../../../lib/parceiroStorage';
import { signInWithGoogle } from '../../../lib/authService';
import { SESSION_KEYS } from '../../../lib/storageService';
import { salvarPendingRegistration, lerPendingRegistration, limparPendingRegistration } from '../../../lib/pendingRegistration';
import { salvarPendingEmailConfirm } from '../../../lib/pendingEmailConfirm';
import { appUrl } from '../../../lib/appUrl';
import { BRAND } from '../../../lib/brandAssets';
import LoadingOverlay from '../../../components/LoadingOverlay';
import './css/FormCadastro.css';
import './css/cadastro-wizard.css';
import './css/marketing-modern.css';
import './css/landing-cadastro-shell.css';
import { Sidebar } from 'primereact/sidebar';
interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FormCadastroLogin: React.FC<RegisterModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [statusMensagem, setStatusMensagem] = useState('');
  const [erroBack, setErroBack] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [aceiteTermos, setAceiteTermos] = useState(false);

  const [email, setEmail] = useState('');
  const [emailConfirm, setEmailConfirm] = useState('');
  const [password, setPassword] = useState('');
  const [nomeCompleto, setNomeCompleto] = useState(sessionStorage.getItem(SESSION_KEYS.tempNome) || '');
  const [cnpj, setCnpj] = useState('');
  const [tipoCadastro, setTipoCadastro] = useState<'AUTONOMO' | 'EMPRESARIAL' | null>(null);
  const [contato, setContato] = useState('');

  // Estados de validação
  const [cnpjValido, setCnpjValido] = useState(true);
  const [errosCampos, setErrosCampos] = useState<Record<string, string>>({});

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const emailPreenchido = email.trim().length > 0;
  const emailFormatoOk = emailRegex.test(email.trim());
  const emailConfirmPreenchido = emailConfirm.trim().length > 0;
  const emailsIguais = emailConfirmPreenchido && email.trim().toLowerCase() === emailConfirm.trim().toLowerCase();

  const senhaRegras = {
    min8: password.length >= 8,
    maiuscula: /[A-ZÀ-Ý]/.test(password),
    numero: /\d/.test(password),
  };
  const senhaValida =
    senhaRegras.min8 && senhaRegras.maiuscula && senhaRegras.numero;

  const dicaEmail = !emailPreenchido
    ? 'Informe um e-mail no formato nome@dominio.com'
    : emailFormatoOk
      ? 'E-mail válido'
      : 'Use o formato nome@dominio.com, sem espaços';

  const dicaEmailConfirm = !emailConfirmPreenchido
    ? 'Repita o mesmo e-mail do campo anterior'
    : emailsIguais
      ? 'E-mails coincidem'
      : 'Os e-mails ainda não coincidem';

  const dicaSenha = !password
    ? 'Mínimo 8 caracteres, com maiúscula e número'
    : !senhaRegras.min8
      ? 'Insira pelo menos 8 caracteres'
      : !senhaRegras.maiuscula
        ? 'Insira pelo menos 1 letra maiúscula'
        : !senhaRegras.numero
          ? 'Insira pelo menos 1 número'
          : 'Senha válida';

  const limparErroCampo = (campo: string) => {
    setErrosCampos((prev) => {
      if (!prev[campo]) return prev;
      const { [campo]: _removido, ...resto } = prev;
      return resto;
    });
  };

  const assIdFromUrl = searchParams.get('ass_id');

  useEffect(() => {
    if (!isOpen) {
      setLoading(false);
      setStatusMensagem('');
      setErroBack('');
      return;
    }

    const pending = lerPendingRegistration();
    const assId = assIdFromUrl || pending?.assinatura_id || null;
    const retomarEmail =
      Boolean(assId) &&
      (pending?.continuar_com_email === true ||
        (Boolean(assIdFromUrl) && pending?.continuar_com_google !== true && Boolean(pending?.email)));

    if (retomarEmail && pending) {
      setStep(2);
      setTipoCadastro(pending.assinatura_tipo ?? 'AUTONOMO');
      setNomeCompleto(pending.nome_completo || '');
      setCnpj(pending.cnpj || '');
      setContato(pending.contato || '');
      setEmail(pending.email || '');
      setEmailConfirm(pending.email || '');
      setAceiteTermos(true);
      setPassword('');
      setStatusMensagem('');
      setErroBack('Pagamento confirmado. Confirme sua senha para concluir o cadastro.');
      return;
    }

    setStep(1);
    setTipoCadastro(null);
    setAceiteTermos(false);
  }, [isOpen, assIdFromUrl]);

  useEffect(() => {
    if (!isOpen) return;

    const html = document.documentElement;
    const { body } = document;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, [isOpen]);

  // Máscara e Validação de CNPJ
  const handleCnpjChange = (v: string) => {
    const rawValue = v.replace(/\D/g, '').slice(0, 14);
    const maskedValue = rawValue
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');

    setCnpj(maskedValue);
    if (rawValue.length === 14) {
      setCnpjValido(cnpjValidator.isValid(rawValue));
    } else {
      setCnpjValido(true);
    }
  };

  // Máscara de Contato (Telefone)
  const handleContatoChange = (v: string) => {
    const rawValue = v.replace(/\D/g, '').slice(0, 11);
    const maskedValue = rawValue
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
    setContato(maskedValue);
  };

  const handleSelectTipo = (tipo: 'AUTONOMO' | 'EMPRESARIAL') => {
    setTipoCadastro(tipo);
    setStep(2);
  };

  // Cadastro via Google (com Stripe quando o plano for pago)
  const handleGoogleSignup = async () => {
    const erros: Record<string, string> = {};
    if (!nomeCompleto.trim()) {
      erros.nome = tipoCadastro === 'AUTONOMO' ? 'Informe seu nome.' : 'Informe o nome da organização.';
    }
    if (tipoCadastro === 'EMPRESARIAL' && !cnpjValidator.isValid(cnpj)) {
      erros.cnpj = 'CNPJ inválido. Verifique os 14 dígitos.';
    }
    if (contato.replace(/\D/g, '').length < 10) {
      erros.contato = 'Informe um telefone válido com DDD.';
    }
    if (!aceiteTermos) {
      erros.aceite = 'É necessário aceitar os Termos e a Privacidade.';
    }
    setErrosCampos(erros);
    if (Object.keys(erros).length > 0) {
      setErroBack('');
      return;
    }

    if (loading) return;
    setLoading(true);
    setErroBack('');
    setStatusMensagem('Preparando ambiente Google...');

    const pendingBase = {
      nome_completo: nomeCompleto,
      cnpj: tipoCadastro === 'EMPRESARIAL' ? cnpj : null,
      assinatura_tipo: (tipoCadastro || 'AUTONOMO') as 'AUTONOMO' | 'EMPRESARIAL',
      assinatura_id: assIdFromUrl,
      contato,
      origem_cadastro: 'DONO',
      parceiro_codigo: obterCodigoParceiro(),
      continuar_com_google: true as const,
      continuar_com_email: false as const,
    };

    try {
      salvarPendingRegistration(pendingBase);
      setStatusMensagem('Redirecionando para autenticação...');
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Erro capturado no cadastro via Google:', err);
      setErroBack(
        isErroEsperadoUsuario(err)
          ? 'Não foi possível concluir o cadastro com Google. Tente novamente.'
          : 'Estamos em manutenção no momento, tente novamente mais tarde.'
      );
      setLoading(false);
    }
  };

  const validarCampos = () => {
    const erros: Record<string, string> = {};

    if (!nomeCompleto.trim()) {
      erros.nome = tipoCadastro === 'AUTONOMO' ? 'Informe seu nome.' : 'Informe o nome da organização.';
    }
    if (tipoCadastro === 'EMPRESARIAL' && !cnpjValidator.isValid(cnpj)) {
      erros.cnpj = 'CNPJ inválido. Verifique os 14 dígitos.';
    }
    if (contato.replace(/\D/g, '').length < 10) {
      erros.contato = 'Informe um telefone válido com DDD.';
    }
    if (!email.trim()) {
      erros.email = 'Informe o e-mail de acesso.';
    } else if (!emailFormatoOk) {
      erros.email = 'Use um e-mail válido, como nome@empresa.com.';
    }
    if (!emailConfirm.trim()) {
      erros.emailConfirm = 'Confirme o e-mail.';
    } else if (!emailsIguais) {
      erros.emailConfirm = 'Os e-mails não coincidem.';
    }
    if (!senhaValida) {
      erros.password = 'A senha ainda não atende a todos os requisitos.';
    }
    if (!aceiteTermos) {
      erros.aceite = 'É necessário aceitar os Termos e a Privacidade.';
    }
    return erros;
  };

  const handleFinalizarCadastro = async (e: React.FormEvent) => {
    e.preventDefault();

    const erros = validarCampos();
    setErrosCampos(erros);
    if (Object.keys(erros).length > 0) {
      setErroBack('');
      return;
    }

    setLoading(true);
    setErroBack('');
    setStatusMensagem('Criando sua conta segura...');

    try {
      const parceiroCodigo = obterCodigoParceiro();
      const assIdFinal = assIdFromUrl || lerPendingRegistration()?.assinatura_id || null;
      
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: appUrl('/verificar-email'),
          data: {
            nome_completo: nomeCompleto,
            cnpj: tipoCadastro === 'EMPRESARIAL' ? cnpj : null,
            assinatura_id: assIdFinal,
            assinatura_tipo: tipoCadastro || 'AUTONOMO',
            contato: contato,
            origem_cadastro: 'DONO',
            ...(parceiroCodigo ? { parceiro_codigo: parceiroCodigo } : {}),
          }
        }
      });

      if (signUpError) throw signUpError;

      if (signUpData.user) {
        if (parceiroCodigo) limparCodigoParceiro();
        limparPendingRegistration();

        if (signUpData.session) {
          setStatusMensagem('Autenticando...');
          navigate('/inicio', { replace: true });
        } else {
          salvarPendingEmailConfirm(email);
          setLoading(false);
          setStep(3);
          setTimeout(() => {
            navigate('/verificar-email', { replace: true });
            onClose();
          }, 3500);
        }
      }

    } catch (err: any) {
      setLoading(false);
      console.error("Erro capturado no FormCadastro:", err);

      if (isErroEsperadoUsuario(err)) {
        setErroBack('Este e-mail já está cadastrado. Por favor, faça login.');
      } else {
        setErroBack('Estamos em manutenção no momento, tente novamente mais tarde.');
      }
    }
  };

  if (!isOpen) return null;

  const stepMeta = [
    { title: 'Perfil de uso', desc: 'Como você vai utilizar a plataforma' },
    { title: 'Sua conta', desc: 'Dados de acesso e segurança' },
    { title: 'Pronto!', desc: 'Conta criada com sucesso' },
  ] as const;

  return (
    <Sidebar
      visible={isOpen}
      onHide={onClose}
      fullScreen
      blockScroll
      showHeader={false}
      showCloseIcon={false}
      className="modal-cadastro landing-cadastro-panel landing-cadastro-panel--wizard"
    >
      {loading && (
        <LoadingOverlay
          visible
          mode="hold"
          message={statusMensagem || 'Criando sua conta…'}
        />
      )}

      <button
        type="button"
        className="landing-cadastro-close"
        onClick={onClose}
        aria-label="Fechar cadastro"
      >
        <i className="pi pi-times" aria-hidden="true" />
      </button>

      <div className="cadastro-wizard">
        <aside className="cadastro-wizard__rail" aria-label="Progresso do cadastro">
          <div className="cadastro-wizard__rail-brand">
            
            <img
              className="cadastro-wizard__rail-mark"
              src={BRAND.logomarca}
            />
          </div>
          <p className="cadastro-wizard__rail-lead">
            Configure sua conta e organize a CIPA: mandato, reuniões e a eleição da NR-05.
          </p>

          <ol className="cadastro-wizard__steps">
            {stepMeta.map((item, index) => {
              const n = index + 1;
              const isActive = step === n;
              const isDone = step > n || (step === 3 && n < 3);
              return (
                <li
                  key={item.title}
                  className={`cadastro-wizard__step${isActive ? ' is-active' : ''}${isDone ? ' is-done' : ''}`}
                >
                  <span className="cadastro-wizard__step-num">{isDone && !isActive ? '✓' : n}</span>
                  <span className="cadastro-wizard__step-text">
                    <strong>{item.title}</strong>
                    <small>{item.desc}</small>
                  </span>
                </li>
              );
            })}
          </ol>

          <ul className="cadastro-wizard__rail-perks">
            <li>Um projeto gratuito para começar</li>
            <li>Calendário da eleição já montado</li>
            <li>Atas e reuniões no mesmo lugar</li>
          </ul>
        </aside>

        <div className="cadastro-wizard__panel">
          <header className="cadastro-wizard__head">
            {step === 2 && (
              <button type="button" className="cadastro-wizard__back" onClick={() => setStep(1)}>
                ← Voltar
              </button>
            )}
           
          </header>

          <div className="cadastro-wizard__body">
            <header className="cadastro-wizard__top">
           
            <div className="cadastro-wizard__head-main">
              <h2>
                {step === 1 && 'Como você pretende usar o sistema?'}
                {step === 2 && 'Complete seu cadastro'}
                {step === 3 && 'Cadastro realizado!'}
              </h2>
              <p>
                {step === 1 && 'Escolha o perfil que melhor descreve seu uso. Você pode evoluir depois.'}
                {step === 2 &&
                  (tipoCadastro === 'EMPRESARIAL'
                    ? 'Informe os dados da organização e crie suas credenciais de acesso.'
                    : 'Informe seus dados e crie suas credenciais de acesso.')}
                {step === 3 && 'Estamos redirecionando você para confirmar o e-mail.'}
              </p>
            </div>
            {step === 2 && tipoCadastro && (
              <span className="cadastro-wizard__tipo-badge">
                {tipoCadastro === 'AUTONOMO' ? 'Autônomo' : 'Empresarial'}
              </span>
            )}
          </header>
            <div className="cadastro-wizard__body-inner" >
              <div className="form-cadastro">
                <div className="modal-body">
                  {step === 1 && (
                    <div className="step-content animate-in step-content--tipo">
                      <div className="cadastro-type-grid">
                        <button
                          type="button"
                          className="cadastro-type-card"
                          onClick={() => handleSelectTipo('AUTONOMO')}
                        >
                          <div className="cadastro-type-card__icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                              <circle cx="12" cy="7" r="4" />
                            </svg>
                          </div>
                          <h4>Autônomo</h4>
                          <p>Uso individual. Você decide quais dados informar na plataforma.</p>
                          <span className="cadastro-type-card__cta">
                            Continuar <span aria-hidden="true">→</span>
                          </span>
                        </button>

                        <button
                          type="button"
                          className="cadastro-type-card"
                          onClick={() => handleSelectTipo('EMPRESARIAL')}
                        >
                          <div className="cadastro-type-card__icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                            </svg>
                          </div>
                          <h4>Empresarial</h4>
                          <p>Para empresas e equipes com CNPJ e múltiplos colaboradores.</p>
                          <span className="cadastro-type-card__cta">
                            Continuar <span aria-hidden="true">→</span>
                          </span>
                        </button>
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <form id="cadastro-form-step2" onSubmit={handleFinalizarCadastro} className="step-content animate-in step-content--form">
                     
                      <div className="cadastro-section">
                        <h3 className="cadastro-section__title">Identificação</h3>
                        <div className="form-grid">
                          <div className={`ff ${tipoCadastro === 'AUTONOMO' ? '' : 'ff--full'}`}>
                            <div className="ff__control">
                              <input
                                id="cad-nome"
                                type="text"
                                className={errosCampos.nome ? 'input-invalid' : undefined}
                                value={nomeCompleto}
                                onChange={(e) => { setNomeCompleto(e.target.value); limparErroCampo('nome'); }}
                                required
                                placeholder={tipoCadastro === 'AUTONOMO' ? 'João da Silva' : 'Minha Empresa LTDA'}
                              />
                              <i className={`ff__icon pi ${tipoCadastro === 'AUTONOMO' ? 'pi-user' : 'pi-building'}`} aria-hidden="true" />
                              <label htmlFor="cad-nome">{tipoCadastro === 'AUTONOMO' ? 'Seu nome' : 'Nome da organização'}</label>
                            </div>
                            {errosCampos.nome && <span className="field-error-text">{errosCampos.nome}</span>}
                          </div>
                          {tipoCadastro === 'EMPRESARIAL' && (
                            <div className="ff">
                              <div className="ff__control">
                                <input
                                  id="cad-cnpj"
                                  type="text"
                                  className={(errosCampos.cnpj || !cnpjValido) ? 'input-invalid' : undefined}
                                  value={cnpj}
                                  onChange={(e) => { handleCnpjChange(e.target.value); limparErroCampo('cnpj'); }}
                                  required
                                  placeholder="00.000.000/0000-00"
                                />
                                <i className="ff__icon pi pi-id-card" aria-hidden="true" />
                                <label htmlFor="cad-cnpj">CNPJ</label>
                              </div>
                              {(errosCampos.cnpj || !cnpjValido) && (
                                <span className="field-error-text">{errosCampos.cnpj || 'CNPJ inválido'}</span>
                              )}
                            </div>
                          )}
                          <div className="ff">
                            <div className="ff__control">
                              <input
                                id="cad-contato"
                                type="text"
                                className={errosCampos.contato ? 'input-invalid' : undefined}
                                value={contato}
                                onChange={(e) => { handleContatoChange(e.target.value); limparErroCampo('contato'); }}
                                required
                                placeholder="(00) 00000-0000"
                              />
                              <i className="ff__icon pi pi-phone" aria-hidden="true" />
                              <label htmlFor="cad-contato">Telefone / WhatsApp</label>
                            </div>
                            {errosCampos.contato && <span className="field-error-text">{errosCampos.contato}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="cadastro-section">
                        <h3 className="cadastro-section__title">Acesso</h3>
                        <div className="form-grid">
                          <div className="ff">
                            <div className="ff__control">
                              <input
                                id="cad-email"
                                type="email"
                                className={errosCampos.email ? 'input-invalid' : undefined}
                                value={email}
                                onChange={(e) => { setEmail(e.target.value); limparErroCampo('email'); }}
                                required
                                placeholder="contato@empresa.com"
                                autoComplete="email"
                              />
                              <i className="ff__icon pi pi-envelope" aria-hidden="true" />
                              <label htmlFor="cad-email">E-mail de acesso</label>
                            </div>
                            <div
                              className={`field-hint${
                                errosCampos.email
                                  ? ' field-hint--invalid'
                                  : emailPreenchido
                                    ? emailFormatoOk
                                      ? ' field-hint--valid'
                                      : ' field-hint--invalid'
                                    : ''
                              }`}
                            >
                              {dicaEmail}
                            </div>
                            {errosCampos.email && <span className="field-error-text">{errosCampos.email}</span>}
                          </div>
                          <div className="ff">
                            <div className="ff__control">
                              <input
                                id="cad-email-confirm"
                                type="email"
                                className={errosCampos.emailConfirm ? 'input-invalid' : undefined}
                                value={emailConfirm}
                                onChange={(e) => { setEmailConfirm(e.target.value); limparErroCampo('emailConfirm'); }}
                                required
                                placeholder="contato@empresa.com"
                                autoComplete="email"
                              />
                              <i className="ff__icon pi pi-check-circle" aria-hidden="true" />
                              <label htmlFor="cad-email-confirm">Confirme o e-mail</label>
                            </div>
                            <div
                              className={`field-hint${
                                errosCampos.emailConfirm
                                  ? ' field-hint--invalid'
                                  : emailConfirmPreenchido
                                    ? emailsIguais
                                      ? ' field-hint--valid'
                                      : ' field-hint--invalid'
                                    : ''
                              }`}
                            >
                              {dicaEmailConfirm}
                            </div>
                            {errosCampos.emailConfirm && <span className="field-error-text">{errosCampos.emailConfirm}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="cadastro-section">
                        <h3 className="cadastro-section__title">Segurança</h3>
                        <div className="form-grid">
                          <div className="ff ff--full ff--pass">
                            <div className="ff__control">
                              <input
                                id="cad-senha"
                                type={showPass ? 'text' : 'password'}
                                className={errosCampos.password ? 'input-invalid' : undefined}
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); limparErroCampo('password'); }}
                                required
                                placeholder="Crie uma senha segura"
                                autoComplete="new-password"
                              />
                              <i className="ff__icon pi pi-lock" aria-hidden="true" />
                              <label htmlFor="cad-senha">Senha</label>
                              <button type="button" className="btn-toggle-inside" onClick={() => setShowPass(!showPass)}>
                                {showPass ? (
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                    <line x1="1" y1="1" x2="23" y2="23" />
                                  </svg>
                                ) : (
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                    <circle cx="12" cy="12" r="3" />
                                  </svg>
                                )}
                              </button>
                            </div>
                            <div
                              className={`field-hint${
                                errosCampos.password
                                  ? ' field-hint--invalid'
                                  : password.length > 0
                                    ? senhaValida
                                      ? ' field-hint--valid'
                                      : ' field-hint--invalid'
                                    : ''
                              }`}
                            >
                              {dicaSenha}
                            </div>
                            {errosCampos.password && <span className="field-error-text">{errosCampos.password}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="aceite-container">
                        <label className="checkbox-modern-inline">
                          <input
                            type="checkbox"
                            checked={aceiteTermos}
                            onChange={(e) => { setAceiteTermos(e.target.checked); limparErroCampo('aceite'); }}
                            required
                          />
                          <span className="checkmark" />
                          <p>
                            Li e aceito os <Link to="/termos-de-uso" target="_blank">Termos de uso</Link> e de{' '}
                            <Link to="/politica-privacidade" target="_blank">Privacidade</Link>.
                          </p>
                        </label>
                        {errosCampos.aceite && <span className="field-error-text">{errosCampos.aceite}</span>}
                      </div>
 {tipoCadastro === 'AUTONOMO' && (
                        <div className="cadastro-autonomo-aviso" role="note">
                          <i className="pi pi-info-circle" aria-hidden="true" />
                          <p>
                            <strong>Cadastro autônomo — dados por sua escolha.</strong> Ao continuar, você declara que
                            os dados informados são fornecidos de forma voluntária. Se incluir dados de terceiros, você
                            é responsável pela base legal conforme a LGPD.
                          </p>
                        </div>
                      )}

                      {erroBack && (
                        <div className="error-message-box" role="alert">
                          <i className="pi pi-exclamation-circle error-message-box__icon" aria-hidden="true" />
                          <p className="error-message-box__text">{erroBack}</p>
                        </div>
                      )}
                    </form>
                  )}

                  {step === 3 && (
                    <div className="success-container cadastro-wizard__success animate-in">
                      <div className="success-checkmark">
                        <div className="check-icon" />
                      </div>
                      <h3>Cadastro realizado!</h3>
                      <p>Redirecionando para verificação do e-mail…</p>
                      <div className="loading-bar-success" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {step === 2 && (
            <footer className="cadastro-wizard__footer">
              <div className="cadastro-wizard__footer-inner">
                
                <div className="actions-right">
                  <button
                  type="button"
                  className="btn-google"
                  onClick={handleGoogleSignup}
                  disabled={loading || !aceiteTermos || (tipoCadastro === 'EMPRESARIAL' && !cnpjValido)}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Google
                </button>
                  <button type="submit" form="cadastro-form-step2" className="btn-finish" disabled={loading || !aceiteTermos || !senhaValida || (tipoCadastro === 'EMPRESARIAL' && !cnpjValido)}>
                    {loading ? 'Processando…' : 'Finalizar cadastro'}
                  </button>
                </div>
              </div>
            </footer>
          )}
        </div>
      </div>

      {loading && (
        <div className="cadastro-processing" role="status" aria-live="polite" aria-busy="true">
          <div className="cadastro-processing__backdrop" aria-hidden="true" />
          <div className="cadastro-processing__card">
            <div className="cadastro-processing__logo-ring">
              <img src={BRAND.logotipo} alt="" className="cadastro-processing__logo" />
            </div>
            <p key={statusMensagem} className="cadastro-processing__status">{statusMensagem || 'Processando...'}</p>
            <div className="cadastro-processing__progress" aria-hidden="true">
              <div className="cadastro-processing__progress-fill" />
            </div>
            <p className="cadastro-processing__footnote">Configurando sua conta com segurança</p>
          </div>
        </div>
      )}
    </Sidebar>
  );
};

export default FormCadastroLogin;