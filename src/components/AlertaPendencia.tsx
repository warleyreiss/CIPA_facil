import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useProjeto } from '../contexts/ProjetoContext';
import { stripeService } from '../lib/stripeService';
import { supabase } from '../lib/supabaseClient';
import { BRAND } from '../lib/brandAssets';
import { EMPRESA } from '../config/empresa';
import { urlSuportePorTema, type SuporteTemaSlug } from '../lib/suporteTemas';
import '../assets/css/especificos/bloqueio-acesso.css';

interface TelaBloqueioProps {
  visible: boolean;
  status: string;
  diasRestantes?: number;
  esgotouTolerancia: boolean;
  billingUrl?: string;
}

type Variante = 'bloqueio' | 'pausado' | 'aviso' | 'default';

type ConteudoBloqueio = {
  variante: Variante;
  badge: string;
  titulo: string;
  lead: string;
  situacao: string;
  impactos: string[];
  preservado: string;
  passos: string[];
  ctaPrimario: string;
  ctaSecundario: string;
  temaSuporte: SuporteTemaSlug;
};

function montarConteudo(
  status: string,
  esgotouTolerancia: boolean,
): ConteudoBloqueio {
  const isBloqueioHard =
    esgotouTolerancia || ['canceled', 'unpaid', 'incomplete', 'incomplete_expired'].includes(status);

  switch (status) {
    case 'past_due':
    case 'incomplete':
    case 'incomplete_expired':
      if (isBloqueioHard) {
        return {
          variante: 'bloqueio',
          badge: 'Acesso bloqueado',
          titulo: 'Seu acesso foi interrompido',
          lead:
            'O pagamento da assinatura não foi concluído e o prazo de tolerância acabou. Por isso o ambiente está temporariamente indisponível.',
          situacao:
            'Enquanto a cobrança estiver em aberto, não é possível operar projetos, colaboradores, estoque ou fornecimentos.',
          impactos: [
            'Entrada no sistema bloqueada para uso operacional',
            'Relatórios e cadastros ficam inacessíveis até regularizar',
            'Novos usuários do projeto também não conseguem operar',
          ],
          preservado:
            'Seus dados, históricos e projetos continuam salvos com segurança. Nada é apagado por causa desta pendência.',
          passos: [
            'Abra o portal de cobrança e atualize o meio de pagamento ou quite a fatura',
            'Aguarde a confirmação do Stripe (geralmente alguns minutos)',
            'Recarregue a página — o acesso é liberado automaticamente',
          ],
          ctaPrimario: 'Regularizar pagamento',
          ctaSecundario: 'Ver planos disponíveis',
          temaSuporte: 'tela_bloqueada',
        };
      }
      return {
        variante: 'aviso',
        badge: 'Pagamento pendente',
        titulo: 'Há uma pendência na sua assinatura',
        lead:
          'Identificamos uma falha no processamento do pagamento. Regularize o quanto antes para evitar o bloqueio do acesso.',
        situacao:
          'Você ainda pode estar dentro da tolerância, mas o acesso será suspenso se a cobrança não for resolvida.',
        impactos: [
          'Risco de bloqueio ao fim da tolerância',
          'Possível interrupção do trabalho da equipe',
          'Faturas em aberto no portal de cobrança',
        ],
        preservado: 'Seus projetos e dados permanecem intactos durante este período.',
        passos: [
          'Acesse o portal de cobrança e confira a fatura em aberto',
          'Atualize o cartão ou conclua o pagamento',
          'Volte ao sistema — a sincronização é automática',
        ],
        ctaPrimario: 'Resolver no portal de cobrança',
        ctaSecundario: 'Ver planos',
        temaSuporte: 'pagamento_pendente',
      };

    case 'paused':
      return {
        variante: 'pausado',
        badge: 'Assinatura pausada',
        titulo: 'Seu plano está pausado',
        lead:
          'A assinatura foi colocada em pausa. Enquanto isso, o uso operacional do sistema permanece bloqueado.',
        situacao:
          'A pausa costuma ocorrer por escolha no portal de faturamento ou por ajuste comercial. Para voltar a usar, é preciso reativar o plano.',
        impactos: [
          'Acesso operacional suspenso',
          'Equipe sem liberação para cadastros e entregas',
          'Funcionalidades premium indisponíveis até reativar',
        ],
        preservado:
          'Projetos, colaboradores e históricos ficam preservados e voltam disponíveis após a reativação.',
        passos: [
          'Abra o portal de assinatura e reative o plano atual',
          'Ou escolha outro plano (incluindo opções compatíveis com seu uso)',
          'Retorne ao sistema após a confirmação',
        ],
        ctaPrimario: 'Reativar no portal',
        ctaSecundario: 'Escolher um plano',
        temaSuporte: 'tela_bloqueada',
      };

    case 'canceled':
    case 'unpaid':
      return {
        variante: 'bloqueio',
        badge: 'Assinatura inativa',
        titulo: 'Assinatura encerrada ou sem pagamento',
        lead:
          'Não há uma assinatura ativa vinculada a esta conta. Por isso o acesso ao ambiente está suspenso.',
        situacao:
          'Sem plano ativo não é possível operar a plataforma. Você pode reativar pelo portal ou contratar um novo plano.',
        impactos: [
          'Sistema bloqueado para uso diário',
          'Equipe sem acesso às rotinas de EPI',
          'Recursos do plano anterior indisponíveis',
        ],
        preservado:
          'Seus dados continuam armazenados. Ao reativar ou assinar novamente, o ambiente é desbloqueado.',
        passos: [
          'Abra o portal de faturamento para reativar ou atualizar o pagamento',
          'Se preferir, escolha um plano na página de assinaturas',
          'Após a confirmação, recarregue e continue de onde parou',
        ],
        ctaPrimario: 'Abrir portal de faturamento',
        ctaSecundario: 'Ver planos e assinar',
        temaSuporte: 'tela_bloqueada',
      };

    default:
      return {
        variante: 'default',
        badge: 'Verificando assinatura',
        titulo: 'Validando o status do seu plano',
        lead:
          'Estamos sincronizando as informações da assinatura com o gateway de pagamento.',
        situacao:
          'Se o bloqueio persistir, use o portal de assinatura ou fale com o suporte.',
        impactos: ['Acesso temporariamente limitado até a validação'],
        preservado: 'Nenhuma alteração é feita nos seus dados durante esta verificação.',
        passos: [
          'Aguarde alguns instantes e atualize a página',
          'Se continuar bloqueado, abra o portal de assinatura',
          'Em caso de dúvida, consulte a Central de Ajuda ou o suporte',
        ],
        ctaPrimario: 'Abrir portal de assinatura',
        ctaSecundario: 'Ver planos',
        temaSuporte: 'faturas_cobranca',
      };
  }
}

export function AlertaPendencia({
  visible,
  status,
  diasRestantes,
  esgotouTolerancia,
  billingUrl,
}: TelaBloqueioProps) {
  const navigate = useNavigate();
  const { assinatura } = useProjeto();
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [loadingLogout, setLoadingLogout] = useState(false);
  const [erroAcao, setErroAcao] = useState<string | null>(null);

  if (!visible || typeof document === 'undefined') return null;

  const info = montarConteudo(status, esgotouTolerancia);
  const processando = loadingPortal || loadingLogout;

  const abrirPortal = async () => {
    setErroAcao(null);
    setLoadingPortal(true);
    try {
      if (assinatura?.id) {
        await stripeService.redirectToCustomerPortal(assinatura.id);
      } else if (billingUrl) {
        window.location.href = billingUrl;
      } else {
        navigate('/upgrade');
      }
    } catch (error) {
      console.error('Erro ao abrir portal Stripe:', error);
      setErroAcao(
        'Não foi possível abrir o portal agora. Tente novamente ou use “Ver planos”.',
      );
    } finally {
      setLoadingPortal(false);
    }
  };

  const irParaPlanos = () => {
    navigate('/upgrade');
  };

  const handleLogout = async () => {
    setLoadingLogout(true);
    try {
      await supabase.auth.signOut();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Erro ao encerrar sessão:', error);
      setErroAcao('Não foi possível sair. Tente novamente.');
    } finally {
      setLoadingLogout(false);
    }
  };

  const node = (
    <div
      className={`ba-root ba-root--${info.variante}`}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="ba-title"
      aria-describedby="ba-lead"
    >
      <div className="ba-backdrop" aria-hidden />

      <div className="ba-shell">
        <header className="ba-brand">
          <img src={BRAND.logomarca} alt={BRAND.name} className="ba-brand__logo" />
        </header>

        <article className="ba-card">
          <div className="ba-card__top">
            <span className="ba-badge">{info.badge}</span>
            <div className="ba-card__heading">
              <div className="ba-icon" aria-hidden>
                <i
                  className={`pi ${
                    info.variante === 'pausado'
                      ? 'pi-pause'
                      : info.variante === 'aviso'
                        ? 'pi-exclamation-triangle'
                        : info.variante === 'default'
                          ? 'pi-sync'
                          : 'pi-lock'
                  }`}
                />
              </div>
              <div className="ba-card__heading-text">
                <h1 id="ba-title" className="ba-title">
                  {info.titulo}
                </h1>
                <p id="ba-lead" className="ba-lead">
                  {info.lead}
                </p>
              </div>
            </div>
          </div>

          {info.variante === 'aviso' && typeof diasRestantes === 'number' && (
            <div className="ba-countdown" aria-live="polite">
              <strong>{diasRestantes}</strong>
              <span>
                dia{diasRestantes === 1 ? '' : 's'} restante
                {diasRestantes === 1 ? '' : 's'} de tolerância
              </span>
            </div>
          )}

          <div className="ba-body">
            <section className="ba-block" aria-labelledby="ba-sit-title">
              <h2 id="ba-sit-title" className="ba-block__title">
                Por que isso aconteceu?
              </h2>
              <p className="ba-block__text">{info.situacao}</p>
            </section>

            <section className="ba-block" aria-labelledby="ba-imp-title">
              <h2 id="ba-imp-title" className="ba-block__title">
                O que isso significa agora?
              </h2>
              <ul className="ba-list">
                {info.impactos.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="ba-safe">
                <i className="pi pi-shield" aria-hidden />
                <span>{info.preservado}</span>
              </p>
            </section>

            <section className="ba-block ba-block--steps" aria-labelledby="ba-how-title">
              <h2 id="ba-how-title" className="ba-block__title">
                Como proceder
              </h2>
              <ol className="ba-steps">
                {info.passos.map((passo, i) => (
                  <li key={passo}>
                    <span className="ba-steps__n">{i + 1}</span>
                    <span>{passo}</span>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          {erroAcao && (
            <div className="ba-error" role="alert">
              <i className="pi pi-exclamation-circle" aria-hidden />
              <p>{erroAcao}</p>
            </div>
          )}

          <div className="ba-actions">
            <p className="ba-actions__title">Opções para resolver</p>
            <div className="ba-actions__main">
              <button
                type="button"
                className="ba-btn ba-btn--primary"
                onClick={() => void abrirPortal()}
                disabled={processando}
              >
                {loadingPortal ? (
                  <span className="ba-spinner" aria-hidden />
                ) : (
                  <i className="pi pi-credit-card" aria-hidden />
                )}
                {loadingPortal ? 'Abrindo…' : info.ctaPrimario}
              </button>

              <button
                type="button"
                className="ba-btn ba-btn--secondary"
                onClick={irParaPlanos}
                disabled={processando}
              >
                <i className="pi pi-th-large" aria-hidden />
                {info.ctaSecundario}
              </button>
            </div>

            <div className="ba-actions__row">
              <a className="ba-btn ba-btn--ghost" href={urlSuportePorTema(info.temaSuporte)}>
                <i className="pi pi-question-circle" aria-hidden />
                Ajuda
              </a>
              <button
                type="button"
                className="ba-btn ba-btn--ghost ba-btn--logout"
                onClick={() => void handleLogout()}
                disabled={processando}
              >
                {loadingLogout ? (
                  <span className="ba-spinner ba-spinner--dark" aria-hidden />
                ) : (
                  <i className="pi pi-sign-out" aria-hidden />
                )}
                Sair
              </button>
            </div>
          </div>
        </article>

        <p className="ba-foot">
          Pagamentos processados com segurança via Stripe · {EMPRESA.nome}
        </p>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
