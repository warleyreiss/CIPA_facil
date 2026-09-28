import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { CampoFormulario } from '../../components/forms/CampoFormulario';
import {
  avisarAcoesAtualizadas,
  cancelarAcao,
  concluirAcao,
  criarAcao,
  executarAcao,
  listarAcoes,
  type Acao,
  type GrupoAcao,
} from '../../lib/acaoService';
import { diasAte, formatarDataBr } from '../../lib/eleicao/etapasEleicao';

const GRUPOS: { id: GrupoAcao; titulo: string }[] = [
  { id: 'validade', titulo: 'Validade da CIPA' },
  { id: 'eleicao', titulo: 'Processo eleitoral' },
  { id: 'habitual', titulo: 'Atividade habitual' },
];

const STATUS: Record<Acao['status'], string> = {
  planejada: 'Planejada',
  em_execucao: 'Em execução',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};

type Props = {
  projetoId: string | null;
  onErro: (mensagem: string) => void;
};

export default function RotinaAcoes({ projetoId, onErro }: Props) {
  const [acoes, setAcoes] = useState<Acao[]>([]);
  const [titulo, setTitulo] = useState('');
  const [grupo, setGrupo] = useState<GrupoAcao>('habitual');
  const [prazo, setPrazo] = useState('');
  const [detalhe, setDetalhe] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [shake, setShake] = useState(0);

  const erroRef = useRef(onErro);
  erroRef.current = onErro;

  const carregar = useCallback(async () => {
    if (!projetoId) {
      setAcoes([]);
      return;
    }
    setAcoes(await listarAcoes(projetoId));
  }, [projetoId]);

  useEffect(() => {
    const atualizar = () => {
      carregar().catch((erro) => erroRef.current(erro instanceof Error ? erro.message : 'Erro ao listar ações.'));
    };
    atualizar();
    window.addEventListener('acoes-atualizadas', atualizar);
    return () => window.removeEventListener('acoes-atualizadas', atualizar);
  }, [carregar]);

  async function gravar(evento: React.FormEvent) {
    evento.preventDefault();
    const novos: Record<string, string> = {};
    if (!titulo.trim()) novos['acao-titulo'] = 'Informe o título.';
    if (!prazo) novos['acao-prazo'] = 'Informe o prazo.';
    if (!projetoId || Object.keys(novos).length) {
      setErros(novos);
      setShake((n) => n + 1);
      return;
    }
    setErros({});
    setSalvando(true);
    try {
      await criarAcao({ projetoId, titulo, grupo, detalhe, prazo });
      setTitulo('');
      setDetalhe('');
      setPrazo('');
      await carregar();
      avisarAcoesAtualizadas();
    } catch (erro) {
      onErro(erro instanceof Error ? erro.message : 'Erro ao criar a ação.');
    } finally {
      setSalvando(false);
    }
  }

  async function mudar(id: string, operacao: 'executar' | 'concluir' | 'cancelar') {
    try {
      if (operacao === 'executar') await executarAcao(id);
      if (operacao === 'concluir') await concluirAcao(id);
      if (operacao === 'cancelar') await cancelarAcao(id);
      await carregar();
      avisarAcoesAtualizadas();
    } catch (erro) {
      onErro(erro instanceof Error ? erro.message : 'Erro ao atualizar a ação.');
    }
  }

  const abertas = acoes.filter((acao) => acao.status === 'planejada' || acao.status === 'em_execucao');
  const encerradas = acoes.filter((acao) => acao.status === 'concluida' || acao.status === 'cancelada');
  const atrasadas = abertas.filter((acao) => diasAte(acao.prazo) < 0).length;

  return (
    <section id="acoes" className="eleicoes-rotina">
      <h2>Ações</h2>
      <p>
        {abertas.length} em aberto, {atrasadas} atrasada(s), {encerradas.length} encerrada(s).
      </p>

      <form className="cepi-form" onSubmit={gravar}>
        <div className="cepi-form__grid">
          <CampoFormulario id="acao-titulo" rotulo="Título" erro={erros['acao-titulo']} shake={shake}>
            <InputText id="acao-titulo" value={titulo} onChange={(evento) => setTitulo(evento.target.value)} />
          </CampoFormulario>
          <CampoFormulario id="acao-tipo" rotulo="Tipo">
            <Dropdown
              inputId="acao-tipo"
              value={grupo}
              options={GRUPOS.map((item) => ({ label: item.titulo, value: item.id }))}
              onChange={(evento) => setGrupo(evento.value)}
            />
          </CampoFormulario>
          <CampoFormulario id="acao-prazo" rotulo="Prazo" erro={erros['acao-prazo']} shake={shake}>
            <InputText id="acao-prazo" type="date" value={prazo} onChange={(evento) => setPrazo(evento.target.value)} />
          </CampoFormulario>
          <CampoFormulario id="acao-detalhe" rotulo="Detalhe">
            <InputText id="acao-detalhe" value={detalhe} onChange={(evento) => setDetalhe(evento.target.value)} />
          </CampoFormulario>
        </div>
        <div className="cepi-form__actions">
          <Button type="submit" label="Criar ação" loading={salvando} />
        </div>
      </form>

      <div className="eleicoes-lista">
        {acoes.length === 0 ? <p>Nenhuma ação cadastrada.</p> : null}
        {acoes.map((acao) => (
          <article key={acao.id} className="eleicoes-antiga">
            <span>
              <strong>{acao.titulo}</strong>
              <br />
              {GRUPOS.find((item) => item.id === acao.grupo)?.titulo} · {STATUS[acao.status]} · prazo{' '}
              {formatarDataBr(acao.prazo)}
              {acao.detalhe ? ` · ${acao.detalhe}` : ''}
            </span>
            <span>
              {acao.status === 'planejada' ? (
                <Button label="Executar" text onClick={() => mudar(acao.id, 'executar')} />
              ) : null}
              {acao.status === 'planejada' || acao.status === 'em_execucao' ? (
                <Button label="Concluir" text onClick={() => mudar(acao.id, 'concluir')} />
              ) : null}
              {acao.status === 'planejada' || acao.status === 'em_execucao' ? (
                <Button label="Cancelar" text onClick={() => mudar(acao.id, 'cancelar')} />
              ) : null}
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}
