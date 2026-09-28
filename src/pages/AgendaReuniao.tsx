import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { baixarIcs, eventoDaReuniao, linkGoogleAgenda, linkOutlook, textoHorario } from '../lib/agendaReuniao';
import { lerData } from '../lib/eleicao/etapasEleicao';
import { extrairMensagemErro } from '../lib/errorUtils';
import { buscarAgendaPublica, itensSumula, type AgendaPublica } from '../lib/reuniaoDetalhe';
import '../assets/css/especificos/agenda-publica.css';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function ehCelular() {
  return /android|iphone|ipad|ipod/i.test(navigator.userAgent);
}

function dataPorExtenso(iso: string) {
  const texto = lerData(iso).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export default function AgendaReuniao() {
  const { token = '' } = useParams();
  const tokenValido = UUID.test(token);
  const [agenda, setAgenda] = useState<AgendaPublica | null>(null);
  const [falha, setFalha] = useState('');
  const [carregando, setCarregando] = useState(tokenValido);
  const abriuSozinho = useRef(false);
  const erro = tokenValido ? falha : 'Este link de agenda não é válido.';

  useEffect(() => {
    if (!tokenValido) return;
    let ativo = true;
    buscarAgendaPublica(token)
      .then((dados) => {
        if (!ativo) return;
        if (!dados) setFalha('Não encontramos esta reunião. O link pode ter sido trocado.');
        setAgenda(dados);
      })
      .catch((motivo) => ativo && setFalha(extrairMensagemErro(motivo)))
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, [token, tokenValido]);

  const evento = useMemo(
    () =>
      agenda
        ? eventoDaReuniao({
            uid: token,
            data: agenda.data_reuniao,
            tipo: agenda.tipo,
            empresa: agenda.empresa,
            horaInicio: agenda.hora_inicio,
            horaFim: agenda.hora_fim,
            local: agenda.local,
            sumula: itensSumula({ sumula: agenda.sumula, pauta: null }),
          })
        : null,
    [agenda, token],
  );

  const cancelada = agenda?.status === 'cancelada';

  useEffect(() => {
    if (!evento || cancelada || abriuSozinho.current || !ehCelular()) return;
    abriuSozinho.current = true;
    baixarIcs(evento, `reuniao-cipa-${evento.data}.ics`);
  }, [evento, cancelada]);

  useEffect(() => {
    document.title = evento ? evento.titulo : 'Agenda da reunião · CIPA Fácil';
  }, [evento]);

  if (carregando) {
    return (
      <main className="agenda-publica">
        <section className="agenda-publica__cartao agenda-publica__cartao--centro">
          <i className="pi pi-spin pi-spinner" aria-hidden />
          <p>Carregando a reunião…</p>
        </section>
      </main>
    );
  }

  if (erro || !agenda || !evento) {
    return (
      <main className="agenda-publica">
        <section className="agenda-publica__cartao agenda-publica__cartao--centro">
          <i className="pi pi-calendar-times agenda-publica__icone-erro" aria-hidden />
          <h1>Link indisponível</h1>
          <p>{erro || 'Não foi possível abrir esta reunião.'}</p>
        </section>
        <footer className="agenda-publica__rodape">Gerado com CIPA Fácil</footer>
      </main>
    );
  }

  const sumula = itensSumula({ sumula: agenda.sumula, pauta: null });
  const horario = textoHorario(evento);

  return (
    <main className="agenda-publica">
      <section className="agenda-publica__cartao">
        <header className="agenda-publica__topo">
          <span className="agenda-publica__selo">{agenda.tipo === 'ordinaria' ? 'Reunião ordinária' : 'Reunião extraordinária'}</span>
          <h1>CIPA · {agenda.empresa}</h1>
        </header>

        {cancelada ? <p className="agenda-publica__aviso">Esta reunião foi cancelada.</p> : null}

        <dl className="agenda-publica__dados">
          <div>
            <dt>
              <i className="pi pi-calendar" aria-hidden /> Data
            </dt>
            <dd>{dataPorExtenso(agenda.data_reuniao)}</dd>
          </div>
          <div>
            <dt>
              <i className="pi pi-clock" aria-hidden /> Horário
            </dt>
            <dd>{horario || 'Dia inteiro (horário a confirmar)'}</dd>
          </div>
          {agenda.local ? (
            <div>
              <dt>
                <i className="pi pi-map-marker" aria-hidden /> Local
              </dt>
              <dd>{agenda.local}</dd>
            </div>
          ) : null}
        </dl>

        {sumula.length ? (
          <section className="agenda-publica__sumula">
            <h2>Súmula prevista</h2>
            <ol>
              {sumula.map((item, indice) => (
                <li key={`${indice}-${item}`}>{item}</li>
              ))}
            </ol>
          </section>
        ) : null}

        {!cancelada ? (
          <section className="agenda-publica__salvar">
            <h2>Salvar na sua agenda</h2>
            <button type="button" className="agenda-publica__botao agenda-publica__botao--principal" onClick={() => baixarIcs(evento, `reuniao-cipa-${evento.data}.ics`)}>
              <i className="pi pi-mobile" aria-hidden /> Agenda do celular (iPhone, Android, Outlook)
            </button>
            <a className="agenda-publica__botao" href={linkGoogleAgenda(evento)} target="_blank" rel="noopener noreferrer">
              <i className="pi pi-google" aria-hidden /> Google Agenda
            </a>
            <a className="agenda-publica__botao" href={linkOutlook(evento, 'pessoal')} target="_blank" rel="noopener noreferrer">
              <i className="pi pi-microsoft" aria-hidden /> Outlook.com
            </a>
            <a className="agenda-publica__botao" href={linkOutlook(evento, 'trabalho')} target="_blank" rel="noopener noreferrer">
              <i className="pi pi-briefcase" aria-hidden /> Microsoft 365 (conta de trabalho)
            </a>
          </section>
        ) : null}
      </section>
      <footer className="agenda-publica__rodape">Gerado com CIPA Fácil</footer>
    </main>
  );
}
