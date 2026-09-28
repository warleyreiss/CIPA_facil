import { FloatLabel } from 'primereact/floatlabel';
import { InputText } from 'primereact/inputtext';
import { cn } from '../lib/cn';

interface CampoBloqueadoPlanoProps {
  /** Rótulo igual ao do campo liberado (ex.: "CPF/ e-social*"). */
  label: string;
  /** Texto dos planos que liberam o recurso (ex.: "Gestor"). */
  planosDisponiveis: string;
  onClick: (e: React.MouseEvent) => void;
  inputId?: string;
  className?: string;
}

/**
 * Placeholder visual de campo de formulário bloqueado por plano:
 * mantém a aparência do input (FloatLabel), esmaecido, com cadeado.
 */
export default function CampoBloqueadoPlano({
  label,
  planosDisponiveis,
  onClick,
  inputId,
  className,
}: CampoBloqueadoPlanoProps) {
  const id = inputId ?? `campo-bloqueado-${label.replace(/\W+/g, '-').toLowerCase()}`;
  const hint = `Disponível em ${planosDisponiveis}`;

  const acionar = (e: React.MouseEvent | React.KeyboardEvent) => {
    onClick(e as React.MouseEvent);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className={cn('campo-bloqueado-plano', className)}
      onClick={acionar}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          acionar(e);
        }
      }}
      title={hint}
      aria-label={`${label}. ${hint}. Clique para ver planos.`}
    >
      <FloatLabel className="campo-bloqueado-plano__float">
        <InputText
          id={id}
          value=""
          disabled
          readOnly
          tabIndex={-1}
          className="w-full campo-bloqueado-plano__input"
          aria-hidden
        />
        <label htmlFor={id}>{label}</label>
      </FloatLabel>
      <span className="campo-bloqueado-plano__lock" aria-hidden>
        <i className="pi pi-lock" />
      </span>
    </div>
  );
}
