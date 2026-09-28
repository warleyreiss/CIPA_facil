import type { ReactNode, CSSProperties } from 'react';
import { cn } from '../../lib/cn';

type CadastroSectionVariant = 'default' | 'switch' | 'table';

export interface CadastroSectionProps {
  variant?: CadastroSectionVariant;
  active?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

/** Card de formulário compartilhado (.cadastro-section). Altere o CSS uma vez → vale em todos. */
export function CadastroSection({
  variant = 'default',
  active,
  className,
  style,
  children,
}: CadastroSectionProps) {
  return (
    <div
      className={cn(
        'cadastro-section mb-3',
        variant === 'switch' && 'cadastro-section--switch',
        variant === 'table' && 'cadastro-section--table',
        active && 'is-active',
        className,
      )}
      style={style}
    >
      {children}
    </div>
  );
}

export interface CadastroSectionBodyProps {
  /** 1 = coluna única; 2 = metade/metade (padrão) */
  cols?: 1 | 2;
  className?: string;
  style?: CSSProperties;
  title?: string;
  children: ReactNode;
}

export function CadastroSectionBody({
  cols = 2,
  className,
  style,
  title,
  children,
}: CadastroSectionBodyProps) {
  return (
    <div
      className={cn(
        'cadastro-section__body',
        cols === 1 && 'cadastro-section__body--stack',
        className,
      )}
      style={style}
      title={title}
    >
      {children}
    </div>
  );
}

export interface CampoValidavelProps {
  invalid?: boolean;
  shaking?: boolean;
  /** Mensagem de erro (legado). Exibida quando `invalid` e não houver `message`. */
  error?: string;
  /** Mensagem inline dentro do campo (validação ou status). */
  message?: string;
  /** Cor da mensagem / borda. Padrão: error. */
  tone?: 'error' | 'warn' | 'success' | 'info';
  className?: string;
  children: ReactNode;
}

/** Campo com mensagem interna + borda colorida + shake opcional. */
export function CampoValidavel({
  invalid,
  shaking,
  error,
  message,
  tone = 'error',
  className,
  children,
}: CampoValidavelProps) {
  const texto = message ?? (invalid ? error : undefined);
  const tom = message != null ? tone : 'error';
  const showMsg = Boolean(texto);

  return (
    <div
      className={cn(
        'campo-validavel',
        showMsg && `campo-validavel--${tom}`,
        shaking && (invalid || tom === 'error') && 'is-shaking',
        className,
      )}
    >
      {children}
      {showMsg ? (
        <span className={cn('campo-erro-inline', `campo-erro-inline--${tom}`)}>{texto}</span>
      ) : null}
    </div>
  );
}
