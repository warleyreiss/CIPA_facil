import { emailOpcionalValido, telefoneBrOpcionalValido } from './telefoneUtils';

export type CampoErro = string | undefined;

export type ResultadoValidacao<T extends string = string> = {
  ok: boolean;
  erros: Partial<Record<T, string>>;
  /** Primeira mensagem útil para toast */
  mensagem: string;
};

const LIMITE = {
  nomenclatura: { min: 2, max: 120 },
  ghe: { min: 2, max: 120 },
  razaoSocial: { min: 2, max: 180 },
  nomeContato: { max: 120 },
  email: { max: 180 },
} as const;

export function normalizarTexto(raw: string | null | undefined): string {
  return String(raw ?? '').trim().replace(/\s+/g, ' ');
}

function nomeIgual(a: string, b: string): boolean {
  return normalizarTexto(a).toLocaleLowerCase('pt-BR') === normalizarTexto(b).toLocaleLowerCase('pt-BR');
}

function montarResultado<T extends string>(erros: Partial<Record<T, string>>): ResultadoValidacao<T> {
  const msgs = Object.values(erros).filter(Boolean) as string[];
  return {
    ok: msgs.length === 0,
    erros,
    mensagem: msgs[0] ?? 'Verifique os campos destacados.',
  };
}

/** Validação de cargo/função (nomenclatura + GHE). */
export function validarCadastroFuncao(input: {
  nomenclatura: string;
  ghe_id: string | null | undefined;
  /** Funções ativas do projeto (para checar duplicidade). */
  existentes?: Array<{ id?: string; nomenclatura?: string; ghe_id?: string | null }>;
  excluirId?: string | null;
}): ResultadoValidacao<'nomenclatura' | 'ghe_id'> {
  const erros: Partial<Record<'nomenclatura' | 'ghe_id', string>> = {};
  const nome = normalizarTexto(input.nomenclatura);

  if (!nome) {
    erros.nomenclatura = 'Nomenclatura obrigatória';
  } else if (nome.length < LIMITE.nomenclatura.min) {
    erros.nomenclatura = `Informe ao menos ${LIMITE.nomenclatura.min} caracteres`;
  } else if (nome.length > LIMITE.nomenclatura.max) {
    erros.nomenclatura = `Máximo de ${LIMITE.nomenclatura.max} caracteres`;
  }

  if (!input.ghe_id) {
    erros.ghe_id = 'GHE obrigatório';
  }

  if (!erros.nomenclatura && input.ghe_id && input.existentes?.length) {
    const duplicada = input.existentes.some(
      (f) =>
        f.id !== input.excluirId &&
        f.ghe_id === input.ghe_id &&
        nomeIgual(f.nomenclatura ?? '', nome),
    );
    if (duplicada) {
      erros.nomenclatura = 'Já existe uma função com este nome neste GHE';
    }
  }

  return montarResultado(erros);
}

/** Validação de GHE (descrição). */
export function validarCadastroGhe(input: {
  descricao: string;
  existentes?: Array<{ id?: string; descricao?: string }>;
  excluirId?: string | null;
}): ResultadoValidacao<'descricao'> {
  const erros: Partial<Record<'descricao', string>> = {};
  const nome = normalizarTexto(input.descricao);

  if (!nome) {
    erros.descricao = 'Descrição obrigatória';
  } else if (nome.length < LIMITE.ghe.min) {
    erros.descricao = `Informe ao menos ${LIMITE.ghe.min} caracteres`;
  } else if (nome.length > LIMITE.ghe.max) {
    erros.descricao = `Máximo de ${LIMITE.ghe.max} caracteres`;
  } else if (input.existentes?.length) {
    const duplicado = input.existentes.some(
      (g) => g.id !== input.excluirId && nomeIgual(g.descricao ?? '', nome),
    );
    if (duplicado) {
      erros.descricao = 'Já existe um GHE com esta descrição';
    }
  }

  return montarResultado(erros);
}

export type FornecedorCampos = {
  razao_social: string;
  nome_contato?: string;
  email_contato?: string;
  telefone_contato?: string;
};

/** Validação de fornecedor. */
export function validarCadastroFornecedor(
  input: FornecedorCampos & {
    existentes?: Array<{ id?: string; razao_social?: string }>;
    excluirId?: string | null;
  },
): ResultadoValidacao<'razao_social' | 'nome_contato' | 'email_contato' | 'telefone_contato'> {
  const erros: Partial<
    Record<'razao_social' | 'nome_contato' | 'email_contato' | 'telefone_contato', string>
  > = {};

  const razao = normalizarTexto(input.razao_social);
  const contato = normalizarTexto(input.nome_contato);
  const email = normalizarTexto(input.email_contato);

  if (!razao) {
    erros.razao_social = 'Razão social obrigatória';
  } else if (razao.length < LIMITE.razaoSocial.min) {
    erros.razao_social = `Informe ao menos ${LIMITE.razaoSocial.min} caracteres`;
  } else if (razao.length > LIMITE.razaoSocial.max) {
    erros.razao_social = `Máximo de ${LIMITE.razaoSocial.max} caracteres`;
  } else if (input.existentes?.length) {
    const duplicado = input.existentes.some(
      (f) => f.id !== input.excluirId && nomeIgual(f.razao_social ?? '', razao),
    );
    if (duplicado) {
      erros.razao_social = 'Já existe um fornecedor com esta razão social';
    }
  }

  if (contato.length > LIMITE.nomeContato.max) {
    erros.nome_contato = `Máximo de ${LIMITE.nomeContato.max} caracteres`;
  }

  if (!emailOpcionalValido(email)) {
    erros.email_contato = 'E-mail inválido';
  } else if (email.length > LIMITE.email.max) {
    erros.email_contato = `Máximo de ${LIMITE.email.max} caracteres`;
  }

  if (!telefoneBrOpcionalValido(input.telefone_contato)) {
    erros.telefone_contato = 'Telefone inválido (DDD + número)';
  }

  return montarResultado(erros);
}

/** Payload normalizado para persistência de fornecedor. */
export function normalizarFornecedor(input: FornecedorCampos): FornecedorCampos {
  return {
    razao_social: normalizarTexto(input.razao_social),
    nome_contato: normalizarTexto(input.nome_contato),
    email_contato: normalizarTexto(input.email_contato).toLowerCase(),
    telefone_contato: normalizarTexto(input.telefone_contato),
  };
}

const LIMITE_FORNECIMENTO = {
  ca: { min: 4, max: 10 },
  observacao: { max: 500 },
  quantidade: { min: 1, max: 9999 },
} as const;

export type CampoFornecimentoEpi =
  | 'colaborador_id'
  | 'epi_id'
  | 'quantidade'
  | 'data_fornecimento'
  | 'motivo_acao'
  | 'ca_numero'
  | 'observacao';

/** Validação do formulário principal de fornecimento de EPI. */
export function validarFornecimentoEpi(input: {
  colaborador_id: string | null | undefined;
  epi_id: string | null | undefined;
  quantidade: number | null | undefined;
  data_fornecimento: Date | null | undefined;
  motivo_acao: string | null | undefined;
  emergencial?: boolean;
  ca_numero: string | null | undefined;
  obrigatorio_ca?: boolean;
  observacao?: string | null;
  estoqueAtual?: number | null;
  controleEstoqueAtivo?: boolean;
}): ResultadoValidacao<CampoFornecimentoEpi> {
  const erros: Partial<Record<CampoFornecimentoEpi, string>> = {};

  if (!input.colaborador_id) erros.colaborador_id = 'Colaborador obrigatório';
  if (!input.epi_id) erros.epi_id = 'Equipamento obrigatório';

  if (!input.data_fornecimento) {
    erros.data_fornecimento = 'Data obrigatória';
  } else if (Number.isNaN(input.data_fornecimento.getTime())) {
    erros.data_fornecimento = 'Data inválida';
  }

  const qtd = input.quantidade;
  if (qtd == null || Number.isNaN(Number(qtd))) {
    erros.quantidade = 'Quantidade obrigatória';
  } else if (Number(qtd) < LIMITE_FORNECIMENTO.quantidade.min) {
    erros.quantidade = `Mínimo ${LIMITE_FORNECIMENTO.quantidade.min}`;
  } else if (Number(qtd) > LIMITE_FORNECIMENTO.quantidade.max) {
    erros.quantidade = `Máximo ${LIMITE_FORNECIMENTO.quantidade.max}`;
  }
  // Estoque negativo é permitido: o saldo pode ficar abaixo de zero no fornecimento.

  const motivo = normalizarTexto(input.motivo_acao);
  if (!input.emergencial && !motivo) {
    erros.motivo_acao = 'Motivo obrigatório';
  }

  const ca = String(input.ca_numero ?? '').replace(/\D/g, '');
  if (input.obrigatorio_ca) {
    if (!ca) {
      erros.ca_numero = 'CA obrigatório para este EPI';
    } else if (ca.length < LIMITE_FORNECIMENTO.ca.min || ca.length > LIMITE_FORNECIMENTO.ca.max) {
      erros.ca_numero = `CA deve ter entre ${LIMITE_FORNECIMENTO.ca.min} e ${LIMITE_FORNECIMENTO.ca.max} dígitos`;
    }
  } else if (ca && (ca.length < LIMITE_FORNECIMENTO.ca.min || ca.length > LIMITE_FORNECIMENTO.ca.max)) {
    erros.ca_numero = `CA deve ter entre ${LIMITE_FORNECIMENTO.ca.min} e ${LIMITE_FORNECIMENTO.ca.max} dígitos`;
  }

  const obs = String(input.observacao ?? '');
  if (obs.length > LIMITE_FORNECIMENTO.observacao.max) {
    erros.observacao = `Máximo ${LIMITE_FORNECIMENTO.observacao.max} caracteres`;
  }

  return montarResultado(erros);
}

export const CADASTRO_LIMITES = { ...LIMITE, fornecimento: LIMITE_FORNECIMENTO };
