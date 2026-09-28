import { grauPorCnae } from './grauRiscoCnae';

export type EmpresaCnpj = {
  razaoSocial: string;
  nomeFantasia: string;
  cnae: string;
  cnaeDescricao: string;
  municipio: string;
  uf: string;
  grauRisco: number | null;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cep?: string;
};

/** O CNPJ identifica o estabelecimento e o CNAE. O grau é o da atividade principal na NR-04. */
export async function consultarCnpj(cnpj: string): Promise<EmpresaCnpj> {
  const limpo = cnpj.replace(/\D/g, '');
  const resposta = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${limpo}`);
  if (!resposta.ok) {
    throw new Error('Não foi possível consultar este CNPJ. Confira o número e tente de novo.');
  }
  const dados = (await resposta.json()) as {
    razao_social?: string;
    nome_fantasia?: string;
    cnae_fiscal?: number | string;
    cnae_fiscal_descricao?: string;
    municipio?: string;
    uf?: string;
    descricao_tipo_de_logradouro?: string;
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cep?: string | number;
  };
  const cnae = String(dados.cnae_fiscal ?? '').replace(/\D/g, '');
  const tipoLogradouro = dados.descricao_tipo_de_logradouro?.trim();
  const logradouro = dados.logradouro?.trim();
  return {
    razaoSocial: dados.razao_social?.trim() || '',
    nomeFantasia: dados.nome_fantasia?.trim() || '',
    cnae,
    cnaeDescricao: dados.cnae_fiscal_descricao?.trim() || '',
    municipio: dados.municipio?.trim() || '',
    uf: dados.uf?.trim() || '',
    grauRisco: grauPorCnae(cnae),
    logradouro: [tipoLogradouro, logradouro].filter(Boolean).join(' '),
    numero: dados.numero?.trim() || '',
    complemento: dados.complemento?.trim() || '',
    bairro: dados.bairro?.trim() || '',
    cep: String(dados.cep ?? '').replace(/\D/g, ''),
  };
}
