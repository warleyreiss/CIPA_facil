import { useState, useEffect, useCallback, type CSSProperties, type FormEvent, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useProjeto } from '../contexts/ProjetoContext';
import { projetoService } from '../lib/projetoService';
import { isLimiteIlimitado, rotuloLimitePlano } from '../lib/limitesPlanoUtils';
import { isPlanoGratuito, temRecurso, normalizarPlanoTipo, rotuloPlano } from '../lib/recursosPlano';
import { formatarCnpj } from '../lib/documentoUtils';
import {
  formatarUltimoAcessoRelativo,
  lerUltimoAcessoProjeto,
  marcarUltimoAcessoProjeto,
  marcarWizardImportacaoPendente,
  marcarConfigTourPendente,
} from '../lib/storageService';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Avatar } from 'primereact/avatar';
import { Card } from 'primereact/card';
import LinkAjudaSuporte from './LinkAjudaSuporte';
import { cn } from '../lib/cn';
import { BRAND } from '../lib/brandAssets';
import LoadingOverlay, { BOOT_VIGNETTE_EXIT_MS } from './LoadingOverlay';
import '../assets/css/especificos/selecao-projeto.css';

interface SelecaoProjetoProps {
  obrigatorio?: boolean;
  /** @deprecated Preferir tela cheia (portal). Mantido para compatibilidade. */
  embedded?: boolean;
  onUpgradeClick?: () => void;
  onProjetoSelecionado?: () => void;
}

interface ProjetoCard {
  id: string;
  nome: string;
  logo_url?: string | null;
  status?: boolean;
  cnpj?: string | null;
  razao_social?: string | null;
  cidade?: string | null;
  estado?: string | null;
  created_at?: string | null;
  funcao?: string | null;
  qtdColaboradores?: number;
  qtdEpis?: number;
  qtdFuncoes?: number;
  ghePrincipal?: string | null;
  alertasPendentes?: number;
  ultimoAcessoIso?: string | null;
}

function iniciais(nome: string): string {
  const parts = nome.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'PR';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function regraAssinatura(assinatura: any): any | null {
  const raw = assinatura?.plano_regras;
  if (!raw) return null;
  return Array.isArray(raw) ? raw[0] ?? null : raw;
}

function localidadeLabel(cidade?: string | null, estado?: string | null): string | null {
  const c = cidade?.trim();
  const e = estado?.trim()?.toUpperCase();
  if (c && e) return `${c}/${e}`;
  if (c) return c;
  if (e) return e;
  return null;
}

export default function SelecaoProjeto({
  obrigatorio = false,
  embedded = false,
  onUpgradeClick,
  onProjetoSelecionado,
}: SelecaoProjetoProps) {
  const [projetos, setProjetos] = useState<ProjetoCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [novoNome, setNovoNome] = useState('');
  const [criando, setCriando] = useState(false);
  const [erroCriacao, setErroCriacao] = useState<string | null>(null);
  const busy = loading || criando;
  const [showBoot, setShowBoot] = useState(true);

  const [limiteAtingido, setLimiteAtingido] = useState(false);
  const [limiteMaximo, setLimiteMaximo] = useState(1);
  const [totalProjetosAtivos, setTotalProjetosAtivos] = useState(0);
  const [podeCriarProjeto, setPodeCriarProjeto] = useState(false);
  const [upgradeOverlayAberto, setUpgradeOverlayAberto] = useState(false);

  const navigate = useNavigate();
  const {
    selecionarProjeto,
    setIsModalSelecaoOpen,
    userData,
    funcaoUsuario,
    assinatura,
    projetoId,
  } = useProjeto();

  const irParaUpgrade = () => {
    if (onUpgradeClick) {
      onUpgradeClick();
      return;
    }
    setIsModalSelecaoOpen?.(false);
    navigate('/upgrade');
  };

  const regra = regraAssinatura(assinatura);
  const planoCodigo = normalizarPlanoTipo(regra?.nome_plano || assinatura?.plano_tipo);
  const planoNome = rotuloPlano(planoCodigo);
  const isCortesia = Boolean(assinatura?.cortesia);
  const isPlanoIniciante = isPlanoGratuito(regra?.nome_plano || assinatura?.plano_tipo);
  const formBloqueado = limiteAtingido;
  const mostrarOverlayUpgrade = formBloqueado && isPlanoIniciante;

  const carregarProjetosELimites = useCallback(async () => {
    if (!userData?.id || !assinatura?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data: membrosData, error: membrosError } = await supabase
        .from('membro_projetos')
        .select(`
          projeto_id,
          funcao,
          projetos (
            id,
            nome,
            logo_url,
            status,
            cnpj,
            razao_social,
            cidade,
            estado,
            created_at
          )
        `)
        .eq('usuario_id', userData.id)
        .eq('status', true);

      if (membrosError) throw membrosError;

      type MembroRow = {
        funcao?: string;
        projetos?:
          | Omit<
              ProjetoCard,
              | 'funcao'
              | 'qtdColaboradores'
              | 'qtdEpis'
              | 'qtdFuncoes'
              | 'ghePrincipal'
              | 'alertasPendentes'
              | 'ultimoAcessoIso'
            >
          | Omit<
              ProjetoCard,
              | 'funcao'
              | 'qtdColaboradores'
              | 'qtdEpis'
              | 'qtdFuncoes'
              | 'ghePrincipal'
              | 'alertasPendentes'
              | 'ultimoAcessoIso'
            >[]
          | null;
      };

      const listaBruta: ProjetoCard[] = [];
      const ids = new Set<string>();

      for (const m of (membrosData ?? []) as MembroRow[]) {
        const p = m.projetos;
        const proj = !p ? null : Array.isArray(p) ? p[0] ?? null : p;
        if (!proj?.id || ids.has(proj.id) || proj.status === false) continue;
        ids.add(proj.id);
        listaBruta.push({
          ...proj,
          nome: proj.nome || 'Sem nome',
          funcao: m.funcao ?? null,
          ultimoAcessoIso: lerUltimoAcessoProjeto(proj.id),
        });
      }

      const comContagem = await Promise.all(
        listaBruta.map(async (proj) => {
          const [
            { count: totalColaboradores },
            { data: tiposEpi, error: erroEpis },
            { count: totalFuncoes },
            { data: ghes },
            { data: conformidade },
          ] = await Promise.all([
            supabase
              .from('colaboradores')
              .select('*', { count: 'exact', head: true })
              .eq('projeto_id', proj.id)
              .eq('status', true),
            Promise.resolve({ data: 0, error: null }),
            supabase
              .from('cargo_funcoes')
              .select('*', { count: 'exact', head: true })
              .eq('projeto_id', proj.id)
              .eq('status', true),
            supabase
              .from('ghe')
              .select('descricao')
              .eq('projeto_id', proj.id)
              .eq('status', true)
              .order('descricao')
              .limit(1),
            supabase
              .from('v_dashboard_conformidade_resumo')
              .select('status_prazo, total')
              .eq('projeto_id', proj.id)
              .in('status_prazo', ['VENCIDO', 'IMINENTE']),
          ]);

          const alertasPendentes = (conformidade ?? []).reduce((acc, row: any) => {
            return acc + Number(row.total ?? 0);
          }, 0);

          return {
            ...proj,
            qtdColaboradores: totalColaboradores || 0,
            qtdEpis: erroEpis ? 0 : Number(tiposEpi ?? 0),
            qtdFuncoes: totalFuncoes || 0,
            ghePrincipal: ghes?.[0]?.descricao ?? null,
            alertasPendentes,
          };
        }),
      );

      setProjetos(comContagem);

      const temVinculoGestor = (membrosData ?? []).some(
        (m: { funcao?: string }) => m.funcao === 'GESTOR',
      );

      let gestor = funcaoUsuario === 'GESTOR' || temVinculoGestor;

      if (!gestor && comContagem.length === 0) {
        const { data: assInfo } = await supabase
          .from('assinaturas')
          .select('proprietario_id')
          .eq('id', assinatura.id)
          .maybeSingle();

        gestor = !assInfo?.proprietario_id || assInfo.proprietario_id === userData.id;
      }

      setPodeCriarProjeto(gestor && temRecurso(assinatura?.plano_tipo, 'shell_criar_projeto'));

      if (gestor) {
        const { count: totalAtivos, error: countError } = await supabase
          .from('projetos')
          .select('*', { count: 'exact', head: true })
          .eq('assinatura_id', assinatura.id)
          .eq('status', true);

        if (countError) throw countError;

        const priceOrRuleId =
          regra?.stripe_price_id ||
          assinatura?.plano_regra_id ||
          assinatura?.stripe_price_id ||
          null;

        let maxPermitido = Number(regra?.quantidade_projetos ?? 1);

        if (priceOrRuleId) {
          const { data: regraDb } = await supabase
            .from('plano_regras')
            .select('quantidade_projetos')
            .eq('stripe_price_id', priceOrRuleId)
            .maybeSingle();

          if (regraDb) {
            maxPermitido = Number(regraDb.quantidade_projetos ?? 0);
          }
        }

        const total = totalAtivos || 0;
        setLimiteMaximo(maxPermitido);
        setTotalProjetosAtivos(total);
        setLimiteAtingido(!isLimiteIlimitado(maxPermitido) && total >= maxPermitido);
      } else {
        setLimiteAtingido(false);
        setTotalProjetosAtivos(comContagem.length);
      }
    } catch (err) {
      console.error('Erro ao carregar ambiente de projetos:', err);
    } finally {
      setLoading(false);
    }
  }, [userData, funcaoUsuario, assinatura, regra?.stripe_price_id, regra?.quantidade_projetos]);

  useEffect(() => {
    void carregarProjetosELimites();
  }, [carregarProjetosELimites]);

  // Plano gratuito / único projeto: nunca ficar na tela de seleção — auto-entra.
  useEffect(() => {
    if (!obrigatorio || loading || !userData?.id || projetoId) return;
    if (projetos.length === 0) return;
    if (!(isPlanoIniciante || projetos.length === 1)) return;

    const unico = projetos[0];
    if (!unico?.id) return;

    // Cadastro / único projeto vazio: agenda o wizard de importação nesta sessão
    if ((unico.qtdEpis ?? 0) === 0 && (unico.qtdFuncoes ?? 0) === 0 && (unico.qtdColaboradores ?? 0) === 0) {
      marcarWizardImportacaoPendente(unico.id);
      marcarConfigTourPendente(unico.id);
    }

    marcarUltimoAcessoProjeto(unico.id);
    selecionarProjeto(unico.id, unico.nome, unico.logo_url || null);
    setIsModalSelecaoOpen(false);
    onProjetoSelecionado?.();
  }, [
    obrigatorio,
    loading,
    userData?.id,
    projetoId,
    projetos,
    isPlanoIniciante,
    selecionarProjeto,
    setIsModalSelecaoOpen,
    onProjetoSelecionado,
  ]);

  useEffect(() => {
    if (embedded) return;

    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, [embedded]);

  const handleSelecionar = (id: string, nome: string, logo: string | null = null) => {
    marcarUltimoAcessoProjeto(id);
    selecionarProjeto(id, nome, logo);
    setIsModalSelecaoOpen(false);
    onProjetoSelecionado?.();
  };

  const handleCancelarSelecao = () => {
    if (!obrigatorio) {
      setIsModalSelecaoOpen?.(false);
      onProjetoSelecionado?.();
    }
  };

  const onCardKeyDown = (e: KeyboardEvent, proj: ProjetoCard) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelecionar(proj.id, proj.nome, proj.logo_url || null);
    }
  };

  const criarNovoProjeto = async (e: FormEvent) => {
    e.preventDefault();
    const nome = novoNome.trim();
    if (!nome || !assinatura?.id || formBloqueado || criando) return;
    setCriando(true);
    setErroCriacao(null);

    try {
      const criado = await projetoService.criarProjetoAvulso(nome, assinatura.id);
      const novoId =
        (typeof criado === 'object' && criado
          ? (criado as { id?: string; projeto_id?: string }).id ??
            (criado as { id?: string; projeto_id?: string }).projeto_id
          : null) || null;
      const novoNomeCriado =
        (typeof criado === 'object' && criado
          ? (criado as { nome?: string }).nome
          : null) || nome;
      const novoLogo =
        typeof criado === 'object' && criado
          ? ((criado as { logo_url?: string | null }).logo_url ?? null)
          : null;

      setNovoNome('');

      if (novoId) {
        marcarWizardImportacaoPendente(novoId);
        marcarConfigTourPendente(novoId);
        handleSelecionar(novoId, novoNomeCriado, novoLogo);
        return;
      }

      // Fallback: se a RPC não devolver id, recarrega a lista
      await carregarProjetosELimites();
    } catch (err) {
      console.error(err);
      setErroCriacao('Não foi possível criar o projeto. Verifique o limite do seu plano.');
    } finally {
      setCriando(false);
    }
  };

  const ilimitado = isLimiteIlimitado(limiteMaximo);
  const usoLabel = ilimitado
    ? `${totalProjetosAtivos} projeto${totalProjetosAtivos === 1 ? '' : 's'} · Ilimitado`
    : `${totalProjetosAtivos}/${rotuloLimitePlano(limiteMaximo)} projetos`;

  // Plano Iniciante (1 projeto) ou único vínculo: não mostrar a lista — só a vinheta até entrar.
  const autoEntrando =
    obrigatorio &&
    !projetoId &&
    !loading &&
    projetos.length > 0 &&
    (isPlanoIniciante || projetos.length === 1);
  const telaOcupada = busy || autoEntrando;

  useEffect(() => {
    if (telaOcupada) {
      setShowBoot(true);
      return;
    }
    const t = window.setTimeout(() => setShowBoot(false), BOOT_VIGNETTE_EXIT_MS + 40);
    return () => window.clearTimeout(t);
  }, [telaOcupada]);

  const emptyTile = !loading && !autoEntrando && projetos.length === 0 && !podeCriarProjeto;

  const totalTiles =
    (emptyTile ? 1 : 0) + (podeCriarProjeto ? 1 : 0) + (autoEntrando ? 0 : projetos.length);
  // Poucos tiles → menos colunas (cards maiores); muitos → mais colunas (cards menores).
  const colunasGrid =
    totalTiles <= 1 ? 1 : totalTiles === 2 ? 2 : totalTiles <= 4 ? Math.min(totalTiles, 4) : totalTiles <= 6 ? 3 : 4;
  const linhasGrid = Math.max(1, Math.ceil(Math.max(totalTiles, 1) / colunasGrid));

  const shell = (
    <div
      className={cn(
        'sp-shell',
        embedded ? 'sp-shell--embedded' : 'sp-shell--fullscreen',
        telaOcupada && 'is-busy',
      )}
      role={embedded ? undefined : 'dialog'}
      aria-modal={embedded ? undefined : true}
      aria-labelledby="sp-title"
    >
      {showBoot && (
        <LoadingOverlay
          visible={telaOcupada}
          mode="hold"
          message={criando ? 'Criando projeto…' : autoEntrando ? 'Entrando no projeto…' : 'Preparando ambientes…'}
        />
      )}

      <div className="sp-shell__inner">
        <header className="sp-header">
          <div className="sp-header__brand">
            <img src={BRAND.logomarca} alt={BRAND.name} className="sp-header__logo" />
            <div className="sp-header__copy">
              <p className="sp-header__kicker">Ambientes</p>
              <h2 id="sp-title" className="sp-header__title">
                Seus projetos
              </h2>
              <p className="sp-header__subtitle">
                Escolha o ambiente para gerenciar EPIs, equipe e estoque
              </p>
            </div>
          </div>

          <div className="sp-header__meta">
            <span className="sp-pill">{planoNome}</span>
            {isCortesia ? <span className="sp-pill sp-pill--cortesia">Cortesia</span> : null}
            <span className="sp-pill sp-pill--soft">{usoLabel}</span>
            {!obrigatorio ? (
              <Button
                icon="pi pi-times"
                text
                rounded
                severity="secondary"
                onClick={handleCancelarSelecao}
                aria-label="Cancelar"
                className="sp-close"
              />
            ) : null}
          </div>
        </header>

        <div
          className="sp-grid"
          style={
            {
              '--sp-cols': String(colunasGrid),
              '--sp-rows': String(linhasGrid),
            } as CSSProperties
          }
        >
          {emptyTile ? (
            <Card className="sp-empty cepi-card">
              <div className="sp-empty__body">
                <i className="pi pi-inbox" aria-hidden />
                <h3>Nenhum projeto vinculado</h3>
                <p>Sua conta ainda não tem acesso a um ambiente.</p>
              </div>
            </Card>
          ) : null}

          {podeCriarProjeto ? (
            <div
              className={cn(
                'sp-create',
                formBloqueado && 'is-inactive',
                mostrarOverlayUpgrade && 'has-upgrade-hover',
                upgradeOverlayAberto && 'is-touch-open',
              )}
              onClick={(e) => {
                if (!mostrarOverlayUpgrade) return;
                if (window.matchMedia('(hover: none)').matches) {
                  e.preventDefault();
                  setUpgradeOverlayAberto(true);
                }
              }}
            >
              <form
                className="sp-create__form"
                onSubmit={criarNovoProjeto}
                aria-disabled={formBloqueado}
              >
                <div className="sp-create__head">
                  <span className="sp-create__badge" aria-hidden>
                    <i className={formBloqueado ? 'pi pi-lock' : 'pi pi-plus'} />
                  </span>
                  <div>
                    <h3>Novo projeto</h3>
                    <p>{formBloqueado ? `Limite · ${usoLabel}` : 'Criar ambiente'}</p>
                  </div>
                </div>

                <label className="sp-create__field" htmlFor="sp-novo-nome">
                  <span>Nome</span>
                  <InputText
                    id="sp-novo-nome"
                    placeholder="Nome do projeto"
                    value={formBloqueado ? '' : novoNome}
                    onChange={(e) => setNovoNome(e.target.value)}
                    className="w-full"
                    required={!formBloqueado}
                    maxLength={80}
                    disabled={criando || formBloqueado}
                    tabIndex={formBloqueado ? -1 : undefined}
                  />
                </label>

                {erroCriacao && !formBloqueado ? (
                  <p className="sp-create__error" role="alert">
                    {erroCriacao}
                  </p>
                ) : null}

                <Button
                  type="submit"
                  label="Criar"
                  icon="pi pi-check"
                  severity="success"
                  size="small"
                  className="sp-create__submit"
                  disabled={criando || formBloqueado || !novoNome.trim()}
                  loading={criando}
                />
              </form>

              {mostrarOverlayUpgrade ? (
                <div className="sp-create__upgrade" role="presentation">
                  <div className="sp-create__upgrade-card">
                    <span className="sp-create__upgrade-icon" aria-hidden>
                      <i className="pi pi-sparkles" />
                    </span>
                    <h4>Limite do Iniciante</h4>
                    <p>
                      {totalProjetosAtivos}/{rotuloLimitePlano(limiteMaximo)} projeto
                      {limiteMaximo === 1 ? '' : 's'}. Faça upgrade para criar mais.
                    </p>
                    <Button
                      type="button"
                      label="Upgrade"
                      icon="pi pi-arrow-up-right"
                      severity="success"
                      size="small"
                      onClick={irParaUpgrade}
                    />
                  </div>
                </div>
              ) : null}

              {formBloqueado && !mostrarOverlayUpgrade ? (
                <div className="sp-create__locked-hint" aria-live="polite">
                  <i className="pi pi-info-circle" aria-hidden />
                  Sem vagas neste plano
                </div>
              ) : null}
            </div>
          ) : null}

          {projetos.map((proj) => {
            const emUso = projetoId === proj.id;
            const local = localidadeLabel(proj.cidade, proj.estado);
            const cnpjFmt = proj.cnpj?.replace(/\D/g, '') ? formatarCnpj(proj.cnpj) : null;
            const razao =
              proj.razao_social?.trim() &&
              proj.razao_social.trim().toLowerCase() !== (proj.nome || '').trim().toLowerCase()
                ? proj.razao_social.trim()
                : null;
            const ultimo =
              formatarUltimoAcessoRelativo(proj.ultimoAcessoIso) ||
              formatarUltimoAcessoRelativo(proj.created_at);

            return (
              <button
                key={proj.id}
                type="button"
                className={cn('sp-card', emUso && 'is-active')}
                onClick={() => handleSelecionar(proj.id, proj.nome, proj.logo_url || null)}
                onKeyDown={(e) => onCardKeyDown(e, proj)}
              >
                {emUso ? <span className="sp-card__badge">Em uso</span> : null}

                <div className="sp-card__top">
                  <div className="sp-card__avatar">
                    {proj.logo_url ? (
                      <img src={proj.logo_url} alt="" />
                    ) : (
                      <Avatar label={iniciais(proj.nome || 'Projeto')} shape="circle" size="large" />
                    )}
                  </div>
                  <div className="sp-card__titles">
                    <span className="sp-card__name">{proj.nome || 'Sem nome'}</span>
                    {razao ? <span className="sp-card__razao">{razao}</span> : null}
                    {proj.funcao ? (
                      <span className="sp-card__role">
                        <i className="pi pi-user" aria-hidden />
                        {proj.funcao}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="sp-card__stats" aria-label="Resumo do ambiente">
                  <span className="sp-stat" title="Colaboradores">
                    <i className="pi pi-users" aria-hidden />
                    <strong>{proj.qtdColaboradores ?? 0}</strong>
                    <em>Equipe</em>
                  </span>
                  <span className="sp-stat" title="Tipos de EPI">
                    <i className="pi pi-box" aria-hidden />
                    <strong>{proj.qtdEpis ?? 0}</strong>
                    <em>EPIs</em>
                  </span>
                  <span className="sp-stat" title="Funções">
                    <i className="pi pi-briefcase" aria-hidden />
                    <strong>{proj.qtdFuncoes ?? 0}</strong>
                    <em>Funções</em>
                  </span>
                </div>

                <div className="sp-card__meta">
                  {proj.ghePrincipal ? (
                    <span className="sp-chip" title="GHE principal">
                      <i className="pi pi-sitemap" aria-hidden />
                      {proj.ghePrincipal}
                    </span>
                  ) : null}
                  {local ? (
                    <span className="sp-chip">
                      <i className="pi pi-map-marker" aria-hidden />
                      {local}
                    </span>
                  ) : null}
                  {(proj.alertasPendentes ?? 0) > 0 ? (
                    <span className="sp-chip sp-chip--alert" title="Vencidos / iminentes">
                      <i className="pi pi-exclamation-triangle" aria-hidden />
                      {proj.alertasPendentes}
                    </span>
                  ) : null}
                  {cnpjFmt ? (
                    <span className="sp-chip sp-chip--mono" title={cnpjFmt}>
                      <i className="pi pi-id-card" aria-hidden />
                      {cnpjFmt}
                    </span>
                  ) : null}
                </div>

                <div className="sp-card__foot">
                  {ultimo ? (
                    <span>
                      <i className="pi pi-clock" aria-hidden />
                      {proj.ultimoAcessoIso ? `Acesso ${ultimo}` : `Criado ${ultimo}`}
                    </span>
                  ) : (
                    <span />
                  )}
                  <span className="sp-card__cta">
                    Entrar
                    <i className="pi pi-arrow-right" aria-hidden />
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <footer className="sp-footer">
          <LinkAjudaSuporte
            tema={obrigatorio ? 'selecionar_projeto' : 'alternar_projeto'}
            className="sp-footer__help"
          />
          {!obrigatorio && projetoId ? (
            <Button
              label="Cancelar"
              icon="pi pi-times"
              text
              severity="secondary"
              size="small"
              onClick={handleCancelarSelecao}
            />
          ) : null}
        </footer>
      </div>
    </div>
  );

  if (embedded) {
    return <div className="sp-root sp-root--embedded">{shell}</div>;
  }

  return createPortal(
    <div className="sp-root sp-root--fullscreen">
      <div className="sp-backdrop" aria-hidden />
      {shell}
    </div>,
    document.body,
  );
}
