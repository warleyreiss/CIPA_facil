import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Sidebar } from 'primereact/sidebar';
import { Toast } from 'primereact/toast';
import { BadgeCargo } from '../../components/BadgeCargo';
import { CampoFormulario } from '../../components/forms/CampoFormulario';
import { PageShell } from '../../components/layout/PageShell';
import { useProjeto } from '../../contexts/ProjetoContext';
import {
  avisarAcoesAtualizadas,
  ehAcaoRotina,
  listarAcoes,
  salvarAcaoOperacional,
  type Acao,
  type NaturezaAcao,
  type StatusAcao,
} from '../../lib/acaoService';
import { diasAte, formatarDataBr, isoData } from '../../lib/eleicao/etapasEleicao';
import { extrairMensagemErro } from '../../lib/errorUtils';
import { listarMembros, type MembroCipa } from '../../lib/gestaoCipaService';
import '../../assets/css/especificos/acoes-gestao.css';

function opcaoMembro(opcao: { label?: string; funcao?: string | null; condicao?: string | null } | null) {
  if (!opcao?.label) return null;
  return (
    <span className="membro-com-cargo">
      <span>{opcao.label}</span>
      <BadgeCargo funcao={opcao.funcao} condicao={opcao.condicao} />
    </span>
  );
}

const NATUREZA: Record<NaturezaAcao, string> = {
  correcao: 'Correção',
  prevencao: 'Prevenção',
};

const vazio = {
  titulo: '',
  natureza: 'correcao' as NaturezaAcao,
  descricao: '',
  membroId: '' as string,
  prazo: '',
  status: 'planejada' as StatusAcao,
};

type Situacao = 'aberta' | 'atrasada' | 'concluida';

const emAberto = (acao: Acao) => acao.status === 'planejada' || acao.status === 'em_execucao';

function situacaoDa(acao: Acao): Situacao {
  if (!emAberto(acao)) return 'concluida';
  return diasAte(acao.prazo) < 0 ? 'atrasada' : 'aberta';
}

const ROTULO_SITUACAO: Record<Situacao, string> = {
  aberta: 'Em aberto',
  atrasada: 'Atrasada',
  concluida: 'Concluída',
};

export default function GestaoAcoes() {
  const toast = useRef<Toast>(null);
  const { projetoId } = useProjeto();
  const [acoes, setAcoes] = useState<Acao[]>([]);
  const [membros, setMembros] = useState<MembroCipa[]>([]);
  const [editando, setEditando] = useState<string | 'nova' | null>(null);
  const [form, setForm] = useState(vazio);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [shake, setShake] = useState(0);
  const [salvando, setSalvando] = useState(false);
  const [filtro, setFiltro] = useState<'abertas' | 'atrasadas' | 'concluidas'>('abertas');
  const [tipo, setTipo] = useState<NaturezaAcao | 'todos'>('todos');
  const [dataDe, setDataDe] = useState(() => {
    const hoje = new Date();
    return isoData(new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1));
  });
  const [dataAte, setDataAte] = useState(() => {
    const hoje = new Date();
    return isoData(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0));
  });
  const [finalizando, setFinalizando] = useState<Acao | null>(null);
  const [realizado, setRealizado] = useState('');
  const [concluidaEm, setConcluidaEm] = useState('');
  const [errosFim, setErrosFim] = useState<Record<string, string>>({});

  const avisar = (summary: string, detail: string, severity: 'success' | 'warn' | 'error' = 'warn') => {
    toast.current?.show({ severity, summary, detail });
  };

  const carregar = useCallback(async () => {
    if (!projetoId) return;
    const [lista, comissao] = await Promise.all([listarAcoes(projetoId), listarMembros(projetoId)]);
    setAcoes(lista.filter(ehAcaoRotina));
    setMembros(comissao);
  }, [projetoId]);

  useEffect(() => {
    carregar().catch((erro) => avisar('Não foi possível carregar as ações', extrairMensagemErro(erro), 'error'));
  }, [carregar]);

  function abrirNova() {
    setForm(vazio);
    setErros({});
    setEditando('nova');
  }

  function abrirEdicao(acao: Acao) {
    setForm({
      titulo: acao.titulo,
      natureza: acao.natureza === 'prevencao' ? 'prevencao' : 'correcao',
      descricao: acao.descricao || acao.detalhe || '',
      membroId: acao.membro_id || '',
      prazo: acao.prazo,
      status: acao.status,
    });
    setErros({});
    setEditando(acao.id);
  }

  function abrirFinalizacao(acao: Acao) {
    setFinalizando(acao);
    setRealizado(acao.realizado || '');
    setConcluidaEm(acao.data_finalizacao || isoData(new Date()));
    setErrosFim({});
  }

  async function gravarAcao(acao: Parameters<typeof salvarAcaoOperacional>[0], titulo: string, texto: string) {
    setSalvando(true);
    try {
      await salvarAcaoOperacional(acao);
      avisarAcoesAtualizadas();
      await carregar();
      avisar(titulo, texto, 'success');
      return true;
    } catch (erro) {
      avisar('Não foi possível salvar a ação', extrairMensagemErro(erro), 'error');
      return false;
    } finally {
      setSalvando(false);
    }
  }

  async function gravar(evento: React.FormEvent) {
    evento.preventDefault();
    const novos: Record<string, string> = {};
    if (!form.titulo.trim()) novos.titulo = 'Informe o título.';
    if (!form.descricao.trim()) novos.descricao = 'Descreva o problema ou a prevenção.';
    if (!form.prazo) novos.prazo = 'Informe o prazo.';
    if (!projetoId || Object.keys(novos).length) {
      setErros(novos);
      setShake((n) => n + 1);
      return;
    }
    setErros({});
    const atual = editando && editando !== 'nova' ? acoes.find((item) => item.id === editando) : undefined;
    const ok = await gravarAcao(
      {
        id: atual?.id,
        projetoId,
        titulo: form.titulo,
        natureza: form.natureza,
        descricao: form.descricao,
        membroId: form.membroId || null,
        prazo: form.prazo,
        dataFinalizacao: atual?.data_finalizacao || '',
        realizado: atual?.realizado || '',
        status: form.status,
      },
      'Ação salva',
      'O registro de correção ou prevenção foi gravado.',
    );
    if (ok) setEditando(null);
  }

  async function finalizar() {
    if (!finalizando || !projetoId) return;
    const novos: Record<string, string> = {};
    if (realizado.trim().length < 10) novos.realizado = 'Descreva o que foi feito (pelo menos 10 caracteres).';
    if (!concluidaEm) novos.concluidaEm = 'Informe o dia da conclusão.';
    else if (concluidaEm > isoData(new Date())) novos.concluidaEm = 'A conclusão não pode ser uma data futura.';
    if (Object.keys(novos).length) {
      setErrosFim(novos);
      setShake((n) => n + 1);
      return;
    }
    const ok = await gravarAcao(
      {
        id: finalizando.id,
        projetoId,
        titulo: finalizando.titulo,
        natureza: finalizando.natureza === 'prevencao' ? 'prevencao' : 'correcao',
        descricao: finalizando.descricao || finalizando.detalhe || '',
        membroId: finalizando.membro_id || null,
        prazo: finalizando.prazo,
        dataFinalizacao: concluidaEm,
        realizado,
        status: 'concluida',
      },
      'Ação finalizada',
      'O que foi realizado ficou registrado.',
    );
    if (ok) setFinalizando(null);
  }

  async function reabrir(acao: Acao) {
    if (!projetoId) return;
    await gravarAcao(
      {
        id: acao.id,
        projetoId,
        titulo: acao.titulo,
        natureza: acao.natureza === 'prevencao' ? 'prevencao' : 'correcao',
        descricao: acao.descricao || acao.detalhe || '',
        membroId: acao.membro_id || null,
        prazo: acao.prazo,
        dataFinalizacao: '',
        realizado: acao.realizado || '',
        status: 'planejada',
      },
      'Ação reaberta',
      'A ação voltou para a lista em aberto.',
    );
  }

  const dataDoFiltro = (acao: Acao) =>
    filtro === 'concluidas' ? acao.data_finalizacao || acao.concluida_em?.slice(0, 10) || acao.prazo : acao.prazo;
  const visiveis = acoes
    .filter((acao) => {
      const situacao = situacaoDa(acao);
      if (filtro === 'abertas' && situacao === 'concluida') return false;
      if (filtro === 'atrasadas' && situacao !== 'atrasada') return false;
      if (filtro === 'concluidas' && situacao !== 'concluida') return false;
      if (tipo !== 'todos' && (acao.natureza || 'correcao') !== tipo) return false;
      const data = dataDoFiltro(acao);
      if (dataDe && data < dataDe) return false;
      if (dataAte && data > dataAte) return false;
      return true;
    })
    .sort((a, b) =>
      filtro === 'concluidas' ? dataDoFiltro(b).localeCompare(dataDoFiltro(a)) : a.prazo.localeCompare(b.prazo),
    );
  const abertas = acoes.filter(emAberto);
  const atrasadas = abertas.filter((acao) => diasAte(acao.prazo) < 0);
  const concluidas = acoes.filter((acao) => !emAberto(acao));
  const nomeMembro = (id?: string | null) => membros.find((item) => item.id === id);

  return (
    <PageShell
      title="Ações da CIPA"
      description="Correção de problemas do dia a dia e ações de prevenção. O processo eleitoral fica na tela de eleições."
      actions={<Button type="button" label="Nova ação" icon="pi pi-plus" onClick={abrirNova} />}
    >
      <Toast ref={toast} />
      {!projetoId ? <p className="eleicoes-aviso">Selecione um projeto para lançar as ações.</p> : null}

      <Sidebar
        visible={Boolean(editando)}
        position="right"
        className="acao-sheet"
        overlayClassName="acao-sheet-mask"
        style={{ width: 'min(760px, 96vw)' }}
        header={editando === 'nova' ? 'Nova ação' : 'Editar ação'}
        onHide={() => setEditando(null)}
      >
        <form className="painel-layout acao-form cepi-form" onSubmit={gravar}>
          <div className="painel-corpo painel-corpo--fill">
            <div className="cepi-form__grid">
              <CampoFormulario id="acao-titulo" rotulo="Título" erro={erros.titulo} shake={shake}>
                <InputText id="acao-titulo" value={form.titulo} onChange={(evento) => setForm({ ...form, titulo: evento.target.value })} />
              </CampoFormulario>
              <CampoFormulario id="acao-natureza" rotulo="Tipo">
                <Dropdown
                  inputId="acao-natureza"
                  value={form.natureza}
                  options={[
                    { label: 'Correção de problema', value: 'correcao' },
                    { label: 'Prevenção', value: 'prevencao' },
                  ]}
                  onChange={(evento) => setForm({ ...form, natureza: evento.value })}
                />
              </CampoFormulario>
              <CampoFormulario id="acao-descricao" rotulo="Descrição" largo erro={erros.descricao} shake={shake}>
                <InputTextarea id="acao-descricao" rows={4} value={form.descricao} onChange={(evento) => setForm({ ...form, descricao: evento.target.value })} />
              </CampoFormulario>
              <CampoFormulario id="acao-membro" rotulo="Membro responsável">
                <Dropdown
                  inputId="acao-membro"
                  value={form.membroId}
                  options={membros.map((membro) => ({
                    label: membro.situacao === 'em_exercicio' ? membro.nome : `${membro.nome} (${membro.situacao})`,
                    value: membro.id,
                    funcao: membro.funcao,
                    condicao: membro.condicao,
                  }))}
                  placeholder="Quem acompanha"
                  onChange={(evento) => setForm({ ...form, membroId: evento.value })}
                  itemTemplate={opcaoMembro}
                  valueTemplate={opcaoMembro}
                />
              </CampoFormulario>
              <CampoFormulario id="acao-prazo" rotulo="Prazo (data limite)" erro={erros.prazo} shake={shake}>
                <InputText id="acao-prazo" type="date" value={form.prazo} onChange={(evento) => setForm({ ...form, prazo: evento.target.value })} />
              </CampoFormulario>
            </div>
          </div>
          <div className="form-rodape">
            <div className="form-rodape-ajuda" />
            <div className="form-rodape-acoes">
              <Button type="button" label="Cancelar" outlined onClick={() => setEditando(null)} />
              <Button type="submit" label={editando === 'nova' ? 'Incluir ação' : 'Salvar alterações'} loading={salvando} />
            </div>
          </div>
        </form>
      </Sidebar>

      <Dialog
        visible={Boolean(finalizando)}
        onHide={() => setFinalizando(null)}
        header="Finalizar ação"
        style={{ width: 'min(560px, 94vw)' }}
        footer={
          <div className="acao-dialogo__rodape">
            <Button type="button" label="Cancelar" outlined onClick={() => setFinalizando(null)} />
            <Button type="button" label="Finalizar ação" icon="pi pi-check" loading={salvando} onClick={() => void finalizar()} />
          </div>
        }
      >
        {finalizando ? (
          <div className="acao-finalizar cepi-form">
            <p className="acao-finalizar__resumo">
              <strong>{finalizando.titulo}</strong>
              <span>Prazo {formatarDataBr(finalizando.prazo)}</span>
            </p>
            <CampoFormulario id="acao-realizado" rotulo="Ações realizadas" largo erro={errosFim.realizado} shake={shake}>
              <InputTextarea
                id="acao-realizado"
                rows={5}
                value={realizado}
                placeholder="O que foi feito para corrigir ou prevenir"
                onChange={(evento) => setRealizado(evento.target.value)}
              />
            </CampoFormulario>
            <CampoFormulario id="acao-concluida-em" rotulo="Concluída em" erro={errosFim.concluidaEm} shake={shake}>
              <InputText
                id="acao-concluida-em"
                type="date"
                max={isoData(new Date())}
                value={concluidaEm}
                onChange={(evento) => setConcluidaEm(evento.target.value)}
              />
            </CampoFormulario>
          </div>
        ) : null}
      </Dialog>

      <div className="acao-painel">
        <div className="acao-resumo">
          <article>
            <span>Em aberto</span>
            <strong>{abertas.length}</strong>
          </article>
          <article className={atrasadas.length ? 'is-alerta' : ''}>
            <span>Atrasadas</span>
            <strong>{atrasadas.length}</strong>
          </article>
          <article>
            <span>Concluídas</span>
            <strong>{concluidas.length}</strong>
          </article>
          <article className="acao-resumo__datas">
            <span>{filtro === 'concluidas' ? 'Concluída entre' : 'Prazo entre'}</span>
            <div className="acao-resumo__datas-campos">
              <InputText
                type="date"
                aria-label="Data inicial"
                value={dataDe}
                max={dataAte || undefined}
                onChange={(evento) => setDataDe(evento.target.value)}
              />
              <small>até</small>
              <InputText
                type="date"
                aria-label="Data final"
                value={dataAte}
                min={dataDe || undefined}
                onChange={(evento) => setDataAte(evento.target.value)}
              />
              {dataDe || dataAte ? (
                <button
                  type="button"
                  className="acao-resumo__limpar"
                  aria-label="Limpar datas"
                  title="Limpar datas"
                  onClick={() => {
                    setDataDe('');
                    setDataAte('');
                  }}
                >
                  <i className="pi pi-times" />
                </button>
              ) : null}
            </div>
          </article>
        </div>
        <section className="acao-quadro">
          <div className="acao-filtros">
            <div className="acao-filtros__abas" role="tablist" aria-label="Situação das ações">
              {(
                [
                  ['abertas', `Em aberto (${abertas.length})`],
                  ['atrasadas', `Atrasadas (${atrasadas.length})`],
                  ['concluidas', `Concluídas (${concluidas.length})`],
                ] as const
              ).map(([id, rotulo]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={filtro === id}
                  className={filtro === id ? 'is-ativa' : ''}
                  onClick={() => setFiltro(id)}
                >
                  {rotulo}
                </button>
              ))}
            </div>
            <div className="acao-filtros__campos">
              <Dropdown
                inputId="acao-filtro-tipo"
                value={tipo}
                options={[
                  { label: 'Todos os tipos', value: 'todos' },
                  { label: 'Correção', value: 'correcao' },
                  { label: 'Prevenção', value: 'prevencao' },
                ]}
                onChange={(evento) => setTipo(evento.value)}
                aria-label="Tipo"
              />
              {tipo !== 'todos' ? <Button type="button" label="Limpar" text onClick={() => setTipo('todos')} /> : null}
            </div>
          </div>
          {visiveis.length === 0 ? (
            <button type="button" className="acao-vazia" onClick={abrirNova}>
              <span className="acao-vazia__icone" aria-hidden><i className="pi pi-check-square" /></span>
              <strong>
                {filtro === 'concluidas' ? 'Nenhuma ação concluída neste filtro' : filtro === 'atrasadas' ? 'Nenhuma ação atrasada' : 'Nenhuma ação em aberto'}
              </strong>
              <span>Inclua uma correção ou uma prevenção, com responsável e prazo.</span>
            </button>
          ) : (
            <table className="acao-tabela">
              <thead>
                <tr>
                  <th>Ação</th>
                  <th>Tipo</th>
                  <th>Responsável</th>
                  <th>Prazo</th>
                  <th>Status</th>
                  <th aria-label="Opções" />
                </tr>
              </thead>
              <tbody>
                {visiveis.map((acao) => {
                  const situacao = situacaoDa(acao);
                  const responsavel = nomeMembro(acao.membro_id);
                  return (
                    <tr key={acao.id}>
                      <td data-rotulo="Ação">
                        <strong>{acao.titulo}</strong>
                        <small>{acao.descricao || acao.detalhe || 'Sem descrição.'}</small>
                        {acao.status === 'concluida' && acao.realizado ? (
                          <small className="acao-tabela__realizado">Realizado: {acao.realizado}</small>
                        ) : null}
                      </td>
                      <td data-rotulo="Tipo">
                        <span className={`acao-selo acao-selo--${acao.natureza || 'correcao'}`}>{NATUREZA[acao.natureza || 'correcao']}</span>
                      </td>
                      <td data-rotulo="Responsável">
                        {responsavel ? (
                          <span className="membro-com-cargo">
                            <span>{responsavel.nome}</span>
                            <BadgeCargo funcao={responsavel.funcao} condicao={responsavel.condicao} />
                          </span>
                        ) : (
                          <span className="acao-tabela__vazio">—</span>
                        )}
                      </td>
                      <td data-rotulo="Prazo">
                        {formatarDataBr(acao.prazo)}
                        {acao.data_finalizacao ? <small>Concluída em {formatarDataBr(acao.data_finalizacao)}</small> : null}
                      </td>
                      <td data-rotulo="Status">
                        <span className={`acao-selo acao-selo--${situacao}`}>
                          {acao.status === 'cancelada' ? 'Cancelada' : ROTULO_SITUACAO[situacao]}
                        </span>
                      </td>
                      <td className="acao-tabela__opcoes">
                        <button type="button" className="acao-opcao" data-dica="Editar" aria-label={`Editar ${acao.titulo}`} onClick={() => abrirEdicao(acao)}>
                          <i className="pi pi-pencil" aria-hidden />
                        </button>
                        {emAberto(acao) ? (
                          <button type="button" className="acao-opcao acao-opcao--finalizar" data-dica="Finalizar ação" aria-label={`Finalizar ${acao.titulo}`} onClick={() => abrirFinalizacao(acao)}>
                            <i className="pi pi-check-circle" aria-hidden />
                          </button>
                        ) : null}
                        {!emAberto(acao) ? (
                          <>
                            <button type="button" className="acao-opcao acao-opcao--finalizar" data-dica="Ver ou corrigir o realizado" aria-label={`Ver o realizado de ${acao.titulo}`} onClick={() => abrirFinalizacao(acao)}>
                              <i className="pi pi-file-edit" aria-hidden />
                            </button>
                            <button type="button" className="acao-opcao" data-dica="Reabrir" aria-label={`Reabrir ${acao.titulo}`} onClick={() => void reabrir(acao)}>
                              <i className="pi pi-replay" aria-hidden />
                            </button>
                          </>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </PageShell>
  );
}
