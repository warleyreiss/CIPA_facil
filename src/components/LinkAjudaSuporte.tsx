import { Link } from 'react-router-dom';
import { urlSuportePorTema, type SuporteTemaSlug } from '../lib/suporteTemas';

interface LinkAjudaSuporteProps {
  tema: SuporteTemaSlug;
  className?: string;
  label?: string;
}

export default function LinkAjudaSuporte({
  tema,
  className,
  label = 'Precisando de ajuda?',
}: LinkAjudaSuporteProps) {
  return (
    <Link
      to={urlSuportePorTema(tema)}
      className={className ?? 'flex align-items-center gap-1 text-primary text-sm no-underline'}
    >
      <i className="pi pi-question-circle" aria-hidden />
      {label}
    </Link>
  );
}
