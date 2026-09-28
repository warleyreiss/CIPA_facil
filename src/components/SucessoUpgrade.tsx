import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useProjeto } from '../contexts/ProjetoContext';
import { supabase } from '../lib/supabaseClient';
import { BRAND } from '../lib/brandAssets';
import { SESSION_KEYS } from '../lib/storageService';
import {
  destaquesComerciaisPlano,
  isPlanoGratuito,
  rotuloPlano,
  planoCodigoDeProduto,
} from '../lib/recursosPlano';
import '../assets/css/especificos/sucesso-upgrade.css';

const REDIRECT_MS = 8000;
const POLL_MS = 1500;
const POLL_MAX_MS = 20000;

type TargetPlan = {
  id?: string;
  nome?: string;
  name?: string;
  e_gratuito?: boolean;
  valor_num?: number;
} | null;

type ChangeMode = 'upgrade' | 'downgrade';

function lerTargetPlan(): TargetPlan {
  try {
    const raw = sessionStorage.getItem(SESSION_KEYS.targetPlan);
    if (!raw) return null;
    return JSON.parse(raw) as TargetPlan;
  } catch {
    return null;
  }
}

function lerMode(): ChangeMode {
  const m = sessionStorage.getItem(SESSION_KEYS.planoChangeMode);
  return m === 'downgrade' ? 'downgrade' : 'upgrade';
}

function limparSessaoPlano() {
  try {
    sessionStorage.removeItem(SESSION_KEYS.targetPlan);
    sessionStorage.removeItem(SESSION_KEYS.planoChangeMode);
  } catch {
    /* ignore */
  }
}

export default function SucessoUpgrade() {
  const navigate = useNavigate();
  const { inicializarUsuario, userData, assinatura } = useProjeto();
  const [syncing, setSyncing] = useState(true);
  const [aguardandoWebhook, setAguardandoWebhook] = useState(false);
  const [segundos, setSegundos] = useState(Math.ceil(REDIRECT_MS / 1000));
  const [target] = useState<TargetPlan>(() => lerTargetPlan());
  const [mode] = useState<ChangeMode>(() => lerMode());

  const isDowngrade = mode === 'downgrade';
  const priceAlvo = target?.id || null;
  const planoConfirmado =
    !priceAlvo ||
    assinatura?.plano_regra_id === priceAlvo ||
    assinatura?.stripe_price_id === priceAlvo ||
    (isDowngrade &&
      isPlanoGratuito(assinatura?.plano_tipo) &&
      (target?.e_gratuito || Number(target?.valor_num ?? 1) === 0));

  const codigoPlano = planoCodigoDeProduto(
    planoConfirmado
      ? assinatura?.plano_tipo
      : (target?.nome || target?.name || assinatura?.plano_tipo),
  );
  const nomePlano = rotuloPlano(codigoPlano);
  const perksPlano = destaquesComerciaisPlano(
    planoConfirmado ? assinatura?.plano_tipo : (target?.nome || target?.name || assinatura?.plano_tipo),
  ).slice(0, 4);
  const primeiroNome = userData?.nome_completo?.trim().split(/\s+/)[0];

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    let cancelado = false;
    let redirectTimer: number | undefined;
    let tickTimer: number | undefined;
    let pollTimer: number | undefined;

    const iniciarRedirect = () => {
      if (cancelado) return;
      setSyncing(false);
      setAguardandoWebhook(false);
      limparSessaoPlano();

      const inicio = Date.now();
      tickTimer = window.setInterval(() => {
        const restante = Math.max(0, Math.ceil((REDIRECT_MS - (Date.now() - inicio)) / 1000));
        setSegundos(restante);
      }, 250);

      redirectTimer = window.setTimeout(() => {
        navigate('/inicio', { replace: true });
      }, REDIRECT_MS);
    };

    const preparar = async () => {
      const inicioPoll = Date.now();

      const sincronizar = async () => {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          await inicializarUsuario(session.user, false, true);
        }
      };

      try {
        await sincronizar();
      } catch (err) {
        console.error('Erro ao sincronizar após mudança de plano:', err);
      }

      // Downgrade gratuito já grava no edge — não precisa esperar Stripe.
      const downgradeGratuitoJaAplicado =
        isDowngrade &&
        (target?.e_gratuito || Number(target?.valor_num ?? 1) === 0);

      const precisaEsperarWebhook = Boolean(priceAlvo) && !downgradeGratuitoJaAplicado;

      if (!precisaEsperarWebhook) {
        if (!cancelado) iniciarRedirect();
        return;
      }

      if (!cancelado) setAguardandoWebhook(true);

      const tentar = async (): Promise<boolean> => {
        try {
          await sincronizar();
        } catch {
          /* continua polling */
        }
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) return false;

        const { data: userDb } = await supabase
          .from('usuarios')
          .select('assinaturas!usuarios_assinatura_id_fkey ( plano_regra_id, stripe_price_id, plano_status, plano_tipo )')
          .eq('id', session.user.id)
          .maybeSingle();

        const ass = Array.isArray(userDb?.assinaturas)
          ? userDb?.assinaturas[0]
          : userDb?.assinaturas;
        const priceAtual = ass?.plano_regra_id || ass?.stripe_price_id;
        const status = ass?.plano_status;

        if (isDowngrade && (target?.e_gratuito || Number(target?.valor_num ?? 1) === 0)) {
          return isPlanoGratuito(ass?.plano_tipo) && status === 'active';
        }

        return (
          priceAtual === priceAlvo &&
          (status === 'active' || status === 'trialing')
        );
      };

      const okInicial = await tentar();
      if (okInicial || cancelado) {
        if (!cancelado) iniciarRedirect();
        return;
      }

      await new Promise<void>((resolve) => {
        const tick = async () => {
          if (cancelado) {
            resolve();
            return;
          }
          if (Date.now() - inicioPoll >= POLL_MAX_MS) {
            resolve();
            return;
          }
          const ok = await tentar();
          if (ok) {
            resolve();
            return;
          }
          pollTimer = window.setTimeout(() => {
            void tick();
          }, POLL_MS);
        };
        pollTimer = window.setTimeout(() => {
          void tick();
        }, POLL_MS);
      });

      if (!cancelado) iniciarRedirect();
    };

    void preparar();

    return () => {
      cancelado = true;
      if (redirectTimer) window.clearTimeout(redirectTimer);
      if (tickTimer) window.clearInterval(tickTimer);
      if (pollTimer) window.clearTimeout(pollTimer);
    };
  }, [navigate, inicializarUsuario, priceAlvo, isDowngrade, target?.e_gratuito, target?.valor_num]);

  const irParaProjeto = () => navigate('/inicio', { replace: true });

  const kicker = syncing
    ? aguardandoWebhook
      ? isDowngrade
        ? 'Confirmando alteração…'
        : 'Confirmando no Stripe…'
      : isDowngrade
        ? 'Aplicando novo plano…'
        : 'Sincronizando assinatura…'
    : isDowngrade
      ? planoConfirmado
        ? 'Downgrade concluído'
        : 'Solicitação registrada'
      : planoConfirmado
        ? 'Upgrade confirmado'
        : 'Solicitação registrada';

  const titulo = syncing
    ? 'Quase lá…'
    : isDowngrade
      ? primeiroNome
        ? `${primeiroNome}, plano alterado para ${nomePlano}`
        : `Plano alterado para ${nomePlano}`
      : primeiroNome
        ? `${primeiroNome}, bem-vindo ao plano ${nomePlano}!`
        : `Bem-vindo ao plano ${nomePlano}!`;

  const lead = syncing
    ? isDowngrade
      ? 'Estamos ajustando os limites e recursos do plano escolhido. Isso leva só alguns segundos.'
      : 'Estamos aguardando a confirmação do pagamento para liberar o novo plano. Isso leva só alguns segundos.'
    : isDowngrade
      ? planoConfirmado
        ? 'A mudança foi aplicada. Alguns recursos avançados do plano anterior podem não estar mais disponíveis — os limites atuais já valem para esta conta.'
        : 'A solicitação foi registrada. Se o plano ainda não atualizar em instantes, atualize a página ou abra Informações da assinatura.'
      : planoConfirmado
        ? 'Sua escolha foi registrada com sucesso. O acesso ao novo plano já está liberado.'
        : 'O pagamento está sendo processado. Se o plano ainda não atualizar em instantes, atualize a página ou abra Informações da assinatura.';

  const node = (
    <div className="su-root" role="status" aria-live="polite">
      <div className="su-backdrop" aria-hidden />
      <div className="su-glow su-glow--a" aria-hidden />
      <div className="su-glow su-glow--b" aria-hidden />

      <div className="su-shell">
        <header className="su-brand">
          <img src={BRAND.logomarca} alt={BRAND.name} className="su-brand__logo" />
        </header>

        <main className={`su-card${isDowngrade ? ' su-card--downgrade' : ''}`}>
          <div className="su-mark" aria-hidden>
            <span className="su-mark__ring" />
            <span className="su-mark__ring su-mark__ring--delay" />
            <span className="su-mark__core">
              {isDowngrade ? (
                <i className="pi pi-arrow-down" style={{ fontSize: '1.35rem' }} />
              ) : (
                <svg viewBox="0 0 24 24" width="36" height="36" fill="none" aria-hidden>
                  <path
                    d="M5 13l4 4L19 7"
                    stroke="currentColor"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="su-mark__check"
                  />
                </svg>
              )}
            </span>
          </div>

          <p className="su-kicker">{kicker}</p>
          <h1 className="su-title">{titulo}</h1>
          <p className="su-lead">{lead}</p>

          {!syncing && !isDowngrade && (
            <ul className="su-perks" aria-label="O que você ganhou">
              {perksPlano.map((perk) => (
                <li key={perk}>
                  <i className="pi pi-check" aria-hidden />
                  {perk}
                </li>
              ))}
            </ul>
          )}

          {!syncing && isDowngrade && (
            <ul className="su-perks" aria-label="O que vale a partir de agora">
              <li>
                <i className="pi pi-info-circle" aria-hidden />
                Limites e recursos do plano {nomePlano} já estão em vigor.
              </li>
              <li>
                <i className="pi pi-info-circle" aria-hidden />
                Você pode fazer upgrade novamente a qualquer momento em Planos.
              </li>
            </ul>
          )}

          <div className="su-actions">
            <button
              type="button"
              className="su-btn su-btn--primary"
              onClick={irParaProjeto}
              disabled={syncing}
            >
              {syncing ? (
                <span className="su-spinner" aria-hidden />
              ) : (
                <i className="pi pi-arrow-right" aria-hidden />
              )}
              {syncing ? 'Preparando ambiente…' : 'Ir para o projeto'}
            </button>
          </div>

          {!syncing && (
            <p className="su-redirect">
              Redirecionando automaticamente em <strong>{segundos}s</strong>
            </p>
          )}
        </main>

        <p className="su-foot">Obrigado por confiar no {BRAND.name}</p>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(node, document.body);
}
