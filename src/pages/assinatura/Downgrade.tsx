import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useProjeto } from '../../contexts/ProjetoContext';
import {
  dentroDoLimitePlano,
  isLimiteIlimitado,
  rotuloLimitePlano,
} from '../../lib/limitesPlanoUtils';
import { stripeService } from '../../lib/stripeService';
import { SESSION_KEYS } from '../../lib/storageService';
import { BRAND } from '../../lib/brandAssets';
import LinkAjudaSuporte from '../../components/LinkAjudaSuporte';
import { cn } from '../../lib/cn';
import { isProdutoPlanoGratuito, normalizarPlanoTipo, rotuloPlano } from '../../lib/recursosPlano';
import '../../assets/css/especificos/upgrade.css';
import '../../assets/css/especificos/downgrade.css';

interface ProjetoItem {
  id: string;
  nome: string | null;
}

interface PlanoRegras {
  nome_plano?: string | null;
  quantidade_projetos?: number | null;
  valor?: number | string | null;
  valor_num?: number | null;
  stripe_price_id?: string | null;
}

interface TargetPlan {
  id: string;
  nome?: string;
  valor_num?: number;
  e_gratuito?: boolean;
  valor_formatado?: string;
  intervalo?: string;
  limite?: number;
}

function lerTargetPlan(): TargetPlan | null {
  try {
    const saved = sessionStorage.getItem(SESSION_KEYS.targetPlan);
    if (!saved) return null;
    const parsed = JSON.parse(saved) as TargetPlan;
    if (!parsed?.id) {
      sessionStorage.removeItem(SESSION_KEYS.targetPlan);
      return null;
    }
    return parsed;
  } catch {
    sessionStorage.removeItem(SESSION_KEYS.targetPlan);
    return null;
  }
}

async function buscarRegrasPorPriceId(priceOrRuleId: string | null | undefined): Promise<PlanoRegras | null> {
  if (!priceOrRuleId) return null;
  // PK de plano_regras é stripe_price_id (não há coluna `id`).
  const { data, error } = await supabase
    .from('plano_regras')
    .select('*')
    .eq('stripe_price_id', priceOrRuleId)
    .maybeSingle();
  if (error || !data) return null;
  return data as PlanoRegras;
}

async function mensagemErroEdge(error: unknown, data: unknown): Promise<string> {
  const doBody =
    data && typeof data === 'object' && 'error' in data
      ? String((data as { error?: unknown }).error ?? '')
      : '';
  if (doBody) return doBody;

  const ctx = (error as { context?: Response })?.context;
  if (ctx && typeof ctx.json === 'function') {
    try {
      const body = await ctx.json();
      if (body?.error) return String(body.error);
    } catch {
      /* ignore */
    }
  }

  if (error instanceof Error && error.message) return error.message;
  return 'Falha ao processar o downgrade.';
}

function UsoBar({
  uso,
  limite,
  label,
}: {
  uso: number;
  limite: number;
  label: string;
}) {
  const ilimitado = isLimiteIlimitado(limite);
  const pct = ilimitado ? 0 : Math.min(100, Math.round((uso / Math.max(limite, 1)) * 100));
  const excedido = !dentroDoLimitePlano(uso, limite);

  return (
    <div className="dg-uso">
      <div className="dg-uso__head">
        <span>{label}</span>
        <strong>
          {uso}
          <span className="dg-uso__sep">/</span>
          {rotuloLimitePlano(limite)}
        </strong>
      </div>
      <div className={cn('dg-uso__track', excedido && 'is-over', ilimitado && 'is-unlimited')}>
        <span style={{ width: ilimitado ? '12%' : `${pct}%` }} />
      </div>
    </div>
  );
}

function CheckItem({
  ok,
  title,
  detail,
}: {
  ok: boolean;
  title: string;
  detail: ReactNode;
}) {
  return (
    <li className={cn('dg-check', ok ? 'is-ok' : 'is-fail')}>
      <i className={cn('pi', ok ? 'pi-check-circle' : 'pi-times-circle')} aria-hidden />
      <div>
        <strong>{title}</strong>
        <p>{detail}</p>
      </div>
    </li>
  );
}

export default function Downgrade() {
  const { assinatura, userData, inicializarUsuario } = useProjeto();
  const navigate = useNavigate();

  const [targetPlan] = useState<TargetPlan | null>(() => lerTargetPlan());
  const [loadingData, setLoadingData] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [erroApi, setErroApi] = useState<string | null>(null);
  const [regrasPlanoAtual, setRegrasPlanoAtual] = useState<PlanoRegras | null>(null);
  const [regrasPlanoAlvo, setRegrasPlanoAlvo] = useState<PlanoRegras | null>(null);
  const [listaProjetos, setListaProjetos] = useState<ProjetoItem[]>([]);
  const [qtdProjetosAtuais, setQtdProjetosAtuais] = useState<number | null>(null);
  const [podeDowngrade, setPodeDowngrade] = useState(false);
  const [falhaCarregamento, setFalhaCarregamento] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    if (!targetPlan) {
      navigate('/upgrade', { replace: true });
      setLoadingData(false);
      setFalhaCarregamento(true);
      return;
    }

    // Assinatura ainda hidratando no contexto — mantém loading, sem marcar falha.
    if (!assinatura?.id) {
      setLoadingData(true);
      setFalhaCarregamento(false);
      return;
    }

    let ativo = true;

    const buscarEValidarDados = async () => {
      setLoadingData(true);
      setErroApi(null);
      setFalhaCarregamento(false);
      try {
        const priceAtual = assinatura.plano_regra_id || assinatura.stripe_price_id;
        const [rulesAtual, rulesAlvo] = await Promise.all([
          buscarRegrasPorPriceId(priceAtual),
          buscarRegrasPorPriceId(targetPlan.id),
        ]);

        if (!ativo) return;
        setRegrasPlanoAtual(rulesAtual);
        setRegrasPlanoAlvo(rulesAlvo);

        const { data: projetosDB, error: erroProjetos, count } = await supabase
          .from('projetos')
          .select('id, nome', { count: 'exact' })
          .eq('assinatura_id', assinatura.id)
          .eq('status', true);

        if (erroProjetos || count === null) {
          throw new Error('Não foi possível carregar os projetos da assinatura.');
        }

        const projetosProcessados: ProjetoItem[] = (projetosDB ?? []).map((p) => ({
          id: p.id,
          nome: p.nome,
        }));

        if (!ativo) return;
        setQtdProjetosAtuais(count);
        setListaProjetos(projetosProcessados);

        if (!rulesAlvo) {
          setPodeDowngrade(false);
          setFalhaCarregamento(true);
          return;
        }

        const limiteProjetosAlvo = Number(rulesAlvo.quantidade_projetos ?? 0);

        setPodeDowngrade(dentroDoLimitePlano(count, limiteProjetosAlvo));
      } catch (error) {
        console.error('Erro na busca de indicadores:', error);
        if (!ativo) return;
        setRegrasPlanoAtual(null);
        setRegrasPlanoAlvo(null);
        setQtdProjetosAtuais(null);
        setListaProjetos([]);
        setPodeDowngrade(false);
        setFalhaCarregamento(true);
        setErroApi(
          error instanceof Error
            ? error.message
            : 'Não foi possível analisar a compatibilidade do plano.',
        );
      } finally {
        if (ativo) setLoadingData(false);
      }
    };

    void buscarEValidarDados();
    return () => {
      ativo = false;
    };
  }, [targetPlan, assinatura, navigate]);

  const confirmarDowngrade = async () => {
    if (!podeDowngrade || !targetPlan || !assinatura?.id) return;
    setProcessing(true);
    setErroApi(null);
    try {
      const {
        data: { session: authSession },
      } = await supabase.auth.getSession();

      const nomeDoPlanoAlvo = regrasPlanoAlvo?.nome_plano?.trim().toUpperCase();
      const ehPlanoGratuito = isProdutoPlanoGratuito({
        e_gratuito: targetPlan.e_gratuito,
        valor_num: targetPlan.valor_num,
        valor: regrasPlanoAlvo?.valor ?? regrasPlanoAlvo?.valor_num,
        nome: nomeDoPlanoAlvo || targetPlan.nome,
        nome_plano: regrasPlanoAlvo?.nome_plano,
      });

      if (ehPlanoGratuito) {
        const { data, error } = await supabase.functions.invoke('downgrade-para-gratuito', {
          body: { assinaturaId: assinatura.id, priceId: targetPlan.id },
          headers: authSession?.access_token
            ? { Authorization: `Bearer ${authSession.access_token}` }
            : undefined,
        });
        if (error || (data && typeof data === 'object' && 'error' in data && data.error)) {
          throw new Error(await mensagemErroEdge(error, data));
        }
        sessionStorage.setItem(SESSION_KEYS.planoChangeMode, 'downgrade');
        sessionStorage.setItem(SESSION_KEYS.targetPlan, JSON.stringify(targetPlan));
        if (inicializarUsuario && userData) await inicializarUsuario(userData, true, true);
        navigate('/sucesso-upgrade');
        return;
      }

      sessionStorage.setItem(SESSION_KEYS.planoChangeMode, 'downgrade');
      sessionStorage.setItem(SESSION_KEYS.targetPlan, JSON.stringify(targetPlan));
      const data = await stripeService.invokeCheckoutAutenticado({
        priceId: targetPlan.id,
        assinaturaId: assinatura.id,
        userId: userData?.id,
        userEmail: userData?.email,
      });

      if (data?.mode === 'updated') {
        navigate('/sucesso-upgrade');
        return;
      }
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error('Resposta inesperada do checkout. Tente novamente.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao processar o downgrade.';
      setErroApi(msg);
    } finally {
      setProcessing(false);
    }
  };

  const nomePlanoAtual =
    regrasPlanoAtual?.nome_plano ||
    rotuloPlano(normalizarPlanoTipo(assinatura?.plano_tipo)) ||
    '—';
  const nomePlanoNovo =
    regrasPlanoAlvo?.nome_plano || targetPlan?.nome || '—';
  const limiteProjetosAtual = Number(regrasPlanoAtual?.quantidade_projetos ?? 0);
  const limiteProjetosNovo = Number(regrasPlanoAlvo?.quantidade_projetos ?? 0);

  const checks = useMemo(() => {
    const qtd = qtdProjetosAtuais ?? 0;
    const projetosOk = dentroDoLimitePlano(qtd, limiteProjetosNovo);
    return { projetosOk };
  }, [qtdProjetosAtuais, limiteProjetosNovo]);

  const totalChecksOk = Number(checks.projetosOk);

  const projetosComProblema = checks.projetosOk ? [] : listaProjetos;

  if (!userData) return null;

  return createPortal(
    <div className="upgrade-overlay downgrade-overlay">
      <div aria-hidden className="upgrade-grid-texture" />

      <div className="upgrade-shell downgrade-shell">
        <header className="downgrade-header">
          <button type="button" onClick={() => navigate('/upgrade')} className="upgrade-back">
            <i className="pi pi-arrow-left" />
            <span className="downgrade-header__back-label">Voltar</span>
          </button>

          <div className="downgrade-header__call">
            <span className="upgrade-badge">
              <i className="pi pi-arrow-down" />
              Downgrade
            </span>
            <div className="downgrade-header__copy">
              <h1 className="upgrade-title">
                Enquadre o consumo no{' '}
                <span className="upgrade-title__accent">plano de destino</span>
              </h1>
              <p className="upgrade-subtitle">
                Uso atual precisa caber em <strong>{nomePlanoNovo || 'destino'}</strong> — excesso bloqueia a troca
              </p>
            </div>
          </div>

          <div className="downgrade-route" aria-label="Troca de plano">
            <span className="downgrade-route__from">{nomePlanoAtual}</span>
            <i className="pi pi-arrow-right" aria-hidden />
            <span className="downgrade-route__to">{nomePlanoNovo}</span>
            {targetPlan?.valor_formatado ? (
              <span className="downgrade-route__price">{targetPlan.valor_formatado}</span>
            ) : null}
          </div>

          <div className="downgrade-header__end">
            <img src={BRAND.logomarca} alt={BRAND.name} className="downgrade-header__logo" />
          </div>
        </header>

        {erroApi ? (
          <div className="upgrade-alerts">
            <div className="upgrade-alert upgrade-alert--error">
              <i className="pi pi-exclamation-circle" />
              <span>{erroApi}</span>
            </div>
          </div>
        ) : null}

        <div className="downgrade-content">
          {loadingData ? (
            <div className="upgrade-state">
              <i className="pi pi-spin pi-spinner" />
              <p>Analisando limites do plano selecionado…</p>
            </div>
          ) : falhaCarregamento || !regrasPlanoAlvo || qtdProjetosAtuais === null ? (
            <div className="upgrade-state">
              <i className="pi pi-exclamation-triangle" />
              <p>Não foi possível recuperar as regras do plano ou os dados da assinatura.</p>
              <button type="button" className="upgrade-card__cta upgrade-card__cta--outline" onClick={() => navigate('/upgrade')}>
                Escolher outro plano
              </button>
            </div>
          ) : (
            <div className="downgrade-layout">
              <div
                className={cn(
                  'downgrade-notice',
                  podeDowngrade ? 'downgrade-notice--ok' : 'downgrade-notice--warn',
                )}
                role="status"
              >
                <i
                  className={cn('pi', podeDowngrade ? 'pi-check-circle' : 'pi-exclamation-triangle')}
                  aria-hidden
                />
                <div>
                  <strong>
                    {podeDowngrade
                      ? `Seu consumo cabe no plano ${nomePlanoNovo}`
                      : `Reduza o consumo para caber no plano ${nomePlanoNovo}`}
                  </strong>
                  <p>
                    {podeDowngrade
                      ? 'A quantidade de projetos cabe no plano de destino. Você pode confirmar a troca.'
                      : `Reduza a quantidade de projetos até caber em ${nomePlanoNovo}.`}
                  </p>
                </div>
              </div>

              <aside className="dg-panel dg-panel--checklist">
                <header className="dg-panel__head">
                  <div>
                    <h2>Checklist de elegibilidade</h2>
                    <p>
                      Enquadre cada recurso no plano {nomePlanoNovo} — só com tudo verde a troca é liberada
                    </p>
                  </div>
                </header>

                <ul className="dg-checklist">
                  <CheckItem
                    ok={checks.projetosOk}
                    title="Limite de projetos"
                    detail={
                      checks.projetosOk
                        ? `Projetos ativos cabem no teto de ${nomePlanoNovo} (${rotuloLimitePlano(limiteProjetosNovo)}).`
                        : `Você usa ${qtdProjetosAtuais} projetos; ${nomePlanoNovo} permite ${rotuloLimitePlano(limiteProjetosNovo)}. Inative ou remova excedentes.`
                    }
                  />
                </ul>

                <div className="dg-panel__cta">
                  <p className="dg-panel__cta-hint">
                    {podeDowngrade
                      ? `Consumo enquadrado em ${nomePlanoNovo}. Confirme para concluir a troca.`
                      : `Enquadre o consumo nos limites de ${nomePlanoNovo} para liberar a confirmação.`}
                  </p>
                  <button
                    type="button"
                    className="upgrade-card__cta upgrade-card__cta--outline"
                    onClick={() => navigate('/upgrade')}
                    disabled={processing}
                  >
                    Escolher outro plano
                  </button>
                  <button
                    type="button"
                    className="upgrade-card__cta upgrade-card__cta--featured"
                    disabled={!podeDowngrade || processing}
                    onClick={() => void confirmarDowngrade()}
                  >
                    {processing ? (
                      <>
                        <i className="pi pi-spin pi-spinner" />
                        Processando…
                      </>
                    ) : (
                      <>
                        Confirmar troca de plano
                        <i className="pi pi-check" />
                      </>
                    )}
                  </button>
                  <LinkAjudaSuporte tema="downgrade_plano" className="dg-panel__help" />
                </div>
              </aside>

              <div className="downgrade-main">
                <section className="dg-summary" aria-label="Resumo da validação">
                  <article className={cn('dg-summary__card', podeDowngrade ? 'is-ok' : 'is-warn')}>
                    <span className="dg-summary__kicker">Resultado</span>
                    <strong>{podeDowngrade ? 'Dentro do limite' : 'Fora do limite'}</strong>
                    <p>
                      {podeDowngrade
                        ? `Uso atual enquadrado no plano ${nomePlanoNovo}.`
                        : `Consumo acima do permitido em ${nomePlanoNovo}. Ajuste antes de continuar.`}
                    </p>
                  </article>

                  <article className="dg-summary__card">
                    <span className="dg-summary__kicker">Checks</span>
                    <strong>
                      {totalChecksOk}
                      <span className="dg-summary__of">/3</span>
                    </strong>
                    <p>
                      {podeDowngrade
                        ? 'Todos os recursos cabem no destino.'
                        : 'Itens restantes precisam caber no destino.'}
                    </p>
                  </article>

                  <article className="dg-summary__card">
                    <span className="dg-summary__kicker">Projetos ativos</span>
                    <strong>
                      {qtdProjetosAtuais}
                      <span className="dg-summary__of">/{rotuloLimitePlano(limiteProjetosNovo)}</span>
                    </strong>
                    <p>Uso atual versus teto de projetos do {nomePlanoNovo}.</p>
                  </article>
                </section>

                <section className="dg-panel dg-panel--compare">
                  <header className="dg-panel__head">
                    <div>
                      <h2>Comparativo de planos</h2>
                      <p>
                        Seu consumo precisa caber nos limites de <strong>{nomePlanoNovo}</strong>
                      </p>
                    </div>
                  </header>

                  <div className="dg-compare">
                    <div className="dg-compare__col">
                      <span className="dg-compare__label">Atual</span>
                      <h3>{nomePlanoAtual}</h3>
                      <ul>
                        <li>
                          Projetos: <strong>{rotuloLimitePlano(limiteProjetosAtual)}</strong>
                        </li>
                      </ul>
                    </div>
                    <div className="dg-compare__arrow" aria-hidden>
                      <i className="pi pi-arrow-right" />
                    </div>
                    <div className="dg-compare__col dg-compare__col--target">
                      <span className="dg-compare__label">Destino</span>
                      <h3>{nomePlanoNovo}</h3>
                      <ul>
                        <li>
                          Projetos: <strong>{rotuloLimitePlano(limiteProjetosNovo)}</strong>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <UsoBar
                    label="Projetos na assinatura"
                    uso={qtdProjetosAtuais}
                    limite={limiteProjetosNovo}
                  />
                </section>

                <section className="dg-panel dg-panel--table">
                  <header className="dg-panel__head">
                    <div>
                      <h2>Uso por projeto</h2>
                      <p>Projetos ativos nesta assinatura.</p>
                    </div>
                    {projetosComProblema.length > 0 ? (
                      <span className="dg-chip dg-chip--warn">
                        {projetosComProblema.length} fora do limite
                      </span>
                    ) : (
                      <span className="dg-chip dg-chip--ok">Tudo enquadrado</span>
                    )}
                  </header>

                  <div className="dg-table-wrap">
                    <table className="dg-table">
                      <thead>
                        <tr>
                          <th>Projeto</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {listaProjetos.length === 0 ? (
                          <tr>
                            <td colSpan={2} className="dg-table__empty">
                              Nenhum projeto ativo nesta assinatura.
                            </td>
                          </tr>
                        ) : (
                          listaProjetos.map((p) => (
                              <tr key={p.id}>
                                <td>
                                  <strong>{p.nome || 'Sem nome'}</strong>
                                </td>
                                <td>
                                  <span className={cn('dg-status', checks.projetosOk ? 'is-ok' : 'is-fail')}>
                                    <i className={cn('pi', checks.projetosOk ? 'pi-check' : 'pi-times')} aria-hidden />
                                    {checks.projetosOk ? 'Dentro do plano' : 'Acima do limite de projetos'}
                                  </span>
                                </td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
