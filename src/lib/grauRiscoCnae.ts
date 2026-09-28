import { GRAU_POR_CLASSE_CNAE } from './grauRiscoCnae.data';

/** Grau da NR-04 para o CNAE. A subclasse do CNPJ (7 dígitos) usa a classe (5 primeiros). */
export function grauPorCnae(cnae: string): number | null {
  const digitos = cnae.replace(/\D/g, '');
  if (digitos.length < 5) return null;
  return GRAU_POR_CLASSE_CNAE[digitos.slice(0, 5)] ?? null;
}
