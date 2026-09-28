import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toast } from 'primereact/toast';
import { supabase } from '../lib/supabaseClient';
import { useProjeto } from '../contexts/ProjetoContext';
import AuthShell from './auth/AuthShell';
import LinkAjudaSuporte from './LinkAjudaSuporte';
import { BRAND } from '../lib/brandAssets';
import {
  lerPendingEmailConfirm,
  limparPendingEmailConfirm,
  salvarPendingEmailConfirm,
} from '../lib/pendingEmailConfirm';

const COOLDOWN_REENVIAR_S = 60;

export default function EmailVerificacao() {
  const [verificando, setVerificando] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [email, setEmail] = useState(() => lerPendingEmailConfirm() || '');
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'warn' | 'erro'; texto: string } | null>(
    null,
  );
  const [cooldown, setCooldown] = useState(0);
  const navigate = useNavigate();
  const { inicializarUsuario, userData } = useProjeto() as {
    inicializarUsuario: (user: unknown) => Promise<void>;
    userData?: { email?: string } | null;
  };
  const toast = useRef<Toast>(null);

  const processando = verificando || reenviando;

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(t);
  }, [cooldown]);

  useEffect(() => {
    let cancelado = false;

    const carregarUsuario = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelado) return;

      const emailResolvido =
        user?.email || userData?.email || lerPendingEmailConfirm() || '';
      if (emailResolvido) {
        setEmail(emailResolvido);
        salvarPendingEmailConfirm(emailResolvido);
      }

      if (user?.email_confirmed_at) {
        limparPendingEmailConfirm();
        await inicializarUsuario(user);
        if (!cancelado) navigate('/inicio', { replace: true });
      }
    };

    void carregarUsuario();
    return () => {
      cancelado = true;
    };
  }, [navigate, inicializarUsuario, userData?.email]);

  const handleReenviar = useCallback(async () => {
    if (!email || cooldown > 0) return;
    setFeedback(null);
    setReenviando(true);

    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) throw error;

      setCooldown(COOLDOWN_REENVIAR_S);
      setFeedback({
        tipo: 'ok',
        texto: 'Novo link enviado. Confira a caixa de entrada e o spam.',
      });
      toast.current?.show({
        severity: 'success',
        summary: 'E-mail reenviado',
        detail: 'Se não aparecer em alguns minutos, verifique o spam.',
        life: 5000,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Não foi possível reenviar o e-mail.';
      setFeedback({ tipo: 'erro', texto: msg });
      toast.current?.show({
        severity: 'error',
        summary: 'Falha ao reenviar',
        detail: msg,
        life: 5000,
      });
    } finally {
      setReenviando(false);
    }
  }, [email, cooldown]);

  const checarStatus = useCallback(async () => {
    setFeedback(null);
    setVerificando(true);

    try {
      await supabase.auth.refreshSession();
      const { data: { user } } = await supabase.auth.getUser();

      if (user?.email_confirmed_at) {
        limparPendingEmailConfirm();
        await inicializarUsuario(user);
        navigate('/inicio', { replace: true });
        return;
      }

      setFeedback({
        tipo: 'warn',
        texto:
          'Ainda não detectamos a confirmação. Abra o link do e-mail e volte aqui em seguida.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Não foi possível verificar o status.';
      setFeedback({ tipo: 'erro', texto: msg });
    } finally {
      setVerificando(false);
    }
  }, [inicializarUsuario, navigate]);

  const sair = useCallback(async () => {
    limparPendingEmailConfirm();
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
  }, [navigate]);

  return (
    <AuthShell
      title="Confirme seu e-mail"
      subtitle="Enviamos um link de ativação. Sem essa etapa, o acesso à plataforma fica bloqueado."
      commercialTitle="Um passo rápido pela segurança."
      commercialText={
        <>
          Confirmamos o e-mail para proteger sua conta e os dados dos seus projetos.
          <br />
          Abra a mensagem, clique no link e volte — leva menos de um minuto.
        </>
      }
    >
      <Toast ref={toast} />

      <div className="login-form email-verify">
        <div className="email-verify__chip" aria-live="polite">
          <span className="email-verify__chip-label">Enviado para</span>
          <strong className="email-verify__chip-email">{email || 'Carregando…'}</strong>
        </div>

        <ol className="email-verify__steps" aria-label="Como confirmar">
          <li>
            <span className="email-verify__step-n">1</span>
            Abra o e-mail da {BRAND.name} (e a pasta de spam)
          </li>
          <li>
            <span className="email-verify__step-n">2</span>
            Clique no link de confirmação
          </li>
          <li>
            <span className="email-verify__step-n">3</span>
            Volte aqui e continue
          </li>
        </ol>

        {feedback?.tipo === 'ok' && (
          <div className="login-success" role="status">
            <i className="pi pi-check-circle login-success-icon" aria-hidden />
            <p className="login-success-text">{feedback.texto}</p>
          </div>
        )}
        {feedback?.tipo === 'warn' && (
          <div className="email-verify__notice email-verify__notice--warn" role="status">
            <i className="pi pi-info-circle" aria-hidden />
            <p>{feedback.texto}</p>
          </div>
        )}
        {feedback?.tipo === 'erro' && (
          <div className="login-error" role="alert">
            <i className="pi pi-exclamation-circle login-error-icon" aria-hidden />
            <p className="login-error-text">{feedback.texto}</p>
          </div>
        )}

        <div className="login-actions email-verify__actions">
          <button
            type="button"
            className={`formSubmitBtnNative login-submit-btn${verificando ? ' is-loading' : ''}`}
            onClick={() => void checarStatus()}
            disabled={processando}
          >
            {verificando ? (
              <span className="login-btn-spinner" aria-hidden />
            ) : (
              <i className="pi pi-check" aria-hidden />
            )}
            {verificando ? 'Verificando…' : 'Já confirmei — continuar'}
          </button>
        </div>

        <button
          type="button"
          className="email-verify__resend"
          onClick={() => void handleReenviar()}
          disabled={processando || !email || cooldown > 0}
        >
          {reenviando ? (
            <span className="login-btn-spinner" aria-hidden />
          ) : (
            <i className="pi pi-refresh" aria-hidden />
          )}
          {reenviando
            ? 'Reenviando…'
            : cooldown > 0
              ? `Reenviar em ${cooldown}s`
              : 'Reenviar link de confirmação'}
        </button>

        <div className="email-verify__help">
          <LinkAjudaSuporte
            tema="email_confirmacao"
            label="Não recebi o e-mail — o que fazer?"
            className="email-verify__help-link"
          />
        </div>

        <div className="login-footer-link">
          <span className="login-footer-text">E-mail errado?</span>
          <button
            type="button"
            className="login-footer-cta"
            onClick={() => void sair()}
            disabled={processando}
          >
            Sair e usar outra conta
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      </div>
    </AuthShell>
  );
}
