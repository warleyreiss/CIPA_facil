import type { Eleicao, EtapaEleicao } from '../eleicaoService';
import {
  diasAte,
  etapaLiberada,
  formatarDataBr,
  isoData,
  lerData,
  primeiroDiaUtilDepois,
  somarDias,
  somarUmAno,
} from './etapasEleicao';

export type GrupoAcao = 'validade' | 'eleicao' | 'habitual';

export type AcaoStatus = {
  id: string;
  grupo: GrupoAcao;
  titulo: string;
  detalhe: string;
  quando: string;
  prazo: string;
  urgente: boolean;
  destino: string;
};

export type VigenciaCipa = {
  inicio: string;
  fim: string;
  diasRestantes: number;
  limiteEleicao: string;
  diasParaLimite: number;
  /** Primeira CIPA: ainda não há mandato. O limite é a abertura do processo, não os 60 dias. */
  implantacao: boolean;
};

export type IndicadoresGestao = {
  diasVigencia: number | null;
  etapasTotal: number;
  etapasConcluidas: number;
  etapasAtrasadas: number;
  etapasProximas: number;
  progresso: number;
};

function subtrairUmAno(dataIso: string): string {
  const data = lerData(dataIso);
  return isoData(new Date(data.getFullYear() - 1, data.getMonth(), data.getDate()));
}

export function vigenciaPorDatas(
  inicio: string | null,
  fim: string | null,
  hoje = new Date(),
  implantacao = false,
): VigenciaCipa | null {
  if (implantacao && inicio) {
    const abertura = isoData(somarDias(lerData(inicio), -32));
    return {
      inicio,
      fim: fim || somarUmAno(inicio),
      diasRestantes: diasAte(inicio, hoje),
      limiteEleicao: abertura,
      diasParaLimite: diasAte(abertura, hoje),
      implantacao: true,
    };
  }
  if (!fim) return null;
  const inicioReal = inicio || isoData(primeiroDiaUtilDepois(lerData(subtrairUmAno(fim))));
  const limite = isoData(somarDias(lerData(fim), -60));
  return {
    inicio: inicioReal,
    fim,
    diasRestantes: diasAte(fim, hoje),
    limiteEleicao: limite,
    diasParaLimite: diasAte(limite, hoje),
    implantacao: false,
  };
}

export function vigenciaDaCipa(
  eleicoes: Eleicao[],
  mandato?: { inicio: string | null; fim: string | null },
  hoje = new Date(),
  implantacao = false,
): VigenciaCipa | null {
  if (implantacao) return vigenciaPorDatas(mandato?.inicio ?? null, mandato?.fim ?? null, hoje, true);
  const andamento = eleicoes.find((item) => item.status === 'em_andamento' && !item.primeira);
  const ultima = eleicoes.find((item) => item.status === 'concluida');
  const fim = andamento
    ? andamento.data_termino_mandato
    : ultima
      ? somarUmAno(ultima.data_termino_mandato)
      : null;
  if (!fim) return vigenciaPorDatas(mandato?.inicio ?? null, mandato?.fim ?? null, hoje);

  const inicio = isoData(primeiroDiaUtilDepois(lerData(subtrairUmAno(fim))));
  const limite = isoData(somarDias(lerData(fim), -60));
  return {
    inicio,
    fim,
    diasRestantes: diasAte(fim, hoje),
    limiteEleicao: limite,
    diasParaLimite: diasAte(limite, hoje),
    implantacao: false,
  };
}

function textoQuando(dataIso: string): string {
  const falta = diasAte(dataIso);
  if (falta < 0) return `Venceu em ${formatarDataBr(dataIso)}`;
  if (falta === 0) return 'Hoje';
  return `${formatarDataBr(dataIso)} · em ${falta} dia(s)`;
}

export function acoesDoPainel(
  vigencia: VigenciaCipa | null,
  andamento: Eleicao | null,
  etapas: EtapaEleicao[],
  hoje = new Date(),
): AcaoStatus[] {
  const acoes: AcaoStatus[] = [];
  const implantacao = Boolean(vigencia?.implantacao || andamento?.primeira);

  if (implantacao && vigencia) {
    if (vigencia.diasRestantes < 0) {
      acoes.push({
        id: 'posse-passou',
        grupo: 'validade',
        titulo: 'A data da posse da primeira CIPA já passou',
        detalhe: 'Registre quem tomou posse. O treinamento deste primeiro mandato pode ser feito até 30 dias depois da posse.',
        quando: textoQuando(vigencia.inicio),
        prazo: vigencia.inicio,
        urgente: true,
        destino: 'processo',
      });
    } else if (!andamento && vigencia.diasParaLimite <= 0) {
      acoes.push({
        id: 'abrir-primeira',
        grupo: 'validade',
        titulo: 'Abrir o processo da primeira CIPA',
        detalhe: 'Não há mandato anterior. A organização constitui a comissão eleitoral e conduz edital, inscrição e votação até a posse.',
        quando: textoQuando(vigencia.limiteEleicao),
        prazo: vigencia.limiteEleicao,
        urgente: true,
        destino: 'iniciar',
      });
    } else if (!andamento) {
      acoes.push({
        id: 'aguardar-abertura',
        grupo: 'validade',
        titulo: 'Acompanhar a abertura da primeira CIPA',
        detalhe: 'O processo começa antes da posse, sem os 60 dias de uma renovação. A comissão eleitoral é da organização.',
        quando: textoQuando(vigencia.limiteEleicao),
        prazo: vigencia.limiteEleicao,
        urgente: vigencia.diasParaLimite <= 15,
        destino: 'iniciar',
      });
    } else {
      acoes.push({
        id: 'primeira-andamento',
        grupo: 'validade',
        titulo: 'Primeira CIPA em constituição',
        detalhe: 'A votação não precisa ocorrer 30 dias antes de um mandato que ainda não existe. O treinamento pode ser até 30 dias depois da posse.',
        quando: textoQuando(vigencia.inicio),
        prazo: vigencia.inicio,
        urgente: vigencia.diasRestantes <= 15,
        destino: 'processo',
      });
    }
  } else if (!vigencia) {
    acoes.push({
      id: 'sem-vigencia',
      grupo: 'validade',
      titulo: 'Não há CIPA em vigência',
      detalhe: 'Inicie o processo eleitoral para constituir a comissão.',
      quando: 'Agora',
      prazo: isoData(hoje),
      urgente: true,
      destino: 'iniciar',
    });
  } else if (vigencia.diasRestantes < 0) {
    acoes.push({
      id: 'mandato-vencido',
      grupo: 'validade',
      titulo: 'Mandato da CIPA vencido',
      detalhe: 'A vigência terminou. A nova eleição deveria ter começado 60 dias antes.',
      quando: textoQuando(vigencia.fim),
      prazo: vigencia.fim,
      urgente: true,
      destino: andamento ? 'processo' : 'iniciar',
    });
  } else if (!andamento && vigencia.diasParaLimite <= 0) {
    acoes.push({
      id: 'abrir-eleicao',
      grupo: 'validade',
      titulo: 'Abrir o processo eleitoral',
      detalhe: 'A NR-05 exige convocar a eleição no mínimo 60 dias antes do término do mandato.',
      quando: textoQuando(vigencia.limiteEleicao),
      prazo: vigencia.limiteEleicao,
      urgente: true,
      destino: 'iniciar',
    });
  } else {
    acoes.push({
      id: 'vigencia-ok',
      grupo: 'validade',
      titulo: 'Acompanhar o vencimento do mandato',
      detalhe: 'A nova eleição deve ser convocada até 60 dias antes do término.',
      quando: textoQuando(vigencia.limiteEleicao),
      prazo: vigencia.limiteEleicao,
      urgente: vigencia.diasParaLimite <= 15,
      destino: 'vigencia',
    });
  }

  const pendentes = etapas
    .filter((etapa) => !etapa.concluida_em)
    .sort((a, b) => a.data_prevista.localeCompare(b.data_prevista));

  if (andamento && pendentes.length === 0) {
    acoes.push({
      id: 'eleicao-completa',
      grupo: 'eleicao',
      titulo: 'Cronograma eleitoral concluído',
      detalhe: 'Todas as etapas deste processo foram registradas.',
      quando: 'Em dia',
      prazo: isoData(hoje),
      urgente: false,
      destino: 'processo',
    });
  }

  pendentes.slice(0, 4).forEach((etapa) => {
    const atraso = diasAte(etapa.data_prevista, hoje) < 0;
    acoes.push({
      id: etapa.id,
      grupo: 'eleicao',
      titulo: etapa.titulo,
      detalhe: etapaLiberada(etapa.data_prevista, hoje)
        ? 'Etapa liberada. Abra para ver o modelo e registrar.'
        : 'Fica disponível 5 dias antes da data.',
      quando: textoQuando(etapa.data_prevista),
      prazo: etapa.data_prevista,
      urgente: atraso || etapaLiberada(etapa.data_prevista, hoje),
      destino: `etapa:${etapa.id}`,
    });
  });

  if (!andamento) {
    acoes.push({
      id: 'sem-processo',
      grupo: 'eleicao',
      titulo: 'Nenhum processo eleitoral em andamento',
      detalhe: implantacao
        ? 'Na primeira CIPA o cronograma corre até a posse. A organização constitui a comissão eleitoral.'
        : 'O cronograma é criado ao iniciar o processo.',
      quando: vigencia ? textoQuando(vigencia.limiteEleicao) : 'Quando houver mandato',
      prazo: vigencia ? vigencia.limiteEleicao : isoData(hoje),
      urgente: false,
      destino: 'iniciar',
    });
  }

  if (implantacao && vigencia && vigencia.diasRestantes > 0) {
    const ordemAntes: GrupoAcao[] = ['validade', 'eleicao', 'habitual'];
    return acoes.sort((a, b) => ordemAntes.indexOf(a.grupo) - ordemAntes.indexOf(b.grupo));
  }

  const proximaReuniao = isoData(primeiroDiaUtilDepois(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)));
  acoes.push({
    id: 'reuniao-mensal',
    grupo: 'habitual',
    titulo: 'Reunião ordinária da CIPA',
    detalhe: 'A NR-05 pede reunião mensal, com ata assinada pelos presentes.',
    quando: textoQuando(proximaReuniao),
    prazo: proximaReuniao,
    urgente: false,
    destino: 'atividades',
  });

  if (vigencia) {
    const sipat = isoData(somarDias(lerData(vigencia.inicio), 180));
    acoes.push({
      id: 'sipat',
      grupo: 'habitual',
      titulo: 'SIPAT do mandato',
      detalhe: 'A CIPA promove, todo ano, a Semana Interna de Prevenção de Acidentes.',
      quando: textoQuando(sipat),
      prazo: sipat,
      urgente: diasAte(sipat, hoje) <= 30 && diasAte(sipat, hoje) >= 0,
      destino: 'atividades',
    });
  }

  const ordem: GrupoAcao[] = ['validade', 'eleicao', 'habitual'];
  return acoes.sort((a, b) => ordem.indexOf(a.grupo) - ordem.indexOf(b.grupo));
}

export function indicadoresDaGestao(
  vigencia: VigenciaCipa | null,
  etapas: EtapaEleicao[],
  hoje = new Date(),
): IndicadoresGestao {
  const concluidas = etapas.filter((etapa) => etapa.concluida_em).length;
  const atrasadas = etapas.filter(
    (etapa) => !etapa.concluida_em && diasAte(etapa.data_prevista, hoje) < 0,
  ).length;
  const proximas = etapas.filter(
    (etapa) => !etapa.concluida_em && etapaLiberada(etapa.data_prevista, hoje),
  ).length;
  return {
    diasVigencia: vigencia ? vigencia.diasRestantes : null,
    etapasTotal: etapas.length,
    etapasConcluidas: concluidas,
    etapasAtrasadas: atrasadas,
    etapasProximas: proximas,
    progresso: etapas.length === 0 ? 0 : Math.round((concluidas / etapas.length) * 100),
  };
}
