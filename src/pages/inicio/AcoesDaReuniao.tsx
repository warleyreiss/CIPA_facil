import { useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Sidebar } from 'primereact/sidebar';
import { BadgeCargo } from '../../components/BadgeCargo';
import { CampoFormulario } from '../../components/forms/CampoFormulario';
import { avisarAcoesAtualizadas, salvarAcaoOperacional, type Acao, type NaturezaAcao } from '../../lib/acaoService';
import { diasAte, formatarDataBr } from '../../lib/eleicao/etapasEleicao';
import { extrairMensagemErro } from '../../lib/errorUtils';
import type { MembroCipa, ReuniaoCipa } from '../../lib/gestaoCipaService';
import { vincularAcao } from '../../lib/reuniaoDetalhe';
import '../../assets/css/especificos/acoes-gestao.css';

const MIN_REALIZADO = 10;

const NATUREZA: Record<NaturezaAcao, string> = {
  correcao: 'Correção',
  prevencao: 'Prevenção',
};

type Form = { titulo: string; natureza: NaturezaAcao; descricao: string; membroId: string; prazo: string };

type Props = {
  reuniao: ReuniaoCipa;
  projetoId: string;
  acoes: Acao[];
  comissao: MembroCipa[];
  editavel: boolean;
  onMudou: () => void;
  onRegistrou: () => void;
  onAviso: (titulo: string, detalhe: string, tipo?: 'success' | 'warn' | 'error') => void;
};

const emAberto = (acao: Acao) => acao.status === 'planejada' || acao.status === 'em_execucao';

function opcaoMembro(opcao: { label?: string; funcao?: string | null; condicao?: string | null } | null) {
  if (!opcao?.label) return null;
  return (
    <span className="membro-com-cargo">
      <span>{opcao.label}</span>
      <BadgeCargo funcao={opcao.funcao} condicao={opcao.condicao} />
    </span>
  );
}

export default function AcoesDaReuniao({ reuniao, projetoId, acoes, comissao, editavel, onMudou, onRegistrou, onAviso }: Props) {
  const [busca, setBusca] = useState('');
  const [vendo, setVendo] = useState<Acao | null>(null);
  const [editando, setEditando] = useState<Acao | null>(null);
  const [form, setForm] = useState<Form>({ titulo: '', natureza: 'correcao', descricao: '', membroId: '', prazo: '' });
  const [erros, setErros] = useState<Record<string, string>>({});
  const [concluindo, setConcluindo] = useState<Acao | null>(null);
  const [realizado, setRealizado] = useState('');
  const [erroRealizado, setErroRealizado] = useState('');
  const [shake, setShake] = useState(0);
  const [ocupado, setOcupado] = useState(false);

  const termo = busca.trim().toLowerCase();
  const abertas = acoes
    .filter(emAberto)
    .filter((acao) => !termo || acao.titulo.toLowerCase().includes(termo) || (acao.descricao ?? '').toLowerCase().includes(termo))
    .sort((a, b) => a.prazo.localeCompare(b.prazo));
  const concluidasAqui = acoes.filter((acao) => acao.reuniao_id === reuniao.id && acao.status === 'concluida');
  const membro = (id?: string | null) => comissao.find((item) => item.id === id);

  function abrirEdicao(acao: Acao) {
    setForm({
      titulo: acao.titulo,
      natureza: acao.natureza === 'prevencao' ? 'prevencao' : 'correcao',
      descricao: acao.descricao || acao.detalhe || '',
      membroId: acao.membro_id || '',
      prazo: acao.prazo,
    });
    setErros({});
    setVendo(null);
    setEditando(acao);
  }

  function abrirConclusao(acao: Acao) {
    setRealizado(acao.realizado ?? '');
    setErroRealizado('');
    setVendo(null);
    setConcluindo(acao);
  }

  async function salvarEdicao(evento: React.FormEvent) {
    evento.preventDefault();
    if (!editando) return;
    const novos: Record<string, string> = {};
    if (!form.titulo.trim()) novos.titulo = 'Informe o título.';
    if (!form.descricao.trim()) novos.descricao = 'Descreva o problema ou a prevenção.';
    if (!form.prazo) novos.prazo = 'Informe o prazo.';
    if (Object.keys(novos).length) {
      setErros(novos);
      setShake((n) => n + 1);
      return;
    }
    setOcupado(true);
    try {
      await salvarAcaoOperacional({
        id: editando.id,
        projetoId,
        titulo: form.titulo,
        natureza: form.natureza,
        descricao: form.descricao,
        membroId: form.membroId || null,
        prazo: form.prazo,
        dataFinalizacao: editando.data_finalizacao || '',
        realizado: editando.realizado || '',
        status: editando.status,
      });
      avisarAcoesAtualizadas();
      onMudou();
      setEditando(null);
      onAviso('Ação salva', 'As alterações da ação foram gravadas.', 'success');
    } catch (erro) {
      onAviso('Plano de ação', extrairMensagemErro(erro), 'error');
    } finally {
      setOcupado(false);
    }
  }

  async function concluir() {
    if (!concluindo) return;
    if (realizado.trim().length < MIN_REALIZADO) {
      setErroRealizado(`Descreva o que foi feito (pelo menos ${MIN_REALIZADO} caracteres).`);
      setShake((n) => n + 1);
      return;
    }
    setOcupado(true);
    try {
      await vincularAcao(concluindo, reuniao, { realizado });
      avisarAcoesAtualizadas();
      onMudou();
      onRegistrou();
      onAviso('Ação concluída', `«${concluindo.titulo}» foi concluída nesta reunião.`, 'success');
      setConcluindo(null);
    } catch (erro) {
      onAviso('Plano de ação', extrairMensagemErro(erro), 'error');
    } finally {
      setOcupado(false);
    }
  }

  function linha(acao: Acao, aberta: boolean) {
    const dias = diasAte(acao.prazo);
    const atrasada = aberta && dias < 0;
    const responsavel = membro(acao.membro_id);
    return (
      <li key={acao.id} className={`reuniao-acao${aberta ? '' : ' is-feita'}${atrasada ? ' is-atrasada' : ''}`}>
        <div className="reuniao-acao__texto">
          <span className="reuniao-acao__topo">
            <span className={`acao-selo acao-selo--${acao.natureza || 'correcao'}`}>{NATUREZA[acao.natureza === 'prevencao' ? 'prevencao' : 'correcao']}</span>
            <strong>{acao.titulo}</strong>
          </span>
          <span className="reuniao-acao__meta">
            {aberta ? (
              <span className={atrasada ? 'is-atrasada' : ''}>
                {atrasada ? `Atrasada desde ${formatarDataBr(acao.prazo)}` : `Prazo ${formatarDataBr(acao.prazo)}`}
              </span>
            ) : (
              <span>Concluída nesta reunião</span>
            )}
            {responsavel ? <span>· {responsavel.nome}</span> : null}
          </span>
        </div>
        <div className="reuniao-acao__botoes">
          <button type="button" className="reuniao-acao__icone" title="Visualizar" aria-label={`Visualizar ${acao.titulo}`} onClick={() => setVendo(acao)}>
            <i className="pi pi-eye" aria-hidden />
          </button>
          {aberta && editavel ? (
            <>
              <button type="button" className="reuniao-acao__icone" title="Editar" aria-label={`Editar ${acao.titulo}`} onClick={() => abrirEdicao(acao)}>
                <i className="pi pi-pencil" aria-hidden />
              </button>
              <Button type="button" label="Concluir" icon="pi pi-check" size="small" onClick={() => abrirConclusao(acao)} />
            </>
          ) : null}
        </div>
      </li>
    );
  }

  const responsavelVisto = vendo ? membro(vendo.membro_id) : null;

  return (
    <div className="reuniao-acoes-grade" role="tabpanel">
      <section className="reuniao-bloco">
        <div className="reuniao-bloco__cabeca">
          <div>
            <h3>Em aberto no plano de ação</h3>
            <p>Veja, ajuste e conclua aqui mesmo. O que for concluído fica registrado nesta reunião.</p>
          </div>
        </div>
        <span className="p-input-icon-left reuniao-busca">
          <i className="pi pi-search" aria-hidden />
          <InputText value={busca} placeholder="Buscar ação" onChange={(evento) => setBusca(evento.target.value)} />
        </span>
        {abertas.length === 0 ? (
          <p className="reuniao-vazio">{termo ? 'Nenhuma ação encontrada.' : 'Nenhuma ação em aberto no plano.'}</p>
        ) : (
          <ul className="reuniao-acoes reuniao-acoes--livres">{abertas.map((acao) => linha(acao, true))}</ul>
        )}
      </section>

      <section className="reuniao-bloco">
        <h3>Concluídas nesta reunião</h3>
        <p>Saem da fila de prazos e entram na ata impressa.</p>
        {concluidasAqui.length === 0 ? (
          <p className="reuniao-vazio">Nenhuma ação concluída nesta reunião ainda.</p>
        ) : (
          <ul className="reuniao-acoes">{concluidasAqui.map((acao) => linha(acao, false))}</ul>
        )}
      </section>

      <Dialog
        header="Detalhes da ação"
        visible={Boolean(vendo)}
        style={{ width: 'min(560px, 94vw)' }}
        onHide={() => setVendo(null)}
        footer={
          vendo && emAberto(vendo) && editavel ? (
            <div className="reuniao-dialogo__botoes">
              <Button type="button" label="Editar" icon="pi pi-pencil" outlined onClick={() => abrirEdicao(vendo)} />
              <Button type="button" label="Concluir nesta reunião" icon="pi pi-check" onClick={() => abrirConclusao(vendo)} />
            </div>
          ) : undefined
        }
      >
        {vendo ? (
          <dl className="reuniao-acao-detalhe">
            <div>
              <dt>Título</dt>
              <dd>{vendo.titulo}</dd>
            </div>
            <div>
              <dt>Tipo</dt>
              <dd>{NATUREZA[vendo.natureza === 'prevencao' ? 'prevencao' : 'correcao']}</dd>
            </div>
            <div>
              <dt>Situação</dt>
              <dd>{emAberto(vendo) ? (diasAte(vendo.prazo) < 0 ? 'Atrasada' : 'Em aberto') : 'Concluída'}</dd>
            </div>
            <div>
              <dt>Prazo</dt>
              <dd>{formatarDataBr(vendo.prazo)}</dd>
            </div>
            <div>
              <dt>Responsável</dt>
              <dd>{responsavelVisto ? responsavelVisto.nome : 'Não definido'}</dd>
            </div>
            {vendo.data_finalizacao ? (
              <div>
                <dt>Concluída em</dt>
                <dd>{formatarDataBr(vendo.data_finalizacao)}</dd>
              </div>
            ) : null}
            <div className="is-largo">
              <dt>Descrição</dt>
              <dd>{vendo.descricao || vendo.detalhe || 'Sem descrição.'}</dd>
            </div>
            {vendo.realizado ? (
              <div className="is-largo">
                <dt>O que foi feito</dt>
                <dd>{vendo.realizado}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </Dialog>

      <Sidebar
        visible={Boolean(editando)}
        position="right"
        className="acao-sheet"
        style={{ width: 'min(760px, 96vw)' }}
        header="Editar ação"
        onHide={() => setEditando(null)}
      >
        <form className="painel-layout acao-form cepi-form" onSubmit={salvarEdicao}>
          <div className="painel-corpo painel-corpo--fill">
            <div className="cepi-form__grid">
              <CampoFormulario id="reuniao-acao-titulo" rotulo="Título *" erro={erros.titulo} shake={shake}>
                <InputText id="reuniao-acao-titulo" value={form.titulo} onChange={(evento) => setForm({ ...form, titulo: evento.target.value })} />
              </CampoFormulario>
              <CampoFormulario id="reuniao-acao-natureza" rotulo="Tipo">
                <Dropdown
                  inputId="reuniao-acao-natureza"
                  value={form.natureza}
                  options={[
                    { label: 'Correção de problema', value: 'correcao' },
                    { label: 'Prevenção', value: 'prevencao' },
                  ]}
                  onChange={(evento) => setForm({ ...form, natureza: evento.value })}
                />
              </CampoFormulario>
              <CampoFormulario id="reuniao-acao-descricao" rotulo="Descrição *" largo erro={erros.descricao} shake={shake}>
                <InputTextarea
                  id="reuniao-acao-descricao"
                  rows={4}
                  value={form.descricao}
                  onChange={(evento) => setForm({ ...form, descricao: evento.target.value })}
                />
              </CampoFormulario>
              <CampoFormulario id="reuniao-acao-membro" rotulo="Membro responsável">
                <Dropdown
                  inputId="reuniao-acao-membro"
                  value={form.membroId}
                  options={comissao.map((item) => ({ label: item.nome, value: item.id, funcao: item.funcao, condicao: item.condicao }))}
                  placeholder="Quem acompanha"
                  onChange={(evento) => setForm({ ...form, membroId: evento.value })}
                  itemTemplate={opcaoMembro}
                  valueTemplate={opcaoMembro}
                />
              </CampoFormulario>
              <CampoFormulario id="reuniao-acao-prazo" rotulo="Prazo (data limite) *" erro={erros.prazo} shake={shake}>
                <InputText id="reuniao-acao-prazo" type="date" value={form.prazo} onChange={(evento) => setForm({ ...form, prazo: evento.target.value })} />
              </CampoFormulario>
            </div>
          </div>
          <div className="form-rodape">
            <div className="form-rodape-ajuda" />
            <div className="form-rodape-acoes">
              <span className="form-rodape-obrigatorio">*Campos obrigatórios</span>
              <Button type="button" label="Fechar" outlined onClick={() => setEditando(null)} />
              <Button type="submit" label="Salvar alterações" loading={ocupado} />
            </div>
          </div>
        </form>
      </Sidebar>

      <Dialog
        header="Concluir nesta reunião"
        visible={Boolean(concluindo)}
        style={{ width: 'min(560px, 94vw)' }}
        onHide={() => setConcluindo(null)}
        footer={
          <div className="reuniao-dialogo__botoes">
            <Button type="button" label="Voltar" text onClick={() => setConcluindo(null)} />
            <Button type="button" label="Concluir ação" icon="pi pi-check" loading={ocupado} onClick={() => void concluir()} />
          </div>
        }
      >
        {concluindo ? (
          <>
            <p>
              <b>{concluindo.titulo}</b> será concluída com a data desta reunião ({formatarDataBr(reuniao.data_reuniao)}) e aparecerá na ata.
            </p>
            <CampoFormulario id="reuniao-acao-realizado" rotulo="O que foi feito? *" largo erro={erroRealizado} shake={shake}>
              <InputTextarea
                id="reuniao-acao-realizado"
                rows={3}
                maxLength={500}
                autoFocus
                value={realizado}
                onChange={(evento) => {
                  setRealizado(evento.target.value);
                  if (erroRealizado) setErroRealizado('');
                }}
              />
            </CampoFormulario>
          </>
        ) : null}
      </Dialog>
    </div>
  );
}
