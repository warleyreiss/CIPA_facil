import { useState, useRef, useEffect, type FormEvent, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Toast } from 'primereact/toast';
import { supabase } from '../../../lib/supabaseClient';
import { useProjeto } from '../../../contexts/ProjetoContext';
import AuthShell from '../../../components/auth/AuthShell';
import LinkAjudaSuporte from '../../../components/LinkAjudaSuporte';

type SessaoStatus = 'aguardando' | 'pronta' | 'invalida';
type ModoSenha = 'convite' | 'recuperacao' | 'ativacao';

function detectarModoSenha(): ModoSenha {
  if (typeof window === 'undefined') return 'ativacao';
  const hash = window.location.hash.replace(/^#/, '');
  const fromHash = new URLSearchParams(hash);
  const fromQuery = new URLSearchParams(window.location.search);
  const type = (fromHash.get('type') || fromQuery.get('type') || '').toLowerCase();
  if (type === 'recovery') return 'recuperacao';
  if (type === 'invite' || type === 'signup') return 'convite';
  return 'ativacao';
}

const COPY: Record<
  ModoSenha,
  { title: string; subtitle: string; commercialTitle: string; commercialText: ReactNode; cta: string }
> = {
  convite: {
    title: 'Ativar convite',
    subtitle: 'Crie sua senha para acessar o projeto ao qual você foi convidado.',
    commercialTitle: 'Bem-vindo à equipe.',
    commercialText: (
      <>
        Seu convite está validado.
        <br />
        Defina uma senha forte e entre na plataforma.
      </>
    ),
    cta: 'Ativar conta e acessar',
  },
  recuperacao: {
    title: 'Nova senha',
    subtitle: 'Escolha uma nova senha para recuperar o acesso à sua conta.',
    commercialTitle: 'Acesso seguro de novo.',
    commercialText: (
      <>
        Link de recuperação confirmado.
        <br />
        Crie uma senha forte e volte à gestão da CIPA.
      </>
    ),
    cta: 'Salvar nova senha',
  },
  ativacao: {
    title: 'Definir senha',
    subtitle: 'Crie uma senha de acesso para ativar sua conta.',
    commercialTitle: 'Ative seu acesso com segurança.',
    commercialText: (
      <>
        Você chegou pelo link do e-mail.
        <br />
        Defina uma senha forte e comece a usar a plataforma.
      </>
    ),
    cta: 'Confirmar e acessar',
  },
};

export default function DefinirSenha() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessaoStatus, setSessaoStatus] = useState<SessaoStatus>('aguardando');
  const [erroLink, setErroLink] = useState<string | null>(null);
  const [erroGeral, setErroGeral] = useState('');
  const [errosCampos, setErrosCampos] = useState<Record<string, string>>({});
  const [modo, setModo] = useState<ModoSenha>(() => detectarModoSenha());
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useRef<Toast>(null);
  const { inicializarUsuario } = useProjeto();

  const copy = COPY[modo];
  const temMaiuscula = /[A-ZÀ-Ý]/.test(password);
  const temNumeroOuEspecial = /[\d\W_]/.test(password);
  const senhaForteOk = password.length >= 6 && temMaiuscula && temNumeroOuEspecial;

  useEffect(() => {
    setModo(detectarModoSenha());

    const erroUrl =
      searchParams.get('error_description') ||
      searchParams.get('error') ||
      (typeof window !== 'undefined'
        ? new URLSearchParams(window.location.hash.replace(/^#/, '')).get('error_description')
        : null);

    if (erroUrl) {
      setErroLink(decodeURIComponent(erroUrl.replace(/\+/g, ' ')));
      setSessaoStatus('invalida');
      return;
    }

    let cancelado = false;
    const aguardarSessao = async () => {
      // Troca tokens do hash/query (invite/recovery) pela sessão
      await supabase.auth.getSession();

      for (let i = 0; i < 16; i++) {
        const { data } = await supabase.auth.getSession();
        if (cancelado) return;
        if (data.session) {
          setSessaoStatus('pronta');
          return;
        }
        await new Promise((r) => setTimeout(r, 250));
      }
      if (!cancelado) {
        setSessaoStatus('invalida');
        setErroLink(
          'Link inválido ou expirado. Solicite um novo convite ou use “Esqueci minha senha”.',
        );
      }
    };

    void aguardarSessao();
    return () => {
      cancelado = true;
    };
  }, [searchParams]);

  const limparErro = (campo: string) => {
    setErrosCampos((prev) => {
      if (!prev[campo]) return prev;
      const { [campo]: _r, ...resto } = prev;
      return resto;
    });
  };

  const validar = (): boolean => {
    const erros: Record<string, string> = {};
    if (password.length < 6) erros.password = 'Mínimo de 6 caracteres.';
    else if (!temMaiuscula) erros.password = 'Inclua ao menos uma letra maiúscula.';
    else if (!temNumeroOuEspecial) erros.password = 'Inclua um número ou caractere especial.';
    if (!confirmPassword) erros.confirm = 'Confirme a senha.';
    else if (password !== confirmPassword) erros.confirm = 'As senhas não coincidem.';
    setErrosCampos(erros);
    return Object.keys(erros).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErroGeral('');
    if (!validar()) return;
    setLoading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Nenhuma sessão ativa. Acesse esta página pelo link enviado por e-mail.');
      }

      const { data: authData, error: authError } = await supabase.auth.updateUser({ password });
      if (authError) throw authError;

      const user = authData?.user;
      if (!user) throw new Error('Não foi possível confirmar o usuário autenticado.');

      const { data: dbData, error: dbError } = await supabase
        .from('usuarios')
        .update({ status_cadastro: 'ATIVO' })
        .eq('id', user.id)
        .select('id, status_cadastro');

      if (dbError) throw dbError;
      if (!dbData?.length) {
        throw new Error('Senha salva, mas não foi possível ativar o cadastro. Contate o suporte.');
      }

      if (inicializarUsuario) await inicializarUsuario(user, true, true);

      toast.current?.show({
        severity: 'success',
        summary: modo === 'recuperacao' ? 'Senha atualizada' : 'Conta ativada',
        detail: 'Tudo certo! Redirecionando…',
      });

      setTimeout(() => navigate('/inicio', { replace: true }), 1000);
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : 'Não foi possível salvar sua senha.';
      setErroGeral(msg);
    } finally {
      setLoading(false);
    }
  };

  const EyeIcon = ({ crossed }: { crossed?: boolean }) =>
    crossed ? (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </svg>
    ) : (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );

  return (
    <AuthShell
      title={copy.title}
      subtitle={copy.subtitle}
      commercialTitle={copy.commercialTitle}
      commercialText={copy.commercialText}
    >
      <Toast ref={toast} />

      {sessaoStatus === 'aguardando' && (
        <div className="login-form">
          <div className="auth-session-wait" role="status">
            <span className="login-btn-spinner" aria-hidden />
            <span>Validando link de acesso…</span>
          </div>
        </div>
      )}

      {sessaoStatus === 'invalida' && (
        <div className="login-form">
          <div className="login-error" role="alert">
            <i className="pi pi-exclamation-circle login-error-icon" aria-hidden />
            <p className="login-error-text">{erroLink || 'Não foi possível validar o link.'}</p>
          </div>

          <div className="login-actions">
            <button
              type="button"
              className="formSubmitBtnNative login-submit-btn"
              onClick={() => navigate('/recuperacao-senha')}
            >
              <i className="pi pi-envelope" aria-hidden />
              Recuperar senha
            </button>
          </div>

          <div className="login-footer-link">
            <span className="login-footer-text">Ou então</span>
            <button type="button" className="login-footer-cta" onClick={() => navigate('/login')}>
              Voltar ao login
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>

          <div className="email-verify__help">
            <LinkAjudaSuporte tema="definir_senha" label="Problemas com o link?" className="email-verify__help-link" />
          </div>
        </div>
      )}

      {sessaoStatus === 'pronta' && (
        <form onSubmit={handleSubmit} className="login-form" noValidate>
          <ul className="auth-password-rules" aria-label="Requisitos da senha">
            <li className={password.length >= 6 ? 'is-ok' : undefined}>Mínimo de 6 caracteres</li>
            <li className={temMaiuscula ? 'is-ok' : undefined}>Uma letra maiúscula</li>
            <li className={temNumeroOuEspecial ? 'is-ok' : undefined}>Um número ou caractere especial</li>
            <li className={senhaForteOk && password === confirmPassword && confirmPassword ? 'is-ok' : undefined}>
              Confirmação igual
            </li>
          </ul>

          <div className="ff ff--pass">
            <div className="ff__control">
              <input
                id="nova-senha"
                type={showPass ? 'text' : 'password'}
                className={errosCampos.password ? 'input-invalid' : undefined}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  limparErro('password');
                }}
                required
                placeholder="Nova senha"
                autoComplete="new-password"
                disabled={loading}
              />
              <i className="ff__icon pi pi-lock" aria-hidden />
              <label htmlFor="nova-senha">Nova senha</label>
              <button
                type="button"
                className="btn-toggle-inside"
                onClick={() => setShowPass((v) => !v)}
                aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}
              >
                <EyeIcon crossed={showPass} />
              </button>
            </div>
            {errosCampos.password && <span className="field-error-text">{errosCampos.password}</span>}
          </div>

          <div className="ff ff--pass">
            <div className="ff__control">
              <input
                id="confirmar-senha"
                type={showConfirm ? 'text' : 'password'}
                className={errosCampos.confirm ? 'input-invalid' : undefined}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  limparErro('confirm');
                }}
                required
                placeholder="Confirme a senha"
                autoComplete="new-password"
                disabled={loading}
              />
              <i className="ff__icon pi pi-lock" aria-hidden />
              <label htmlFor="confirmar-senha">Confirmar senha</label>
              <button
                type="button"
                className="btn-toggle-inside"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={showConfirm ? 'Ocultar senha' : 'Mostrar senha'}
              >
                <EyeIcon crossed={showConfirm} />
              </button>
            </div>
            {errosCampos.confirm && <span className="field-error-text">{errosCampos.confirm}</span>}
          </div>

          {erroGeral && (
            <div className="login-error" role="alert">
              <i className="pi pi-exclamation-circle login-error-icon" aria-hidden />
              <p className="login-error-text">{erroGeral}</p>
            </div>
          )}

          <div className="login-actions">
            <button
              type="submit"
              className={`formSubmitBtnNative login-submit-btn${loading ? ' is-loading' : ''}`}
              disabled={loading}
            >
              {loading ? (
                <span className="login-btn-spinner" aria-hidden />
              ) : (
                <i className="pi pi-check" aria-hidden />
              )}
              {loading ? 'Salvando…' : copy.cta}
            </button>
          </div>

          <div className="email-verify__help">
            <LinkAjudaSuporte tema="definir_senha" className="email-verify__help-link" />
          </div>
        </form>
      )}
    </AuthShell>
  );
}
