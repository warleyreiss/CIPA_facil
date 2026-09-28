import FormCadastroLogin from './components/FormCadastroLogin';
import ModalIndicacaoParceiro from './components/ModalIndicacaoParceiro';
import LoadingOverlay from '../../components/LoadingOverlay';
import ProvaSocialLogin from '../../components/auth/ProvaSocialLogin';
import { useProjeto } from '../../contexts/ProjetoContext';
import { STRIPE_PRICE_ID_INICIANTE } from '../../lib/recursosPlano';
import { BRAND } from '../../lib/brandAssets';
import { SESSION_KEYS } from '../../lib/storageService';
import { signInWithGoogle } from '../../lib/authService';
import {
  lerPendingRegistration,
  mesclarPendingRegistration,
} from '../../lib/pendingRegistration';
import { stripeService } from '../../lib/stripeService';
import './components/css/Login.css';
import './components/css/FormCadastro.css';
import { supabase } from '../../lib/supabaseClient';
import { isErroEsperadoUsuario } from '../../lib/alertaManutencaoService';
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { capturarParceiroDaUrl, obterCodigoParceiro } from '../../lib/parceiroStorage';
import { revalidarIndicacaoPendente } from '../../lib/parceiroService';

export default function Login() {
  const isRegistering = false;
  const [isCadastroModalOpen, setIsCadastroModalOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { inicializarUsuario, authError } = useProjeto() as {
    inicializarUsuario: (user: any) => Promise<void>;
    authError?: any;
  };

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nomeCompleto, setNomeCompleto] = useState(sessionStorage.getItem(SESSION_KEYS.tempNome) || '');
  const [nomeEmpresa, setNomeEmpresa] = useState(sessionStorage.getItem(SESSION_KEYS.tempEmpresa) || '');
  const [loading, setLoading] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [errosCampos, setErrosCampos] = useState<Record<string, string>>({});
  const [indicacaoOpen, setIndicacaoOpen] = useState(false);
  const [codigoTentado, setCodigoTentado] = useState('');
  const [abrirCadastroAposIndicacao, setAbrirCadastroAposIndicacao] = useState(false);
  const googlePosStripeRef = useRef(false);

  const limparErroCampo = (campo: string) => {
    setErrosCampos((prev) => {
      if (!prev[campo]) return prev;
      const { [campo]: _removido, ...resto } = prev;
      return resto;
    });
  };

  const priceIdFixo = STRIPE_PRICE_ID_INICIANTE;
  const assIdFromUrl = searchParams.get('ass_id');
  const continuarGoogleUrl = searchParams.get('auth') === 'google';

  const iniciarGoogleComAssinatura = async (assinaturaId?: string | null) => {
    const pending = lerPendingRegistration();
    mesclarPendingRegistration({
      ...(pending ?? {}),
      assinatura_id: assinaturaId || pending?.assinatura_id || null,
      origem_cadastro: pending?.origem_cadastro || 'DONO',
      continuar_com_google: true,
      parceiro_codigo: pending?.parceiro_codigo ?? obterCodigoParceiro(),
    });
    await signInWithGoogle();
  };

  useEffect(() => {
    capturarParceiroDaUrl(searchParams.toString() ? `?${searchParams.toString()}` : undefined);
  }, [searchParams]);

  useEffect(() => {
    if (authError) {
      setErrorMessage(authError);
      setLoading(false);
    }
  }, [authError]);

  // Pós-Stripe (cadastro Google): /login?ass_id=…&auth=google → retoma OAuth
  useEffect(() => {
    if (!assIdFromUrl || googlePosStripeRef.current) return;

    const pending = lerPendingRegistration();
    const deveContinuarGoogle =
      continuarGoogleUrl || pending?.continuar_com_google === true;

    if (!deveContinuarGoogle) return;

    googlePosStripeRef.current = true;
    setLoading(true);
    setErrorMessage('');
    setShowSuccessOverlay(true);

    void (async () => {
      try {
        await iniciarGoogleComAssinatura(assIdFromUrl);
      } catch (err: unknown) {
        googlePosStripeRef.current = false;
        setShowSuccessOverlay(false);
        setLoading(false);
        console.error('Erro ao retomar Google após Stripe:', err);
        setErrorMessage(
          isErroEsperadoUsuario(err)
            ? 'Pagamento ok, mas não foi possível entrar com Google. Clique no botão Google para concluir.'
            : 'Pagamento ok. Estamos em manutenção no login Google — tente o botão Google em instantes.',
        );
      }
    })();
  }, [assIdFromUrl, continuarGoogleUrl]);

  // Pós-Stripe (cadastro e-mail): reabre wizard com dados do pending
  useEffect(() => {
    if (!assIdFromUrl || continuarGoogleUrl || isCadastroModalOpen) return;

    const pending = lerPendingRegistration();
    const retomarEmail =
      pending?.continuar_com_email === true ||
      (pending?.continuar_com_google !== true && Boolean(pending?.email));

    if (!retomarEmail) return;

    mesclarPendingRegistration({ assinatura_id: assIdFromUrl });
    setIsCadastroModalOpen(true);
  }, [assIdFromUrl, continuarGoogleUrl, isCadastroModalOpen]);

  const abrirCadastroComValidacao = async () => {
    const codigo = obterCodigoParceiro();
    if (!codigo) {
      setIsCadastroModalOpen(true);
      return;
    }
    const result = await revalidarIndicacaoPendente();
    if (result && !result.ok) {
      setCodigoTentado(result.codigoTentado || codigo);
      setAbrirCadastroAposIndicacao(true);
      setIndicacaoOpen(true);
      return;
    }
    setIsCadastroModalOpen(true);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    const erros: Record<string, string> = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      erros.email = 'Informe o e-mail.';
    } else if (!emailRegex.test(email)) {
      erros.email = 'E-mail inválido.';
    }
    if (!password) {
      erros.password = 'Informe a senha.';
    }
    setErrosCampos(erros);
    if (Object.keys(erros).length > 0) {
      setErrorMessage('');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    if (isRegistering) {
      sessionStorage.setItem(SESSION_KEYS.tempNome, nomeCompleto);
      sessionStorage.setItem(SESSION_KEYS.tempEmpresa, nomeEmpresa);
    }

    try {
      if (isRegistering) {
        const assIdFromUrl = searchParams.get('ass_id');
        if (!assIdFromUrl) {
          const { data: planos } = await supabase.functions.invoke('get-plans');
          const plano = planos?.find((p: any) => p.id === priceIdFixo);

          if (plano?.e_gratuito) {
            const { data: novaAssinatura, error: insertError } = await supabase
              .from('assinaturas')
              .insert([
                {
                  plano_status: 'active',
                  assinatura_tipo: 'AUTONOMO',
                  plano_tipo: 'INICIANTE',
                  plano_regra_id: priceIdFixo,
                },
              ])
              .select('id')
              .single();

            if (insertError) throw insertError;

            if (novaAssinatura?.id) {
              setSearchParams({ ass_id: novaAssinatura.id });
            } else {
              throw new Error('Erro ao gerar ID da assinatura.');
            }

            setLoading(false);
            return;
          }

          await stripeService.createCheckoutSession(priceIdFixo, 'AUTONOMO', email.trim() || undefined);
          return;
        }

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              nome_completo: nomeCompleto,
              nome_empresa: nomeEmpresa,
              assinatura_id: assIdFromUrl,
              role: 'GESTOR',
            },
          },
        });

        if (signUpError) throw signUpError;

        if (signUpData.user) {
          setShowSuccessOverlay(true);
          setTimeout(() => navigate('/verificar-email'), 1500);
        }
      } else {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;

        if (signInData.user) {
          await inicializarUsuario(signInData.user);

          setShowSuccessOverlay(true);
          setTimeout(() => {
            navigate(signInData.user.email_confirmed_at ? '/inicio' : '/verificar-email');
          }, 1000);
        }
      }
    } catch (err: any) {
      setLoading(false);
      console.error('Erro capturado no bloco catch do Login:', err);

      if (isErroEsperadoUsuario(err)) {
        setErrorMessage('E-mail ou senha incorretos, ou conta não verificada.');
      } else {
        setErrorMessage('Nosso sistema está em manutenção no momento. Nossa equipe técnica já foi notificada.');
      }
    }
  };

  const handleGoogleLogin = async () => {
    if (loading) return;
    setLoading(true);
    setErrorMessage('');
    try {
      const pending = lerPendingRegistration();
      if (assIdFromUrl || pending?.continuar_com_google) {
        await iniciarGoogleComAssinatura(assIdFromUrl);
      } else {
        await signInWithGoogle();
      }
    } catch (err: unknown) {
      setLoading(false);
      console.error('Erro no login Google:', err);
      setErrorMessage(
        isErroEsperadoUsuario(err)
          ? 'Não foi possível entrar com Google. Tente novamente.'
          : 'Nosso sistema está em manutenção no momento. Nossa equipe técnica já foi notificada.'
      );
    }
  };

  return (
    <div className="page-login-background-section">
      {[...Array(400)].map((_, index) => (
        <span key={index} className="page-login-background-section-span" />
      ))}

      <div className="login-page-brand">
        <img src={BRAND.logomarca} alt={BRAND.name} />
      </div>

      <div className="login-container">
        {showSuccessOverlay && !errorMessage && (
          <div className="custom-loading-overlay">
            <LoadingOverlay onComplete={() => {}} />
          </div>
        )}

        <aside className="login-commercial-side" aria-hidden="true">
          <div className="commercial-content">
            <h1>A gestão da CIPA com o prazo na frente.</h1>
            <p>
              Mandato, reuniões, membros e a eleição da NR-05 no mesmo calendário.
              <br />
              Entre para ver o que vence agora.
            </p>
            <ProvaSocialLogin />
          </div>
        </aside>

        <main className="login-auth-side">
          <div className="login-card">
            <header className="login-card-header">
              <div className="login-card-logo" aria-hidden="true">
                <img src={BRAND.logomarca} alt="" />
              </div>
              <h2 className="login-card-title">Bem-vindo de volta</h2>
              <p className="login-card-subtitle">Acesse sua conta para continuar</p>
            </header>

            <form onSubmit={handleAuth} className="login-form" noValidate>
              {isRegistering && (
                <>
                  <div className="login-field">
                    <label htmlFor="login-nome">Nome completo</label>
                    <input
                      id="login-nome"
                      type="text"
                      value={nomeCompleto}
                      onChange={(e) => setNomeCompleto(e.target.value)}
                      required
                      placeholder="Seu nome"
                      autoComplete="name"
                    />
                  </div>
                  <div className="login-field">
                    <label htmlFor="login-empresa">Empresa</label>
                    <input
                      id="login-empresa"
                      type="text"
                      value={nomeEmpresa}
                      onChange={(e) => setNomeEmpresa(e.target.value)}
                      required
                      placeholder="Nome da empresa"
                      autoComplete="organization"
                    />
                  </div>
                </>
              )}

              <div className="ff">
                <div className="ff__control">
                  <input
                    id="login-email"
                    type="email"
                    className={errosCampos.email ? 'input-invalid' : undefined}
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); limparErroCampo('email'); }}
                    required
                    placeholder="exemplo@empresa.com"
                    autoComplete="email"
                  />
                  <i className="ff__icon pi pi-envelope" aria-hidden="true" />
                  <label htmlFor="login-email">E-mail corporativo</label>
                </div>
                {errosCampos.email && <span className="field-error-text">{errosCampos.email}</span>}
              </div>

              <div className="ff ff--pass">
                <div className="ff__control">
                  <input
                    id="login-senha"
                    type={showPass ? 'text' : 'password'}
                    className={errosCampos.password ? 'input-invalid' : undefined}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); limparErroCampo('password'); }}
                    required
                    placeholder="Sua senha"
                    autoComplete="current-password"
                  />
                  <i className="ff__icon pi pi-lock" aria-hidden="true" />
                  <label htmlFor="login-senha">Senha</label>
                  <button
                    type="button"
                    className="btn-toggle-inside"
                    onClick={() => setShowPass(!showPass)}
                    aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPass ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                {errosCampos.password && <span className="field-error-text">{errosCampos.password}</span>}
              </div>

              <p className="login-forgot">
                <Link to="/recuperacao-senha">Esqueci minha senha</Link>
              </p>

              {errorMessage && (
                <div className="login-error" role="alert">
                  <i className="pi pi-exclamation-circle login-error-icon" aria-hidden="true" />
                  <p className="login-error-text">{errorMessage}</p>
                </div>
              )}

              <div className="login-actions">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="login-btn-google"
                  disabled={loading}
                  aria-label="Entrar com Google"
                  title="Entrar com Google"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                </button>
                <button
                  type="submit"
                  className={`formSubmitBtnNative login-submit-btn${loading ? ' is-loading' : ''}`}
                  disabled={loading}
                >
                  {loading ? (
                    <span className="login-btn-spinner" aria-hidden="true" />
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                      <polyline points="10 17 15 12 10 7" />
                      <line x1="15" y1="12" x2="3" y2="12" />
                    </svg>
                  )}
                  {loading ? 'Processando…' : 'Entrar no sistema'}
                </button>
              </div>

              <div className="login-footer-link">
                <span className="login-footer-text">Não tem conta?</span>
                <button
                  type="button"
                  className="login-footer-cta"
                  onClick={() => void abrirCadastroComValidacao()}
                >
                  Cadastre-se
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>

      <FormCadastroLogin
        isOpen={isCadastroModalOpen}
        onClose={() => setIsCadastroModalOpen(false)}
      />

      <ModalIndicacaoParceiro
        open={indicacaoOpen}
        codigoTentado={codigoTentado}
        onClose={() => {
          setIndicacaoOpen(false);
          setAbrirCadastroAposIndicacao(false);
        }}
        onContinuarSemIndicacao={() => {
          setIndicacaoOpen(false);
          if (abrirCadastroAposIndicacao) {
            setAbrirCadastroAposIndicacao(false);
            setIsCadastroModalOpen(true);
          }
        }}
        onIndicacaoCorrigida={() => {
          setIndicacaoOpen(false);
          if (abrirCadastroAposIndicacao) {
            setAbrirCadastroAposIndicacao(false);
            setIsCadastroModalOpen(true);
          }
        }}
      />
    </div>
  );
}
