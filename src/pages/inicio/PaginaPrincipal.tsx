import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import WizardCipa from './WizardCipa';
import { extrairMensagemErro } from '../../lib/errorUtils';
import { Button } from 'primereact/button';
import { Sidebar } from 'primereact/sidebar';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { CampoFormulario } from '../../components/forms/CampoFormulario';
import { Toast } from 'primereact/toast';
import { BadgeCargo } from '../../components/BadgeCargo';
import { PageShell } from '../../components/layout/PageShell';
import { useProjeto } from '../../contexts/ProjetoContext';
import { supabase } from '../../lib/supabaseClient';
import { DIAS_DA_POSSE_PRIMEIRA, diasAte, ehImplantacao, emTreinamentoPrimeiroMandato, formatarDataBr, isoData, lerData, somarDias } from '../../lib/eleicao/etapasEleicao';
import { ehAcaoRotina, listarAcoes, type Acao } from '../../lib/acaoService';
import { listarEleicoes } from '../../lib/eleicaoService';
import {
  textoAtaComunicacao,
  textoAtaConvocacao,
  textoAtaReuniao,
} from '../../lib/eleicao/modelosDocumento';
import EditorDocumento from '../../components/EditorDocumento';
import GestaoReunioes from './GestaoReunioes';
import {
  faltasOrdinariasSemJustificativa,
  listarPresencaProjeto,
  pesoStatusReuniao,
  resumoFrequencia,
  statusVisual,
  type PresencaReuniao,
} from '../../lib/reuniaoDetalhe';
import SubstituicaoMembro from './SubstituicaoMembro';
import {
  avaliarQuadro,
  dimensionarCipa,
  porteDoRegistro,
  type PorteSalvo,
  funcaoPermitida,
  funcoesDaRepresentacao,
  quadroVigente,
  textoQuadro,
  validarMembroComissao,
  type QuadroCipa,
} from '../../lib/quadroCipa';
import {
  listarMembros,
  listarReunioes,
  MOTIVOS_DESLIGAMENTO,
  salvarMembro,
  type MembroCipa,
  type ReuniaoCipa,
} from '../../lib/gestaoCipaService';
import '../../assets/css/especificos/eleicoes.css';
import '../../assets/css/especificos/principal.css';

const SITUACAO = { em_exercicio: 'Em exercício', afastado: 'Afastado', encerrado: 'Mandato encerrado' };

function QuadroMembros({
  quadro,
  titulares,
  empregados,
  grau,
  proximo,
  mandato,
}: {
  quadro: QuadroCipa;
  titulares: number;
  empregados: number | null;
  grau: number | null;
  proximo: QuadroCipa | null;
  mandato: PorteSalvo['mandato'];
}) {
  const aviso = textoQuadro(quadro, titulares);
  const faltaEmpregados = empregados == null;
  const faltaGrau = grau == null;
  const titulo = faltaEmpregados || faltaGrau ? 'Falta um dado do dimensionamento' : aviso.titulo;
  const texto = faltaEmpregados && faltaGrau
    ? 'A quantidade de colaboradores e o grau de risco não estão salvos neste projeto. Os dois fecham o dimensionamento da CIPA.'
    : faltaEmpregados
      ? 'A quantidade de colaboradores não está salva neste projeto. Sem ela o dimensionamento da CIPA não fecha.'
      : faltaGrau
        ? 'O grau de risco não está salvo neste projeto. Ele vem do CNPJ e entra no dimensionamento da CIPA.'
        : proximo && mandato
          ? `O mandato atual começou com ${mandato.empregados} colaboradores e grau de risco ${mandato.grau}. ${aviso.texto} Pela NR-05, a comissão não pode ser reduzida antes do fim do mandato: com ${empregados} colaboradores e grau ${grau}, o quadro de ${proximo.modo === 'designado' ? '1 representante designado' : `${proximo.titularesPermitidos} titulares`} vale a partir da próxima eleição.`
          : `Com ${empregados} colaboradores e grau de risco ${grau}. ${aviso.texto}`;
  const comErro = faltaEmpregados
    || faltaGrau
    || quadro.modo === 'indefinido'
    || (quadro.modo === 'designado' && titulares > 0)
    || (quadro.modo === 'cipa' && titulares !== (quadro.titularesPermitidos ?? 0));
  if (!comErro && !(proximo && mandato)) return null;
  return (
    <aside className={comErro ? 'membros-quadro membros-quadro--erro' : 'membros-quadro'} role={comErro ? 'alert' : undefined}>
      <strong>{titulo}</strong>
      <p>{texto}</p>
      <Link to="/configurar-projeto">Configurar o projeto</Link>
    </aside>
  );
}

function estiloMembro(item: MembroCipa) {
  if (item.funcao === 'presidente') return 'presidente';
  if (item.funcao === 'vice') return 'vice';
  if (item.condicao === 'suplente') return 'suplente';
  return 'membro';
}

type PainelInicio = 'hub' | 'membros' | 'reunioes';

const membroVazio = {
  nome: '',
  representacao: 'empregados' as MembroCipa['representacao'],
  condicao: 'titular' as MembroCipa['condicao'],
  funcao: 'membro' as MembroCipa['funcao'],
  inicio_mandato: '',
  fim_mandato: '',
  situacao: 'em_exercicio' as MembroCipa['situacao'],
  email: '',
};

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function PaginaPrincipal() {
  const toast = useRef<Toast>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { projetoId, projetoNome } = useProjeto();
  const [painel, setPainel] = useState<PainelInicio>('hub');
  const [membros, setMembros] = useState<MembroCipa[]>([]);
  const [reunioes, setReunioes] = useState<ReuniaoCipa[]>([]);
  const [presencas, setPresencas] = useState<PresencaReuniao[]>([]);
  const [acoes, setAcoes] = useState<Acao[]>([]);
  const [membroId, setMembroId] = useState<string | null>(null);
  const [substituindoId, setSubstituindoId] = useState<string | null>(null);
  const [formAberto, setFormAberto] = useState(false);
  const [membro, setMembro] = useState(membroVazio);
  const [salvando, setSalvando] = useState(false);
  const [errosMembro, setErrosMembro] = useState<Record<string, string>>({});
  const [shakeMembro, setShakeMembro] = useState(0);
  const [wizardAberto, setWizardAberto] = useState(false);
  const [recarregarSituacao, setRecarregarSituacao] = useState(0);
  const [situacao, setSituacao] = useState<{
    emAndamento: boolean | null;
    inicio: string | null;
    fim: string | null;
    maturidade: string | null;
  } | null>(null);
  const [porte, setPorte] = useState<PorteSalvo>({
    empregados: null,
    grau: null,
    efetivos: null,
    manual: false,
  });
  const [editor, setEditor] = useState<{ titulo: string; texto: string } | null>(null);
  const [processoAberto, setProcessoAberto] = useState(false);
  const hoje = formatarDataBr(isoData(new Date()));
  const nome = projetoNome ?? 'Estabelecimento';

  useEffect(() => {
    if (!projetoId) return;
    let ativo = true;
    supabase
      .from('projetos')
      .select('cipa_em_andamento, data_inicio_gestao, data_fim_mandato, cipa_maturidade')
      .eq('id', projetoId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!ativo || error || !data) return;
        setSituacao({
          emAndamento: data.cipa_em_andamento,
          inicio: data.data_inicio_gestao,
          fim: data.data_fim_mandato,
          maturidade: data.cipa_maturidade,
        });
        setWizardAberto(data.cipa_em_andamento === null);
      });
    const colunasPorte = 'quantidade_empregados, grau_risco, dimensionamento_efetivos, dimensionamento_editado_usuario, cipa_maturidade';
    supabase
      .from('projetos')
      .select(`${colunasPorte}, quadro_mandato_empregados, quadro_mandato_grau`)
      .eq('id', projetoId)
      .maybeSingle()
      .then(async ({ data, error }) => {
        if (!ativo) return;
        if (!error && data) {
          setPorte(porteDoRegistro(data));
          return;
        }
        const semMandato = await supabase.from('projetos').select(colunasPorte).eq('id', projetoId).maybeSingle();
        if (!ativo) return;
        if (!semMandato.error && semMandato.data) {
          setPorte(porteDoRegistro(semMandato.data));
          return;
        }
        const reserva = await supabase
          .from('projetos')
          .select('cipa_maturidade')
          .eq('id', projetoId)
          .maybeSingle();
        if (!ativo) return;
        setPorte(porteDoRegistro(reserva.data));
      });
    return () => {
      ativo = false;
    };
  }, [projetoId, recarregarSituacao]);

  const avisar = (summary: string, detail: string, severity: 'success' | 'warn' | 'error' = 'warn') => {
    toast.current?.show({ severity, summary, detail });
  };

  const carregar = useCallback(async () => {
    if (!projetoId) return;
    const [listaMembros, listaReunioes, listaAcoes, listaEleicoes] = await Promise.all([
      listarMembros(projetoId),
      listarReunioes(projetoId),
      listarAcoes(projetoId),
      listarEleicoes(projetoId),
    ]);
    setMembros(listaMembros);
    setReunioes(listaReunioes);
    setPresencas(await listarPresencaProjeto(listaReunioes.map((item) => item.id)));
    setAcoes(listaAcoes.filter(ehAcaoRotina));
    setProcessoAberto(listaEleicoes.some((item) => item.status === 'em_andamento'));
  }, [projetoId]);

  useEffect(() => {
    const atualizar = () => {
      carregar().catch((erro) => avisar('Não foi possível carregar', erro instanceof Error ? erro.message : 'Erro.', 'error'));
    };
    atualizar();
    window.addEventListener('acoes-atualizadas', atualizar);
    return () => window.removeEventListener('acoes-atualizadas', atualizar);
  }, [carregar]);

  useEffect(() => {
    if (location.hash === '#membros') setPainel('membros');
    else if (location.hash === '#reunioes') setPainel('reunioes');
  }, [location.hash]);

  function abrirNovoMembro() {
    setMembroId(null);
    setSubstituindoId(null);
    setMembro({
      ...membroVazio,
      inicio_mandato: situacao?.inicio ?? '',
      fim_mandato: situacao?.fim ?? '',
    });
    setErrosMembro({});
    setFormAberto(true);
  }

  function editarMembro(item: MembroCipa) {
    setMembroId(item.id);
    setSubstituindoId(null);
    setErrosMembro({});
    setFormAberto(true);
    setMembro({
      nome: item.nome,
      representacao: item.representacao,
      condicao: item.condicao,
      funcao: item.funcao,
      inicio_mandato: item.inicio_mandato,
      fim_mandato: item.fim_mandato,
      situacao: item.situacao,
      email: item.email ?? '',
    });
  }

  function substituirMembro(item: MembroCipa) {
    if (!item.fim_mandato) {
      avisar('Falta o fim previsto', 'Defina o fim do mandato antes de desligar ou substituir esta pessoa.');
      return;
    }
    setMembroId(null);
    setSubstituindoId(item.id);
    setFormAberto(true);
  }

  function cargoDisponivel(representacao: MembroCipa['representacao'], funcao: MembroCipa['funcao']) {
    if (!funcaoPermitida(representacao, funcao)) return false;
    if (funcao === 'membro') return true;
    return !membros.some((item) => item.situacao !== 'encerrado' && item.funcao === funcao && item.id !== membroId);
  }

  async function gravarMembro(evento: React.FormEvent) {
    evento.preventDefault();
    const novos = validarMembroComissao(membro, membros, quadro, membroId ? [membroId] : []);
    const email = membro.email.trim();
    if (email && !EMAIL_VALIDO.test(email)) novos['membro-email'] = 'Informe um e-mail válido, como nome@empresa.com.br.';
    else if (email.length > 254) novos['membro-email'] = 'O e-mail pode ter até 254 caracteres.';
    if (!projetoId || Object.keys(novos).length) {
      setErrosMembro(novos);
      setShakeMembro((n) => n + 1);
      return;
    }
    setErrosMembro({});
    setSalvando(true);
    try {
      const { emailIgnorado } = await salvarMembro({ ...membro, projeto_id: projetoId, id: membroId ?? undefined });
      setMembroId(null);
      setMembro(membroVazio);
      setFormAberto(false);
      await carregar();
      if (emailIgnorado && email) {
        avisar('Membro salvo sem o e-mail', 'O banco ainda não tem o campo de e-mail. Rode a atualização pendente do banco e salve o e-mail de novo.', 'warn');
      } else {
        avisar('Membro salvo', 'O registro foi gravado, inclusive se a data for anterior.', 'success');
      }
    } catch (erro) {
      avisar('Não foi possível salvar', extrairMensagemErro(erro), 'error');
    } finally {
      setSalvando(false);
    }
  }

  const hojeIso = isoData(new Date());
  const saindo = substituindoId ? membros.find((item) => item.id === substituindoId) ?? null : null;
  const desligados = membros
    .filter((item) => item.situacao === 'encerrado')
    .sort((a, b) => (b.fim_real ?? b.fim_mandato).localeCompare(a.fim_real ?? a.fim_mandato));
  const mesNome = new Date().toLocaleDateString('pt-BR', { month: 'long' });
  const emExercicio = membros.filter((item) => item.situacao === 'em_exercicio');
  const titulares = emExercicio.filter((item) => item.condicao === 'titular').length;
  const suplentes = emExercicio.filter((item) => item.condicao === 'suplente').length;
  const temPresidente = emExercicio.some((item) => item.funcao === 'presidente' && item.representacao === 'organizacao');
  const temVice = emExercicio.some((item) => item.funcao === 'vice' && item.representacao === 'empregados');
  const quadroCalculado = dimensionarCipa(porte.empregados, porte.grau);
  const { quadro, preservado: quadroPreservado } = quadroVigente(quadroCalculado, porte.mandato, situacao?.fim, hojeIso);
  const leituraQuadro = avaliarQuadro(quadro, titulares);
  const ordinariasDoMes = reunioes.filter(
    (item) => item.tipo === 'ordinaria' && item.data_reuniao.slice(0, 7) === hojeIso.slice(0, 7) && item.status !== 'cancelada',
  );
  const ordinariaDoMes = ordinariasDoMes.reduce<ReuniaoCipa | null>((melhor, item) => {
    if (!melhor) return item;
    const pesoItem = pesoStatusReuniao(item, hojeIso);
    const pesoMelhor = pesoStatusReuniao(melhor, hojeIso);
    if (pesoItem !== pesoMelhor) return pesoItem > pesoMelhor ? item : melhor;
    return item.data_reuniao > melhor.data_reuniao ? item : melhor;
  }, null);
  const pesoOrdinaria = ordinariaDoMes ? pesoStatusReuniao(ordinariaDoMes, hojeIso) : 0;
  const statusOrdinaria = ordinariaDoMes ? statusVisual(ordinariaDoMes, hojeIso) : null;
  const abertas = acoes.filter((acao) => acao.status === 'planejada' || acao.status === 'em_execucao');
  const atrasadas = abertas.filter((acao) => diasAte(acao.prazo) < 0);
  const diasMandato = situacao?.fim ? diasAte(situacao.fim) : null;
  const implantacao = ehImplantacao(situacao?.emAndamento ?? null, situacao?.inicio ?? null);
  const treinamentoPrimeiro = emTreinamentoPrimeiroMandato(situacao?.emAndamento ?? null, situacao?.inicio ?? null);
  const aberturaPrimeira = situacao?.inicio
    ? isoData(somarDias(lerData(situacao.inicio), DIAS_DA_POSSE_PRIMEIRA.iniciar_processo))
    : null;
  const diasParaAbrirPrimeira = aberturaPrimeira ? diasAte(aberturaPrimeira) : null;
  const diasParaConvocar = !implantacao && situacao?.fim ? diasAte(isoData(somarDias(lerData(situacao.fim), -60))) : null;
  const criterios = implantacao
    ? [
        { id: 'mandato', peso: situacao?.inicio ? 1 : 0, rotulo: 'Posse da primeira CIPA situada', destino: 'eleicoes' as const },
        { id: 'presidente', peso: processoAberto || (diasParaAbrirPrimeira != null && diasParaAbrirPrimeira > 0) ? 1 : 0, rotulo: 'Abertura do processo eleitoral', destino: 'eleicoes' as const },
        { id: 'vice', peso: 1, rotulo: 'Comissão só depois da posse', destino: 'membros' as const },
        { id: 'titulares', peso: 1, rotulo: 'Dimensionamento conferido', destino: 'hub' as const },
        { id: 'ordinaria', peso: 1, rotulo: 'Reunião mensal depois da posse', destino: 'reunioes' as const },
        { id: 'prazos', peso: atrasadas.length === 0 ? 1 : 0, rotulo: 'Ações no prazo', destino: 'acoes' as const },
      ]
    : [
        { id: 'mandato', peso: Boolean(situacao?.inicio) || situacao?.emAndamento === false ? 1 : 0, rotulo: 'Mandato situado', destino: 'hub' as const },
        { id: 'presidente', peso: temPresidente ? 1 : 0, rotulo: 'Presidente da organização', destino: 'membros' as const },
        { id: 'vice', peso: quadro.modo === 'designado' || temVice ? 1 : 0, rotulo: 'Vice dos empregados', destino: 'membros' as const },
        { id: 'titulares', peso: leituraQuadro.peso, rotulo: leituraQuadro.rotulo, destino: 'membros' as const },
        {
          id: 'ordinaria',
          peso: pesoOrdinaria,
          rotulo: statusOrdinaria ? `Ordinária ${statusOrdinaria.rotulo.toLowerCase()}` : 'Ordinária do mês',
          destino: 'reunioes' as const,
        },
        { id: 'prazos', peso: atrasadas.length === 0 ? 1 : 0, rotulo: 'Ações no prazo', destino: 'acoes' as const },
      ];
  const conformidade = Math.round((criterios.reduce((soma, item) => soma + item.peso, 0) / criterios.length) * 100);
  const tomConformidade = conformidade >= 100 ? 'ok' : conformidade >= 60 ? 'atencao' : 'risco';
  const statusCipa = implantacao
    ? 'Em implantação'
    : treinamentoPrimeiro
      ? 'Primeiro mandato'
      : diasMandato === null
        ? 'A situar'
        : diasMandato < 0
          ? 'Mandato encerrado'
          : 'Em vigência';

  const pendencias: { id: string; texto: string; meta: string; destino: 'membros' | 'reunioes' | 'eleicoes' | 'acoes'; critica?: boolean }[] = [];
  const comissaoCritica = !implantacao && quadro.modo === 'cipa' && (leituraQuadro.peso < 1 || !temPresidente || !temVice);
  if (comissaoCritica) {
    pendencias.push({
      id: 'comissao',
      texto: emExercicio.length === 0
        ? 'Relacionar os membros da CIPA'
        : !temPresidente
          ? 'Indicar o presidente pela organização'
          : !temVice
            ? 'Indicar o vice-presidente pelos empregados'
            : 'Completar os titulares do dimensionamento',
      meta: 'Pendência crítica',
      destino: 'membros',
      critica: true,
    });
  }
  if (implantacao && !processoAberto && diasParaAbrirPrimeira !== null && diasParaAbrirPrimeira <= 0) {
    pendencias.unshift({
      id: 'eleicao-primeira',
      texto: 'Abrir o processo da primeira CIPA',
      meta: 'Sem os 60 dias da renovação',
      destino: 'eleicoes',
      critica: true,
    });
  }
  if (treinamentoPrimeiro && situacao?.inicio) {
    pendencias.unshift({
      id: 'treinamento-primeiro',
      texto: 'Concluir o treinamento do primeiro mandato',
      meta: `Até ${formatarDataBr(isoData(somarDias(lerData(situacao.inicio), 30)))}`,
      destino: 'eleicoes',
    });
  }
  if (diasParaConvocar !== null && diasParaConvocar <= 0) {
    pendencias.push({ id: 'eleicao', texto: 'Convocar o processo eleitoral', meta: 'NR-05 · 60 dias antes do fim', destino: 'eleicoes' });
  }
  if (!implantacao && !ordinariaDoMes) {
    pendencias.push({ id: 'ordinaria', texto: `Lançar a ordinária de ${mesNome}`, meta: 'Reunião mensal', destino: 'reunioes' });
  } else if (!implantacao && statusOrdinaria && statusOrdinaria.id !== 'concluida') {
    pendencias.push({
      id: 'ordinaria',
      texto:
        statusOrdinaria.id === 'agendada'
          ? `Realizar a ordinária de ${mesNome}`
          : `Concluir a ordinária de ${mesNome}`,
      meta: statusOrdinaria.rotulo,
      destino: 'reunioes',
    });
  }
  if (!temPresidente && !comissaoCritica) {
    pendencias.push({ id: 'presidente', texto: 'Indicar o presidente pela organização', meta: 'Comissão', destino: 'membros' });
  }
  if (leituraQuadro.peso < 1 && !comissaoCritica && pendencias.length < 4) {
    pendencias.push({
      id: 'quadro',
      texto: leituraQuadro.rotulo,
      meta: quadro.modo === 'indefinido' ? 'Configurar o projeto' : 'Quadro da NR-05',
      destino: 'membros',
    });
  }
  for (const acao of [...atrasadas, ...abertas.filter((item) => diasAte(item.prazo) >= 0)]) {
    if (pendencias.length >= 4) break;
    pendencias.push({
      id: acao.id,
      texto: acao.titulo,
      meta: diasAte(acao.prazo) < 0 ? 'Prazo vencido' : `Até ${formatarDataBr(acao.prazo)}`,
      destino: 'acoes',
    });
  }

  function abrir(destino: 'membros' | 'reunioes' | 'hub') {
    setPainel(destino);
    document.querySelector('.content-outlet-host')?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function seguir(destino: 'membros' | 'reunioes' | 'eleicoes' | 'acoes' | 'hub') {
    if (destino === 'eleicoes') {
      navigate('/eleicoes');
      return;
    }
    if (destino === 'acoes') {
      navigate('/acoes');
      return;
    }
    if (destino === 'hub' && situacao?.emAndamento === null) {
      setWizardAberto(true);
      return;
    }
    abrir(destino === 'hub' ? 'hub' : destino);
  }

  const titulo =
    painel === 'membros' ? 'Gestão de membros' : painel === 'reunioes' ? 'Gestão de reuniões' : 'Centro de gestão';
  const descricao =
    painel === 'membros'
      ? 'Titulares e suplentes da organização e dos empregados. O início e o fim do mandato podem ser datas já passadas.'
      : painel === 'reunioes'
        ? 'Reunião ordinária mensal ou extraordinária. A data pode ser anterior a hoje para registrar o que já ocorreu.'
        : 'A situação da CIPA, o nível de conformidade e o caminho para cada rotina.';

  return (
    <PageShell
      title={titulo}
      description={descricao}
      className={painel === 'hub' ? undefined : 'cepi-page--voltar'}
      actions={
        painel === 'hub' ? undefined : (
          <Button type="button" label="Voltar ao centro" icon="pi pi-arrow-left" text onClick={() => abrir('hub')} />
        )
      }
    >
      <Toast ref={toast} />
      {wizardAberto ? (
        <WizardCipa
          onConcluido={() => {
            setRecarregarSituacao((n) => n + 1);
            carregar().catch((erro) => avisar('Não foi possível carregar', erro instanceof Error ? erro.message : 'Erro.', 'error'));
          }}
        />
      ) : null}
      {!projetoId ? <p className="eleicoes-aviso">Selecione um projeto para lançar os registros.</p> : null}

      {painel === 'hub' ? (
        <div className="inicio-hub">
          <section className="inicio-faixa" aria-label="Situação da CIPA">
            <div className="inicio-faixa__status">
              <span className={`inicio-selo inicio-selo--${tomConformidade}`}>{statusCipa}</span>
              <strong>
                {implantacao
                  ? diasParaAbrirPrimeira != null && diasParaAbrirPrimeira > 0
                    ? `${diasParaAbrirPrimeira} dias`
                    : 'Abrir processo'
                  : treinamentoPrimeiro
                    ? 'Treinamento'
                    : diasMandato === null
                      ? 'Mandato a definir'
                      : diasMandato < 0
                        ? 'Encerrado'
                        : `${diasMandato} dias`}
              </strong>
              <p>
                {implantacao && situacao?.inicio
                  ? `Posse em ${formatarDataBr(situacao.inicio)}. Processo a partir de ${aberturaPrimeira ? formatarDataBr(aberturaPrimeira) : '—'}.`
                  : treinamentoPrimeiro && situacao?.inicio
                    ? `Primeiro mandato. Treinamento até ${formatarDataBr(isoData(somarDias(lerData(situacao.inicio), 30)))}.`
                    : situacao?.inicio && situacao.fim
                      ? `${formatarDataBr(situacao.inicio)} a ${formatarDataBr(situacao.fim)}`
                      : diasParaConvocar === null
                        ? 'O início do mandato define o fim, um ano depois.'
                        : diasParaConvocar > 0
                          ? `Convocação da renovação em ${diasParaConvocar} dia(s).`
                          : 'A janela de 60 dias para convocar a renovação já começou.'}
              </p>
            </div>

            <div className="inicio-faixa__metro">
              <div className="inicio-faixa__metro-topo">
                <span>Nível de conformidade</span>
                <strong>{situacao === null ? '—' : `${conformidade}%`}</strong>
              </div>
              <div
                className={`inicio-barra inicio-barra--${tomConformidade}`}
                role="meter"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={situacao === null ? 0 : conformidade}
                aria-label="Nível de conformidade da CIPA"
              >
                <span style={{ width: situacao === null ? '0%' : `${conformidade}%` }} />
              </div>
              <ul className="inicio-criterios">
                {criterios.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={item.peso >= 1 ? 'is-ok' : item.peso > 0 ? 'is-parcial' : 'is-pendente'}
                      onClick={() => seguir(item.destino)}
                    >
                      <i className={`pi ${item.peso >= 1 ? 'pi-check' : item.peso > 0 ? 'pi-minus' : 'pi-exclamation-circle'}`} aria-hidden />
                      {item.rotulo}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="inicio-faixa__pendencias">
              <span>Próximas e pendentes</span>
              {pendencias.length === 0 ? (
                <p>Nada pendente agora. A rotina deste momento está em dia.</p>
              ) : (
                <ul>
                  {pendencias.map((item) => (
                    <li key={item.id} className={item.critica ? 'is-critica' : undefined}>
                      <button type="button" onClick={() => seguir(item.destino)}>
                        <strong>{item.texto}</strong>
                        <em>{item.meta}</em>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <div className="inicio-cards">
            <button type="button" className="inicio-card" onClick={() => abrir('membros')}>
              <span className="inicio-card__icone" aria-hidden><i className="pi pi-users" /></span>
              <span className="inicio-card__kicker">Comissão</span>
              <strong>Gestão de membros</strong>
              <p>
                {emExercicio.length} em exercício · {titulares} titular(es)
                {quadro.titularesPermitidos != null ? ` de ${quadro.titularesPermitidos}` : ''} · {suplentes} suplente(s).{' '}
                {implantacao
                  ? 'A comissão só passa a ser cobrada depois da posse.'
                  : `${leituraQuadro.rotulo}. ${temPresidente ? 'Presidente da organização indicado.' : 'Falta o presidente da organização.'}${quadro.modo === 'cipa' ? (temVice ? ' Vice dos empregados indicado.' : ' Falta o vice dos empregados.') : ''}`}
              </p>
              <span className="inicio-card__ir">Abrir gestão de membros <i className="pi pi-arrow-right" aria-hidden /></span>
            </button>

            <button type="button" className="inicio-card" onClick={() => abrir('reunioes')}>
              <span className="inicio-card__icone" aria-hidden><i className="pi pi-calendar" /></span>
              <span className="inicio-card__kicker">Rotina mensal</span>
              <strong>Reuniões</strong>
              <p>
                {statusOrdinaria
                  ? `Ordinária de ${mesNome}: ${statusOrdinaria.rotulo}. ${
                      statusOrdinaria.id === 'concluida'
                        ? 'Ela entra inteira no nível de conformidade.'
                        : 'Enquanto não for concluída, entra só em parte no nível de conformidade.'
                    }`
                  : implantacao && situacao?.inicio
                    ? `A reunião mensal começa depois da posse, em ${formatarDataBr(situacao.inicio)}.`
                    : `A ordinária de ${mesNome} ainda não foi lançada. A NR-05 pede reunião mensal com ata.`}
              </p>
              <span className="inicio-card__ir">
                {implantacao ? 'Ver reuniões' : ordinariaDoMes ? 'Abrir reuniões' : `Lançar a ordinária de ${mesNome}`}
                <i className="pi pi-arrow-right" aria-hidden />
              </span>
            </button>

            <Link className="inicio-card" to="/eleicoes">
              <span className="inicio-card__icone" aria-hidden><i className="pi pi-flag" /></span>
              <span className="inicio-card__kicker">NR-05</span>
              <strong>Processo eleitoral</strong>
              <p>
                {implantacao
                  ? processoAberto
                    ? 'Primeira CIPA. O processo já está aberto e corre até a posse, sem os 30 dias de uma renovação.'
                    : diasParaAbrirPrimeira != null && diasParaAbrirPrimeira > 0
                      ? `Primeira CIPA. O processo abre em ${diasParaAbrirPrimeira} dia(s), contados até a posse.`
                      : 'Primeira CIPA. Abra o processo: edital, 15 dias de inscrição e votação até a posse.'
                  : treinamentoPrimeiro
                    ? 'Primeiro mandato. Conclua o treinamento em até 30 dias depois da posse.'
                    : diasParaConvocar === null
                      ? 'Acompanhe a vigência e abra o processo 60 dias antes do término.'
                      : diasParaConvocar > 0
                        ? `Faltam ${diasParaConvocar} dia(s) para a convocação da renovação.`
                        : 'A janela de 60 dias da renovação já começou. Abra o processo eleitoral.'}
              </p>
              <span className="inicio-card__ir">Ir para eleições <i className="pi pi-arrow-right" aria-hidden /></span>
            </Link>

            <Link className="inicio-card" to="/acoes">
              <span className="inicio-card__icone" aria-hidden><i className="pi pi-check-square" /></span>
              <span className="inicio-card__kicker">Dia a dia</span>
              <strong>Correção e prevenção</strong>
              <p>
                {abertas.length === 0
                  ? 'Nenhuma ação com prazo aberto.'
                  : `${abertas.length} em aberto${atrasadas.length ? `, ${atrasadas.length} com prazo vencido` : ''}.`}
              </p>
              <span className="inicio-card__ir">Ver ações <i className="pi pi-arrow-right" aria-hidden /></span>
            </Link>

            <article className="inicio-card inicio-card--estatico">
              <span className="inicio-card__icone" aria-hidden><i className="pi pi-file" /></span>
              <span className="inicio-card__kicker">Documentos</span>
              <strong>Atas prontas para imprimir</strong>
              <p>Abra o modelo, ajuste o texto e imprima. O documento não depende do prazo da etapa.</p>
              <span className="inicio-card__acoes">
                <button type="button" onClick={() => setEditor({ titulo: 'Ata de reunião', texto: textoAtaReuniao(nome, hoje) })}>Ata de reunião</button>
                <button type="button" onClick={() => setEditor({ titulo: 'Ata de comunicação', texto: textoAtaComunicacao(nome, hoje) })}>Comunicação</button>
                <button type="button" onClick={() => setEditor({ titulo: 'Ata de convocação', texto: textoAtaConvocacao(nome, hoje) })}>Convocação</button>
              </span>
            </article>

            <Link className="inicio-card" to="/configurar-projeto">
              <span className="inicio-card__icone" aria-hidden><i className="pi pi-cog" /></span>
              <span className="inicio-card__kicker">Projeto</span>
              <strong>Configuração</strong>
              <p>Dados do estabelecimento, assinatura e o que vale para este projeto ativo.</p>
              <span className="inicio-card__ir">Abrir configuração <i className="pi pi-arrow-right" aria-hidden /></span>
            </Link>
          </div>
        </div>
      ) : null}

      <EditorDocumento
        titulo={editor?.titulo ?? ''}
        textoInicial={editor?.texto ?? ''}
        aberto={Boolean(editor)}
        onFechar={() => setEditor(null)}
      />

      {painel === 'membros' ? (
      <div className="inicio-painel" id="membros">
        <QuadroMembros
          quadro={quadro}
          titulares={titulares}
          empregados={porte.empregados}
          grau={porte.grau}
          proximo={quadroPreservado ? quadroCalculado : null}
          mandato={porte.mandato}
        />
        <div className="membros-topo">
          <Button type="button" label="Adicionar membro" icon="pi pi-plus" onClick={abrirNovoMembro} />
        </div>
        <div className="membros-lados">
          {(['empregados', 'organizacao'] as const).map((lado) => {
            const doLado = membros.filter((item) => item.representacao === lado && item.situacao !== 'encerrado');
            const titularesLado = doLado.filter((item) => item.situacao === 'em_exercicio' && item.condicao === 'titular').length;
            return (
              <section key={lado} className="membros-lado">
                <header>
                  <strong>{lado === 'empregados' ? 'Empregados' : 'Organização'}</strong>
                  {quadro.modo === 'cipa' && quadro.efetivosPorLado != null ? <span>{titularesLado}/{quadro.efetivosPorLado}</span> : null}
                </header>
                {doLado.length === 0 ? <p>Ninguém deste lado ainda.</p> : (
                  <ul>
                    {doLado.map((item) => {
                      const frequencia = resumoFrequencia(item, reunioes, presencas, hojeIso);
                      const faltasOrdinarias = faltasOrdinariasSemJustificativa(item, reunioes, presencas, hojeIso);
                      return (
                        <li key={item.id} className={`membros-pessoa membros-pessoa--${estiloMembro(item)}`}>
                          <div className="membros-pessoa__topo">
                            <strong>{item.nome}</strong>
                          </div>
                          <div className="membros-pessoa__cargo">
                            <BadgeCargo funcao={item.funcao} condicao={item.condicao} />
                          </div>
                          <div className="membros-pessoa__meta">
                            <em className="presenca-badge presenca-badge--presente">{frequencia.presentes} presentes</em>
                            <em className="presenca-badge presenca-badge--falta">{frequencia.faltas} faltas</em>
                            <em className="presenca-badge presenca-badge--justificada">{frequencia.justificadas} justificadas</em>
                            <small>{SITUACAO[item.situacao]} · {formatarDataBr(item.inicio_mandato)} a {formatarDataBr(item.fim_mandato)}</small>
                          </div>
                          {item.condicao === 'titular' && faltasOrdinarias > 4 ? (
                            <em className="membros-pessoa__perda">
                              {faltasOrdinarias} faltas ordinárias sem justificativa. Pela NR-05, perde o mandato.
                            </em>
                          ) : null}
                          <div className="membros-pessoa__acoes">
                            <button type="button" className="membros-acao membros-acao--editar" data-dica="Editar" aria-label={`Editar ${item.nome}`} onClick={() => editarMembro(item)}>
                              <i className="pi pi-pencil" aria-hidden />
                            </button>
                            <button type="button" className="membros-acao membros-acao--substituir" data-dica="Substituir ou desligar" aria-label={`Substituir ou desligar ${item.nome}`} onClick={() => substituirMembro(item)}>
                              <i className="pi pi-sync" aria-hidden />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
        {desligados.length ? (
          <section className="membros-historico">
            <header>
              <strong>Membros desligados</strong>
              <span>{desligados.length}</span>
            </header>
            <div className="membros-historico__tabela">
              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Cargo</th>
                    <th>Fim previsto</th>
                    <th>Fim real</th>
                    <th>Motivo</th>
                    <th>Substituído por</th>
                  </tr>
                </thead>
                <tbody>
                  {desligados.map((item) => {
                    const substituto = item.substituido_por ? membros.find((outro) => outro.id === item.substituido_por) : undefined;
                    return (
                      <tr key={item.id}>
                        <td><strong>{item.nome}</strong><small>{item.representacao === 'empregados' ? 'Empregados' : 'Organização'}</small></td>
                        <td><BadgeCargo funcao={item.funcao} condicao={item.condicao} /></td>
                        <td>{formatarDataBr(item.fim_mandato)}</td>
                        <td>{item.fim_real ? formatarDataBr(item.fim_real) : formatarDataBr(item.fim_mandato)}</td>
                        <td>
                          {item.motivo_desligamento ? MOTIVOS_DESLIGAMENTO[item.motivo_desligamento] : 'Fim do mandato'}
                          {item.motivo_descricao ? <small>{item.motivo_descricao}</small> : null}
                        </td>
                        <td>{substituto ? substituto.nome : 'Vaga aberta'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
        <Sidebar
          visible={formAberto}
          position="right"
          className="membros-sheet"
          overlayClassName="membros-sheet-mask"
          header={substituindoId ? 'Substituir ou desligar membro' : membroId ? 'Editar membro' : 'Adicionar membro'}
          onHide={() => {
            setFormAberto(false);
            setSubstituindoId(null);
          }}
        >
          {saindo ? (
            <SubstituicaoMembro
              key={saindo.id}
              saindo={saindo}
              membros={membros}
              faltasOrdinarias={faltasOrdinariasSemJustificativa(saindo, reunioes, presencas, hojeIso)}
              onCancelar={() => {
                setFormAberto(false);
                setSubstituindoId(null);
              }}
              onConcluido={async (titulo, texto) => {
                setFormAberto(false);
                setSubstituindoId(null);
                await carregar();
                avisar(titulo, texto, 'success');
              }}
              onErro={(texto) => avisar('Não foi possível registrar', texto, 'error')}
            />
          ) : (
          <form className="painel-layout membros-form" onSubmit={gravarMembro}>
            <div className="painel-corpo painel-corpo--fill">
              <div className="membros-form__campos">
                <CampoFormulario id="membro-nome" rotulo="Nome *" largo erro={errosMembro['membro-nome']} shake={shakeMembro}>
                  <InputText id="membro-nome" value={membro.nome} onChange={(evento) => setMembro({ ...membro, nome: evento.target.value })} />
                </CampoFormulario>
                <CampoFormulario id="membro-email" rotulo="E-mail de contato" largo erro={errosMembro['membro-email']} shake={shakeMembro}>
                  <InputText
                    id="membro-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    maxLength={254}
                    value={membro.email}
                    onChange={(evento) => setMembro({ ...membro, email: evento.target.value })}
                  />
                </CampoFormulario>
                <CampoFormulario id="membro-rep" rotulo="Representação *" largo>
                  <Dropdown
                    inputId="membro-rep"
                    value={membro.representacao}
                    options={[
                      { label: 'Empregados', value: 'empregados' },
                      { label: 'Organização', value: 'organizacao' },
                    ]}
                    onChange={(evento) => {
                      const representacao = evento.value as MembroCipa['representacao'];
                      const funcao = cargoDisponivel(representacao, membro.funcao) ? membro.funcao : 'membro';
                      setMembro({ ...membro, representacao, funcao });
                    }}
                  />
                </CampoFormulario>
                <CampoFormulario id="membro-condicao" rotulo="Condição *" largo erro={errosMembro['membro-condicao']} shake={shakeMembro}>
                  <Dropdown
                    inputId="membro-condicao"
                    value={membro.condicao}
                    options={[
                      { label: 'Titular', value: 'titular' },
                      { label: 'Suplente', value: 'suplente' },
                      { label: 'Reservista', value: 'reservista' },
                    ]}
                    onChange={(evento) => setMembro({ ...membro, condicao: evento.value })}
                  />
                </CampoFormulario>
                <CampoFormulario id="membro-funcao" rotulo="Função *" largo erro={errosMembro['membro-funcao']} shake={shakeMembro}>
                  <Dropdown
                    inputId="membro-funcao"
                    value={membro.funcao}
                    options={funcoesDaRepresentacao(membro.representacao).filter((opcao) => cargoDisponivel(membro.representacao, opcao.value) || opcao.value === membro.funcao)}
                    onChange={(evento) => setMembro({ ...membro, funcao: evento.value })}
                  />
                </CampoFormulario>
                <CampoFormulario id="membro-inicio" rotulo="Início do mandato *" largo erro={errosMembro['membro-inicio']} shake={shakeMembro}>
                  <InputText id="membro-inicio" type="date" value={membro.inicio_mandato} onChange={(evento) => setMembro({ ...membro, inicio_mandato: evento.target.value })} />
                </CampoFormulario>
                <CampoFormulario id="membro-fim" rotulo="Fim previsto do mandato *" largo erro={errosMembro['membro-fim']} shake={shakeMembro}>
                  <InputText id="membro-fim" type="date" value={membro.fim_mandato} onChange={(evento) => setMembro({ ...membro, fim_mandato: evento.target.value })} />
                </CampoFormulario>
                <CampoFormulario id="membro-situacao" rotulo="Situação" largo>
                  <Dropdown
                    inputId="membro-situacao"
                    value={membro.situacao}
                    options={[
                      { label: 'Em exercício', value: 'em_exercicio' },
                      { label: 'Afastado temporariamente', value: 'afastado' },
                    ]}
                    onChange={(evento) => setMembro({ ...membro, situacao: evento.value })}
                  />
                </CampoFormulario>
                {membroId ? (
                  <p className="membros-form__nota">Para desligar alguém da comissão, use Substituir ou desligar. O motivo fica registrado.</p>
                ) : null}
              </div>
            </div>
            <div className="form-rodape">
              <div className="form-rodape-ajuda" />
              <div className="form-rodape-acoes">
                <span className="form-rodape-obrigatorio">*Campos obrigatórios</span>
                <Button type="button" label="Cancelar" outlined onClick={() => setFormAberto(false)} />
                <Button type="submit" label={membroId ? 'Atualizar' : 'Incluir'} loading={salvando} />
              </div>
            </div>
          </form>
          )}
        </Sidebar>
      </div>
      ) : null}

      {painel === 'reunioes' && projetoId ? (
        <GestaoReunioes
          projetoId={projetoId}
          projetoNome={nome}
          membros={membros}
          acoes={acoes}
          reunioes={reunioes}
          onMudou={() => {
            carregar().catch((erro) => avisar('Não foi possível atualizar', erro instanceof Error ? erro.message : 'Erro.', 'error'));
          }}
          onAviso={avisar}
        />
      ) : null}
    </PageShell>
  );
}
