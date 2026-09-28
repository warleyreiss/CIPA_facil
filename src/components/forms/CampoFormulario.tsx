import { cloneElement, type ReactElement } from 'react';
import { FloatLabel } from 'primereact/floatlabel';
import { cn } from '../../lib/cn';
import { CampoValidavel } from './CadastroSection';

type Props = {
  id: string;
  rotulo: string;
  largo?: boolean;
  erro?: string;
  shake?: number;
  ajuda?: string;
  children: ReactElement;
};

/** Campo com rótulo flutuante. O erro fica dentro do input, colorido e com o mesmo balanço do Controle EPI. */
export function CampoFormulario({ id, rotulo, largo, erro, shake = 0, ajuda, children }: Props) {
  const invalido = Boolean(erro);
  const propsAtuais = children.props as { className?: string };
  const controle = invalido
    ? cloneElement(children, {
        className: cn(propsAtuais.className, 'p-invalid'),
        invalid: true,
      } as never)
    : children;

  return (
    <div className={largo ? 'field cepi-form__full' : 'field'}>
      <CampoValidavel key={`${id}-${shake}`} invalid={invalido} shaking={invalido} error={erro}>
        <FloatLabel>
          {controle}
          <label htmlFor={id}>{rotulo}</label>
        </FloatLabel>
      </CampoValidavel>
      {ajuda ? <p className="cepi-form__hint wizard-cnpj-nota">{ajuda}</p> : null}
    </div>
  );
}
