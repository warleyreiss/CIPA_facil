import { forwardRef } from 'react';
import { OverlayPanel } from 'primereact/overlaypanel';
import type { OverlayPanel as OverlayPanelType } from 'primereact/overlaypanel';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/Button';
import LinkAjudaSuporte from './LinkAjudaSuporte';
import {
  RECURSOS_PLANO,
  rotuloPlano,
  rotulosPlanosDisponiveis,
  type RecursoId,
} from '../lib/recursosPlano';
import { normalizarPlanoTipo } from '../lib/recursosPlano';

export interface OverlayRecursoPlanoProps {
  recurso: RecursoId | null;
  planoTipo?: string | null;
}

const OverlayRecursoPlano = forwardRef<OverlayPanelType, OverlayRecursoPlanoProps>(
  ({ recurso, planoTipo }, ref) => {
    const navigate = useNavigate();
    if (!recurso) return <OverlayPanel ref={ref} />;

    const meta = RECURSOS_PLANO[recurso];
    const planoAtual = rotuloPlano(normalizarPlanoTipo(planoTipo));
    const planosOk = rotulosPlanosDisponiveis(recurso);

    const irUpgrade = () => {
      if (ref && typeof ref !== 'function') ref.current?.hide();
      navigate('/upgrade');
    };

    return (
      <OverlayPanel ref={ref} style={{ minWidth: '280px', maxWidth: '340px' }}>
        <div className="flex flex-column gap-3">
          <div className="flex align-items-center gap-2 font-semibold text-sm border-bottom-1 surface-border pb-2">
            <i className="pi pi-lock text-primary" />
            Recurso do plano
          </div>

          <div className="flex flex-column gap-1">
            <p className="m-0 text-sm font-semibold text-color">{meta.label}</p>
            <p className="m-0 text-sm text-color-secondary line-height-3">
              Seu plano atual é <strong>{planoAtual}</strong>. Este recurso está disponível em:{' '}
              <strong>{planosOk}</strong>.
            </p>
          </div>

          <ul className="m-0 pl-3 text-sm text-color-secondary line-height-3">
            {meta.planos.map((p) => (
              <li key={p}>
                <strong>{rotuloPlano(p)}</strong>
                {p === normalizarPlanoTipo(planoTipo) ? ' · plano atual' : ''}
              </li>
            ))}
          </ul>

          <Button type="button" className="w-full" onClick={irUpgrade}>
            Ver planos e fazer upgrade
          </Button>
          <LinkAjudaSuporte tema="recurso_bloqueado_plano" />
        </div>
      </OverlayPanel>
    );
  },
);

OverlayRecursoPlano.displayName = 'OverlayRecursoPlano';

export default OverlayRecursoPlano;

/** Painel full-width para páginas/rotas bloqueadas. */
export function PainelRecursoBloqueado({
  recurso,
  planoTipo,
  mostrarAjuda = true,
}: {
  recurso: RecursoId;
  planoTipo?: string | null;
  /** Quando false, a ajuda fica a cargo do rodapé do card pai. */
  mostrarAjuda?: boolean;
}) {
  const navigate = useNavigate();
  const meta = RECURSOS_PLANO[recurso];
  const planoAtual = rotuloPlano(normalizarPlanoTipo(planoTipo));

  return (
    <div
      className="flex flex-column align-items-start gap-3 p-4 border-round border-1 surface-border"
      style={{ maxWidth: 520, margin: '1.5rem auto', background: 'var(--surface-card)' }}
      role="status"
    >
      <div className="flex align-items-center gap-2 font-semibold">
        <i className="pi pi-lock text-primary" />
        Recurso indisponível no seu plano
      </div>
      <p className="m-0 text-sm text-color-secondary line-height-3">
        <strong>{meta.label}</strong> não está incluído no plano <strong>{planoAtual}</strong>.
        Disponível em: <strong>{rotulosPlanosDisponiveis(recurso)}</strong>.
      </p>
      <Button type="button" onClick={() => navigate('/upgrade')}>
        Ver planos e fazer upgrade
      </Button>
      {mostrarAjuda ? <LinkAjudaSuporte tema="recurso_bloqueado_plano" /> : null}
    </div>
  );
}
