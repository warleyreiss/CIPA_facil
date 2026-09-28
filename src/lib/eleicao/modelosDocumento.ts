import type { CodigoEtapa } from './etapasEleicao';

function cabecalho(projeto: string, data: string) {
  return `${projeto || 'Estabelecimento'}\nCIPA — Comissão Interna de Prevenção de Acidentes e de Assédio\nData: ${data}\n\n`;
}

export function textoAtaComunicacao(projeto: string, data: string): string {
  return `${cabecalho(projeto, data)}ATA DE COMUNICAÇÃO\n\nRegistro do que foi comunicado, a quem e por qual meio.\n\nAssunto: ________________________________\nDestinatário: ________________________________\nMeio (quadro, e-mail ou outro): ________________________________\nConfirmação de entrega: ________________________________\n\nTexto da comunicação:\n\n________________________________\n\nResponsável: ________________________________\nData do envio: ____/____/________`;
}

export function textoAtaReuniao(projeto: string, data: string): string {
  return `${cabecalho(projeto, data)}ATA DE REUNIÃO DA CIPA\n\nItem 5.6 da NR-05. A ata é assinada pelos presentes e fica disponível aos integrantes.\n\nTipo: ordinária / extraordinária\nHorário: ________ às ________\nLocal: ________________________________\nSecretário da ata: ________________________________\n\nPresentes:\n1. ________________________________\n\nPauta:\n1. ________________________________\n\nDeliberações e encaminhamentos:\n\n________________________________\n\nAssinaturas: ________________________________`;
}

export function textoAtaConvocacao(projeto: string, data: string): string {
  return `${cabecalho(projeto, data)}ATA DE CONVOCAÇÃO\n\nItem 5.3.4 da NR-05. O presidente convoca os membros para a reunião.\n\nFicam convocados os membros da CIPA para reunião.\n\nData da reunião: ____/____/________\nHorário: ________\nLocal: ________________________________\nPauta: ________________________________\n\nConvocação feita por: ________________________________\nData desta convocação: ____/____/________`;
}

export function textoModelo(codigo: CodigoEtapa, projeto: string, data: string, primeira = false): string {
  const topo = cabecalho(projeto, data);

  const textos: Record<CodigoEtapa, string> = {
    iniciar_processo: `${topo}REGISTRO DE ABERTURA DO PROCESSO ELEITORAL\n\nNos termos do item 5.5.1 da NR-05, fica iniciado o processo eleitoral para escolha dos representantes dos empregados na CIPA, com antecedência mínima de 60 dias do término do mandato em curso.\n\nResponsável: ________________________________\nData: ____/____/________`,
    comunicar_sindicato: `${topo}COMUNICAÇÃO AO SINDICATO DA CATEGORIA PREPONDERANTE\n\nItem 5.5.1.1 da NR-05.\n\nComunicamos o início do processo eleitoral da CIPA deste estabelecimento.\n\nSindicato: ________________________________\nMeio (e-mail ou outro): ________________________________\nConfirmação de entrega: ________________________________\nData do envio: ____/____/________`,
    edital_convocacao: `${topo}EDITAL DE CONVOCAÇÃO DA ELEIÇÃO DA CIPA\n\nItem 5.5.3, "a", da NR-05.\n\nFicam convocados os empregados para a eleição dos representantes na CIPA.\n\nPeríodo de inscrição: de ____/____/________ a ____/____/________ (mínimo de 15 dias corridos).\nData da votação: ____/____/________\nLocal de divulgação: ________________________________`,
    comissao_eleitoral: `${topo}ATA DE CONSTITUIÇÃO DA COMISSÃO ELEITORAL\n\nItem 5.5.2 da NR-05.\n\nFicam designados para organizar e acompanhar o processo eleitoral:\n\n1. ________________________________\n2. ________________________________\n3. ________________________________\n\nAssinaturas: ________________________________`,
    edital_inscricao: `${topo}EDITAL DE INSCRIÇÃO PARA A ELEIÇÃO DA CIPA\n\nItens 5.5.3, "a" e "b", da NR-05.\n\nAs inscrições são individuais e abertas a todos os empregados do estabelecimento, de qualquer setor.\n\nInício: ____/____/________\nTérmino: ____/____/________\nLocal ou canal de inscrição: ________________________________`,
    lista_inscricao: `${topo}LISTA DE INSCRIÇÃO INDIVIDUAL\n\nItem 5.5.3, "c", da NR-05. Entregar comprovante a cada inscrito.\n\nNome | Setor | Data | Assinatura do comprovante\n1. ________________________________\n2. ________________________________\n3. ________________________________`,
    lista_inscritos: `${topo}RELAÇÃO DOS EMPREGADOS INSCRITOS\n\nItem 5.5.3, "e", da NR-05. Publicar em local de fácil acesso.\n\n1. ________________________________\n2. ________________________________\n3. ________________________________`,
    realizacao_eleicao: `${topo}REGISTRO DA REALIZAÇÃO DA ELEIÇÃO\n\nItem 5.5.3, "f" a "j", da NR-05.\n\nA votação ocorreu em dia normal de trabalho, com voto secreto.\n\nData: ____/____/________\nHorário: ________ às ________\nLocal: ________________________________`,
    comprovante_voto: `${topo}COMPROVANTE DE VOTO\n\nEleição da CIPA — voto secreto.\n\nEmpregado: ________________________________\nData: ____/____/________\n\nEste comprovante não identifica o candidato escolhido.`,
    lista_presenca_apuracao: `${topo}LISTA DE PRESENÇA DA APURAÇÃO\n\nItem 5.5.3, "i", da NR-05.\n\nRepresentante da organização: ________________________________\nRepresentante dos empregados: ________________________________\nCandidatos presentes (facultativo): ________________________________\n\nNome | Papel | Assinatura\n1. ________________________________`,
    registro_apuracao: `${topo}REGISTRO DA APURAÇÃO DOS VOTOS\n\nItens 5.5.4, 5.5.6, 5.5.7 e 5.5.8 da NR-05.\n\nEmpregados do estabelecimento: ________\nVotantes: ________\nDia da votação (1, 2 ou 3): ________\n\nTitulares eleitos:\n1. ________________________________  votos: ____\n\nSuplentes:\n1. ________________________________  votos: ____\n\nNão eleitos, em ordem de votos:\n1. ________________________________  votos: ____\n\nEmpate resolvido pelo maior tempo de serviço: sim / não`,
    ata_divulgacao: `${topo}ATA DE DIVULGAÇÃO DO RESULTADO\n\nItens 5.5.5 e 5.5.8 da NR-05.\n\nResultado divulgado em ____/____/________.\nLocal ou canal: ________________________________\n\nO prazo para denúncia do processo eleitoral é de 30 dias após esta divulgação.`,
    reuniao_treinamento: `${topo}ATA DA REUNIÃO DA CIPA — TREINAMENTO\n\nItem 5.7.1 da NR-05.\n\nFica definido que o treinamento dos membros titulares e suplentes será ministrado pela entidade:\n\n________________________________\n\nData prevista: ____/____/________\nCarga horária conforme o grau de risco do estabelecimento.\n\nPresentes: ________________________________`,
    lista_treinamento: `${topo}LISTA DE PRESENÇA DO TREINAMENTO DA CIPA\n\nItens 5.7.1 e 5.7.2 da NR-05. O treinamento ocorre antes da posse.\n\nEntidade: ________________________________\nData: ____/____/________   Carga horária: ________\n\nNome | Titular ou suplente | Assinatura\n1. ________________________________`,
    ata_posse: `${topo}ATA DE INSTALAÇÃO E POSSE\n\nItens 5.4.5 e 5.4.7 da NR-05.\n\nNo primeiro dia útil após o término do mandato anterior, tomam posse os novos membros.\n\nPresidente designado pela organização: ________________________________\nVice-presidente escolhido pelos eleitos: ________________________________\n\nTitulares e suplentes: ________________________________\n\nData da posse: ____/____/________`,
    recibo_entrega: `${topo}RECIBO DE ENTREGA DAS ATAS AOS MEMBROS\n\nItens 5.4.8 e 5.4.9 da NR-05.\n\nRecebi cópia da ata de eleição e da ata de posse.\n\nNome | Titular ou suplente | Data | Assinatura\n1. ________________________________\n\nSe o sindicato solicitar a documentação, o prazo de envio é de 10 dias.`,
  };

  if (primeira) {
    textos.iniciar_processo = `${topo}REGISTRO DE ABERTURA DO PROCESSO ELEITORAL\n\nPrimeira CIPA deste estabelecimento. Não há mandato em curso, então o prazo de 60 dias do item 5.5.1 não se aplica. A organização abre o processo e conduz as etapas até a posse.\n\nResponsável: ________________________________\nData: ____/____/________`;
    textos.comissao_eleitoral = `${topo}ATA DE CONSTITUIÇÃO DA COMISSÃO ELEITORAL\n\nItem 5.5.2.1 da NR-05. Como ainda não há CIPA, a organização constitui a comissão eleitoral.\n\nFicam designados para organizar e acompanhar o processo:\n\n1. ________________________________\n2. ________________________________\n3. ________________________________\n\nAssinaturas: ________________________________`;
    textos.realizacao_eleicao = `${topo}REGISTRO DA REALIZAÇÃO DA ELEIÇÃO\n\nItem 5.5.3 da NR-05. Na primeira CIPA não há o prazo de 30 dias antes do fim de um mandato.\n\nA votação ocorreu em dia normal de trabalho, com voto secreto, depois do período mínimo de 15 dias de inscrição.\n\nData: ____/____/________\nHorário: ________ às ________\nLocal: ________________________________`;
    textos.lista_treinamento = `${topo}LISTA DE PRESENÇA DO TREINAMENTO DA CIPA\n\nItem 5.7.1.1 da NR-05. No primeiro mandato o treinamento pode ocorrer até 30 dias depois da posse.\n\nEntidade: ________________________________\nData: ____/____/________   Carga horária: ________\n\nNome | Titular ou suplente | Assinatura\n1. ________________________________`;
    textos.ata_posse = `${topo}ATA DE INSTALAÇÃO E POSSE\n\nItens 5.4.5 e 5.4.6 da NR-05. Primeira CIPA: o mandato de um ano começa nesta posse.\n\nPresidente designado pela organização: ________________________________\nVice-presidente escolhido pelos eleitos: ________________________________\n\nTitulares e suplentes: ________________________________\n\nData da posse: ____/____/________`;
  }

  return textos[codigo];
}
