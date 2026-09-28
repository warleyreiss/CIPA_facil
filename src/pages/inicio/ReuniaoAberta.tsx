import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Sidebar } from 'primereact/sidebar';
import { BadgeCargo } from '../../components/BadgeCargo';
import EditorAta from '../../components/EditorAta';
import { CampoFormulario } from '../../components/forms/CampoFormulario';
import type { Acao } from '../../lib/acaoService';
import { textoHorario } from '../../lib/agendaReuniao';
import { ataParaHtml, ataVazia } from '../../lib/ataHtml';
import { formatarDataBr } from '../../lib/eleicao/etapasEleicao';
import { extrairMensagemErro } from '../../lib/errorUtils';
import type { MembroCipa, ReuniaoCipa } from '../../lib/gestaoCipaService';
import {
  concluirReuniao,
  guardarPresenca,
  guardarTextoReuniao,
  itensSumula,
  listarLog,
  listarPresenca,
  statusVisual,
  textoAtaImpressao,
  type LogReuniao,
  type PresencaReuniao,
  type SituacaoPresenca,
} from '../../lib/reuniaoDetalhe';
import { carregarEmpresa, escreverEImprimir, htmlAta } from '../../lib/reuniaoImpressao';
import AcoesDaReuniao from './AcoesDaReuniao';

const TIPO = { ordinaria: 'Ordinária', extraordinaria: 'Extraordinária' };
const MIN_MOTIVO = 10;

const PRESENCA: Record<SituacaoPresenca, { rotulo: string; icone: string; proxima: SituacaoPresenca }> = {
  faltante: { rotulo: 'Ausente', icone: 'pi pi-times', proxima: 'justificado' },
  justificado: { rotulo: 'Justificado', icone: 'pi pi-exclamation', proxima: 'presente' },
  presente: { rotulo: 'Presente', icone: 'pi pi-check', proxima: 'faltante' },
};

type Aba = 'ata' | 'chamada' | 'acoes' | 'historico';
type LinhaPresenca = { situacao: SituacaoPresenca; justificativa: string };
type Chamada = Record<string, LinhaPresenca>;

type Props = {
  reuniao: ReuniaoCipa;
  projetoId: string;
  projetoNome: string;
  comissao: MembroCipa[];
  acoes: Acao[];
  onVoltar: () => void;
  onEditar: () => void;
  onMudou: () => void;
  onAviso: (titulo: string, detalhe: string, tipo?: 'success' | 'warn' | 'error') => void;
};

function chamadaDe(comissao: MembroCipa[], presenca: PresencaReuniao[]): Chamada {
  const mapa = new Map(presenca.map((item) => [item.membro_id, item]));
  return Object.fromEntries(
    comissao.map((membro) => {
      const marca = mapa.get(membro.id);
      return [membro.id, { situacao: marca?.situacao ?? 'faltante', justificativa: marca?.justificativa ?? '' }];
    }),
  );
}

function mesmaChamada(a: Chamada, b: Chamada) {
  const chaves = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const chave of chaves) {
    if (a[chave]?.situacao !== b[chave]?.situacao) return false;
    if ((a[chave]?.justificativa ?? '').trim() !== (b[chave]?.justificativa ?? '').trim()) return false;
  }
  return true;
}

function mensagemErroReuniao(erro: unknown) {
  const texto = extrairMensagemErro(erro);
  if (/malformed array literal/i.test(texto)) {
    return 'O banco da CIPA ainda está com a versão antiga do histórico da reunião. Rode o arquivo supabase/aplicar-agora.sql no Supabase e tente de novo.';
  }
  return texto;
}

function abrirJanela() {
  const janela = window.open('', '_blank');
  if (janela) janela.opener = null;
  return janela;
}

export default function ReuniaoAberta({
  reuniao,
  projetoId,
  projetoNome,
  comissao,
  acoes,
  onVoltar,
  onEditar,
  onMudou,
  onAviso,
}: Props) {
  const [aba, setAba] = useState<Aba>('ata');
  const [ata, setAta] = useState(reuniao.ata ?? '');
  const [ataSalva, setAtaSalva] = useState(reuniao.ata ?? '');
  const [chamada, setChamada] = useState<Chamada>(() => chamadaDe(comissao, []));
  const [chamadaSalva, setChamadaSalva] = useState<Chamada>(() => chamadaDe(comissao, []));
  const [errosChamada, setErrosChamada] = useState<Record<string, string>>({});
  const [log, setLog] = useState<LogReuniao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [reescrevendo, setReescrevendo] = useState(false);
  const [pedirMotivo, setPedirMotivo] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [erroMotivo, setErroMotivo] = useState('');
  const [confirmarConclusao, setConfirmarConclusao] = useState(false);
  const [erroAta, setErroAta] = useState('');
  const [shake, setShake] = useState(0);
  const avisoRef = useRef(onAviso);
  avisoRef.current = onAviso;

  const concluida = reuniao.status === 'concluida';
  const cancelada = reuniao.status === 'cancelada';
  const editavel = !cancelada && (!concluida || reescrevendo);
  const visual = statusVisual(reuniao);
  const sumula = itensSumula(reuniao);
  const horario = textoHorario({ horaInicio: reuniao.hora_inicio, horaFim: reuniao.hora_fim });
  const comissaoRef = useRef(comissao);
  comissaoRef.current = comissao;

  useEffect(() => {
    let ativo = true;
    listarPresenca(reuniao.id)
      .then((presenca) => {
        if (!ativo) return;
        const inicial = chamadaDe(comissaoRef.current, presenca);
        setChamada(inicial);
        setChamadaSalva(inicial);
      })
      .catch((erro) => {
        if (ativo) avisoRef.current('Reunião', extrairMensagemErro(erro), 'error');
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [reuniao.id]);

  useEffect(() => {
    let ativo = true;
    listarLog(reuniao.id)
      .then((historico) => {
        if (ativo) setLog(historico);
      })
      .catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, [reuniao]);

  const ataMudou = ataParaHtml(ata) !== ataParaHtml(ataSalva);
  const chamadaMudou = !mesmaChamada(chamada, chamadaSalva);
  const pendente = ataMudou || chamadaMudou;

  const grupos = useMemo(() => {
    const de = (situacao: SituacaoPresenca) => comissao.filter((membro) => (chamada[membro.id]?.situacao ?? 'faltante') === situacao);
    return { presentes: de('presente'), faltantes: de('faltante'), justificados: de('justificado') };
  }, [comissao, chamada]);

  const acoesDesta = acoes.filter((acao) => acao.reuniao_id === reuniao.id);
  const reescritaEm = log.find((item) => item.apos_conclusao && /Ata reescrita|Reescrita salva/.test(item.evento))?.quando ?? null;

  function presencaAtual(): PresencaReuniao[] {
    return comissao.map((membro) => ({
      reuniao_id: reuniao.id,
      membro_id: membro.id,
      situacao: chamada[membro.id]?.situacao ?? 'faltante',
      justificativa: chamada[membro.id]?.justificativa ?? '',
    }));
  }

  function validarChamada(): boolean {
    const erros: Record<string, string> = {};
    for (const membro of grupos.justificados) {
      if (!(chamada[membro.id]?.justificativa ?? '').trim()) erros[membro.id] = 'Informe a justificativa.';
    }
    setErrosChamada(erros);
    if (Object.keys(erros).length) {
      setAba('chamada');
      setShake((n) => n + 1);
      onAviso('Chamada', 'Quem justificou a falta precisa ter a justificativa escrita.', 'warn');
      return false;
    }
    return true;
  }

  async function recarregarLog() {
    setLog(await listarLog(reuniao.id));
  }

  async function gravar(motivoReescrita?: string, gravarChamada = chamadaMudou) {
    if (motivoReescrita || ataMudou) await guardarTextoReuniao(reuniao, ata, motivoReescrita);
    if (gravarChamada) await guardarPresenca(reuniao.id, presencaAtual());
    setAtaSalva(ata);
    setChamadaSalva(chamada);
  }

  async function salvar() {
    if (!validarChamada()) return;
    setOcupado(true);
    try {
      await gravar();
      onMudou();
      await recarregarLog();
      onAviso('Reunião salva', 'Ata e chamada foram gravadas.', 'success');
    } catch (erro) {
      onAviso('Reunião', mensagemErroReuniao(erro), 'error');
    } finally {
      setOcupado(false);
    }
  }

  function pedirConclusao() {
    if (ataVazia(ata)) {
      setErroAta('Escreva a ata antes de concluir a reunião.');
      setAba('ata');
      setShake((n) => n + 1);
      return;
    }
    if (!validarChamada()) return;
    setErroAta('');
    setConfirmarConclusao(true);
  }

  async function concluir() {
    setOcupado(true);
    try {
      await gravar(undefined, true);
      await concluirReuniao(reuniao.id);
      setConfirmarConclusao(false);
      onMudou();
      await recarregarLog();
      onAviso('Reunião concluída', 'A ata já pode ser impressa e enviada aos membros.', 'success');
    } catch (erro) {
      onAviso('Reunião', mensagemErroReuniao(erro), 'error');
    } finally {
      setOcupado(false);
    }
  }

  function cancelarReescrita() {
    setAta(ataSalva);
    setChamada(chamadaSalva);
    setErrosChamada({});
    setErroAta('');
    setReescrevendo(false);
  }

  function abrirMotivo() {
    if (!pendente) {
      onAviso('Reescrever', 'Nada mudou ainda. Altere a ata ou a chamada antes de salvar.', 'warn');
      return;
    }
    if (ataVazia(ata)) {
      setErroAta('A ata de uma reunião concluída não pode ficar vazia.');
      setAba('ata');
      setShake((n) => n + 1);
      return;
    }
    if (!validarChamada()) return;
    setMotivo('');
    setErroMotivo('');
    setPedirMotivo(true);
  }

  async function salvarReescrita() {
    if (motivo.trim().length < MIN_MOTIVO) {
      setErroMotivo(`Explique o motivo (pelo menos ${MIN_MOTIVO} caracteres).`);
      setShake((n) => n + 1);
      return;
    }
    setOcupado(true);
    try {
      await gravar(motivo);
      setPedirMotivo(false);
      setReescrevendo(false);
      onMudou();
      await recarregarLog();
      onAviso('Reescrita salva', 'A versão anterior e o motivo ficaram no histórico da reunião.', 'success');
    } catch (erro) {
      onAviso('Reunião', mensagemErroReuniao(erro), 'error');
    } finally {
      setOcupado(false);
    }
  }

  function voltar() {
    if (pendente && !window.confirm('Há alterações não salvas nesta reunião. Sair mesmo assim?')) return;
    onVoltar();
  }

  function mudarPresenca(membroId: string, mudanca: Partial<LinhaPresenca>) {
    setChamada((atual) => ({ ...atual, [membroId]: { ...atual[membroId], ...mudanca } }));
    if (errosChamada[membroId]) {
      setErrosChamada((atual) => {
        const resto = { ...atual };
        delete resto[membroId];
        return resto;
      });
    }
  }

  function avisarBloqueio() {
    onAviso('Ata bloqueada', 'Conclua a reunião primeiro. Depois disso a ata pode ser impressa e enviada.', 'warn');
  }

  async function salvarJustificativa(membroId: string) {
    const linha = chamada[membroId];
    if (!linha?.justificativa.trim()) {
      setErrosChamada((atual) => ({ ...atual, [membroId]: 'Informe a justificativa.' }));
      setShake((n) => n + 1);
      return;
    }
    setOcupado(true);
    try {
      await guardarPresenca(reuniao.id, [
        { reuniao_id: reuniao.id, membro_id: membroId, situacao: 'justificado', justificativa: linha.justificativa },
      ]);
      setChamadaSalva((atual) => ({ ...atual, [membroId]: { situacao: 'justificado', justificativa: linha.justificativa.trim() } }));
      setChamada((atual) => ({ ...atual, [membroId]: { ...atual[membroId], justificativa: linha.justificativa.trim() } }));
      onAviso('Chamada', 'Justificativa salva.', 'success');
    } catch (erro) {
      onAviso('Chamada', mensagemErroReuniao(erro), 'error');
    } finally {
      setOcupado(false);
    }
  }

  function marcarTodosPresentes() {
    setChamada(Object.fromEntries(comissao.map((membro) => [membro.id, { situacao: 'presente' as const, justificativa: '' }])));
    setErrosChamada({});
  }

  async function imprimirAta() {
    const janela = abrirJanela();
    if (!janela) {
      onAviso('Impressão', 'O navegador bloqueou a janela de impressão. Libere pop-ups para este site.', 'warn');
      return;
    }
    janela.document.body.textContent = 'Preparando a ata…';
    try {
      const empresa = await carregarEmpresa(projetoId, projetoNome);
      escreverEImprimir(janela, htmlAta({ ...reuniao, ata }, empresa, comissao, presencaAtual(), acoes, reescritaEm));
    } catch (erro) {
      janela.close();
      onAviso('Impressão', extrairMensagemErro(erro), 'error');
    }
  }

  function enviarAta() {
    const destinatarios = comissao.map((membro) => membro.email?.trim()).filter((email): email is string => Boolean(email));
    const assunto = `Ata da reunião da CIPA — ${formatarDataBr(reuniao.data_reuniao)}`;
    const corpo = `${textoAtaImpressao({ ...reuniao, ata }, projetoNome, comissao, presencaAtual(), acoes)}\n\nGerado com CIPA Fácil`;
    const copia = destinatarios.length ? `bcc=${encodeURIComponent(destinatarios.join(','))}&` : '';
    window.location.href = `mailto:?${copia}subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
    if (!destinatarios.length) {
      onAviso('E-mail', 'Nenhum membro tem e-mail salvo. Cadastre o e-mail em Membros ou inclua os destinatários no seu programa.', 'warn');
    }
  }

  const abas: { id: Aba; rotulo: string; icone: string; contagem?: string; alerta?: boolean }[] = [
    { id: 'ata', rotulo: 'Súmula e ata', icone: 'pi pi-file-edit', alerta: ataMudou },
    {
      id: 'chamada',
      rotulo: 'Chamada',
      icone: 'pi pi-users',
      contagem: grupos.faltantes.length + grupos.justificados.length ? `${grupos.faltantes.length + grupos.justificados.length} ausente(s)` : undefined,
      alerta: chamadaMudou,
    },
    { id: 'acoes', rotulo: 'Plano de ação', icone: 'pi pi-list-check', contagem: acoesDesta.length ? String(acoesDesta.length) : undefined },
    { id: 'historico', rotulo: 'Histórico', icone: 'pi pi-history', contagem: log.length ? String(log.length) : undefined },
  ];

  const passos = [
    { rotulo: 'Súmula prevista', feito: sumula.length > 0 },
    { rotulo: 'Ata escrita', feito: !ataVazia(ataSalva) },
    { rotulo: 'Reunião concluída', feito: concluida },
  ];

  return (
    <Sidebar visible fullScreen showHeader={false} className="reuniao-modal" onHide={voltar}>
      <div className="reuniao-modal__topo">
        <div className="reuniao-detalhe">
          <header className="reuniao-cabeca">
            <button type="button" className="reuniao-fechar" aria-label="Fechar reunião" title="Fechar (Esc)" onClick={voltar}>
              <i className="pi pi-times" aria-hidden />
            </button>
            <div className="reuniao-cabeca__titulo">
              <span className={`reuniao-selo reuniao-selo--${visual.id}`}>{reescrevendo ? 'Reescrevendo' : visual.rotulo}</span>
              <h2>
                Reunião {TIPO[reuniao.tipo].toLowerCase()} · {formatarDataBr(reuniao.data_reuniao)}
              </h2>
              <p>{[horario, reuniao.local].filter(Boolean).join(' · ') || 'Horário e local não informados'}</p>
            </div>
            {cancelada ? null : (
              <div className="reuniao-cabeca__acoes">
                <Button type="button" label="Editar dados" icon="pi pi-pencil" outlined size="small" onClick={onEditar} />
                {concluida ? (
                  <>
                    <Button type="button" label="Imprimir ata" icon="pi pi-print" outlined size="small" onClick={imprimirAta} />
                    <Button type="button" label="Enviar ata" icon="pi pi-envelope" outlined size="small" onClick={enviarAta} />
                  </>
                ) : (
                  <span
                    className="reuniao-bloqueio"
                    tabIndex={0}
                    role="note"
                    aria-label="Imprimir e enviar a ata ficam liberados depois que a reunião for concluída."
                    onClick={avisarBloqueio}
                    onKeyDown={(evento) => {
                      if (evento.key === 'Enter' || evento.key === ' ') {
                        evento.preventDefault();
                        avisarBloqueio();
                      }
                    }}
                  >
                    <Button type="button" label="Imprimir ata" icon="pi pi-lock" outlined size="small" disabled tabIndex={-1} />
                    <Button type="button" label="Enviar ata" icon="pi pi-lock" outlined size="small" disabled tabIndex={-1} />
                    <span className="reuniao-bloqueio__balao" aria-hidden>
                      <i className="pi pi-lock" />
                      <span>
                        <b>Conclua a reunião primeiro</b>
                        Imprimir e enviar a ata ficam liberados depois que a reunião for finalizada.
                      </span>
                    </span>
                  </span>
                )}
              </div>
            )}
            {cancelada ? null : (
              <ol className="reuniao-passos" aria-label="Andamento da reunião">
                {passos.map((passo) => (
                  <li key={passo.rotulo} className={passo.feito ? 'is-feito' : ''}>
                    <i className={passo.feito ? 'pi pi-check-circle' : 'pi pi-circle'} aria-hidden /> {passo.rotulo}
                  </li>
                ))}
              </ol>
            )}
          </header>

          <nav className="reuniao-abas" role="tablist" aria-label="Partes da reunião">
            {abas.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={aba === item.id}
                className={aba === item.id ? 'is-ativa' : ''}
                onClick={() => setAba(item.id)}
              >
                <i className={item.icone} aria-hidden />
                {item.rotulo}
                {item.contagem ? <span className="reuniao-abas__conta">{item.contagem}</span> : null}
                {item.alerta ? <span className="reuniao-abas__pendente" title="Alterações não salvas" /> : null}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className={`reuniao-modal__rolagem${aba === 'chamada' ? ' is-ajustada' : ''}`}>
        <div className="reuniao-detalhe">
          {cancelada ? (
            <p className="reuniao-alerta reuniao-alerta--cancelada">
              <i className="pi pi-ban" aria-hidden />
              <span>Reunião cancelada. Ela fica no quadro só para consulta; o cancelamento está no histórico.</span>
            </p>
          ) : null}
          {concluida && !reescrevendo ? (
            <p className="reuniao-alerta reuniao-alerta--info">
              <i className="pi pi-lock" aria-hidden />
              <span>
                Reunião concluída{reuniao.concluida_em ? ` em ${new Date(reuniao.concluida_em).toLocaleDateString('pt-BR')}` : ''}. Para corrigir a ata ou a
                chamada, use <b>Reescrever</b>. Cada reescrita pede um motivo e guarda a versão anterior no histórico.
              </span>
            </p>
          ) : null}
          {reescrevendo ? (
            <p className="reuniao-alerta">
              <i className="pi pi-exclamation-triangle" aria-hidden />
              <span>Você está reescrevendo uma reunião já concluída. Ao salvar, informe o motivo. A versão anterior fica no histórico.</span>
            </p>
          ) : null}

          {aba === 'ata' ? (
            <div className="reuniao-ata-grade" role="tabpanel">
              <aside className="reuniao-bloco reuniao-bloco--sumula">
                <div className="reuniao-bloco__cabeca">
                  <h3>Súmula prevista</h3>
                  {cancelada ? null : (
                    <button type="button" className="reuniao-link" onClick={onEditar}>
                      Alterar
                    </button>
                  )}
                </div>
                {sumula.length ? (
                  <ol className="reuniao-sumula">
                    {sumula.map((item, indice) => (
                      <li key={`${indice}-${item}`}>{item}</li>
                    ))}
                  </ol>
                ) : cancelada ? (
                  <p className="reuniao-vazio">Nenhum item previsto.</p>
                ) : (
                  <button type="button" className="reuniao-sumula reuniao-sumula--vazia" onClick={onEditar}>
                    Nenhum item previsto. Clique para incluir.
                  </button>
                )}
                <div className="reuniao-mini-resumo">
                  <span>
                    <b>{grupos.presentes.length}</b> presentes
                  </span>
                  <span className={grupos.faltantes.length ? 'is-falta' : ''}>
                    <b>{grupos.faltantes.length}</b> ausentes
                  </span>
                  <span className={grupos.justificados.length ? 'is-justificou' : ''}>
                    <b>{grupos.justificados.length}</b> justificados
                  </span>
                  <span>
                    <b>{acoesDesta.filter((acao) => acao.status === 'concluida').length}</b> ações concluídas
                  </span>
                </div>
              </aside>
              <section className="reuniao-bloco reuniao-bloco--ata">
                <div className="reuniao-bloco__cabeca">
                  <div>
                    <h3>Ata da reunião</h3>
                    <p>O que foi dito e decidido. É este texto que sai na impressão e no e-mail.</p>
                  </div>
                </div>
                <div key={`ata-${shake}`} className={erroAta ? 'reuniao-ata-erro is-shake' : ''}>
                  <EditorAta
                    id="reuniao-ata"
                    valor={ata}
                    onChange={(html) => {
                      setAta(html);
                      if (erroAta) setErroAta('');
                    }}
                    editavel={editavel}
                    roteiro={sumula}
                  />
                </div>
                {erroAta ? <small className="reuniao-erro">{erroAta}</small> : null}
                {!editavel && ataVazia(ata) ? <p className="reuniao-vazio">Sem ata registrada.</p> : null}
              </section>
            </div>
          ) : null}

          {aba === 'chamada' ? (
            <section className="reuniao-bloco reuniao-bloco--chamada" role="tabpanel">
              <div className="reuniao-contadores">
                <article className="reuniao-contador reuniao-contador--presente">
                  <strong>{grupos.presentes.length}</strong>
                  <span>Presentes</span>
                </article>
                <article className="reuniao-contador reuniao-contador--faltante">
                  <strong>{grupos.faltantes.length}</strong>
                  <span>Ausentes</span>
                  {grupos.faltantes.length ? (
                    <small title={grupos.faltantes.map((membro) => membro.nome).join(', ')}>
                      {grupos.faltantes.map((membro) => membro.nome).join(', ')}
                    </small>
                  ) : null}
                </article>
                <article className="reuniao-contador reuniao-contador--justificado">
                  <strong>{grupos.justificados.length}</strong>
                  <span>Justificados</span>
                  {grupos.justificados.length ? (
                    <small
                      title={grupos.justificados
                        .map((membro) => `${membro.nome}${chamada[membro.id]?.justificativa ? ` — ${chamada[membro.id].justificativa}` : ''}`)
                        .join('\n')}
                    >
                      {grupos.justificados.map((membro) => membro.nome).join(', ')}
                    </small>
                  ) : null}
                </article>
              </div>

              <div className="reuniao-bloco__cabeca">
                <div>
                  <h3>Quem participou</h3>
                  <p>
                    Todos começam como ausentes. Clique no quadro de cada pessoa para alternar:{' '}
                    <span className="presenca-legenda presenca-legenda--faltante">Ausente</span> →{' '}
                    <span className="presenca-legenda presenca-legenda--justificado">Justificado</span> →{' '}
                    <span className="presenca-legenda presenca-legenda--presente">Presente</span>
                  </p>
                </div>
                {editavel && comissao.length ? (
                  <button type="button" className="reuniao-link" onClick={marcarTodosPresentes}>
                    Marcar todos como presentes
                  </button>
                ) : null}
              </div>
              {carregando ? <p className="reuniao-vazio">Carregando a chamada…</p> : null}
              {!carregando && comissao.length === 0 ? <p className="reuniao-vazio">Nenhum membro em exercício para a chamada.</p> : null}
              <div className="reuniao-chamada">
                {comissao.map((membro) => {
                  const linha = chamada[membro.id] ?? { situacao: 'faltante' as const, justificativa: '' };
                  const estado = PRESENCA[linha.situacao];
                  const salva = chamadaSalva[membro.id];
                  const justificativaSalva =
                    salva?.situacao === 'justificado' && salva.justificativa.trim() === linha.justificativa.trim() && Boolean(linha.justificativa.trim());
                  return (
                    <article key={membro.id} className={`reuniao-pessoa reuniao-pessoa--${linha.situacao}`}>
                      <div className="reuniao-pessoa__linha">
                        <span className="membro-com-cargo">
                          <strong>{membro.nome}</strong>
                          <BadgeCargo funcao={membro.funcao} condicao={membro.condicao} />
                        </span>
                        <button
                          type="button"
                          className={`presenca-tri presenca-tri--${linha.situacao}`}
                          disabled={!editavel}
                          aria-label={`${membro.nome}: ${estado.rotulo}. Clique para marcar ${PRESENCA[estado.proxima].rotulo.toLowerCase()}.`}
                          title={editavel ? `Clique para marcar ${PRESENCA[estado.proxima].rotulo.toLowerCase()}` : undefined}
                          onClick={() => mudarPresenca(membro.id, { situacao: estado.proxima })}
                        >
                          <span className="presenca-tri__caixa">
                            <i className={estado.icone} aria-hidden />
                          </span>
                          {estado.rotulo}
                        </button>
                      </div>
                      {linha.situacao === 'justificado' ? (
                        <div className={`reuniao-justificativa${editavel && !reescrevendo ? ' tem-botao' : ''}`}>
                          <CampoFormulario
                            id={`justificativa-${membro.id}`}
                            rotulo="Justificativa *"
                            largo
                            erro={errosChamada[membro.id]}
                            shake={shake}
                          >
                            <InputText
                              id={`justificativa-${membro.id}`}
                              value={linha.justificativa}
                              maxLength={300}
                              disabled={!editavel}
                              onChange={(evento) => mudarPresenca(membro.id, { justificativa: evento.target.value })}
                              onKeyDown={(evento) => {
                                if (evento.key === 'Enter' && editavel && !reescrevendo && !justificativaSalva) {
                                  evento.preventDefault();
                                  void salvarJustificativa(membro.id);
                                }
                              }}
                            />
                          </CampoFormulario>
                          {editavel && !reescrevendo ? (
                            <button
                              type="button"
                              className={`reuniao-justificativa__salvar${justificativaSalva ? ' is-salva' : ''}`}
                              disabled={ocupado || justificativaSalva}
                              onClick={() => void salvarJustificativa(membro.id)}
                            >
                              <i className={justificativaSalva ? 'pi pi-check' : 'pi pi-save'} aria-hidden />
                              {justificativaSalva ? 'Salva' : 'Salvar'}
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </section>
          ) : null}

          {aba === 'acoes' ? (
            <AcoesDaReuniao
              reuniao={reuniao}
              projetoId={projetoId}
              acoes={acoes}
              comissao={comissao}
              editavel={editavel}
              onMudou={onMudou}
              onRegistrou={() => void recarregarLog()}
              onAviso={onAviso}
            />
          ) : null}

          {aba === 'historico' ? (
            <section className="reuniao-bloco" role="tabpanel">
              <h3>Histórico da reunião</h3>
              <p>Começa quando a reunião é concluída. A partir daí, toda mudança fica registrada com data, hora, motivo e a versão anterior da ata.</p>
              {log.length === 0 ? (
                <p className="reuniao-vazio">
                  {concluida ? 'Nenhuma alteração depois da conclusão.' : 'O histórico começa a ser registrado quando a reunião for concluída.'}
                </p>
              ) : null}
              <ol className="reuniao-log">
                {log.map((item) => (
                  <li key={item.id} className={item.apos_conclusao ? 'is-apos' : ''}>
                    <time>{new Date(item.quando).toLocaleString('pt-BR')}</time>
                    <strong>{item.evento}</strong>
                    {item.detalhe ? <span>{item.apos_conclusao ? `Motivo: ${item.detalhe}` : item.detalhe}</span> : null}
                    {item.apos_conclusao ? <em>Após a conclusão</em> : null}
                    {item.versao_anterior ? (
                      <details className="reuniao-log__versao">
                        <summary>Ver a ata antes desta mudança</summary>
                        <div dangerouslySetInnerHTML={{ __html: ataParaHtml(item.versao_anterior) }} />
                      </details>
                    ) : null}
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          <Dialog
            header="Concluir a reunião?"
            visible={confirmarConclusao}
            style={{ width: 'min(480px, 94vw)' }}
            onHide={() => setConfirmarConclusao(false)}
            footer={
              <div className="reuniao-dialogo__botoes">
                <Button type="button" label="Voltar" text onClick={() => setConfirmarConclusao(false)} />
                <Button type="button" label="Concluir" icon="pi pi-check" loading={ocupado} onClick={concluir} />
              </div>
            }
          >
            <p>
              A ata e a chamada serão salvas e a reunião fica protegida. Depois disso, qualquer mudança só com <b>Reescrever</b>, informando o motivo.
            </p>
            <ul className="reuniao-dialogo__resumo">
              <li>{grupos.presentes.length} presente(s)</li>
              <li>{grupos.faltantes.length} ausente(s)</li>
              <li>{grupos.justificados.length} justificado(s)</li>
              <li>{acoesDesta.filter((acao) => acao.status === 'concluida').length} ação(ões) concluída(s) nesta reunião</li>
            </ul>
          </Dialog>

          <Dialog
            header="Motivo da reescrita"
            visible={pedirMotivo}
            style={{ width: 'min(520px, 94vw)' }}
            onHide={() => setPedirMotivo(false)}
            footer={
              <div className="reuniao-dialogo__botoes">
                <Button type="button" label="Voltar" text onClick={() => setPedirMotivo(false)} />
                <Button type="button" label="Salvar reescrita" icon="pi pi-save" loading={ocupado} onClick={salvarReescrita} />
              </div>
            }
          >
            <p>Esta reunião já estava concluída. Conte por que ela está sendo alterada. O motivo e a versão anterior ficam no histórico.</p>
            <CampoFormulario id="reuniao-motivo" rotulo="Motivo *" largo erro={erroMotivo} shake={shake}>
              <InputTextarea
                id="reuniao-motivo"
                value={motivo}
                rows={3}
                maxLength={500}
                autoFocus
                onChange={(evento) => {
                  setMotivo(evento.target.value);
                  if (erroMotivo) setErroMotivo('');
                }}
              />
            </CampoFormulario>
          </Dialog>
        </div>
      </div>
      {cancelada ? null : (
        <footer className={`reuniao-barra${pendente ? ' is-pendente' : ''}`}>
          <span className="reuniao-barra__estado">
            {pendente ? (
              <>
                <i className="pi pi-circle-fill" aria-hidden /> Alterações não salvas
              </>
            ) : concluida && !reescrevendo ? (
              <>
                <i className="pi pi-lock" aria-hidden /> Concluída e protegida
              </>
            ) : (
              <>
                <i className="pi pi-check" aria-hidden /> Tudo salvo
              </>
            )}
          </span>
          <div className="reuniao-barra__botoes">
            {!concluida ? (
              <>
                <Button type="button" label="Salvar" outlined loading={ocupado} disabled={!pendente || ocupado} onClick={salvar} />
                <Button type="button" label="Concluir reunião" icon="pi pi-check" disabled={ocupado || carregando} onClick={pedirConclusao} />
              </>
            ) : reescrevendo ? (
              <>
                <Button type="button" label="Cancelar" text disabled={ocupado} onClick={cancelarReescrita} />
                <Button type="button" label="Salvar reescrita" icon="pi pi-save" loading={ocupado} onClick={abrirMotivo} />
              </>
            ) : (
              <Button type="button" label="Reescrever" icon="pi pi-pencil" onClick={() => setReescrevendo(true)} />
            )}
          </div>
        </footer>
      )}
    </Sidebar>
  );
}
