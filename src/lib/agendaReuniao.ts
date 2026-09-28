import { appUrl } from './appUrl';
import { isoData, lerData, somarDias } from './eleicao/etapasEleicao';

export type EventoAgenda = {
  uid: string;
  titulo: string;
  descricao: string;
  data: string;
  horaInicio?: string | null;
  horaFim?: string | null;
  local?: string | null;
};

const FUSO = 'America/Sao_Paulo';

function hhmm(hora?: string | null) {
  return hora ? hora.slice(0, 5) : '';
}

/** Sem fim informado, a reunião dura uma hora. */
function fimDoEvento(evento: EventoAgenda) {
  const inicio = hhmm(evento.horaInicio);
  if (!inicio) return '';
  const fim = hhmm(evento.horaFim);
  if (fim) return fim;
  const [h, m] = inicio.split(':').map(Number);
  const total = Math.min(h * 60 + m + 60, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function compacto(data: string, hora?: string) {
  const dia = data.replace(/-/g, '');
  return hora ? `${dia}T${hora.replace(':', '')}00` : dia;
}

function diaSeguinte(data: string) {
  return isoData(somarDias(lerData(data), 1));
}

export function textoHorario(evento: Pick<EventoAgenda, 'horaInicio' | 'horaFim'>) {
  const inicio = hhmm(evento.horaInicio);
  const fim = hhmm(evento.horaFim);
  if (!inicio) return '';
  return fim ? `${inicio} às ${fim}` : `a partir das ${inicio}`;
}

export function eventoDaReuniao(dados: {
  uid: string;
  data: string;
  tipo: 'ordinaria' | 'extraordinaria';
  empresa: string;
  horaInicio?: string | null;
  horaFim?: string | null;
  local?: string | null;
  sumula: string[];
  link?: string;
}): EventoAgenda {
  const tipo = dados.tipo === 'ordinaria' ? 'ordinária' : 'extraordinária';
  const horario = textoHorario(dados);
  const descricao = [
    `Reunião ${tipo} da CIPA — ${dados.empresa}`,
    horario ? `Horário: ${horario}` : '',
    dados.local ? `Local: ${dados.local}` : '',
    '',
    'Súmula prevista:',
    ...(dados.sumula.length ? dados.sumula.map((item, indice) => `${indice + 1}. ${item}`) : ['A definir.']),
    ...(dados.link ? ['', `Detalhes: ${dados.link}`] : []),
    '',
    'Gerado com CIPA Fácil',
  ].filter((linha, indice, lista) => linha !== '' || lista[indice - 1] !== '').join('\n');
  return {
    uid: dados.uid,
    titulo: `Reunião ${tipo} da CIPA — ${dados.empresa}`,
    descricao,
    data: dados.data,
    horaInicio: dados.horaInicio,
    horaFim: dados.horaFim,
    local: dados.local,
  };
}

export function linkAgendaPublica(token: string) {
  return appUrl(`/agenda/${encodeURIComponent(token)}`);
}

export function icsDoEvento(evento: EventoAgenda) {
  const escapar = (texto: string) =>
    texto.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  const carimbo = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const inicio = hhmm(evento.horaInicio);
  const quando = inicio
    ? [`DTSTART;TZID=${FUSO}:${compacto(evento.data, inicio)}`, `DTEND;TZID=${FUSO}:${compacto(evento.data, fimDoEvento(evento))}`]
    : [`DTSTART;VALUE=DATE:${compacto(evento.data)}`, `DTEND;VALUE=DATE:${compacto(diaSeguinte(evento.data))}`];
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CIPA Facil//Reunioes//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${evento.uid}@cipafacil`,
    `DTSTAMP:${carimbo}`,
    ...quando,
    `SUMMARY:${escapar(evento.titulo)}`,
    `DESCRIPTION:${escapar(evento.descricao)}`,
    ...(evento.local ? [`LOCATION:${escapar(evento.local)}`] : []),
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapar(evento.titulo)}`,
    inicio ? 'TRIGGER:-PT1H' : 'TRIGGER:-PT15H',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function baixarIcs(evento: EventoAgenda, nomeArquivo: string) {
  const url = URL.createObjectURL(new Blob([icsDoEvento(evento)], { type: 'text/calendar;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function linkGoogleAgenda(evento: EventoAgenda) {
  const inicio = hhmm(evento.horaInicio);
  const datas = inicio
    ? `${compacto(evento.data, inicio)}/${compacto(evento.data, fimDoEvento(evento))}`
    : `${compacto(evento.data)}/${compacto(diaSeguinte(evento.data))}`;
  const params = new URLSearchParams({ action: 'TEMPLATE', text: evento.titulo, dates: datas, details: evento.descricao, ctz: FUSO });
  if (evento.local) params.set('location', evento.local);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function linkOutlook(evento: EventoAgenda, conta: 'pessoal' | 'trabalho' = 'pessoal') {
  const inicio = hhmm(evento.horaInicio);
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: evento.titulo,
    body: evento.descricao,
    startdt: inicio ? `${evento.data}T${inicio}:00` : evento.data,
    enddt: inicio ? `${evento.data}T${fimDoEvento(evento)}:00` : diaSeguinte(evento.data),
  });
  if (!inicio) params.set('allday', 'true');
  if (evento.local) params.set('location', evento.local);
  const base = conta === 'trabalho' ? 'https://outlook.office.com' : 'https://outlook.live.com';
  return `${base}/calendar/0/deeplink/compose?${params.toString()}`;
}
