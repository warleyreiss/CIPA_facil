import '../assets/css/especificos/cargo-badge.css';

type Cargo = {
  rotulo: string;
  estilo: 'presidente' | 'vice' | 'membro' | 'suplente';
};

export function cargoDoMembro(membro: { funcao?: string | null; condicao?: string | null }): Cargo {
  if (membro.funcao === 'presidente') return { rotulo: 'Presidente', estilo: 'presidente' };
  if (membro.funcao === 'vice') return { rotulo: 'Vice', estilo: 'vice' };
  if (membro.condicao === 'suplente') return { rotulo: 'Suplente', estilo: 'suplente' };
  return { rotulo: 'Membro', estilo: 'membro' };
}

export function BadgeCargo({ funcao, condicao }: { funcao?: string | null; condicao?: string | null }) {
  const cargo = cargoDoMembro({ funcao, condicao });
  return <em className={`cargo-badge cargo-badge--${cargo.estilo}`}>{cargo.rotulo}</em>;
}
