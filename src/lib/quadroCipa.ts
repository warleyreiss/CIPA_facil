import type { MembroCipa } from './gestaoCipaService';

export type GrauRisco = 1 | 2 | 3 | 4;

type Faixa = {
  min: number;
  max: number;
  efetivos: (number | null)[];
  suplentes: (number | null)[];
};

/** Quadro I da NR-05 (Portaria MTP nº 422/2021). O número é de cada lado: empregados e organização. Célula vazia é representante designado. */
const FAIXAS: Faixa[] = [
  { min: 0, max: 19, efetivos: [null, null, null, null], suplentes: [null, null, null, null] },
  { min: 20, max: 29, efetivos: [null, null, 1, 1], suplentes: [null, null, 1, 1] },
  { min: 30, max: 50, efetivos: [null, null, 1, 2], suplentes: [null, null, 1, 1] },
  { min: 51, max: 80, efetivos: [null, 1, 2, 3], suplentes: [null, 1, 1, 2] },
  { min: 81, max: 100, efetivos: [1, 1, 2, 3], suplentes: [1, 1, 1, 2] },
  { min: 101, max: 120, efetivos: [1, 2, 2, 4], suplentes: [1, 1, 1, 2] },
  { min: 121, max: 140, efetivos: [1, 2, 3, 4], suplentes: [1, 1, 2, 2] },
  { min: 141, max: 300, efetivos: [1, 3, 4, 4], suplentes: [1, 2, 2, 3] },
  { min: 301, max: 500, efetivos: [2, 4, 5, 5], suplentes: [2, 3, 4, 4] },
  { min: 501, max: 1000, efetivos: [4, 5, 6, 6], suplentes: [3, 4, 4, 5] },
  { min: 1001, max: 2500, efetivos: [5, 6, 8, 9], suplentes: [4, 5, 6, 7] },
  { min: 2501, max: 5000, efetivos: [6, 8, 10, 11], suplentes: [5, 6, 8, 8] },
  { min: 5001, max: 10000, efetivos: [8, 10, 12, 13], suplentes: [6, 8, 8, 10] },
];

const ACRESCIMO_EFETIVOS = [1, 1, 2, 2];
const ACRESCIMO_SUPLENTES = [1, 1, 2, 2];

export type QuadroCipa = {
  modo: 'indefinido' | 'designado' | 'cipa';
  efetivosPorLado: number | null;
  suplentesPorLado: number | null;
  titularesPermitidos: number | null;
};

export type PorteSalvo = {
  empregados: number | null;
  grau: number | null;
  efetivos: number | null;
  /** true quando dimensionamento_editado_usuario está marcado no projeto. */
  manual: boolean;
  /** Colaboradores e grau com que o mandato atual começou. */
  mandato?: { empregados: number | null; grau: number | null } | null;
};

/**
 * NR-05: a CIPA não pode ter o número de representantes reduzido antes do fim do mandato,
 * salvo encerramento das atividades do estabelecimento. Um quadro menor só vale na próxima eleição.
 */
export function quadroVigente(
  calculado: QuadroCipa,
  mandato: { empregados: number | null; grau: number | null } | null | undefined,
  fimMandato: string | null | undefined,
  hojeIso: string,
): { quadro: QuadroCipa; preservado: boolean } {
  if (!mandato || !fimMandato || fimMandato < hojeIso) return { quadro: calculado, preservado: false };
  const doMandato = dimensionarCipa(mandato.empregados, mandato.grau);
  if (doMandato.modo === 'indefinido') return { quadro: calculado, preservado: false };
  if ((doMandato.titularesPermitidos ?? 0) > (calculado.titularesPermitidos ?? 0)) {
    return { quadro: doMandato, preservado: true };
  }
  return { quadro: calculado, preservado: false };
}

function numeroOuNulo(valor: unknown): number | null {
  if (valor == null || valor === '') return null;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

/** Lê o porte das colunas do projeto. Se elas ainda não existirem, usa o texto guardado em cipa_maturidade. */
export function porteDoRegistro(data: {
  quantidade_empregados?: number | null;
  grau_risco?: number | null;
  dimensionamento_efetivos?: number | null;
  dimensionamento_editado_usuario?: boolean | null;
  quadro_mandato_empregados?: number | null;
  quadro_mandato_grau?: number | null;
  cipa_maturidade?: string | null;
} | null): PorteSalvo {
  const vazio = { empregados: null, grau: null, efetivos: null, manual: false };
  if (!data) return vazio;
  const empregados = numeroOuNulo(data.quantidade_empregados);
  const grau = numeroOuNulo(data.grau_risco);
  const efetivos = numeroOuNulo(data.dimensionamento_efetivos);
  const manual = data.dimensionamento_editado_usuario === true;
  const mandatoEmpregados = numeroOuNulo(data.quadro_mandato_empregados);
  const mandatoGrau = numeroOuNulo(data.quadro_mandato_grau);
  const mandato = mandatoEmpregados != null && mandatoGrau != null
    ? { empregados: mandatoEmpregados, grau: mandatoGrau }
    : null;
  if (empregados != null || grau != null || efetivos != null) return { empregados, grau, efetivos, manual, mandato };
  const texto = data.cipa_maturidade;
  if (!texto?.startsWith('porte:')) return vazio;
  try {
    const json = JSON.parse(texto.slice(6)) as { empregados?: unknown; grau?: unknown; efetivos?: unknown };
    return {
      empregados: numeroOuNulo(json.empregados),
      grau: numeroOuNulo(json.grau),
      efetivos: numeroOuNulo(json.efetivos),
      manual,
    };
  } catch {
    return vazio;
  }
}

export function maturidadeDoPorte(porte: PorteSalvo): string {
  return `porte:${JSON.stringify({ empregados: porte.empregados, grau: porte.grau, efetivos: porte.efetivos })}`;
}

export function dimensionarCipa(empregados: number | null | undefined, grau: number | null | undefined): QuadroCipa {
  if (empregados == null || !Number.isFinite(empregados) || empregados < 0 || grau == null || grau < 1 || grau > 4) {
    return { modo: 'indefinido', efetivosPorLado: null, suplentesPorLado: null, titularesPermitidos: null };
  }
  const indice = grau - 1;
  if (empregados > 10000) {
    const base = FAIXAS[FAIXAS.length - 1];
    const grupos = Math.ceil((empregados - 10000) / 2500);
    const efetivos = (base.efetivos[indice] ?? 0) + grupos * ACRESCIMO_EFETIVOS[indice];
    const suplentes = (base.suplentes[indice] ?? 0) + grupos * ACRESCIMO_SUPLENTES[indice];
    return { modo: 'cipa', efetivosPorLado: efetivos, suplentesPorLado: suplentes, titularesPermitidos: efetivos * 2 };
  }
  const faixa = FAIXAS.find((item) => empregados >= item.min && empregados <= item.max) ?? FAIXAS[0];
  const efetivos = faixa.efetivos[indice];
  const suplentes = faixa.suplentes[indice];
  if (efetivos == null) {
    return { modo: 'designado', efetivosPorLado: 0, suplentesPorLado: 0, titularesPermitidos: 0 };
  }
  return { modo: 'cipa', efetivosPorLado: efetivos, suplentesPorLado: suplentes, titularesPermitidos: efetivos * 2 };
}

export function funcoesDaRepresentacao(representacao: MembroCipa['representacao']) {
  if (representacao === 'empregados') {
    return [
      { label: 'Membro', value: 'membro' as const },
      { label: 'Vice-presidente', value: 'vice' as const },
    ];
  }
  return [
    { label: 'Membro', value: 'membro' as const },
    { label: 'Presidente', value: 'presidente' as const },
  ];
}

export function funcaoPermitida(representacao: MembroCipa['representacao'], funcao: MembroCipa['funcao']): boolean {
  return funcoesDaRepresentacao(representacao).some((item) => item.value === funcao);
}

export function mensagemFuncao(representacao: MembroCipa['representacao']): string {
  if (representacao === 'empregados') {
    return 'Quem representa os empregados não pode ser presidente. O vice-presidente é escolhido nesse grupo.';
  }
  return 'Quem representa a organização não pode ser vice-presidente. O presidente é designado por esse lado.';
}

function ocupaCargo(item: MembroCipa, ignorarIds: string[]): boolean {
  return item.situacao !== 'encerrado' && !ignorarIds.includes(item.id);
}

/** Impede vaga duplicada: um presidente, um vice, e o limite de titulares e suplentes de cada lado. */
export function validarMembroComissao(
  membro: Pick<MembroCipa, 'nome' | 'representacao' | 'condicao' | 'funcao' | 'inicio_mandato' | 'fim_mandato' | 'situacao'>,
  comissao: MembroCipa[],
  quadro: QuadroCipa,
  ignorarIds: string[] = [],
): Record<string, string> {
  const novos: Record<string, string> = {};
  if (!membro.nome.trim()) novos['membro-nome'] = 'Informe o nome.';
  if (!funcaoPermitida(membro.representacao, membro.funcao)) {
    novos['membro-funcao'] = mensagemFuncao(membro.representacao);
  }
  if ((membro.funcao === 'presidente' || membro.funcao === 'vice') && membro.condicao !== 'titular') {
    novos['membro-condicao'] = membro.funcao === 'presidente'
      ? 'O presidente precisa ser titular da organização.'
      : 'O vice-presidente precisa ser titular dos empregados.';
  }
  if (!membro.inicio_mandato) novos['membro-inicio'] = 'Informe o início do mandato.';
  if (!membro.fim_mandato) novos['membro-fim'] = 'Informe o fim do mandato.';
  else if (membro.inicio_mandato && membro.fim_mandato < membro.inicio_mandato) {
    novos['membro-fim'] = 'O fim precisa ser igual ou posterior ao início.';
  }

  if (membro.situacao !== 'encerrado' && membro.funcao === 'presidente' && comissao.some((item) => ocupaCargo(item, ignorarIds) && item.funcao === 'presidente')) {
    novos['membro-funcao'] = 'Já existe um presidente. Substitua essa pessoa em vez de cadastrar outro.';
  }
  if (membro.situacao !== 'encerrado' && membro.funcao === 'vice' && comissao.some((item) => ocupaCargo(item, ignorarIds) && item.funcao === 'vice')) {
    novos['membro-funcao'] = 'Já existe um vice-presidente. Substitua essa pessoa em vez de cadastrar outro.';
  }

  const ativos = comissao.filter((item) => item.situacao === 'em_exercicio' && !ignorarIds.includes(item.id));
  if (membro.situacao === 'em_exercicio' && membro.condicao === 'titular' && quadro.titularesPermitidos != null) {
    const titularesDepois = ativos.filter((item) => item.condicao === 'titular').length + 1;
    const ladoDepois = ativos.filter((item) => item.condicao === 'titular' && item.representacao === membro.representacao).length + 1;
    if (titularesDepois > quadro.titularesPermitidos || (quadro.efetivosPorLado != null && ladoDepois > quadro.efetivosPorLado)) {
      novos['membro-condicao'] = quadro.modo === 'designado'
        ? 'Este porte pede um representante designado, não mais um titular.'
        : `O quadro comporta ${quadro.titularesPermitidos} titulares, ${quadro.efetivosPorLado} de cada lado.`;
    }
  }
  if (membro.situacao === 'em_exercicio' && membro.condicao === 'suplente' && quadro.suplentesPorLado != null) {
    const suplentesLado = ativos.filter((item) => item.condicao === 'suplente' && item.representacao === membro.representacao).length + 1;
    if (suplentesLado > quadro.suplentesPorLado) {
      novos['membro-condicao'] = quadro.suplentesPorLado === 0
        ? 'Este porte não abre vaga de suplente.'
        : `Este lado comporta ${quadro.suplentesPorLado} suplente(s).`;
    }
  }
  return novos;
}

export function textoQuadro(quadro: QuadroCipa, titulares: number): { titulo: string; texto: string } {
  if (quadro.modo === 'indefinido') {
    return {
      titulo: 'Ainda não dá para medir o quadro',
      texto: 'O projeto não informa quantos empregados o estabelecimento tem, nem o grau de risco. Se a equipe cresceu ou a atividade mudou, atualize esses dois dados. A partir deles a NR-05 diz quantos titulares cabem.',
    };
  }
  if (quadro.modo === 'designado') {
    return {
      titulo: titulares > 0 ? 'Este porte pede um representante, não uma comissão cheia' : 'Aqui cabe um representante designado',
      texto: titulares > 0
        ? `Há ${titulares} titular(es) em exercício, mas com esse número de empregados e esse grau de risco a NR-05 não abre uma CIPA completa. Se os colaboradores aumentaram ou o grau de risco é outro, revise na configuração do projeto.`
        : 'Com esse número de empregados e esse grau de risco, a norma pede um representante designado. Se a equipe ou o risco mudaram, o quadro pode passar a pedir titulares.',
    };
  }
  const permitido = quadro.titularesPermitidos ?? 0;
  const porLado = quadro.efetivosPorLado ?? 0;
  if (titulares > permitido) {
    return {
      titulo: 'Os titulares passaram do quadro',
      texto: `O Quadro I comporta ${permitido} titulares, ${porLado} da organização e ${porLado} dos empregados. Hoje há ${titulares}. Se o estabelecimento ganhou gente ou o grau de risco subiu, ajuste isso na configuração do projeto e o limite acompanha.`,
    };
  }
  return {
    titulo: 'Quadro de titulares',
    texto: `Cabem ${permitido} titulares, ${porLado} de cada lado. Há ${titulares} em exercício. Se o número de empregados ou o grau de risco mudou, a configuração do projeto recalcula esse limite.`,
  };
}

export function avaliarQuadro(quadro: QuadroCipa, titulares: number): { peso: number; rotulo: string } {
  if (quadro.modo === 'indefinido') {
    return {
      peso: titulares > 0 ? 0.35 : 0,
      rotulo: 'Quadro a configurar',
    };
  }
  if (quadro.modo === 'designado') {
    return {
      peso: titulares === 0 ? 0.5 : 0.15,
      rotulo: titulares === 0 ? 'Representante designado' : 'Titulares acima do quadro',
    };
  }
  const permitido = quadro.titularesPermitidos ?? 0;
  if (permitido <= 0) return { peso: 0, rotulo: 'Quadro a configurar' };
  if (titulares > permitido) return { peso: 0.15, rotulo: 'Titulares acima do quadro' };
  if (titulares === permitido) return { peso: 1, rotulo: 'Quadro de titulares completo' };
  if (titulares === 0) return { peso: 0, rotulo: 'Sem titulares' };
  return { peso: Math.round((titulares / permitido) * 100) / 100, rotulo: 'Quadro de titulares incompleto' };
}
