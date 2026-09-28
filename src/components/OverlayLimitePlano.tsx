import { forwardRef, type MouseEvent, type Ref } from 'react';
import { OverlayPanel } from 'primereact/overlaypanel';
import type { OverlayPanel as OverlayPanelType } from 'primereact/overlaypanel';
import { Button } from 'primereact/button';
import { useNavigate } from 'react-router-dom';
import LinkAjudaSuporte from './LinkAjudaSuporte';
import {
  calcularExcedenteLimite,
  isLimiteIlimitado,
} from '../lib/limitesPlanoUtils';
import { normalizarPlanoTipo } from '../lib/recursosPlano';

export type ModoLimitePlano = 'atingido' | 'projecao';

export interface OverlayLimitePlanoProps {
  tipo: TipoLimiteConsumo;
  uso: number;
  limite: number;
  planoTipo: string;
  modo?: ModoLimitePlano;
  quantidadeNova?: number;
}

type TipoLimiteConsumo = 'projetos';

const LABELS: Record<TipoLimiteConsumo, { tituloAtingido: string; tituloProjecao: string; recurso: string; unidade: string }> = {
  projetos: {
    tituloAtingido: 'Limite de projetos atingido',
    tituloProjecao: 'Limite de projetos será ultrapassado',
    recurso: 'projetos',
    unidade: 'projeto(s)',
  },
};

export function AlertaLimiteProjecao({
  tipo,
  uso,
  limite,
  planoTipo,
  quantidadeNova,
  onSaibaMais,
}: {
  tipo: TipoLimiteConsumo;
  uso: number;
  limite: number;
  planoTipo: string;
  quantidadeNova: number;
  onSaibaMais?: () => void;
}) {
  const meta = LABELS[tipo];
  const excedente = calcularExcedenteLimite(uso, limite, quantidadeNova);
  const usoProjetado = uso + quantidadeNova;

  if (isLimiteIlimitado(limite) || excedente <= 0) return null;

  return (
    <div
      className="flex flex-column gap-2 p-3 border-round border-1 border-orange-300"
      style={{ background: 'var(--orange-50)' }}
      role="alert"
    >
      <div className="flex align-items-center gap-2 font-semibold text-sm" style={{ color: 'var(--orange-600)' }}>
        <i className="pi pi-exclamation-triangle" />
        {meta.tituloProjecao}
      </div>
      <p className="m-0 text-sm text-color-secondary line-height-3">
        Plano <strong>{planoTipo}</strong>: limite de <strong>{limite}</strong> {meta.recurso}.
        Uso atual <strong>{uso}</strong> + <strong>{quantidadeNova}</strong> {meta.unidade} ={' '}
        <strong>{usoProjetado}</strong> (excede em <strong>{excedente}</strong>).
      </p>
      {onSaibaMais && (
        <Button
          label="Ver opções de upgrade"
          text
          size="small"
          severity="warning"
          onClick={onSaibaMais}
        />
      )}
    </div>
  );
}

const OverlayLimitePlano = forwardRef<OverlayPanelType, OverlayLimitePlanoProps>(
  ({ tipo, uso, limite, planoTipo, modo = 'atingido', quantidadeNova = 0 }, ref) => {
    const navigate = useNavigate();
    const meta = LABELS[tipo];
    const mostrarUpgrade = planoTipo !== 'PRO';
    const limiteLabel = isLimiteIlimitado(limite) ? 'ilimitado' : String(limite);
    const excedente = calcularExcedenteLimite(uso, limite, quantidadeNova);
    const usoProjetado = uso + quantidadeNova;
    const titulo = modo === 'projecao' ? meta.tituloProjecao : meta.tituloAtingido;

    const irParaUpgrade = () => {
      if (ref && typeof ref !== 'function' && ref.current) {
        ref.current.hide();
      }
      navigate('/upgrade');
    };

    return (
      <OverlayPanel ref={ref} style={{ minWidth: '260px', maxWidth: '320px' }}>
        <div className="flex flex-column gap-3">
          <div className="flex align-items-center gap-2 font-semibold text-sm border-bottom-1 surface-border pb-2">
            <i className="pi pi-lock text-primary" />
            {titulo}
          </div>

          <p className="m-0 text-sm text-color-secondary line-height-3">
            {modo === 'projecao' && quantidadeNova > 0 ? (
              <>
                Seu plano <strong>{planoTipo}</strong> permite até{' '}
                <strong>{limiteLabel}</strong> {meta.recurso} por projeto. Você utiliza{' '}
                <strong>{uso}</strong> e está tentando cadastrar{' '}
                <strong>{quantidadeNova}</strong> {meta.unidade}, totalizando{' '}
                <strong>{usoProjetado}</strong> —{' '}
                <strong>{excedente}</strong> acima do limite.
              </>
            ) : (
              <>
                Seu plano <strong>{planoTipo}</strong> permite até{' '}
                <strong>{limiteLabel}</strong> {meta.recurso} por projeto. Você já utiliza{' '}
                <strong>{uso}</strong>.
              </>
            )}
          </p>

          <div className="flex flex-column gap-2 border-top-1 surface-border pt-2">
            <p className="m-0 text-xs text-color-secondary">
              {modo === 'projecao'
                ? 'Reduza a seleção ou faça upgrade para concluir o cadastro'
                : 'Ação necessária: faça upgrade para ampliar o limite'}
            </p>
            {mostrarUpgrade && (
              <Button
                type="button"
                label={normalizarPlanoTipo(planoTipo) === 'GESTOR' ? 'Ver planos' : 'Fazer upgrade'}
                icon="pi pi-star-fill"
                size="small"
                severity="success"
                onClick={irParaUpgrade}
              />
            )}
            <LinkAjudaSuporte tema="limite_botao_novo" />
          </div>
        </div>
      </OverlayPanel>
    );
  }
);

OverlayLimitePlano.displayName = 'OverlayLimitePlano';

interface BotaoLimitePlanoProps {
  limiteAtingido: boolean;
  onLimiteClick: (event: MouseEvent, target: HTMLElement) => void;
  onClick: () => void;
  label: string;
  icon?: string;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export function BotaoLimitePlano({
  limiteAtingido,
  onLimiteClick,
  onClick,
  label,
  icon = 'pi pi-plus',
  className = 'p-button-sm p-button-success',
  type = 'button',
}: BotaoLimitePlanoProps) {
  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <Button
        type={type}
        label={label}
        icon={icon}
        className={className}
        disabled={limiteAtingido}
        onClick={onClick}
      />
      {limiteAtingido && (
        <button
          type="button"
          tabIndex={-1}
          aria-label="Limite do plano atingido"
          onClick={(e) => onLimiteClick(e, e.currentTarget)}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
        />
      )}
    </span>
  );
}

interface BotaoSubmitLimitePlanoProps {
  bloqueado: boolean;
  onLimiteClick: (event: MouseEvent, target: HTMLElement) => void;
  onClick: () => void;
  label: string;
  loading?: boolean;
  icon?: string;
  className?: string;
  /** Ref do wrapper (ex.: âncora do overlay de limite) — evita span extra no rodapé */
  wrapperRef?: Ref<HTMLSpanElement>;
}

export function BotaoSubmitLimitePlano({
  bloqueado,
  onLimiteClick,
  onClick,
  label,
  loading = false,
  icon = 'pi pi-check',
  className,
  wrapperRef,
}: BotaoSubmitLimitePlanoProps) {
  return (
    <span ref={wrapperRef} style={{ position: 'relative', display: 'inline-block' }}>
      <Button
        type="button"
        label={label}
        icon={icon}
        loading={loading}
        className={className}
        disabled={bloqueado}
        onClick={onClick}
      />
      {bloqueado && (
        <button
          type="button"
          tabIndex={-1}
          aria-label="Cadastro bloqueado pelo limite do plano"
          onClick={(e) => onLimiteClick(e, e.currentTarget)}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
        />
      )}
    </span>
  );
}

export default OverlayLimitePlano;
