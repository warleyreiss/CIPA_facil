import { memo, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjeto } from '../contexts/ProjetoContext';
import {
  buscarLimitesPlanoComFallback,
  contarProjetosAssinatura,
  type LimitesPlano,
} from '../lib/limitesPlanoUtils';
import { Button } from './ui/Button';
import { normalizarPlanoTipo } from '../lib/recursosPlano';
import '../assets/css/especificos/status-plano.css';

type TomUso = 'ok' | 'warn' | 'danger' | 'unlimited';

function calcPerc(uso: number, limite: number) {
  if (limite === 0) return 100;
  if (uso === 0) return 0;
  return Math.min(100, Math.round((uso / limite) * 100));
}

function tomUso(perc: number, limite: number): TomUso {
  if (limite === 0) return 'unlimited';
  if (perc >= 100) return 'danger';
  if (perc > 80) return 'warn';
  return 'ok';
}

function rotuloStatus(status: string): { label: string; tom: 'ok' | 'warn' | 'danger' | 'info'; icon: string } {
  const s = status.toLowerCase();
  if (s === 'active' || s === 'ativo') {
    return { label: 'Ativo', tom: 'ok', icon: 'pi-check-circle' };
  }
  if (s === 'trialing') {
    return { label: 'Teste', tom: 'info', icon: 'pi-clock' };
  }
  if (s === 'past_due' || s === 'unpaid' || s === 'atrasado') {
    return { label: 'Pendência', tom: 'warn', icon: 'pi-exclamation-triangle' };
  }
  if (s === 'paused' || s === 'incomplete' || s === 'incomplete_expired') {
    return { label: s === 'paused' ? 'Pausado' : 'Incompleto', tom: 'danger', icon: 'pi-lock' };
  }
  if (s === 'canceled' || s === 'cancelled' || s === 'cancelado') {
    return { label: 'Cancelado', tom: 'danger', icon: 'pi-times-circle' };
  }
  return { label: status || 'Aguardando', tom: 'info', icon: 'pi-info-circle' };
}

function MetricRow({
  label,
  icon,
  uso,
  limite,
}: {
  label: string;
  icon: string;
  uso: number;
  limite: number;
}) {
  const ilimitado = limite === 0;
  const perc = calcPerc(uso, limite);
  const tom = tomUso(perc, limite);

  return (
    <div className="status-plano__metric">
      <div className="status-plano__metric-top">
        <span className="status-plano__metric-label">
          <i className={`pi ${icon}`} aria-hidden />
          {label}
        </span>
        <span className="status-plano__metric-uso">
          {ilimitado ? (
            <span className="status-plano__perc status-plano__perc--unlimited">Ilimitado</span>
          ) : (
            <>
              <strong>{uso}</strong>
              {' / '}
              {limite}
              <span className={`status-plano__perc status-plano__perc--${tom}`} style={{ marginLeft: '0.35rem' }}>
                {perc}%
              </span>
            </>
          )}
        </span>
      </div>
      <div
        className="status-plano__track"
        role="progressbar"
        aria-valuenow={perc}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className={`status-plano__fill status-plano__fill--${tom}`}
          style={{ ['--osp-perc' as string]: `${ilimitado ? 100 : perc}%` }}
        />
      </div>
    </div>
  );
}

const OverlayStatusPlano: React.FC = () => {
  const { assinatura, projetoId } = useProjeto();
  const navigate = useNavigate();

  const assinaturaRef = useRef(assinatura);
  assinaturaRef.current = assinatura;

  const [usoProjetos, setUsoProjetos] = useState(0);
  const [limites, setLimites] = useState<LimitesPlano>({
    quantidade_projetos: 0,
  });
  const [carregandoDados, setCarregandoDados] = useState(true);

  const assinaturaId = assinatura?.id;
  const planoRegraId = assinatura?.plano_regra_id ?? assinatura?.stripe_price_id;

  useEffect(() => {
    if (!assinaturaId) {
      setCarregandoDados(false);
      return;
    }

    let cancelado = false;
    setCarregandoDados(true);

    const carregarDadosEPlano = async () => {
      const assinaturaAtual = assinaturaRef.current;
      if (!assinaturaAtual?.id) return;

      try {
        const regrasFinais = await buscarLimitesPlanoComFallback(assinaturaAtual);
        if (cancelado) return;
        setLimites(regrasFinais);

        const projCount = await contarProjetosAssinatura(assinaturaAtual.id, projetoId);
        if (cancelado) return;
        setUsoProjetos(projCount);
      } catch (err) {
        console.error('Erro ao carregar dados de consumo do plano:', err);
      } finally {
        if (!cancelado) setCarregandoDados(false);
      }
    };

    carregarDadosEPlano();

    return () => {
      cancelado = true;
    };
  }, [assinaturaId, projetoId, planoRegraId]);

  if (!assinatura) {
    return (
      <div className="status-plano status-plano--loading" role="status">
        <i className="pi pi-spin pi-spinner" aria-hidden />
        Carregando plano…
      </div>
    );
  }

  const regraPlanoRaw = (assinatura as { plano_regras?: unknown }).plano_regras;
  const regraPlano = Array.isArray(regraPlanoRaw) ? regraPlanoRaw[0] : regraPlanoRaw;
  const nomeRegra =
    regraPlano && typeof regraPlano === 'object' && 'nome_plano' in regraPlano
      ? String((regraPlano as { nome_plano?: unknown }).nome_plano ?? '').trim()
      : '';

  const planoTipo = nomeRegra || assinatura.plano_tipo || 'Plano';
  const planoStatus = assinatura.plano_status || 'Aguardando';
  const statusMeta = rotuloStatus(planoStatus);

  const limiteProj = limites.quantidade_projetos;

  const tom = tomUso(calcPerc(usoProjetos, limiteProj), limiteProj);
  const pertoDoLimite = !carregandoDados && (tom === 'warn' || tom === 'danger');

  const isGestor = normalizarPlanoTipo(assinatura.plano_tipo) === 'GESTOR';

  return (
    <div className="status-plano">
      <header className="status-plano__head">
        <p className="status-plano__eyebrow">Seu plano</p>
        <div className="status-plano__title-row">
          <h4 className="status-plano__nome">{planoTipo}</h4>
          <span className={`status-plano__badge status-plano__badge--${statusMeta.tom}`}>
            <i className={`pi ${statusMeta.icon}`} aria-hidden />
            {statusMeta.label}
          </span>
        </div>
      </header>

      {carregandoDados ? (
        <div className="status-plano__updating" role="status">
          <i className="pi pi-spin pi-spinner" aria-hidden />
          Atualizando consumo…
        </div>
      ) : (
        <div className="status-plano__metrics">
          <MetricRow label="Projetos" icon="pi-briefcase" uso={usoProjetos} limite={limiteProj} />
        </div>
      )}

      {pertoDoLimite && (
        <p className="status-plano__hint">
          <i className="pi pi-exclamation-triangle" aria-hidden />
          Um ou mais limites estão próximos ou esgotados.
        </p>
      )}

      <div className="status-plano__actions">
        <Button
          label="Colaborar"
          icon="pi pi-heart"
          size="sm"
          variant="secondary"
          onClick={() => navigate('/colaboracao')}
        />
        <Button
          label={isGestor ? 'Ver planos' : 'Fazer upgrade'}
          icon="pi pi-arrow-up"
          size="sm"
          variant="primary"
          onClick={() => navigate('/upgrade')}
        />
      </div>
    </div>
  );
};

export default memo(OverlayStatusPlano);
