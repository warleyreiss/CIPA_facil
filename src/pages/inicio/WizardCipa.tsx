import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as EventoPonteiro, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, CircleCheck, Clock, Save, Search, SlidersHorizontal } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import { SplitButton } from 'primereact/splitbutton';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { CampoFormulario } from '../../components/forms/CampoFormulario';
import { useProjeto } from '../../contexts/ProjetoContext';
import { supabase } from '../../lib/supabaseClient';
import { projetoService } from '../../lib/projetoService';
import { consultarCnpj, type EmpresaCnpj } from '../../lib/consultaCnpj';
import { cnpjObrigatorioValido, formatarCnpj } from '../../lib/documentoUtils';
import { extrairMensagemErro } from '../../lib/errorUtils';
import { salvarMembro, type MembroCipa } from '../../lib/gestaoCipaService';
import { DIAS_DA_POSSE_PRIMEIRA, formatarDataBr, isoData, lerData, somarDias, somarUmAno } from '../../lib/eleicao/etapasEleicao';
import { dimensionarCipa, type QuadroCipa } from '../../lib/quadroCipa';
import '../../assets/css/especificos/eleicoes.css';
import '../../assets/css/especificos/wizard-cipa.css';

type Passo = 'situacao' | 'dados' | 'empresa' | 'membros' | 'implantar' | 'dados-impl' | 'resumo-impl' | 'conclusao';

type RascunhoMembro = {
  id: string;
  nome: string;
  condicao: MembroCipa['condicao'];
  representacao: MembroCipa['representacao'];
  funcao: MembroCipa['funcao'];
};

type LadoComissao = MembroCipa['representacao'];

type FechoWizard = {
  tipo: 'sucesso' | 'pendencia';
  destino: 'inicio' | 'eleicoes';
  titulo: string;
  texto: string;
  itens: string[];
};

type PapelMembro = 'presidente' | 'vice' | 'membro' | 'suplente';

const PAPEIS: { id: PapelMembro; rotulo: string }[] = [
  { id: 'presidente', rotulo: 'Presidente' },
  { id: 'vice', rotulo: 'Vice' },
  { id: 'membro', rotulo: 'Membro' },
  { id: 'suplente', rotulo: 'Suplente' },
];

function papelDe(item: RascunhoMembro): PapelMembro {
  if (item.funcao === 'presidente') return 'presidente';
  if (item.funcao === 'vice') return 'vice';
  if (item.condicao === 'suplente') return 'suplente';
  return 'membro';
}

function ordemComissao(item: RascunhoMembro) {
  if (item.funcao === 'presidente') return 0;
  if (item.funcao === 'vice') return 1;
  if (item.condicao === 'titular') return 2;
  if (item.condicao === 'suplente') return 3;
  return 4;
}

function montarMembro(nome: string, papel: PapelMembro, lado: MembroCipa['representacao']): RascunhoMembro {
  const id = crypto.randomUUID();
  if (papel === 'presidente') return { id, nome, condicao: 'titular', representacao: 'organizacao', funcao: 'presidente' };
  if (papel === 'vice') return { id, nome, condicao: 'titular', representacao: 'empregados', funcao: 'vice' };
  if (papel === 'suplente') return { id, nome, condicao: 'suplente', representacao: lado, funcao: 'membro' };
  return { id, nome, condicao: 'titular', representacao: lado, funcao: 'membro' };
}

function trocarCom(lista: RascunhoMembro[], indice: number, parceiro: number) {
  const item = lista[indice];
  const outro = lista[parceiro];
  if (!item || !outro || indice === parceiro || item.representacao === outro.representacao) return null;
  const papelItem = papelDe(item);
  const papelOutro = papelDe(outro);
  if (papelItem === 'presidente' || papelItem === 'vice' || papelOutro === 'presidente' || papelOutro === 'vice') return null;
  if (papelItem !== papelOutro) return null;
  const movido = { ...item, representacao: outro.representacao };
  const deslocado = { ...outro, representacao: item.representacao };
  return lista.map((pessoa, atual) => {
    if (atual === indice) return deslocado;
    if (atual === parceiro) return movido;
    return pessoa;
  });
}

function motivoDaComissao(
  lista: RascunhoMembro[],
  anterior: RascunhoMembro[],
  efetivosNumero: number | null,
  suplentesPorLado: number | null,
) {
  if (efetivosNumero == null) return 'Confirme o dimensionamento antes de mover a comissão.';
  if (lista.some((item) => item.funcao === 'presidente' && item.representacao !== 'organizacao')) {
    return 'O presidente permanece na organização.';
  }
  if (lista.some((item) => item.funcao === 'vice' && item.representacao !== 'empregados')) {
    return 'O vice permanece nos empregados.';
  }
  const contar = (base: RascunhoMembro[], lado: LadoComissao, condicao: RascunhoMembro['condicao']) =>
    base.filter((item) => item.condicao === condicao && item.representacao === lado).length;
  for (const lado of ['empregados', 'organizacao'] as const) {
    const nomeLado = lado === 'empregados' ? 'dos empregados' : 'da organização';
    const titulares = contar(lista, lado, 'titular');
    const suplentes = contar(lista, lado, 'suplente');
    if (titulares > efetivosNumero && titulares > contar(anterior, lado, 'titular')) {
      return `O lado ${nomeLado} ficaria com mais titulares do que o dimensionamento permite.`;
    }
    if (suplentesPorLado != null && suplentes > suplentesPorLado && suplentes > contar(anterior, lado, 'suplente')) {
      return `O lado ${nomeLado} ficaria com mais suplentes do que o dimensionamento permite.`;
    }
  }
  return '';
}

function rotuloInclusao(papel: PapelMembro, lado: MembroCipa['representacao']) {
  if (papel === 'presidente') return 'Adicionar presidente';
  if (papel === 'vice') return 'Adicionar vice';
  if (papel === 'suplente') return lado === 'empregados' ? 'Suplente dos empregados' : 'Suplente da organização';
  return lado === 'empregados' ? 'Membro dos empregados' : 'Membro da organização';
}

const OPCOES_INCLUSAO: { papel: PapelMembro; lado: MembroCipa['representacao']; label: string }[] = [
  { papel: 'presidente', lado: 'organizacao', label: 'Presidente' },
  { papel: 'vice', lado: 'empregados', label: 'Vice' },
  { papel: 'membro', lado: 'empregados', label: 'Membro dos empregados' },
  { papel: 'membro', lado: 'organizacao', label: 'Membro da organização' },
  { papel: 'suplente', lado: 'empregados', label: 'Suplente dos empregados' },
  { papel: 'suplente', lado: 'organizacao', label: 'Suplente da organização' },
];

const GRAUS = [
  { label: 'Grau 1', value: 1 },
  { label: 'Grau 2', value: 2 },
  { label: 'Grau 3', value: 3 },
  { label: 'Grau 4', value: 4 },
];

export default function WizardCipa({ onConcluido }: { onConcluido?: () => void }) {
  const navigate = useNavigate();
  const { projetoId, projetoNome, projetoLogo, selecionarProjeto } = useProjeto();
  const [passo, setPasso] = useState<Passo>('situacao');
  const [cnpj, setCnpj] = useState('');
  const [nome, setNome] = useState(projetoNome ?? '');
  const [inicio, setInicio] = useState('');
  const [empregados, setEmpregados] = useState('');
  const [empresa, setEmpresa] = useState<EmpresaCnpj | null>(null);
  const [grau, setGrau] = useState<number | null>(null);
  const nomeMembroRef = useRef<HTMLInputElement>(null);
  const devolverFocoNome = useRef(false);
  const [membro, setMembro] = useState<RascunhoMembro>({
    id: '',
    nome: '',
    condicao: 'titular',
    representacao: 'organizacao',
    funcao: 'presidente',
  });
  const [papel, setPapel] = useState<PapelMembro>('presidente');
  const [avisoPapel, setAvisoPapel] = useState('');
  const [avisoTroca, setAvisoTroca] = useState('');
  const [membros, setMembros] = useState<RascunhoMembro[]>([]);
  const [arraste, setArraste] = useState<{
    indice: number;
    id: string;
    ladoOrigem: LadoComissao;
    estilo: PapelMembro;
    nome: string;
    rotulo: string;
    largura: number;
    altura: number;
  } | null>(null);
  const [alvoArraste, setAlvoArraste] = useState<number | null>(null);
  const [recusaIndice, setRecusaIndice] = useState<number | null>(null);
  const [consultando, setConsultando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [erros, setErros] = useState<Record<string, string>>({});
  const [shake, setShake] = useState(0);
  const [alterandoQuadro, setAlterandoQuadro] = useState(false);
  const [fecho, setFecho] = useState<FechoWizard | null>(null);
  const arrasteRef = useRef<{
    pointerId: number;
    indice: number;
    id: string;
    ladoOrigem: LadoComissao;
    offsetX: number;
    offsetY: number;
    largura: number;
    altura: number;
    origemX: number;
    origemY: number;
    startX: number;
    startY: number;
    x: number;
    y: number;
    ativo: boolean;
  } | null>(null);
  const fantasmaRef = useRef<HTMLDivElement>(null);
  const animacaoRef = useRef<{
    antes: Map<string, { left: number; top: number }>;
    idArrastado: string;
    ghost: { left: number; top: number } | null;
  } | null>(null);
  const recusaTimer = useRef<number | null>(null);

  const fim = inicio ? somarUmAno(inicio) : '';
  const quadro = dimensionarCipa(Number(empregados), grau);
  const efetivosNumero = quadro.efetivosPorLado;
  const grauDoCnpj = empresa?.grauRisco ?? null;
  const editouDimensionamento = empresa != null && grau != null && grau !== grauDoCnpj;

  function rejeitar(novos: Record<string, string>) {
    setErros(novos);
    setShake((n) => n + 1);
  }

  function limparErro(id: string) {
    setErros((atual) => {
      if (!atual[id]) return atual;
      const resto = { ...atual };
      delete resto[id];
      return resto;
    });
  }

  useEffect(() => {
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = anterior;
    };
  }, []);

  useEffect(() => {
    if (!projetoId) return;
    supabase
      .from('projetos')
      .select('cipa_em_andamento')
      .eq('id', projetoId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) return;
        if (data.cipa_em_andamento !== null) navigate('/inicio', { replace: true });
      });
  }, [projetoId, navigate]);

  useLayoutEffect(() => {
    const dados = arrasteRef.current;
    const el = fantasmaRef.current;
    if (!dados?.ativo || !el) return;
    el.style.transform = `translate3d(${dados.x}px, ${dados.y}px, 0) scale(1.04)`;
  }, [arraste, alvoArraste]);

  useLayoutEffect(() => {
    const pendente = animacaoRef.current;
    if (!pendente) return;
    animacaoRef.current = null;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    document.querySelectorAll<HTMLElement>('[data-membro-id]').forEach((el) => {
      const id = el.dataset.membroId;
      if (!id) return;
      const next = el.getBoundingClientRect();
      const origem = id === pendente.idArrastado && pendente.ghost ? pendente.ghost : pendente.antes.get(id);
      if (!origem) return;
      const dx = origem.left - next.left;
      const dy = origem.top - next.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      el.animate(
        [
          { transform: `translate(${dx}px, ${dy}px)` },
          { transform: 'translate(0, 0)' },
        ],
        { duration: 460, easing: 'cubic-bezier(.22, .9, .24, 1)' },
      );
    });
  }, [membros]);

  useEffect(() => () => {
    if (recusaTimer.current) window.clearTimeout(recusaTimer.current);
  }, []);

  const progresso: Record<Passo, number> = {
    situacao: 16,
    dados: 40,
    empresa: 68,
    membros: 100,
    implantar: 28,
    'dados-impl': 58,
    'resumo-impl': 100,
    conclusao: 100,
  };

  function validarIdentificacao(idCnpj: string, idData: string, idEmpregados: string) {
    const novos: Record<string, string> = {};
    if (!cnpj.replace(/\D/g, '')) novos[idCnpj] = 'Informe o CNPJ.';
    else if (!cnpjObrigatorioValido(cnpj)) novos[idCnpj] = 'CNPJ incompleto.';
    if (!inicio) novos[idData] = 'Informe a data.';
    if (!empregados || Number(empregados) < 0) novos[idEmpregados] = 'Informe a quantidade de colaboradores.';
    return novos;
  }

  async function consultarESeguir(proximo: Passo) {
    setConsultando(true);
    setAviso('');
    try {
      const achado = await consultarCnpj(cnpj);
      setEmpresa(achado);
      setAlterandoQuadro(false);
      setNome(achado.nomeFantasia || achado.razaoSocial || projetoNome || '');
      setGrau(achado.grauRisco);
      setPasso(proximo);
    } catch (erro) {
      setAviso(extrairMensagemErro(erro));
    } finally {
      setConsultando(false);
    }
  }

  function aplicarGrau(valor: number) {
    setGrau(valor);
  }

  function bloqueioPapel(
    papelAlvo: PapelMembro,
    lado: MembroCipa['representacao'],
    lista: RascunhoMembro[] = membros,
  ) {
    if (papelAlvo === 'presidente' && lista.some((item) => item.funcao === 'presidente')) {
      return 'Já há um presidente.';
    }
    if (papelAlvo === 'vice' && lista.some((item) => item.funcao === 'vice')) {
      return 'Já há um vice-presidente.';
    }
    const titularesLado = lista.filter((item) => item.condicao === 'titular' && item.representacao === lado).length;
    const suplentesLado = lista.filter((item) => item.condicao === 'suplente' && item.representacao === lado).length;
    if (papelAlvo === 'suplente') {
      const cota = quadro.suplentesPorLado;
      if (cota != null && suplentesLado >= cota) {
        return cota === 0 ? 'Este porte não pede suplentes.' : `A cota de ${cota} suplente(s) deste lado já está preenchida.`;
      }
      return '';
    }
    if (efetivosNumero != null && titularesLado >= efetivosNumero) {
      return efetivosNumero === 0
        ? 'Este porte não pede titulares.'
        : `A cota de ${efetivosNumero} titular(es) deste lado já está preenchida.`;
    }
    return '';
  }

  function incluirMembro(papelAlvo: PapelMembro = papel, ladoAlvo: MembroCipa['representacao'] = membro.representacao) {
    const nomeLimpo = membro.nome.trim();
    if (!nomeLimpo) {
      rejeitar({ 'wiz-membro-nome': 'Escreva o nome de quem entra na comissão.' });
      window.setTimeout(() => nomeMembroRef.current?.focus(), 0);
      return;
    }
    const novo = montarMembro(nomeLimpo, papelAlvo, ladoAlvo);
    const bloqueio = bloqueioPapel(papelAlvo, ladoAlvo);
    if (bloqueio) {
      setAvisoPapel(bloqueio);
      return;
    }
    const comNovo = [...membros, novo].sort((a, b) => ordemComissao(a) - ordemComissao(b));
    setMembros(comNovo);
    const seguinte = OPCOES_INCLUSAO.find((opcao) => !bloqueioPapel(opcao.papel, opcao.lado, comNovo));
    setPapel(seguinte?.papel ?? 'suplente');
    setMembro({
      id: '',
      nome: '',
      condicao: 'titular',
      funcao: 'membro',
      representacao: seguinte?.lado ?? 'empregados',
    });
    limparErro('wiz-membro-nome');
    setAviso('');
    setAvisoPapel('');
    devolverFocoNome.current = true;
    nomeMembroRef.current?.focus();
  }

  function escolherPapel(proximo: PapelMembro, lado: MembroCipa['representacao']) {
    if (bloqueioPapel(proximo, lado)) return;
    setPapel(proximo);
    setMembro((atual) => ({ ...atual, representacao: lado }));
    setAvisoPapel('');
    if (membro.nome.trim()) incluirMembro(proximo, lado);
  }

  function retirarMembro(indice: number) {
    const resto = membros.filter((_, atual) => atual !== indice);
    setMembros(resto);
    const seguinte = OPCOES_INCLUSAO.find((opcao) => !bloqueioPapel(opcao.papel, opcao.lado, resto));
    if (!seguinte) return;
    setPapel(seguinte.papel);
    setMembro((atual) => ({ ...atual, representacao: seguinte.lado }));
    setAvisoPapel('');
  }

  function medirPosicoes() {
    const mapa = new Map<string, { left: number; top: number }>();
    document.querySelectorAll<HTMLElement>('[data-membro-id]').forEach((el) => {
      const id = el.dataset.membroId;
      if (!id) return;
      const rect = el.getBoundingClientRect();
      mapa.set(id, { left: rect.left, top: rect.top });
    });
    return mapa;
  }

  function indiceSobPonto(x: number, y: number, ignorarId: string) {
    const pilha = document.elementsFromPoint(x, y);
    for (const no of pilha) {
      if (!(no instanceof Element)) continue;
      const card = no.closest('[data-membro-id]');
      if (!(card instanceof HTMLElement)) continue;
      const id = card.dataset.membroId;
      if (!id || id === ignorarId) continue;
      const indice = membros.findIndex((item) => item.id === id);
      if (indice >= 0) return indice;
    }
    return -1;
  }

  function motivoTroca(indice: number, parceiro: number) {
    const item = membros[indice];
    const outro = membros[parceiro];
    if (!item || !outro) return 'Não encontrei este membro.';
    if (item.representacao === outro.representacao) return '';
    const papelItem = papelDe(item);
    const papelOutro = papelDe(outro);
    if (papelItem === 'presidente' || papelItem === 'vice' || papelOutro === 'presidente' || papelOutro === 'vice') {
      return 'Presidente e vice não mudam de lado.';
    }
    if (papelItem !== papelOutro) return 'A troca só vale entre pessoas do mesmo tipo.';
    const simulada = trocarCom(membros, indice, parceiro);
    if (!simulada) return 'Não foi possível trocar estes membros.';
    return motivoDaComissao(simulada, membros, efetivosNumero, quadro.suplentesPorLado);
  }

  function voarDeVolta(recusar: boolean, dados = arrasteRef.current) {
    const el = fantasmaRef.current;
    arrasteRef.current = null;
    setAlvoArraste(null);
    if (!dados || !el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setArraste(null);
      return;
    }
    const volta = { transform: `translate3d(${dados.origemX}px, ${dados.origemY}px, 0) scale(1)` };
    const atual = { transform: `translate3d(${dados.x}px, ${dados.y}px, 0) scale(1.04)` };
    const quadros = recusar
      ? [
          atual,
          { transform: `translate3d(${dados.x - 10}px, ${dados.y}px, 0) scale(1.04)` },
          { transform: `translate3d(${dados.x + 10}px, ${dados.y}px, 0) scale(1.04)` },
          atual,
          volta,
        ]
      : [atual, volta];
    const animacao = el.animate(quadros, { duration: recusar ? 420 : 280, easing: 'cubic-bezier(.2, .8, .2, 1)' });
    animacao.onfinish = () => setArraste(null);
    animacao.oncancel = () => setArraste(null);
  }

  function concluirTroca(indice: number, parceiro: number) {
    const item = membros[indice];
    const simulada = trocarCom(membros, indice, parceiro);
    if (!item || !simulada) return;
    const antes = medirPosicoes();
    const ghost = fantasmaRef.current?.getBoundingClientRect();
    animacaoRef.current = {
      antes,
      idArrastado: item.id,
      ghost: ghost ? { left: ghost.left, top: ghost.top } : null,
    };
    arrasteRef.current = null;
    setArraste(null);
    setAlvoArraste(null);
    setAvisoTroca('');
    setMembros(simulada);
  }

  function aoPointerDown(event: EventoPonteiro<HTMLLIElement>, indice: number) {
    if ((event.target as HTMLElement).closest('button')) return;
    const item = membros[indice];
    if (!item) return;
    const estilo = papelDe(item);
    if (estilo === 'presidente' || estilo === 'vice') {
      setAvisoTroca('Presidente e vice não mudam de lado.');
      setRecusaIndice(indice);
      if (recusaTimer.current) window.clearTimeout(recusaTimer.current);
      recusaTimer.current = window.setTimeout(() => setRecusaIndice(null), 450);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    arrasteRef.current = {
      pointerId: event.pointerId,
      indice,
      id: item.id,
      ladoOrigem: item.representacao,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      largura: rect.width,
      altura: rect.height,
      origemX: rect.left,
      origemY: rect.top,
      startX: event.clientX,
      startY: event.clientY,
      x: rect.left,
      y: rect.top,
      ativo: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function aoPointerMove(event: EventoPonteiro<HTMLLIElement>) {
    const dados = arrasteRef.current;
    if (!dados || event.pointerId !== dados.pointerId) return;
    event.preventDefault();
    const distancia = Math.hypot(event.clientX - dados.startX, event.clientY - dados.startY);
    if (!dados.ativo && distancia < 8) return;
    const item = membros[dados.indice];
    if (!item) return;
    if (!dados.ativo) {
      dados.ativo = true;
      const estilo = papelDe(item);
      setAvisoTroca('');
      setArraste({
        indice: dados.indice,
        id: item.id,
        ladoOrigem: item.representacao,
        estilo,
        nome: item.nome,
        rotulo: PAPEIS.find((papelItem) => papelItem.id === estilo)?.rotulo ?? '',
        largura: dados.largura,
        altura: dados.altura,
      });
    }
    dados.x = event.clientX - dados.offsetX;
    dados.y = event.clientY - dados.offsetY;
    if (fantasmaRef.current) {
      fantasmaRef.current.style.transform = `translate3d(${dados.x}px, ${dados.y}px, 0) scale(1.04)`;
    }
    const alvo = indiceSobPonto(event.clientX, event.clientY, dados.id);
    const outro = alvo >= 0 ? membros[alvo] : null;
    const proximo = outro && outro.representacao !== dados.ladoOrigem ? alvo : null;
    setAlvoArraste((atual) => (atual === proximo ? atual : proximo));
  }

  function aoPointerUp(event: EventoPonteiro<HTMLLIElement>) {
    const dados = arrasteRef.current;
    if (!dados || event.pointerId !== dados.pointerId) return;
    arrasteRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!dados.ativo) return;
    const alvo = indiceSobPonto(event.clientX, event.clientY, dados.id);
    const outro = alvo >= 0 ? membros[alvo] : null;
    if (!outro || outro.representacao === dados.ladoOrigem) {
      const noOutroLado = (['empregados', 'organizacao'] as const).some((lado) => {
        if (lado === dados.ladoOrigem) return false;
        const el = document.querySelector<HTMLElement>(`[data-lado="${lado}"]`);
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
      });
      if (noOutroLado) {
        setAvisoTroca('Solte sobre a pessoa do outro lado que vai trocar de lugar.');
        voarDeVolta(true, dados);
        return;
      }
      voarDeVolta(false, dados);
      return;
    }
    const erro = motivoTroca(dados.indice, alvo);
    if (erro) {
      setAvisoTroca(erro);
      voarDeVolta(true, dados);
      return;
    }
    arrasteRef.current = dados;
    concluirTroca(dados.indice, alvo);
  }

  function validarComissao(completa: boolean) {
    if (completa) {
      const temPresidente = membros.some((item) => item.funcao === 'presidente');
      const temSuplente = membros.some((item) => item.condicao === 'suplente');
      if (!temPresidente || !temSuplente) {
        return 'Para salvar a comissão, relacione um presidente e um suplente.';
      }
    } else if (!membros.length) {
      return 'Inclua ao menos um membro ou escolha preencher a comissão depois.';
    }
    if (efetivosNumero == null) return 'Confirme o dimensionamento antes de lançar a comissão.';
    const titulares = membros.filter((item) => item.condicao === 'titular');
    const porLado = (lado: RascunhoMembro['representacao']) =>
      titulares.filter((item) => item.representacao === lado).length;
    if (efetivosNumero === 0 && titulares.length > 0) {
      return 'Este porte pede um representante designado, não uma comissão de titulares.';
    }
    if (titulares.length > efetivosNumero * 2 || porLado('empregados') > efetivosNumero || porLado('organizacao') > efetivosNumero) {
      return `O dimensionamento comporta ${efetivosNumero} titular(es) de cada lado. Ajuste a comissão ou volte e confira o grau de risco.`;
    }
    return '';
  }

  function lacunasComissao() {
    if (quadro.modo === 'designado') {
      return membros.length ? [] : ['Representante designado pela organização'];
    }
    if (quadro.modo !== 'cipa' || efetivosNumero == null) return ['Dimensionamento da CIPA'];
    const itens: string[] = [];
    if (!membros.some((item) => item.funcao === 'presidente')) itens.push('Presidente pela organização');
    if (!membros.some((item) => item.funcao === 'vice')) itens.push('Vice-presidente pelos empregados');
    for (const lado of ['empregados', 'organizacao'] as const) {
      const nomeLado = lado === 'empregados' ? 'dos empregados' : 'da organização';
      const titulares = membros.filter((item) => item.condicao === 'titular' && item.representacao === lado).length;
      if (efetivosNumero > 0 && titulares < efetivosNumero) {
        itens.push(`Titulares ${nomeLado}`);
      }
      const cota = quadro.suplentesPorLado;
      const suplentes = membros.filter((item) => item.condicao === 'suplente' && item.representacao === lado).length;
      if (cota != null && cota > 0 && suplentes < cota) {
        itens.push(`Suplentes ${nomeLado}`);
      }
    }
    return itens;
  }

  function montarFecho(destino: 'inicio' | 'eleicoes', emAndamento: boolean): FechoWizard {
    if (destino === 'eleicoes') {
      return {
        tipo: 'sucesso',
        destino,
        titulo: 'A implantação está aberta',
        texto: 'A empresa, o grau de risco e o calendário da eleição já estão no sistema. Acompanhe cada etapa na gestão de eleições.',
        itens: [],
      };
    }
    if (!emAndamento) {
      return {
        tipo: 'pendencia',
        destino,
        titulo: 'A implantação pode esperar',
        texto: 'Nada da eleição foi aberto. Quando quiser constituir a CIPA, o caminho continua na plataforma, no seu ritmo.',
        itens: ['Estabelecimento e data da posse'],
      };
    }
    const itens = lacunasComissao();
    if (itens.length) {
      return {
        tipo: 'pendencia',
        destino,
        titulo: 'Seus dados estão guardados',
        texto: 'A comissão pode ser completada depois, com calma. Estes pontos ficam à mão na página principal.',
        itens,
      };
    }
    return {
      tipo: 'sucesso',
      destino,
      titulo: 'A comissão foi registrada',
      texto: 'O mandato e os membros já estão na página principal. A gestão de conformidade acompanha esse quadro.',
      itens: [],
    };
  }

  function sairFecho() {
    if (!fecho) return;
    onConcluido?.();
    navigate(fecho.destino === 'eleicoes' ? '/eleicoes' : '/inicio', { replace: true });
  }

  async function gravar(destino: 'inicio' | 'eleicoes', emAndamento: boolean, lancarMembros: boolean, completa = false) {
    if (!projetoId) {
      setAviso('Selecione um projeto para continuar.');
      return;
    }
    if (lancarMembros) {
      const mensagem = validarComissao(completa);
      if (mensagem) {
        setAviso(mensagem);
        return;
      }
    }
    setSalvando(true);
    setAviso('');
    try {
      const campos: Record<string, unknown> = !emAndamento && !inicio
        ? { cipa_em_andamento: false }
        : {
            nome: nome.trim() || empresa?.razaoSocial || projetoNome,
            cnpj: cnpj.replace(/\D/g, '') || null,
            razao_social: empresa?.razaoSocial || null,
            cipa_em_andamento: emAndamento,
            data_inicio_gestao: inicio || null,
            data_fim_mandato: fim || null,
            quantidade_empregados: Number.isFinite(Number(empregados)) ? Number(empregados) : null,
            grau_risco: grau,
            cnae: empresa?.cnae || null,
            cnae_descricao: empresa?.cnaeDescricao || null,
            dimensionamento_efetivos: efetivosNumero,
            dimensionamento_editado_usuario: editouDimensionamento,
            quadro_mandato_empregados: emAndamento && Number.isFinite(Number(empregados)) ? Number(empregados) : null,
            quadro_mandato_grau: emAndamento ? grau : null,
          };
      await projetoService.salvarDadosCipa(
        projetoId,
        campos,
        'grau_risco' in campos ? ['quantidade_empregados', 'grau_risco'] : [],
      );

      if (nome.trim()) selecionarProjeto(projetoId, nome.trim(), projetoLogo);

      if (lancarMembros) {
        for (const item of membros) {
          await salvarMembro({
            projeto_id: projetoId,
            nome: item.nome,
            representacao: item.representacao,
            condicao: item.condicao,
            funcao: item.funcao,
            inicio_mandato: inicio,
            fim_mandato: fim || inicio,
            situacao: 'em_exercicio',
          });
        }
      }
      setFecho(montarFecho(destino, emAndamento));
      setPasso('conclusao');
    } catch (erro) {
      setAviso(extrairMensagemErro(erro));
    } finally {
      setSalvando(false);
    }
  }

  const resumoEleicao = inicio
    ? [
        {
          titulo: 'Início do processo',
          data: isoData(somarDias(lerData(inicio), DIAS_DA_POSSE_PRIMEIRA.iniciar_processo)),
          texto: 'A organização abre o processo e constitui a comissão eleitoral. Não há os 60 dias de uma renovação.',
        },
        {
          titulo: 'Eleição',
          data: isoData(somarDias(lerData(inicio), DIAS_DA_POSSE_PRIMEIRA.realizacao_eleicao)),
          texto: 'A votação vem depois dos 15 dias de inscrição, sem os 30 dias de um mandato anterior.',
        },
        {
          titulo: 'Posse',
          data: inicio,
          texto: `O mandato de um ano começa nesta data e vai até ${formatarDataBr(fim)}.`,
        },
        {
          titulo: 'Treinamento',
          data: isoData(somarDias(lerData(inicio), DIAS_DA_POSSE_PRIMEIRA.lista_treinamento)),
          texto: 'No primeiro mandato, o treinamento pode ser feito até 30 dias depois da posse.',
        },
      ]
    : [];

  return createPortal(
    <div className="wizard-modal" role="dialog" aria-modal="true" aria-labelledby="wizard-cipa-titulo">
      <div className="wizard-modal__caixa">
        <header className="wizard-modal__cabecalho">
          <p className="wizard-modal__olho" id="wizard-cipa-titulo">
            {passo === 'conclusao' ? (fecho?.tipo === 'sucesso' ? 'Tudo certo' : 'Pode seguir') : 'Vamos situar a sua CIPA'}
          </p>
          <p className="wizard-lead wizard-modal__subtitulo">
            {passo === 'conclusao'
              ? fecho?.tipo === 'sucesso'
                ? 'O que você preencheu já está na plataforma.'
                : 'O que você informou já está guardado. O restante pode esperar.'
              : 'Um passo de cada vez. No final, a página principal já nasce com o que você informou.'}
          </p>
          <div className="wizard-progresso" aria-hidden>
            <span style={{ width: `${progresso[passo]}%` }} />
          </div>
          {aviso ? <p className="eleicoes-aviso">{aviso}</p> : null}
        </header>
        <div className="wizard-modal__corpo">
          <div className="wizard-modal__centro">
          <div className="wizard-cipa">
            {passo === 'situacao' ? (
              <section className="wizard-passo">
                <h2>Neste estabelecimento, a CIPA já está constituída e em mandato?</h2>
                <p className="wizard-lead">
                  Pense na comissão que existe hoje, com membros empossados. Se ela já funciona, seguimos pelo que está em curso. Se ainda não existe, montamos a implantação.
                </p>
                <div className="wizard-escolhas">
                  <button type="button" className="wizard-escolha" onClick={() => setPasso('dados')}>
                    <strong>Sim, a CIPA já está em funcionamento</strong>
                    <span>Vamos registrar o mandato atual e, se quiser, quem compõe a comissão.</span>
                  </button>
                  <button type="button" className="wizard-escolha" onClick={() => setPasso('implantar')}>
                    <strong>Ainda não temos CIPA instalada</strong>
                    <span>Você decide se quer abrir a implantação agora ou entrar e organizar isso depois.</span>
                  </button>
                </div>
              </section>
            ) : null}

            {passo === 'dados' ? (
              <section className="wizard-passo">
                <h2>CNPJ, colaboradores e início da gestão</h2>
                <p className="wizard-lead">
                  O nome da empresa não é digitado aqui. Ele vem do CNPJ, junto com a classificação de risco. A quantidade de colaboradores completa o dimensionamento da CIPA.
                </p>
                <form
                  id="wiz-form-dados"
                  className="cepi-form"
                  onSubmit={(evento) => {
                    evento.preventDefault();
                    const novos = validarIdentificacao('wiz-cnpj', 'wiz-inicio', 'wiz-empregados');
                    if (Object.keys(novos).length) {
                      rejeitar(novos);
                      return;
                    }
                    setErros({});
                    consultarESeguir('empresa');
                  }}
                >
                  <div className="cepi-form__grid">
                    <CampoFormulario
                      id="wiz-cnpj"
                      rotulo="CNPJ"
                      largo
                      erro={erros['wiz-cnpj']}
                      shake={shake}
                      ajuda="Este CNPJ é importante. É com ele que puxamos a classificação de risco e o dimensionamento da CIPA."
                    >
                      <InputText id="wiz-cnpj" value={cnpj} onChange={(e) => { setCnpj(formatarCnpj(e.target.value)); limparErro('wiz-cnpj'); }} />
                    </CampoFormulario>
                    <CampoFormulario id="wiz-empregados" rotulo="Quantidade de colaboradores" erro={erros['wiz-empregados']} shake={shake}>
                      <InputText id="wiz-empregados" type="number" min={0} value={empregados} onChange={(e) => { setEmpregados(e.target.value); limparErro('wiz-empregados'); }} />
                    </CampoFormulario>
                    <CampoFormulario id="wiz-inicio" rotulo="Início da gestão" erro={erros['wiz-inicio']} shake={shake}>
                      <InputText id="wiz-inicio" type="date" value={inicio} onChange={(e) => { setInicio(e.target.value); limparErro('wiz-inicio'); }} />
                    </CampoFormulario>
                    {fim ? <p className="wizard-lead cepi-form__full">O mandato termina em {formatarDataBr(fim)}.</p> : null}
                  </div>
                </form>
              </section>
            ) : null}

            {passo === 'empresa' && empresa ? (
              <section className="wizard-passo">
                <h2>Confira a empresa e o dimensionamento</h2>
                <p className="wizard-lead">
                  O dimensionamento abaixo é o do Quadro I da NR-05 para o grau de risco desta atividade. Se o estabelecimento presta serviço dentro de uma empresa de grau maior, altere o grau de risco: o quadro de membros é recalculado.
                </p>
                <FichaEmpresa empresa={empresa} empregados={empregados} grau={grau} alterando={alterandoQuadro} onGrau={aplicarGrau} />
                <PainelDimensionamento quadro={quadro} grau={grau} grauDoCnpj={grauDoCnpj} editou={editouDimensionamento} />
              </section>
            ) : null}

            {passo === 'membros' ? (
              <section className="wizard-passo">
                <h2>Quem compõe a CIPA neste mandato?</h2>
                <p className="wizard-lead">Escolha o papel, escreva o nome e adicione. Arraste um membro ou suplente sobre alguém do outro lado: a pessoa sob o cursor troca de lugar quando a troca é possível. Para salvar, a comissão precisa de um presidente e de um suplente.</p>
                <form
                  className="wizard-entrada"
                  onSubmit={(evento) => {
                    evento.preventDefault();
                    incluirMembro();
                    devolverFocoNome.current = false;
                  }}
                >
                  <div className="wizard-entrada__linha">
                    <CampoFormulario id="wiz-membro-nome" rotulo="Nome" erro={erros['wiz-membro-nome']} shake={shake}>
                      <InputText
                        ref={nomeMembroRef}
                        id="wiz-membro-nome"
                        value={membro.nome}
                        onChange={(e) => {
                          setMembro({ ...membro, nome: e.target.value });
                          limparErro('wiz-membro-nome');
                          setAvisoPapel('');
                        }}
                      />
                    </CampoFormulario>
                    <SplitButton
                      className="wizard-split"
                      menuClassName="wizard-split__menu"
                      label={rotuloInclusao(papel, membro.representacao)}
                      disabled={Boolean(bloqueioPapel(papel, membro.representacao))}
                      onClick={() => {
                        incluirMembro();
                        devolverFocoNome.current = false;
                      }}
                      onMenuCloseAutoFocus={(evento) => {
                        if (!devolverFocoNome.current) return;
                        evento.preventDefault();
                        devolverFocoNome.current = false;
                        nomeMembroRef.current?.focus();
                      }}
                      model={OPCOES_INCLUSAO.map((opcao) => {
                        const motivo = bloqueioPapel(opcao.papel, opcao.lado);
                        return {
                          label: opcao.label,
                          disabled: Boolean(motivo),
                          motivo,
                          className: `wizard-split__opcao wizard-split__opcao--${opcao.papel}`,
                          command: () => escolherPapel(opcao.papel, opcao.lado),
                        };
                      })}
                    />
                  </div>
                  {avisoPapel ? <p className="wizard-entrada__erro" role="alert">{avisoPapel}</p> : null}
                </form>
                <div className="wizard-comissao-lados">
                  {(['empregados', 'organizacao'] as const).map((lado) => {
                    const doLado = membros
                      .map((item, indice) => ({ item, indice }))
                      .filter(({ item }) => item.representacao === lado)
                      .sort((a, b) => ordemComissao(a.item) - ordemComissao(b.item) || a.indice - b.indice);
                    const titularesLado = doLado.filter(({ item }) => item.condicao === 'titular').length;
                    return (
                      <article
                        key={lado}
                        data-lado={lado}
                        className="wizard-lado"
                      >
                        <header>
                          <strong>{lado === 'empregados' ? 'Empregados' : 'Organização'}</strong>
                          {efetivosNumero != null && efetivosNumero > 0 ? <span>{titularesLado}/{efetivosNumero}</span> : null}
                        </header>
                        {doLado.length === 0 ? (
                          <p>Ninguém deste lado ainda.</p>
                        ) : (
                          <ol>
                            {doLado.map(({ item, indice }) => {
                              const estilo = papelDe(item);
                              const rotulo = PAPEIS.find((papelItem) => papelItem.id === estilo)?.rotulo;
                              const fixo = estilo === 'presidente' || estilo === 'vice';
                              const sobreEste = arraste != null && alvoArraste === indice;
                              const podeTrocar = sobreEste && motivoTroca(arraste.indice, indice) === '';
                              const classes = [
                                'wizard-pessoa',
                                `wizard-pessoa--${estilo}`,
                                fixo ? 'is-fixo' : 'is-arrastavel',
                                arraste?.indice === indice ? 'is-origem' : '',
                                sobreEste ? (podeTrocar ? 'is-troca' : 'is-troca-negada') : '',
                                recusaIndice === indice ? 'is-recusa' : '',
                              ].filter(Boolean).join(' ');
                              return (
                                <li
                                  key={item.id}
                                  data-membro-id={item.id}
                                  className={classes}
                                  title={fixo ? 'Presidente e vice não mudam de lado.' : 'Arraste sobre uma pessoa do outro lado. Ela troca de lugar se a troca for possível.'}
                                  onPointerDown={(event) => aoPointerDown(event, indice)}
                                  onPointerMove={aoPointerMove}
                                  onPointerUp={aoPointerUp}
                                  onPointerCancel={() => {
                                    const dados = arrasteRef.current;
                                    if (dados?.ativo) voarDeVolta(false, dados);
                                    else arrasteRef.current = null;
                                  }}
                                >
                                  <span>{item.nome}</span>
                                  <em className={`wizard-badge wizard-badge--${estilo}`}>{rotulo}</em>
                                  <button
                                    type="button"
                                    aria-label={`Retirar ${item.nome}`}
                                    onPointerDown={(event) => event.stopPropagation()}
                                    onClick={() => retirarMembro(indice)}
                                  >×</button>
                                </li>
                              );
                            })}
                          </ol>
                        )}
                      </article>
                    );
                  })}
                </div>
                <p className="wizard-troca-dica">Passe sobre a pessoa do outro lado. O contorno verde troca; o vermelho não troca. Soltar no vermelho não muda a comissão e mostra o motivo.</p>
                {avisoTroca ? <p className="wizard-entrada__erro" role="alert">{avisoTroca}</p> : null}
                {arraste ? createPortal(
                  <div
                    ref={fantasmaRef}
                    className={`wizard-pessoa wizard-pessoa--${arraste.estilo} wizard-fantasma`}
                    style={{ width: arraste.largura, height: arraste.altura }}
                  >
                    <span>{arraste.nome}</span>
                    <em className={`wizard-badge wizard-badge--${arraste.estilo}`}>{arraste.rotulo}</em>
                    <i className="wizard-fantasma__lugar" aria-hidden="true" />
                  </div>,
                  document.body,
                ) : null}
              </section>
            ) : null}

            {passo === 'conclusao' && fecho ? (
              <section className={`wizard-passo wizard-fecho wizard-fecho--${fecho.tipo}`}>
                <div className="wizard-fecho__marca" aria-hidden>
                  {fecho.tipo === 'sucesso' ? <CircleCheck /> : <Clock />}
                </div>
                <h2>{fecho.titulo}</h2>
                <p className="wizard-lead">{fecho.texto}</p>
                {fecho.itens.length ? (
                  <>
                    <p className="wizard-fecho__chamada">Para quando for a hora</p>
                    <ul className="wizard-fecho__lista">
                      {fecho.itens.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </>
                ) : null}
              </section>
            ) : null}

            {passo === 'implantar' ? (
              <section className="wizard-passo">
                <h2>Quer abrir agora o caminho para constituir a CIPA?</h2>
                <p className="wizard-lead">Se sim, informamos o estabelecimento e a data da posse. Se preferir olhar a plataforma antes, a implantação continua disponível depois.</p>
                <div className="wizard-escolhas">
                  <button type="button" className="wizard-escolha" onClick={() => setPasso('dados-impl')}>
                    <strong>Sim, quero iniciar a implantação</strong>
                    <span>O CNPJ puxa a classificação de risco e o dimensionamento. Depois informamos a data da posse.</span>
                  </button>
                  <button type="button" className="wizard-escolha" onClick={() => gravar('inicio', false, false)}>
                    <strong>Agora não</strong>
                    <span>Seguimos para a página principal. Você começa a implantação quando quiser.</span>
                  </button>
                </div>
              </section>
            ) : null}

            {passo === 'dados-impl' ? (
              <section className="wizard-passo">
                <h2>Dados para iniciar a implantação</h2>
                <p className="wizard-lead">
                  A quantidade de colaboradores entra no dimensionamento. A data é a da posse: o processo eleitoral acontece antes dela.
                </p>
                <form
                  id="wiz-form-impl"
                  className="cepi-form"
                  onSubmit={(evento) => {
                    evento.preventDefault();
                    const novos = validarIdentificacao('wiz-impl-cnpj', 'wiz-posse', 'wiz-impl-empregados');
                    if (Object.keys(novos).length) {
                      rejeitar(novos);
                      return;
                    }
                    setErros({});
                    consultarESeguir('resumo-impl');
                  }}
                >
                  <div className="cepi-form__grid">
                    <CampoFormulario
                      id="wiz-impl-cnpj"
                      rotulo="CNPJ"
                      largo
                      erro={erros['wiz-impl-cnpj']}
                      shake={shake}
                      ajuda="Este CNPJ é importante. É com ele que puxamos a classificação de risco e o dimensionamento da CIPA."
                    >
                      <InputText id="wiz-impl-cnpj" value={cnpj} onChange={(e) => { setCnpj(formatarCnpj(e.target.value)); limparErro('wiz-impl-cnpj'); }} />
                    </CampoFormulario>
                    <CampoFormulario id="wiz-impl-empregados" rotulo="Quantidade de colaboradores" erro={erros['wiz-impl-empregados']} shake={shake}>
                      <InputText id="wiz-impl-empregados" type="number" min={0} value={empregados} onChange={(e) => { setEmpregados(e.target.value); limparErro('wiz-impl-empregados'); }} />
                    </CampoFormulario>
                    <CampoFormulario id="wiz-posse" rotulo="Data da posse" erro={erros['wiz-posse']} shake={shake}>
                      <InputText id="wiz-posse" type="date" value={inicio} onChange={(e) => { setInicio(e.target.value); limparErro('wiz-posse'); }} />
                    </CampoFormulario>
                  </div>
                </form>
              </section>
            ) : null}

            {passo === 'resumo-impl' && empresa ? (
              <section className="wizard-passo">
                <h2>A implantação já tem um ponto de partida</h2>
                <p className="wizard-lead">
                  Confira a empresa, o grau de risco e o dimensionamento. Como ainda não há CIPA, o calendário abaixo corre até a posse. Não usa os 60 e 30 dias de uma renovação.
                </p>
                <FichaEmpresa empresa={empresa} empregados={empregados} grau={grau} alterando={alterandoQuadro} onGrau={aplicarGrau} />
                <PainelDimensionamento quadro={quadro} grau={grau} grauDoCnpj={grauDoCnpj} editou={editouDimensionamento} />
                <h3 className="wizard-ficha__titulo">Resumo da eleição</h3>
                <ol className="wizard-linha">
                  {resumoEleicao.map((item, indice) => (
                    <li key={item.titulo} className={item.titulo === 'Posse' ? 'is-posse' : undefined}>
                      <span className="wizard-linha__marca">{indice + 1}</span>
                      <div>
                        <strong>{item.titulo}</strong>
                        <time dateTime={item.data}>{formatarDataBr(item.data)}</time>
                        <p>{item.texto}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                <p className="wizard-lead">Ao fechar, você entra na gestão das eleições e acompanha cada etapa por lá.</p>
              </section>
            ) : null}
          </div>
          </div>
        </div>
        <RodapeWizard
          passo={passo}
          consultando={consultando}
          salvando={salvando}
          alterando={alterandoQuadro}
          podeSeguir={grau != null && efetivosNumero != null}
          temMembros={membros.length >= 1}
          editou={editouDimensionamento}
          onAlterar={() => setAlterandoQuadro(true)}
          onPasso={setPasso}
          onGravar={gravar}
          fecho={fecho}
          onSair={sairFecho}
        />
      </div>
    </div>,
    document.body,
  );
}

function RodapeWizard({
  passo,
  consultando,
  salvando,
  alterando,
  podeSeguir,
  temMembros,
  editou,
  onAlterar,
  onPasso,
  onGravar,
  fecho,
  onSair,
}: {
  passo: Passo;
  consultando: boolean;
  salvando: boolean;
  alterando: boolean;
  podeSeguir: boolean;
  temMembros: boolean;
  editou: boolean;
  onAlterar: () => void;
  onPasso: (passo: Passo) => void;
  onGravar: (destino: 'inicio' | 'eleicoes', emAndamento: boolean, lancarMembros: boolean, completa?: boolean) => void;
  fecho: FechoWizard | null;
  onSair: () => void;
}) {
  const alterar = passo === 'empresa' || passo === 'resumo-impl' ? (
    <Button
      type="button"
      label="Alterar o grau de risco"
      icon={<SlidersHorizontal aria-hidden />}
      outlined
      disabled={alterando}
      title="Use se este estabelecimento presta serviço dentro de uma empresa de grau de risco maior. O quadro de membros é recalculado pela NR-05."
      onClick={onAlterar}
    />
  ) : null;

  let acoes: ReactNode = null;
  if (passo === 'conclusao' && fecho) {
    acoes = (
      <Button
        type="button"
        label={fecho.destino === 'eleicoes' ? 'Ir para as eleições' : 'Seguir para o início'}
        icon={<ArrowRight aria-hidden />}
        iconPos="right"
        onClick={onSair}
      />
    );
  } else if (passo === 'dados') {
    acoes = (
      <>
        <Button type="button" label="Voltar" icon={<ArrowLeft aria-hidden />} outlined onClick={() => onPasso('situacao')} />
        <Button type="submit" form="wiz-form-dados" label="Buscar a empresa" icon={<Search aria-hidden />} loading={consultando} />
      </>
    );
  } else if (passo === 'empresa') {
    acoes = (
      <>
        <Button type="button" label="Voltar" icon={<ArrowLeft aria-hidden />} outlined onClick={() => onPasso('dados')} />
        {alterar}
        <Button
          type="button"
          label={editou ? 'Seguir com este grau' : 'Concordo com o dimensionamento'}
          icon={<ArrowRight aria-hidden />}
          iconPos="right"
          disabled={!podeSeguir}
          onClick={() => onPasso('membros')}
        />
      </>
    );
  } else if (passo === 'membros') {
    acoes = (
      <>
        <Button type="button" label="Voltar" icon={<ArrowLeft aria-hidden />} outlined onClick={() => onPasso('empresa')} />
        <Button
          type="button"
          label={temMembros ? 'Continuar depois' : 'Preencher depois'}
          icon={<Clock aria-hidden />}
          outlined
          loading={salvando}
          onClick={() => onGravar('inicio', true, temMembros)}
        />
        <Button type="button" label="Salvar a comissão" icon={<Save aria-hidden />} loading={salvando} onClick={() => onGravar('inicio', true, true, true)} />
      </>
    );
  } else if (passo === 'dados-impl') {
    acoes = (
      <>
        <Button type="button" label="Voltar" icon={<ArrowLeft aria-hidden />} outlined onClick={() => onPasso('implantar')} />
        <Button type="submit" form="wiz-form-impl" label="Ver a empresa e a eleição" icon={<Search aria-hidden />} loading={consultando} />
      </>
    );
  } else if (passo === 'resumo-impl') {
    acoes = (
      <>
        <Button type="button" label="Voltar" icon={<ArrowLeft aria-hidden />} outlined onClick={() => onPasso('dados-impl')} />
        {alterar}
        <Button
          type="button"
          label="Ir para as eleições"
          icon={<ArrowRight aria-hidden />}
          iconPos="right"
          loading={salvando}
          disabled={!podeSeguir}
          onClick={() => onGravar('eleicoes', false, false)}
        />
      </>
    );
  }

  if (!acoes) return null;
  return (
    <footer className="wizard-modal__rodape">
      <div className="wizard-acoes">{acoes}</div>
    </footer>
  );
}

function FichaEmpresa({
  empresa,
  empregados,
  grau,
  alterando,
  onGrau,
}: {
  empresa: EmpresaCnpj;
  empregados: string;
  grau: number | null;
  alterando: boolean;
  onGrau: (valor: number) => void;
}) {
  const escolher = alterando || !empresa.grauRisco;
  return (
    <ul className="wizard-ficha">
      <li><span>Razão social</span><strong>{empresa.razaoSocial || '—'}</strong></li>
      <li><span>Nome fantasia</span><strong>{empresa.nomeFantasia || '—'}</strong></li>
      <li><span>Município</span><strong>{[empresa.municipio, empresa.uf].filter(Boolean).join('/') || '—'}</strong></li>
      <li><span>CNAE</span><strong>{empresa.cnae ? `${empresa.cnae} · ${empresa.cnaeDescricao}` : '—'}</strong></li>
      <li><span>Colaboradores</span><strong>{empregados}</strong></li>
      <li>
        <span>Grau de risco</span>
        {escolher ? (
          <Dropdown
            inputId="wiz-grau"
            value={grau}
            options={GRAUS.filter((item) => !empresa.grauRisco || item.value >= empresa.grauRisco)}
            placeholder="Confirme o grau da NR-04"
            onChange={(evento) => onGrau(evento.value)}
          />
        ) : (
          <strong>Grau {empresa.grauRisco}, da atividade principal</strong>
        )}
      </li>
    </ul>
  );
}

function PainelDimensionamento({
  quadro,
  grau,
  grauDoCnpj,
  editou,
}: {
  quadro: QuadroCipa;
  grau: number | null;
  grauDoCnpj: number | null;
  editou: boolean;
}) {
  if (quadro.modo === 'indefinido') {
    return <p className="wizard-lead">Confirme o grau de risco para ver o quadro da NR-05.</p>;
  }

  const numero = quadro.efetivosPorLado ?? 0;
  const suplentes = quadro.suplentesPorLado ?? 0;
  const ajuste = editou ? (
    <p className="wizard-quadro__aviso">
      Quadro calculado com o grau {grau}, escolhido por você.
      {grauDoCnpj ? ` A atividade principal do CNPJ indica grau ${grauDoCnpj}.` : ''} Fica marcado como alterado.
    </p>
  ) : null;

  if (quadro.modo === 'designado' && numero === 0) {
    return (
      <section className="wizard-quadro" aria-label="Dimensionamento da CIPA">
        <p className="wizard-quadro__olho">Quadro da NR-05</p>
        <div className="wizard-quadro__designado">
          <strong>1</strong>
          <span>representante designado</span>
          <p>Este porte não pede titulares dos dois lados. Uma pessoa designada cobre a CIPA.</p>
        </div>
        {ajuste}
      </section>
    );
  }

  return (
    <section className={`wizard-quadro${editou ? ' wizard-quadro--editado' : ''}`} aria-label="Dimensionamento da CIPA">
      <div className="wizard-quadro__topo">
        <p className="wizard-quadro__olho">Quadro da NR-05</p>
        <p className="wizard-quadro__total">{numero * 2} {numero * 2 === 1 ? 'titular no total' : 'titulares no total'}</p>
      </div>
      <div className="wizard-quadro__lados">
        <LadoComissao nome="Empregados" titulares={numero} suplentes={suplentes} />
        <LadoComissao nome="Organização" titulares={numero} suplentes={suplentes} />
      </div>
      <p className="wizard-quadro__legenda">
        <span className="wizard-assento" aria-hidden /> titular
        <span className="wizard-assento wizard-assento--suplente" aria-hidden /> suplente
      </p>
      {ajuste}
    </section>
  );
}

function LadoComissao({ nome, titulares, suplentes }: { nome: string; titulares: number; suplentes: number }) {
  return (
    <article className="wizard-lado">
      <strong>{nome}</strong>
      <span className="wizard-lado__numero">{titulares}</span>
      <span className="wizard-lado__rotulo">{titulares === 1 ? 'titular' : 'titulares'}</span>
      <Assentos quantidade={titulares} suplente={false} />
      <p className="wizard-lado__suplentes">{suplentes} {suplentes === 1 ? 'suplente' : 'suplentes'}</p>
      <Assentos quantidade={suplentes} suplente />
    </article>
  );
}

function Assentos({ quantidade, suplente }: { quantidade: number; suplente: boolean }) {
  const visiveis = Math.min(quantidade, 12);
  if (!visiveis) return null;
  return (
    <div className="wizard-assentos" aria-hidden>
      {Array.from({ length: visiveis }, (_, indice) => (
        <span key={indice} className={suplente ? 'wizard-assento wizard-assento--suplente' : 'wizard-assento'} />
      ))}
      {quantidade > visiveis ? <span className="wizard-assentos__mais">+{quantidade - visiveis}</span> : null}
    </div>
  );
}

