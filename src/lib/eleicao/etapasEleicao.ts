/** Prazos da NR-05 (texto de 2023, itens 5.4, 5.5 e 5.7). */

export type CodigoEtapa =
  | 'iniciar_processo'
  | 'comunicar_sindicato'
  | 'edital_convocacao'
  | 'comissao_eleitoral'
  | 'edital_inscricao'
  | 'lista_inscricao'
  | 'lista_inscritos'
  | 'comprovante_voto'
  | 'realizacao_eleicao'
  | 'lista_presenca_apuracao'
  | 'registro_apuracao'
  | 'ata_divulgacao'
  | 'reuniao_treinamento'
  | 'lista_treinamento'
  | 'ata_posse'
  | 'recibo_entrega';

export type EtapaDefinicao = {
  codigo: CodigoEtapa;
  ordem: number;
  titulo: string;
  norma: string;
  /** Dias em relação ao término do mandato. Negativo = antes. */
  diasAntesDoTermino: number | null;
  /** Posse: primeiro dia útil depois do término. */
  posse: boolean;
  explica: string;
};

export const ETAPAS: EtapaDefinicao[] = [
  {
    codigo: 'iniciar_processo',
    ordem: 1,
    titulo: 'Iniciar o processo eleitoral',
    norma: 'NR-05, item 5.5.1',
    diasAntesDoTermino: 60,
    posse: false,
    explica: 'O empregador convoca a eleição no prazo mínimo de 60 dias antes do término do mandato em curso.',
  },
  {
    codigo: 'comunicar_sindicato',
    ordem: 2,
    titulo: 'Comunicar o sindicato da categoria',
    norma: 'NR-05, item 5.5.1.1',
    diasAntesDoTermino: 60,
    posse: false,
    explica: 'Comunique o início do processo ao sindicato da categoria preponderante, com antecedência e confirmação de entrega. Pode ser por meio eletrônico.',
  },
  {
    codigo: 'edital_convocacao',
    ordem: 3,
    titulo: 'Edital de convocação da eleição',
    norma: 'NR-05, item 5.5.3, alínea "a"',
    diasAntesDoTermino: 60,
    posse: false,
    explica: 'Publique e divulgue o edital em local de fácil acesso, em papel ou meio eletrônico.',
  },
  {
    codigo: 'comissao_eleitoral',
    ordem: 4,
    titulo: 'Ata de constituição da comissão eleitoral',
    norma: 'NR-05, item 5.5.2',
    diasAntesDoTermino: 55,
    posse: false,
    explica: 'Presidente e vice-presidente constituem a comissão entre os membros da CIPA. Se ainda não houver CIPA, a organização constitui a comissão.',
  },
  {
    codigo: 'edital_inscricao',
    ordem: 5,
    titulo: 'Edital de inscrição',
    norma: 'NR-05, item 5.5.3, alíneas "a" e "b"',
    diasAntesDoTermino: 50,
    posse: false,
    explica: 'Abra o prazo de inscrição. O período mínimo é de 15 dias corridos. A inscrição é individual e livre para todos os empregados do estabelecimento.',
  },
  {
    codigo: 'lista_inscricao',
    ordem: 6,
    titulo: 'Lista de inscrição individual',
    norma: 'NR-05, item 5.5.3, alínea "c"',
    diasAntesDoTermino: 50,
    posse: false,
    explica: 'Entregue comprovante de inscrição, em papel ou meio eletrônico. O empregado inscrito tem garantia de emprego até a eleição.',
  },
  {
    codigo: 'lista_inscritos',
    ordem: 7,
    titulo: 'Lista dos inscritos',
    norma: 'NR-05, item 5.5.3, alínea "e"',
    diasAntesDoTermino: 35,
    posse: false,
    explica: 'Depois dos 15 dias de inscrição, publique a relação dos inscritos em local de fácil acesso.',
  },
  {
    codigo: 'realizacao_eleicao',
    ordem: 8,
    titulo: 'Realização da eleição',
    norma: 'NR-05, item 5.5.3, alíneas "f", "g", "h" e "j"',
    diasAntesDoTermino: 30,
    posse: false,
    explica: 'A votação ocorre no mínimo 30 dias antes do término do mandato, em dia normal de trabalho, com voto secreto e horário que permita a participação da maioria.',
  },
  {
    codigo: 'comprovante_voto',
    ordem: 9,
    titulo: 'Comprovante de voto',
    norma: 'NR-05, item 5.5.3, alínea "j"',
    diasAntesDoTermino: 30,
    posse: false,
    explica: 'O registro do voto precisa ser seguro, confidencial e preciso. Entregue comprovante a quem votou.',
  },
  {
    codigo: 'lista_presenca_apuracao',
    ordem: 10,
    titulo: 'Lista de presença da apuração',
    norma: 'NR-05, item 5.5.3, alínea "i"',
    diasAntesDoTermino: 30,
    posse: false,
    explica: 'A apuração é em horário normal de trabalho, com representante da organização e dos empregados. Os candidatos podem acompanhar.',
  },
  {
    codigo: 'registro_apuracao',
    ordem: 11,
    titulo: 'Registro da apuração dos votos',
    norma: 'NR-05, itens 5.5.4, 5.5.6 e 5.5.7',
    diasAntesDoTermino: 30,
    posse: false,
    explica: 'Se votarem menos de 50% no primeiro dia, não apure: prorrogue para o dia seguinte. No segundo dia, vale com pelo menos um terço. No terceiro, vale com qualquer número. Empate: fica quem tem mais tempo de serviço.',
  },
  {
    codigo: 'ata_divulgacao',
    ordem: 12,
    titulo: 'Ata de divulgação do resultado',
    norma: 'NR-05, itens 5.5.5 e 5.5.8',
    diasAntesDoTermino: 29,
    posse: false,
    explica: 'Divulgue titulares, suplentes e a lista dos não eleitos, em ordem de votos. Denúncia sobre o processo pode ser feita em até 30 dias depois desta divulgação.',
  },
  {
    codigo: 'reuniao_treinamento',
    ordem: 13,
    titulo: 'Ata da reunião que define o treinamento',
    norma: 'NR-05, item 5.7.1',
    diasAntesDoTermino: 10,
    posse: false,
    explica: 'Registre em ata qual entidade vai ministrar o treinamento. Titulares e suplentes devem ser treinados antes da posse. No primeiro mandato, o prazo máximo é de 30 dias depois da posse.',
  },
  {
    codigo: 'lista_treinamento',
    ordem: 14,
    titulo: 'Lista de presença do treinamento',
    norma: 'NR-05, itens 5.7.1 e 5.7.2',
    diasAntesDoTermino: 7,
    posse: false,
    explica: 'O treinamento ocorre antes da posse e inclui prevenção de acidentes, assédio e as atribuições da CIPA.',
  },
  {
    codigo: 'ata_posse',
    ordem: 15,
    titulo: 'Ata de instalação e posse',
    norma: 'NR-05, itens 5.4.5 e 5.4.7',
    diasAntesDoTermino: null,
    posse: true,
    explica: 'A posse é no primeiro dia útil depois do término do mandato anterior. A organização designa o presidente. Os eleitos escolhem o vice-presidente entre os titulares.',
  },
  {
    codigo: 'recibo_entrega',
    ordem: 16,
    titulo: 'Recibo de entrega da ata aos membros',
    norma: 'NR-05, itens 5.4.8 e 5.4.9',
    diasAntesDoTermino: null,
    posse: true,
    explica: 'Entregue cópia das atas de eleição e de posse a titulares e suplentes. Se o sindicato pedir, encaminhe a documentação em até 10 dias.',
  },
];

export function somarUmAno(dataIso: string): string {
  const data = lerData(dataIso);
  return isoData(new Date(data.getFullYear() + 1, data.getMonth(), data.getDate()));
}

export function somarDias(data: Date, dias: number): Date {
  const copia = new Date(data.getFullYear(), data.getMonth(), data.getDate());
  copia.setDate(copia.getDate() + dias);
  return copia;
}

export function primeiroDiaUtilDepois(data: Date): Date {
  const dia = somarDias(data, 1);
  const semana = dia.getDay();
  if (semana === 6) return somarDias(dia, 2);
  if (semana === 0) return somarDias(dia, 1);
  return dia;
}

/** Dias em relação à posse na primeira CIPA. Negativo = antes. O treinamento é depois. */
export const DIAS_DA_POSSE_PRIMEIRA: Record<CodigoEtapa, number> = {
  iniciar_processo: -32,
  comunicar_sindicato: -32,
  edital_convocacao: -32,
  comissao_eleitoral: -30,
  edital_inscricao: -25,
  lista_inscricao: -25,
  lista_inscritos: -10,
  realizacao_eleicao: -8,
  comprovante_voto: -8,
  lista_presenca_apuracao: -8,
  registro_apuracao: -8,
  ata_divulgacao: -7,
  reuniao_treinamento: 10,
  lista_treinamento: 20,
  ata_posse: 0,
  recibo_entrega: 0,
};

const EXPLICA_PRIMEIRA: Partial<Record<CodigoEtapa, string>> = {
  iniciar_processo: 'Não há mandato anterior. A organização abre o processo e as etapas correm até a posse escolhida. Os 60 dias do item 5.5.1 valem só quando já existe mandato.',
  comissao_eleitoral: 'Como ainda não há CIPA, a organização constitui a comissão eleitoral (NR-05, item 5.5.2.1).',
  realizacao_eleicao: 'Na primeira CIPA não existe o prazo de 30 dias antes do fim do mandato. A votação fica pouco antes da posse, depois dos 15 dias de inscrição.',
  reuniao_treinamento: 'No primeiro mandato o treinamento pode ocorrer até 30 dias depois da posse (NR-05, item 5.7.1.1).',
  lista_treinamento: 'O treinamento do primeiro mandato inclui prevenção de acidentes, assédio e as atribuições da CIPA, e pode ser depois da posse.',
  ata_posse: 'A posse é a data escolhida para começar o mandato. Não há mandato anterior para encerrar no dia útil seguinte.',
};

export function explicaEtapa(etapa: EtapaDefinicao, primeira: boolean): string {
  if (!primeira) return etapa.explica;
  return EXPLICA_PRIMEIRA[etapa.codigo] ?? etapa.explica;
}

export function dataDaEtapa(ancora: Date, etapa: EtapaDefinicao, primeira = false): Date {
  if (primeira) return somarDias(ancora, DIAS_DA_POSSE_PRIMEIRA[etapa.codigo]);
  if (etapa.posse) return primeiroDiaUtilDepois(ancora);
  return somarDias(ancora, -(etapa.diasAntesDoTermino ?? 0));
}

export function ehImplantacao(emAndamento: boolean | null, inicio: string | null, hoje = new Date()): boolean {
  if (emAndamento !== false || !inicio) return false;
  return diasAte(inicio, hoje) > 0;
}

export function emTreinamentoPrimeiroMandato(emAndamento: boolean | null, inicio: string | null, hoje = new Date()): boolean {
  if (emAndamento !== false || !inicio) return false;
  const dias = diasAte(inicio, hoje);
  return dias <= 0 && dias >= -30;
}

export function isoData(data: Date): string {
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${mes}-${dia}`;
}

export function lerData(valor: string): Date {
  const [ano, mes, dia] = valor.slice(0, 10).split('-').map(Number);
  return new Date(ano, mes - 1, dia);
}

export function formatarDataBr(valor: string): string {
  const data = lerData(valor);
  return data.toLocaleDateString('pt-BR');
}

/** O card abre quando faltam 5 dias ou menos para a data da etapa. */
export function etapaLiberada(dataIso: string, hoje = new Date()): boolean {
  const limite = somarDias(lerData(dataIso), -5);
  const agora = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  return agora >= limite;
}

export function diasAte(dataIso: string, hoje = new Date()): number {
  const alvo = lerData(dataIso).getTime();
  const agora = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).getTime();
  return Math.round((alvo - agora) / 86400000);
}
