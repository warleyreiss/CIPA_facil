import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Sidebar } from 'primereact/sidebar';
import { CadastroSection, CampoValidavel } from '../../components/forms/CadastroSection';
import { CampoFormulario } from '../../components/forms/CampoFormulario';
import type { Acao } from '../../lib/acaoService';
import { extrairMensagemErro } from '../../lib/errorUtils';
import { appUrl } from '../../lib/appUrl';
import { eventoDaReuniao, linkAgendaPublica, linkGoogleAgenda, linkOutlook, textoHorario } from '../../lib/agendaReuniao';
import { carregarEmpresa, escreverEImprimir, htmlAta, htmlConvocacao } from '../../lib/reuniaoImpressao';
import { diasAte, formatarDataBr, isoData } from '../../lib/eleicao/etapasEleicao';
import type { MembroCipa, ReuniaoCipa } from '../../lib/gestaoCipaService';
import {
  cancelarReuniao,
  criarReuniao,
  editarReuniao,
  itensSumula,
  listarLog,
  listarPresenca,
  statusVisual,
} from '../../lib/reuniaoDetalhe';
import ReuniaoAberta from './ReuniaoAberta';
import '../../assets/css/especificos/reunioes-gestao.css';

const TIPO = { ordinaria: 'Ordinária', extraordinaria: 'Extraordinária' };
const LIMITE_ITENS = 30;
const LIMITE_ITEM = 300;

type LinhaSumula = { id: string; texto: string };

function linhaSumula(texto = ''): LinhaSumula {
  return { id: crypto.randomUUID(), texto };
}

function semErroSumula(erros: Record<string, string>) {
  const resto = { ...erros };
  delete resto['reuniao-sumula'];
  return resto;
}

type Props = {
  projetoId: string;
  projetoNome: string;
  membros: MembroCipa[];
  acoes: Acao[];
  reunioes: ReuniaoCipa[];
  onMudou: () => void;
  onAviso: (titulo: string, detalhe: string, tipo?: 'success' | 'warn' | 'error') => void;
};

type FiltroStatus = 'todas' | 'pendentes' | 'agendada' | 'concluida' | 'cancelada';

const FILTROS: { id: FiltroStatus; rotulo: string }[] = [
  { id: 'todas', rotulo: 'Todas' },
  { id: 'pendentes', rotulo: 'Precisam de ata' },
  { id: 'agendada', rotulo: 'Agendadas' },
  { id: 'concluida', rotulo: 'Concluídas' },
  { id: 'cancelada', rotulo: 'Canceladas' },
];

function periodoPadrao() {
  const ano = new Date().getFullYear();
  return { de: `${ano - 1}-01-01`, ate: `${ano + 1}-12-31` };
}

function grupoStatus(reuniao: ReuniaoCipa): Exclude<FiltroStatus, 'todas'> {
  const id = statusVisual(reuniao).id;
  return id === 'aberta' || id === 'andamento' ? 'pendentes' : id;
}

function diaDaSemana(data: string) {
  return new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
}

function quandoFalta(data: string) {
  const dias = diasAte(data);
  if (dias === 0) return 'Hoje';
  if (dias === 1) return 'Amanhã';
  return `Em ${dias} dias`;
}

function mesChave(data: string) {
  return data.slice(0, 7);
}

function rotuloMes(chave: string) {
  const data = new Date(`${chave}-02T12:00:00`);
  const texto = data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function abrirJanelaImpressao() {
  const janela = window.open('', '_blank');
  if (janela) janela.opener = null;
  return janela;
}

function linkReuniao(id: string) {
  return appUrl(`/inicio?reuniao=${encodeURIComponent(id)}#reunioes`);
}

function eventoDe(reuniao: ReuniaoCipa, empresa: string) {
  return eventoDaReuniao({
    uid: reuniao.token_agenda ?? reuniao.id,
    data: reuniao.data_reuniao,
    tipo: reuniao.tipo,
    empresa,
    horaInicio: reuniao.hora_inicio,
    horaFim: reuniao.hora_fim,
    local: reuniao.local,
    sumula: itensSumula(reuniao),
    link: reuniao.token_agenda ? linkAgendaPublica(reuniao.token_agenda) : undefined,
  });
}

function textoEmailAgenda(reuniao: ReuniaoCipa, empresa: string) {
  const evento = eventoDe(reuniao, empresa);
  const linhas = [
    evento.descricao.replace(/\n\nGerado com CIPA Fácil$/, ''),
    '',
    'Salvar na agenda:',
    reuniao.token_agenda ? `Celular (iPhone e Android): ${linkAgendaPublica(reuniao.token_agenda)}` : '',
    `Google Agenda: ${linkGoogleAgenda(evento)}`,
    `Outlook: ${linkOutlook(evento)}`,
    '',
    'Gerado com CIPA Fácil',
  ];
  return linhas.filter((linha, indice) => linha !== '' || linhas[indice - 1] !== '').join('\n');
}
export default function GestaoReunioes({ projetoId, projetoNome, membros, acoes, reunioes, onMudou, onAviso }: Props) {
  const [abertaId, setAbertaId] = useState<string | null>(null);
  const [dataNova, setDataNova] = useState('');
  const [tipoNovo, setTipoNovo] = useState<ReuniaoCipa['tipo']>('ordinaria');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFim, setHoraFim] = useState('');
  const [localNovo, setLocalNovo] = useState('');
  const [itensNovos, setItensNovos] = useState<LinhaSumula[]>(() => [linhaSumula()]);
  const focarLinha = useRef<string | null>(null);
  const listaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = focarLinha.current;
    if (!id) return;
    focarLinha.current = null;
    listaRef.current?.querySelector<HTMLInputElement>(`[data-linha="${id}"]`)?.focus();
  }, [itensNovos]);
  const [formReuniao, setFormReuniao] = useState<'nova' | 'editar' | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [errosNova, setErrosNova] = useState<Record<string, string>>({});
  const [shake, setShake] = useState(0);
  const [ocupado, setOcupado] = useState(false);
  const [periodo, setPeriodo] = useState(periodoPadrao);
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('todas');
  const [maisRecentes, setMaisRecentes] = useState(true);

  const aberta = reunioes.find((item) => item.id === abertaId) ?? null;
  const editada = formReuniao === 'editar' ? reunioes.find((item) => item.id === editandoId) ?? null : null;
  const pedidaNoLink = useRef(new URLSearchParams(window.location.search).get('reuniao'));

  useEffect(() => {
    const id = pedidaNoLink.current;
    if (!id || !reunioes.some((item) => item.id === id)) return;
    pedidaNoLink.current = null;
    setAbertaId(id);
  }, [reunioes]);
  const comissao = useMemo(
    () => membros.filter((item) => item.situacao === 'em_exercicio'),
    [membros],
  );
  const periodoInvalido = Boolean(periodo.de && periodo.ate && periodo.de > periodo.ate);
  const noPeriodo = useMemo(
    () =>
      periodoInvalido
        ? []
        : reunioes.filter(
            (item) => (!periodo.de || item.data_reuniao >= periodo.de) && (!periodo.ate || item.data_reuniao <= periodo.ate),
          ),
    [reunioes, periodo, periodoInvalido],
  );
  const contagem = useMemo(() => {
    const total: Record<FiltroStatus, number> = { todas: noPeriodo.length, pendentes: 0, agendada: 0, concluida: 0, cancelada: 0 };
    for (const item of noPeriodo) total[grupoStatus(item)] += 1;
    return total;
  }, [noPeriodo]);
  const filtradas = filtroStatus === 'todas' ? noPeriodo : noPeriodo.filter((item) => grupoStatus(item) === filtroStatus);
  const filtroMudou = filtroStatus !== 'todas' || !maisRecentes || periodo.de !== periodoPadrao().de || periodo.ate !== periodoPadrao().ate;
  const proxima = useMemo(
    () =>
      reunioes
        .filter((item) => item.status !== 'concluida' && item.status !== 'cancelada' && item.data_reuniao >= isoData(new Date()))
        .sort((a, b) => a.data_reuniao.localeCompare(b.data_reuniao))[0] ?? null,
    [reunioes],
  );
  const meses = useMemo(() => {
    const ordenadas = [...filtradas].sort((a, b) => {
      const ordem = a.data_reuniao.localeCompare(b.data_reuniao) || (a.hora_inicio ?? '').localeCompare(b.hora_inicio ?? '');
      return maisRecentes ? -ordem : ordem;
    });
    const mapa = new Map<string, ReuniaoCipa[]>();
    for (const item of ordenadas) {
      const chave = mesChave(item.data_reuniao);
      mapa.set(chave, [...(mapa.get(chave) ?? []), item]);
    }
    return [...mapa.entries()];
  }, [filtradas, maisRecentes]);

  function limparFiltros() {
    setPeriodo(periodoPadrao());
    setFiltroStatus('todas');
    setMaisRecentes(true);
  }

  function abrirNova(data = '') {
    setDataNova(data);
    setTipoNovo('ordinaria');
    setHoraInicio('');
    setHoraFim('');
    setLocalNovo('');
    setItensNovos([linhaSumula()]);
    setErrosNova({});
    setFormReuniao('nova');
  }

  function abrirEdicao(reuniao: ReuniaoCipa | null = aberta) {
    if (!reuniao) return;
    setEditandoId(reuniao.id);
    setDataNova(reuniao.data_reuniao);
    setTipoNovo(reuniao.tipo);
    setHoraInicio(reuniao.hora_inicio?.slice(0, 5) ?? '');
    setHoraFim(reuniao.hora_fim?.slice(0, 5) ?? '');
    setLocalNovo(reuniao.local ?? '');
    const salvos = itensSumula(reuniao).map((texto) => linhaSumula(texto));
    setItensNovos(salvos.length ? salvos : [linhaSumula()]);
    setErrosNova({});
    setFormReuniao('editar');
  }

  function enviarAgenda(reuniao: ReuniaoCipa) {
    const destinatarios = comissao.map((membro) => membro.email?.trim()).filter((email): email is string => Boolean(email));
    const assunto = `Reunião da CIPA — ${formatarDataBr(reuniao.data_reuniao)}`;
    const copia = destinatarios.length ? `bcc=${encodeURIComponent(destinatarios.join(','))}&` : '';
    window.location.href = `mailto:?${copia}subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(textoEmailAgenda(reuniao, projetoNome))}`;
    if (!destinatarios.length) {
      onAviso('E-mail', 'Nenhum membro tem e-mail salvo. Inclua os destinatários no seu programa de e-mail.', 'warn');
    }
  }

  async function copiarLink(reuniao: ReuniaoCipa) {
    try {
      if (reuniao.token_agenda) {
        await navigator.clipboard.writeText(linkAgendaPublica(reuniao.token_agenda));
        onAviso('Link copiado', 'Quem abrir no celular salva a reunião na agenda. Não precisa de login.', 'success');
      } else {
        await navigator.clipboard.writeText(linkReuniao(reuniao.id));
        onAviso('Link copiado', 'O link de agenda ainda não está ativo nesta base. Este link abre a reunião para quem tem acesso ao projeto.', 'warn');
      }
    } catch {
      onAviso('Link', 'Não foi possível copiar. Seu navegador bloqueou a área de transferência.', 'error');
    }
  }

  async function imprimirConvocacao(reuniao: ReuniaoCipa) {
    const janela = abrirJanelaImpressao();
    if (!janela) {
      onAviso('Impressão', 'O navegador bloqueou a janela de impressão. Libere pop-ups para este site.', 'warn');
      return;
    }
    janela.document.body.textContent = 'Preparando a convocação…';
    try {
      const empresa = await carregarEmpresa(projetoId, projetoNome);
      escreverEImprimir(janela, htmlConvocacao(reuniao, empresa, comissao));
    } catch (erro) {
      janela.close();
      onAviso('Impressão', extrairMensagemErro(erro), 'error');
    }
  }

  async function imprimirAtaDe(reuniao: ReuniaoCipa) {
    if (reuniao.status !== 'concluida') return;
    const janela = abrirJanelaImpressao();
    if (!janela) {
      onAviso('Impressão', 'O navegador bloqueou a janela de impressão. Libere pop-ups para este site.', 'warn');
      return;
    }
    janela.document.body.textContent = 'Preparando a ata…';
    try {
      const [empresa, presenca, historico] = await Promise.all([
        carregarEmpresa(projetoId, projetoNome),
        listarPresenca(reuniao.id),
        listarLog(reuniao.id),
      ]);
      const reescritaEm = historico.find((item) => item.apos_conclusao && /Ata reescrita|Reescrita salva/.test(item.evento))?.quando ?? null;
      escreverEImprimir(janela, htmlAta(reuniao, empresa, comissao, presenca, acoes, reescritaEm));
    } catch (erro) {
      janela.close();
      onAviso('Impressão', extrairMensagemErro(erro), 'error');
    }
  }

  function incluirLinha(depoisDe?: string) {
    if (itensNovos.length >= LIMITE_ITENS) {
      setErrosNova((atual) => ({ ...atual, 'reuniao-sumula': `A súmula pode ter até ${LIMITE_ITENS} itens.` }));
      setShake((n) => n + 1);
      return;
    }
    const nova = linhaSumula();
    const posicao = depoisDe ? itensNovos.findIndex((item) => item.id === depoisDe) + 1 : itensNovos.length;
    setItensNovos([...itensNovos.slice(0, posicao), nova, ...itensNovos.slice(posicao)]);
    focarLinha.current = nova.id;
  }

  function mudarLinha(id: string, texto: string) {
    setItensNovos(itensNovos.map((item) => (item.id === id ? { ...item, texto } : item)));
    if (errosNova[`sumula-${id}`] || errosNova['reuniao-sumula']) {
      setErrosNova((atual) => {
        const resto = semErroSumula(atual);
        delete resto[`sumula-${id}`];
        return resto;
      });
    }
  }

  function removerLinha(id: string) {
    const resto = itensNovos.filter((item) => item.id !== id);
    setItensNovos(resto.length ? resto : [linhaSumula()]);
  }

  function errosDaSumula(): Record<string, string> {
    const erros: Record<string, string> = {};
    const vistos = new Set<string>();
    for (const item of itensNovos) {
      const texto = item.texto.trim();
      if (!texto) continue;
      const chave = texto.toLowerCase();
      if (texto.length > LIMITE_ITEM) erros[`sumula-${item.id}`] = `Até ${LIMITE_ITEM} caracteres.`;
      else if (vistos.has(chave)) erros[`sumula-${item.id}`] = 'Item repetido.';
      vistos.add(chave);
    }
    return erros;
  }

  function validarNova(): Record<string, string> {
    const novos: Record<string, string> = {};
    const idAtual = editada?.id ?? null;
    const mesmaDataETipo = editada && editada.data_reuniao === dataNova && editada.tipo === tipoNovo;
    if (!dataNova) novos['reuniao-data'] = 'Informe a data da reunião.';
    else if (
      !mesmaDataETipo &&
      reunioes.some(
        (item) => item.id !== idAtual && item.status !== 'cancelada' && item.data_reuniao === dataNova && item.tipo === tipoNovo,
      )
    ) {
      novos['reuniao-data'] = `Já existe uma reunião ${TIPO[tipoNovo].toLowerCase()} nesta data. Se for repetida, cancele uma delas.`;
    }
    if (!tipoNovo) novos['reuniao-tipo'] = 'Escolha o tipo da reunião.';
    if (horaFim && !horaInicio) novos['reuniao-inicio'] = 'Informe o início antes do término.';
    else if (horaInicio && horaFim && horaFim <= horaInicio) novos['reuniao-fim'] = 'O término precisa ser depois do início.';
    if (localNovo.trim().length > 200) novos['reuniao-local'] = 'O local pode ter até 200 caracteres.';
    const daSumula = errosDaSumula();
    if (Object.keys(daSumula).length) novos['reuniao-sumula'] = 'Corrija os itens destacados da súmula.';
    return { ...novos, ...daSumula };
  }

  async function cancelar(reuniao: ReuniaoCipa) {
    const confirmado = window.confirm(
      `Cancelar a reunião ${TIPO[reuniao.tipo].toLowerCase()} de ${formatarDataBr(reuniao.data_reuniao)}? Ela continua no quadro como cancelada e o cancelamento fica no histórico.`,
    );
    if (!confirmado) return;
    setOcupado(true);
    try {
      await cancelarReuniao(reuniao.id);
      setFormReuniao(null);
      if (abertaId === reuniao.id) setAbertaId(null);
      onMudou();
      onAviso('Reunião cancelada', 'Ela não conta mais nas reuniões previstas.', 'success');
    } catch (erro) {
      onAviso('Reunião', extrairMensagemErro(erro), 'error');
    } finally {
      setOcupado(false);
    }
  }

  async function marcar(evento: React.FormEvent) {
    evento.preventDefault();
    const novos = validarNova();
    if (Object.keys(novos).length) {
      setErrosNova(novos);
      setShake((n) => n + 1);
      return;
    }
    setErrosNova({});
    const sumula = itensNovos.map((item) => item.texto.trim()).filter(Boolean);
    setOcupado(true);
    try {
      const agenda = { horaInicio, horaFim, local: localNovo };
      const avisoAgenda = 'Horário e local não foram gravados: o banco ainda não tem esses campos. Rode a atualização pendente do banco.';
      if (editada) {
        const { agendaIgnorada } = await editarReuniao(editada.id, { data: dataNova, tipo: tipoNovo, sumula, agenda });
        setFormReuniao(null);
        onMudou();
        if (agendaIgnorada) onAviso('Reunião atualizada em parte', avisoAgenda, 'warn');
        else onAviso('Reunião atualizada', editada.status === 'concluida' ? 'A alteração ficou no histórico da reunião concluída.' : 'Os dados da reunião foram gravados.', 'success');
        return;
      }
      const { id, agendaIgnorada } = await criarReuniao({ projetoId, data: dataNova, tipo: tipoNovo, sumula, agenda });
      setFormReuniao(null);
      onMudou();
      setAbertaId(id);
      if (agendaIgnorada) onAviso('Reunião marcada em parte', avisoAgenda, 'warn');
      else onAviso('Reunião marcada', 'A reunião entrou no quadro. Lance a ata e a presença quando ela acontecer.', 'success');
    } catch (erro) {
      onAviso('Reunião', extrairMensagemErro(erro), 'error');
    } finally {
      setOcupado(false);
    }
  }

  const hoje = isoData(new Date());
  const editando = formReuniao === 'editar';

  const painelReuniao = (
    <Sidebar
      visible={Boolean(formReuniao)}
      position="right"
      className="membros-sheet"
      overlayClassName="membros-sheet-mask"
      header={editando ? 'Editar reunião' : 'Marcar reunião'}
      onHide={() => setFormReuniao(null)}
    >
      <form className="painel-layout membros-form" onSubmit={marcar}>
        <div className="painel-corpo painel-corpo--fill">
          <div className="membros-form__campos">
            <CampoFormulario id="reuniao-data" rotulo="Data *" largo erro={errosNova['reuniao-data']} shake={shake}>
              <InputText id="reuniao-data" type="date" value={dataNova} onChange={(evento) => setDataNova(evento.target.value)} />
            </CampoFormulario>
            <CampoFormulario id="reuniao-tipo" rotulo="Tipo *" largo erro={errosNova['reuniao-tipo']} shake={shake}>
              <Dropdown
                inputId="reuniao-tipo"
                value={tipoNovo}
                options={[
                  { label: 'Ordinária', value: 'ordinaria' },
                  { label: 'Extraordinária', value: 'extraordinaria' },
                ]}
                onChange={(evento) => setTipoNovo(evento.value)}
              />
            </CampoFormulario>
            <div className="reuniao-form__horario">
              <CampoFormulario id="reuniao-inicio" rotulo="Início" erro={errosNova['reuniao-inicio']} shake={shake}>
                <InputText id="reuniao-inicio" type="time" value={horaInicio} onChange={(evento) => setHoraInicio(evento.target.value)} />
              </CampoFormulario>
              <CampoFormulario id="reuniao-fim" rotulo="Término" erro={errosNova['reuniao-fim']} shake={shake}>
                <InputText id="reuniao-fim" type="time" value={horaFim} min={horaInicio || undefined} onChange={(evento) => setHoraFim(evento.target.value)} />
              </CampoFormulario>
            </div>
            <CampoFormulario id="reuniao-local" rotulo="Local" largo erro={errosNova['reuniao-local']} shake={shake}>
              <InputText
                id="reuniao-local"
                value={localNovo}
                maxLength={201}
                placeholder="Sala, endereço ou link da chamada"
                onChange={(evento) => setLocalNovo(evento.target.value)}
              />
            </CampoFormulario>
            <CadastroSection variant="table" className="mb-0 form-cadastro-funcao__epis reuniao-sumula-tabela">
              <div className="form-cadastro-funcao__pick-shell">
                <header className="form-cadastro-funcao__pick-head">
                  <div className="form-cadastro-funcao__pick-title">
                    <span className="form-cadastro-funcao__label">Súmula prevista</span>
                    <span className="form-cadastro-funcao__chip form-cadastro-funcao__chip--target" title="Itens preenchidos">
                      {itensNovos.filter((item) => item.texto.trim()).length}
                    </span>
                  </div>
                </header>

                <div className="grid mb-0 reuniao-sumula-tabela__cols">
                  <div className="col-1">#</div>
                  <div className="col-10">Assunto</div>
                  <div className="col-1" />
                </div>

                <div ref={listaRef} className="cadastro-section__table-scroll reuniao-sumula-tabela__scroll">
                  {itensNovos.map((item, indice) => {
                    const erro = errosNova[`sumula-${item.id}`];
                    return (
                      <div key={item.id} className="grid mb-0 reuniao-sumula-tabela__linha">
                        <div className="col-1 reuniao-sumula-tabela__numero">{indice + 1}</div>
                        <div className="field col-10 mb-0 px-2">
                          <CampoValidavel key={`sumula-${item.id}-${shake}`} invalid={Boolean(erro)} shaking={Boolean(erro)} error={erro}>
                            <InputText
                              data-linha={item.id}
                              aria-label={`Assunto ${indice + 1}`}
                              value={item.texto}
                              maxLength={LIMITE_ITEM + 1}
                              placeholder="Assunto a tratar"
                              className={erro ? 'w-full p-invalid' : 'w-full'}
                              onChange={(evento) => mudarLinha(item.id, evento.target.value)}
                              onKeyDown={(evento) => {
                                if (evento.key !== 'Enter') return;
                                evento.preventDefault();
                                incluirLinha(item.id);
                              }}
                            />
                          </CampoValidavel>
                        </div>
                        <div className="field col-1 mb-0 px-2 flex align-items-center">
                          <Button
                            type="button"
                            icon="pi pi-times"
                            rounded
                            text
                            severity="danger"
                            aria-label={`Remover assunto ${indice + 1}`}
                            disabled={itensNovos.length === 1 && !item.texto}
                            onClick={() => removerLinha(item.id)}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {errosNova['reuniao-sumula'] ? <div className="cadastro-section__lista-alerta">{errosNova['reuniao-sumula']}</div> : null}
                </div>
              </div>
            </CadastroSection>
            <div className="flex justify-content-center mb-2 mt-1">
              <Button
                type="button"
                label="+ Itens"
                outlined
                className="btn-add-leve btn-add-itens"
                style={{ height: '2rem', width: '6rem' }}
                onClick={() => incluirLinha()}
              />
            </div>
            <p className="membros-form__nota">
              {editada?.status === 'concluida'
                ? 'Esta reunião já foi concluída. A alteração fica registrada no histórico.'
                : 'A ata e a chamada são lançadas no cartão da reunião. Datas passadas são aceitas para reuniões que já aconteceram.'}
            </p>
          </div>
        </div>
        <div className="form-rodape">
          <div className="form-rodape-ajuda">
            {editada && editada.status !== 'concluida' && editada.status !== 'cancelada' ? (
              <Button
                type="button"
                label="Cancelar reunião"
                icon="pi pi-ban"
                text
                severity="danger"
                disabled={ocupado}
                onClick={() => void cancelar(editada)}
              />
            ) : null}
          </div>
          <div className="form-rodape-acoes">
            <span className="form-rodape-obrigatorio">*Campos obrigatórios</span>
            <Button type="button" label="Fechar" outlined onClick={() => setFormReuniao(null)} />
            <Button type="submit" label={editando ? 'Salvar alterações' : 'Marcar reunião'} loading={ocupado} />
          </div>
        </div>
      </form>
    </Sidebar>
  );

  return (
    <div className="reuniao-quadro" id="reunioes">
      <div className="reuniao-filtros">
        <div className="reuniao-filtros__chips" role="tablist" aria-label="Situação">
          {FILTROS.map((filtro) => (
            <button
              key={filtro.id}
              type="button"
              role="tab"
              aria-selected={filtroStatus === filtro.id}
              className={`reuniao-chip reuniao-chip--${filtro.id}${filtroStatus === filtro.id ? ' is-ativo' : ''}`}
              onClick={() => setFiltroStatus(filtro.id)}
            >
              {filtro.rotulo}
              <span>{contagem[filtro.id]}</span>
            </button>
          ))}
        </div>
        <div className="reuniao-filtros__acoes">
          <div className={`reuniao-filtros__periodo${periodoInvalido ? ' is-invalido' : ''}`} role="group" aria-label="Período">
            <i className="pi pi-calendar" aria-hidden />
            <input
              type="date"
              aria-label="Data inicial"
              title={periodoInvalido ? 'A data inicial está depois da data final' : 'Data inicial'}
              value={periodo.de}
              max={periodo.ate || undefined}
              onChange={(evento) => setPeriodo((atual) => ({ ...atual, de: evento.target.value }))}
            />
            <span aria-hidden>–</span>
            <input
              type="date"
              aria-label="Data final"
              title="Data final"
              value={periodo.ate}
              min={periodo.de || undefined}
              onChange={(evento) => setPeriodo((atual) => ({ ...atual, ate: evento.target.value }))}
            />
          </div>
          <button
            type="button"
            className="reuniao-filtros__icone"
            title={maisRecentes ? 'Mais recentes primeiro' : 'Mais antigas primeiro'}
            aria-label={maisRecentes ? 'Ordenado das mais recentes para as mais antigas. Inverter.' : 'Ordenado das mais antigas para as mais recentes. Inverter.'}
            onClick={() => setMaisRecentes((atual) => !atual)}
          >
            <i className={maisRecentes ? 'pi pi-sort-amount-down' : 'pi pi-sort-amount-up'} aria-hidden />
            {maisRecentes ? 'Recentes' : 'Antigas'}
          </button>
          {filtroMudou ? (
            <button type="button" className="reuniao-filtros__icone" title="Limpar filtros" aria-label="Limpar filtros" onClick={limparFiltros}>
              <i className="pi pi-filter-slash" aria-hidden />
            </button>
          ) : null}
          <Button type="button" label="Marcar reunião" icon="pi pi-plus" size="small" onClick={() => abrirNova()} />
        </div>
      </div>

      {proxima && filtroStatus !== 'concluida' && filtroStatus !== 'cancelada' ? (
        <button type="button" className="reuniao-proxima" onClick={() => setAbertaId(proxima.id)}>
          <span className="reuniao-proxima__data">
            <small>{diaDaSemana(proxima.data_reuniao)}</small>
            <b>{proxima.data_reuniao.slice(8, 10)}</b>
            <small>{rotuloMes(mesChave(proxima.data_reuniao)).split(' ')[0].slice(0, 3)}</small>
          </span>
          <span className="reuniao-proxima__texto">
            <span className="reuniao-proxima__rotulo">
              <i className="pi pi-bell" aria-hidden /> Próxima reunião · {quandoFalta(proxima.data_reuniao)}
            </span>
            <strong>Reunião {TIPO[proxima.tipo].toLowerCase()}</strong>
            <span>
              {[textoHorario({ horaInicio: proxima.hora_inicio, horaFim: proxima.hora_fim }), proxima.local].filter(Boolean).join(' · ') ||
                'Horário e local a definir'}
            </span>
          </span>
          <span className="reuniao-proxima__abrir">
            Abrir <i className="pi pi-arrow-right" aria-hidden />
          </span>
        </button>
      ) : null}

      {aberta ? (
        <ReuniaoAberta
          key={aberta.id}
          reuniao={aberta}
          projetoId={projetoId}
          projetoNome={projetoNome}
          comissao={comissao}
          acoes={acoes}
          onVoltar={() => setAbertaId(null)}
          onEditar={() => abrirEdicao()}
          onMudou={onMudou}
          onAviso={onAviso}
        />
      ) : null}
      {painelReuniao}

      {reunioes.length === 0 ? (
        <button type="button" className="reuniao-vazia" onClick={() => abrirNova(hoje)}>
          <i className="pi pi-calendar-plus" aria-hidden />
          <strong>Nenhuma reunião no quadro</strong>
          <span>Marque a ordinária do mês. O cartão abre a súmula, a ata e a chamada.</span>
        </button>
      ) : meses.length === 0 ? (
        <div className="reuniao-vazia reuniao-vazia--filtro">
          <i className="pi pi-search" aria-hidden />
          <strong>Nenhuma reunião com esses filtros</strong>
          <span>Amplie o período ou escolha outra situação.</span>
          <Button type="button" label="Limpar filtros" icon="pi pi-filter-slash" outlined size="small" onClick={limparFiltros} />
        </div>
      ) : (
        meses.map(([chave, itens]) => (
          <section key={chave} className={`reuniao-mes${chave === mesChave(hoje) ? ' is-atual' : ''}`}>
            <h3>
              {rotuloMes(chave)}
              {chave === mesChave(hoje) ? <span className="reuniao-mes__atual">Este mês</span> : null}
              <span className="reuniao-mes__conta">
                {itens.length} {itens.length === 1 ? 'reunião' : 'reuniões'}
              </span>
            </h3>
            <div className="reuniao-trilho">
              {itens.map((item) => {
                const selo = statusVisual(item);
                const dia = item.data_reuniao.slice(8, 10);
                const lista = itensSumula(item);
                const concluida = item.status === 'concluida';
                const quando = [textoHorario({ horaInicio: item.hora_inicio, horaFim: item.hora_fim }), item.local].filter(Boolean);
                return (
                  <article key={item.id} className={`reuniao-carta reuniao-carta--${selo.id}`}>
                    <button type="button" className="reuniao-carta__abrir" onClick={() => setAbertaId(item.id)}>
                      <span className="reuniao-carta__topo">
                        <span className="reuniao-carta__dia">
                          <b>{dia}</b>
                          <small>{diaDaSemana(item.data_reuniao)}</small>
                        </span>
                        <span className={`reuniao-selo reuniao-selo--${selo.id}`}>{selo.rotulo}</span>
                      </span>
                      <strong>{TIPO[item.tipo]}</strong>
                      <span className="reuniao-carta__quando">
                        <i className="pi pi-clock" aria-hidden />
                        {quando.length ? quando.join(' · ') : 'Horário a definir'}
                      </span>
                      <span className="reuniao-carta__resumo">
                        {!lista.length ? 'Sem súmula ainda' : lista.length > 1 ? `${lista[0]} +${lista.length - 1}` : lista[0]}
                      </span>
                      <span className="reuniao-carta__rodape">
                        <span>
                          <i className="pi pi-list" aria-hidden /> {lista.length} {lista.length === 1 ? 'item' : 'itens'}
                        </span>
                        <span>
                          <i className={item.ata?.trim() ? 'pi pi-file-edit' : 'pi pi-file'} aria-hidden /> {item.ata?.trim() ? 'Ata escrita' : 'Sem ata'}
                        </span>
                      </span>
                    </button>
                    {item.status === 'cancelada' ? null : (
                      <div className="reuniao-carta__menu" role="group" aria-label={`Opções da reunião de ${formatarDataBr(item.data_reuniao)}`}>
                        <button type="button" onClick={() => setAbertaId(item.id)}>
                          <i className="pi pi-folder-open" aria-hidden /> Abrir reunião
                        </button>
                        <button type="button" onClick={() => abrirEdicao(item)}>
                          <i className="pi pi-calendar-plus" aria-hidden /> Editar ou reagendar
                        </button>
                        <button type="button" onClick={() => enviarAgenda(item)}>
                          <i className="pi pi-envelope" aria-hidden /> Enviar agenda por e-mail
                        </button>
                        <button type="button" onClick={() => void copiarLink(item)}>
                          <i className="pi pi-link" aria-hidden /> Copiar link
                        </button>
                        <button type="button" onClick={() => void imprimirConvocacao(item)}>
                          <i className="pi pi-print" aria-hidden /> Imprimir convocação
                        </button>
                        <button
                          type="button"
                          disabled={!concluida}
                          title={concluida ? undefined : 'Liberada depois que a reunião for concluída'}
                          onClick={() => void imprimirAtaDe(item)}
                        >
                          <i className={concluida ? 'pi pi-file' : 'pi pi-lock'} aria-hidden /> Imprimir ata
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
