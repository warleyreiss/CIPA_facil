import { useState, useRef, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toast } from 'primereact/toast';
import { supabase } from '../../../lib/supabaseClient';
import { emailValido, formatarEmailDigitacao } from '../../../lib/telefoneUtils';
import { appUrl } from '../../../lib/appUrl';
import AuthShell from '../../../components/auth/AuthShell';
import LinkAjudaSuporte from '../../../components/LinkAjudaSuporte';

export default function EsqueciSenha() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [erroCampo, setErroCampo] = useState('');
  const [erroGeral, setErroGeral] = useState('');
  const [enviado, setEnviado] = useState(false);
  const navigate = useNavigate();
  const toast = useRef<Toast>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErroGeral('');

    if (!email.trim()) {
      setErroCampo('Informe o e-mail.');
      return;
    }
    if (!emailValido(email)) {
      setErroCampo('E-mail inválido.');
      return;
    }
    setErroCampo('');
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: appUrl('/definir-senha'),
      });
      if (error) throw error;

      setEnviado(true);
      setEmail('');
      toast.current?.show({
        severity: 'success',
        summary: 'E-mail enviado',
        detail:
          'Se este e-mail estiver cadastrado, você receberá um link para redefinir sua senha em instantes.',
        life: 6000,
      });
    } catch (error: unknown) {
      const msg =
        error instanceof Error
          ? error.message
          : 'Não foi possível processar a recuperação de senha.';
      setErroGeral(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Recuperar senha"
      subtitle="Informe o e-mail da conta para receber o link de redefinição."
      commercialTitle="Acesso seguro à sua conta."
      commercialText={
        <>
          Esqueceu a senha? Sem problema.
          <br />
          Enviamos um link seguro para você criar uma nova senha e voltar à gestão da CIPA.
        </>
      }
    >
      <Toast ref={toast} />

      <form onSubmit={handleSubmit} className="login-form" noValidate>
        {enviado && (
          <div className="login-success" role="status">
            <i className="pi pi-check-circle login-success-icon" aria-hidden />
            <p className="login-success-text">
              Link enviado. Verifique sua caixa de entrada e o spam. Em seguida use o link para
              definir a nova senha.
            </p>
          </div>
        )}

        <div className="ff">
          <div className="ff__control">
            <input
              id="recuperar-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              className={erroCampo ? 'input-invalid' : undefined}
              value={email}
              onChange={(e) => {
                setEmail(formatarEmailDigitacao(e.target.value));
                setErroCampo('');
                setEnviado(false);
              }}
              required
              placeholder="exemplo@empresa.com"
              disabled={loading}
            />
            <i className="ff__icon pi pi-envelope" aria-hidden />
            <label htmlFor="recuperar-email">E-mail corporativo</label>
          </div>
          {erroCampo && <span className="field-error-text">{erroCampo}</span>}
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
              <i className="pi pi-envelope" aria-hidden />
            )}
            {loading ? 'Enviando…' : enviado ? 'Reenviar link' : 'Enviar link de recuperação'}
          </button>
        </div>

        <div className="login-footer-link">
          <span className="login-footer-text">Lembrou a senha?</span>
          <button
            type="button"
            className="login-footer-cta"
            onClick={() => navigate('/login')}
            disabled={loading}
          >
            Voltar ao login
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

        <div className="email-verify__help">
          <LinkAjudaSuporte
            tema="esqueci_senha"
            label="Não recebi o e-mail — o que fazer?"
            className="email-verify__help-link"
          />
        </div>
      </form>
    </AuthShell>
  );
}
