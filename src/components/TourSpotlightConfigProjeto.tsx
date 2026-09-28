import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import '../assets/css/especificos/tour-spotlight-config.css';

export type TourConfigStepId =
  | 'periodicidade'
  | 'estoque'
  | 'guia'
  | 'dias'
  | 'salvar';

type StepDef = {
  id: TourConfigStepId;
  selector: string;
  title: string;
  body: string;
};

const STEPS_BASE: StepDef[] = [
  {
    id: 'periodicidade',
    selector: '[data-tour="config-periodicidade"]',
    title: 'Controle de periodicidade',
    body: 'Ative para acompanhar o prazo de troca dos EPIs (vencido, iminente e no prazo). Desligado, o sistema não classifica vencimentos.',
  },
  {
    id: 'estoque',
    selector: '[data-tour="config-estoque"]',
    title: 'Controle de estoque',
    body: 'Ative para monitorar entradas e saídas de equipamentos e bloquear fornecimento sem saldo quando fizer sentido.',
  },
  {
    id: 'guia',
    selector: '[data-tour="config-guia-tamanhos"]',
    title: 'Guia de tamanhos',
    body: 'Quando ligado, o cadastro do colaborador exibe e exige os tamanhos (calçado, luva, etc.). Desligado, a guia some do projeto.',
  },
];

const STEP_DIAS: StepDef = {
  id: 'dias',
  selector: '[data-tour="config-dias-iminencia"]',
  title: 'Dias para iminência de troca',
  body: 'Define com quantos dias de antecedência o EPI aparece como Iminente. Só se aplica com a periodicidade ligada.',
};

const STEP_SALVAR: StepDef = {
  id: 'salvar',
  selector: '[data-tour="config-salvar"]',
  title: 'Salvar alterações',
  body: 'Revise as opções e salve para aplicar as regras neste projeto. É obrigatório concluir esta etapa.',
};

function montarPassos(periodicidadeAtiva: boolean): StepDef[] {
  const passos = [...STEPS_BASE];
  if (periodicidadeAtiva) passos.push(STEP_DIAS);
  passos.push(STEP_SALVAR);
  return passos;
}

type Rect = { top: number; left: number; width: number; height: number };

type Props = {
  open: boolean;
  getPeriodicidadeAtiva: () => boolean;
  onSalvarEConcluir: () => Promise<boolean>;
  onConcluido: () => void;
};

const PAD = 8;

export default function TourSpotlightConfigProjeto({
  open,
  getPeriodicidadeAtiva,
  onSalvarEConcluir,
  onConcluido,
}: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [saving, setSaving] = useState(false);
  const [steps, setSteps] = useState<StepDef[]>(() => montarPassos(true));

  const step = steps[stepIndex] ?? steps[0];
  const isLast = stepIndex >= steps.length - 1;
  const total = steps.length;

  const recalcularPassos = useCallback(() => {
    const next = montarPassos(getPeriodicidadeAtiva());
    setSteps(next);
    return next;
  }, [getPeriodicidadeAtiva]);

  const medir = useCallback(() => {
    const current = steps[stepIndex];
    if (!current) {
      setRect(null);
      return;
    }
    document.querySelectorAll('.tour-spot-target-live').forEach((n) => {
      n.classList.remove('tour-spot-target-live');
    });
    const el = document.querySelector(current.selector) as HTMLElement | null;
    if (!el) {
      setRect(null);
      return;
    }
    el.classList.add('tour-spot-target-live');
    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    const r = el.getBoundingClientRect();
    setRect({
      top: Math.max(0, r.top - PAD),
      left: Math.max(0, r.left - PAD),
      width: r.width + PAD * 2,
      height: r.height + PAD * 2,
    });
  }, [stepIndex, steps]);

  useEffect(() => {
    if (!open) return;
    setStepIndex(0);
    setSteps(montarPassos(getPeriodicidadeAtiva()));
  }, [open, getPeriodicidadeAtiva]);

  useLayoutEffect(() => {
    if (!open) return;
    let cancelled = false;
    const tentar = (tentativa: number) => {
      if (cancelled) return;
      medir();
      const current = steps[stepIndex];
      const el = current ? document.querySelector(current.selector) : null;
      if (!el && tentativa < 8) {
        window.setTimeout(() => tentar(tentativa + 1), 80);
      }
    };
    const t = window.setTimeout(() => tentar(0), 40);
    const onResize = () => medir();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
      document.querySelectorAll('.tour-spot-target-live').forEach((n) => {
        n.classList.remove('tour-spot-target-live');
      });
    };
  }, [open, medir, stepIndex, steps]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const tooltipStyle = useMemo(() => {
    if (!rect) {
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' as const };
    }
    const below = rect.top + rect.height + 12;
    const spaceBelow = window.innerHeight - below;
    const top = spaceBelow < 180 ? Math.max(12, rect.top - 12) : below;
    const transform =
      spaceBelow < 180 ? 'translate(-50%, -100%)' : 'translateX(-50%)';
    const left = Math.min(Math.max(16, rect.left + rect.width / 2), window.innerWidth - 16);
    return { top, left, transform };
  }, [rect]);

  const irProximo = () => {
    if (isLast) return;
    const fromId = steps[stepIndex]?.id;
    const nextSteps = recalcularPassos();
    const idxInNext = fromId ? nextSteps.findIndex((s) => s.id === fromId) : stepIndex;
    const base = idxInNext >= 0 ? idxInNext : stepIndex;
    setStepIndex(Math.min(base + 1, nextSteps.length - 1));
  };

  const concluirComSalvar = async () => {
    setSaving(true);
    try {
      const ok = await onSalvarEConcluir();
      if (ok) onConcluido();
    } finally {
      setSaving(false);
    }
  };

  if (!open || typeof document === 'undefined') return null;

  const panels = rect
    ? [
        { top: 0, left: 0, width: '100%' as const, height: rect.top },
        { top: rect.top, left: 0, width: rect.left, height: rect.height },
        {
          top: rect.top,
          left: rect.left + rect.width,
          width: Math.max(0, window.innerWidth - (rect.left + rect.width)),
          height: rect.height,
        },
        {
          top: rect.top + rect.height,
          left: 0,
          width: '100%' as const,
          height: Math.max(0, window.innerHeight - (rect.top + rect.height)),
        },
      ]
    : [{ top: 0, left: 0, width: '100%' as const, height: '100%' as const }];

  return createPortal(
    <div className="tour-spot" role="dialog" aria-modal="true" aria-labelledby="tour-spot-title">
      {panels.map((p, i) => (
        <div
          key={i}
          className="tour-spot__dim"
          style={{
            top: p.top,
            left: p.left,
            width: p.width,
            height: p.height,
          }}
          aria-hidden
        />
      ))}

      {rect ? (
        <div
          className="tour-spot__ring"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          }}
          aria-hidden
        />
      ) : null}

      <div className="tour-spot__card" style={tooltipStyle}>
        <p className="tour-spot__progress">
          Passo {stepIndex + 1} de {total}
        </p>
        <h2 id="tour-spot-title" className="tour-spot__title">
          {step?.title}
        </h2>
        <p className="tour-spot__body">{step?.body}</p>
        <div className="tour-spot__actions">
          {!isLast ? (
            <button type="button" className="tour-spot__btn tour-spot__btn--primary" onClick={irProximo}>
              Próximo
            </button>
          ) : (
            <button
              type="button"
              className="tour-spot__btn tour-spot__btn--primary"
              onClick={() => void concluirComSalvar()}
              disabled={saving}
            >
              {saving ? 'Salvando…' : 'Salvar e concluir'}
            </button>
          )}
        </div>
        <p className="tour-spot__note">Tour obrigatório — avance por todos os passos.</p>
      </div>
    </div>,
    document.body,
  );
}
