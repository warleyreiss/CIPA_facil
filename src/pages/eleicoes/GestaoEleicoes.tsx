import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { CampoFormulario } from '../../components/forms/CampoFormulario';
import { Badge } from '../../components/ui/Badge';
import { Toast } from 'primereact/toast';
import { PageShell } from '../../components/layout/PageShell';
import { useProjeto } from '../../contexts/ProjetoContext';
import { supabase } from '../../lib/supabaseClient';
import {
  avaliarApuracao,
  concluirEtapa,
  criarEleicao,
  encerrarEleicaoSeCompleta,
  listarEleicoes,
  listarEtapas,
  sugerirInicio,
  type Eleicao,
  type EtapaEleicao,
} from '../../lib/eleicaoService';
import {
  DIAS_DA_POSSE_PRIMEIRA,
  ETAPAS,
  diasAte,
  ehImplantacao,
  etapaLiberada,
  explicaEtapa,
  formatarDataBr,
  isoData,
  lerData,
  somarDias,
  somarUmAno,
} from '../../lib/eleicao/etapasEleicao';
import { textoModelo } from '../../lib/eleicao/modelosDocumento';
import EditorDocumento from '../../components/EditorDocumento';
import {
  acoesDoPainel,
  indicadoresDaGestao,
  vigenciaDaCipa,
  type GrupoAcao,
} from '../../lib/eleicao/painelGestao';
import { projetoService } from '../../lib/projetoService';
import { dimensionarCipa } from '../../lib/quadroCipa';
import { grauPorCnae } from '../../lib/grauRiscoCnae';
import '../../assets/css/especificos/eleicoes.css';

export default function GestaoEleicoes() {
  const toast = useRef<Toast>(null);
  const { projetoId, projetoNome } = useProjeto();
  const [eleicoes, setEleicoes] = useState<Eleicao[]>([]);
  const [etapas, setEtapas] = useState<EtapaEleicao[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [modalData, setModalData] = useState(false);
  const [modalSindicato, setModalSindicato] = useState(false);
  const [dataTermino, setDataTermino] = useState('');
  const [erroTermino, setErroTermino] = useState('');
  const [shakeTermino, setShakeTermino] = useState(0);
  const [errosApuracao, setErrosApuracao] = useState<Record<string, string>>({});
  const [shakeApuracao, setShakeApuracao] = useState(0);
  const [primeira, setPrimeira] = useState(true);
  const [aberta, setAberta] = useState<EtapaEleicao | null>(null);
  const [empregados, setEmpregados] = useState<number | ''>('');
  const [votos, setVotos] = useState<number | ''>('');
  const [diaVotacao, setDiaVotacao] = useState(1);
  const [consulta, setConsulta] = useState<Eleicao | null>(null);
  const [etapasConsulta, setEtapasConsulta] = useState<EtapaEleicao[]>([]);
  const [resultadoApuracao, setResultadoApuracao] = useState('');
  const [editor, setEditor] = useState<{ titulo: string; texto: string } | null>(null);
  const [mandato, setMandato] = useState<{ inicio: string | null; fim: string | null; emAndamento: boolean | null } | null>(null);
  const [porteProjeto, setPorteProjeto] = useState<{ empregados: number | null; grau: number | null; grauIndicado: number | null }>({
    empregados: null,
    grau: null,
    grauIndicado: null,
  });
  const [colaboradoresEleicao, setColaboradoresEleicao] = useState<number | ''>('');
  const [grauEleicao, setGrauEleicao] = useState<number | null>(null);
  const [errosPorte, setErrosPorte] = useState<Record<string, string>>({});

  const emAndamento = eleicoes.find((item) => item.status === 'em_andamento') ?? null;
  const antigas = eleicoes.filter((item) => item.id !== emAndamento?.id);
  const implantacao = ehImplantacao(mandato?.emAndamento ?? null, mandato?.inicio ?? null) || Boolean(emAndamento?.primeira);
  const vigencia = vigenciaDaCipa(eleicoes, mandato ?? undefined, new Date(), implantacao);
  const indicadores = indicadoresDaGestao(vigencia, etapas);
  const acoes = acoesDoPainel(vigencia, emAndamento, etapas);
  const grupos: { id: GrupoAcao; titulo: string }[] = [
    { id: 'validade', titulo: 'Validade da CIPA' },
    { id: 'eleicao', titulo: 'Processo eleitoral' },
    { id: 'habitual', titulo: 'Atividades habituais' },
  ];

  function abrirEtapa(etapa: EtapaEleicao) {
    setAberta(etapa);
    setResultadoApuracao('');
    setEmpregados('');
    setVotos('');
    setDiaVotacao(1);
  }

  function abrirDestino(destino: string) {
    if (destino === 'iniciar') {
      abrirInicio();
      return;
    }
    if (destino.startsWith('etapa:')) {
      const etapa = etapas.find((item) => item.id === destino.slice(6));
      document.getElementById('processo')?.scrollIntoView({ behavior: 'smooth' });
      if (etapa && (etapaLiberada(etapa.data_prevista) || etapa.concluida_em)) abrirEtapa(etapa);
      return;
    }
    document.getElementById(destino)?.scrollIntoView({ behavior: 'smooth' });
  }

  const carregar = useCallback(async () => {
    if (!projetoId) return;
    setCarregando(true);
    try {
      const lista = await listarEleicoes(projetoId);
      setEleicoes(lista);
      const atual = lista.find((item) => item.status === 'em_andamento');
      setEtapas(atual ? await listarEtapas(atual.id) : []);
    } catch (erro) {
      toast.current?.show({
        severity: 'error',
        summary: 'Não foi possível carregar as eleições',
        detail: erro instanceof Error ? erro.message : 'Erro ao consultar a base.',
      });
    } finally {
      setCarregando(false);
    }
  }, [projetoId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    if (!projetoId) return;
    supabase
      .from('projetos')
      .select('*')
      .eq('id', projetoId)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setMandato({
          inicio: data.data_inicio_gestao,
          fim: data.data_fim_mandato,
          emAndamento: data.cipa_em_andamento,
        });
        const grau = data.grau_risco == null ? null : Number(data.grau_risco);
        const doCnae = data.cnae ? grauPorCnae(String(data.cnae)) : null;
        setPorteProjeto({
          empregados: data.quantidade_empregados == null ? null : Number(data.quantidade_empregados),
          grau,
          grauIndicado: doCnae ?? (data.dimensionamento_editado_usuario === true ? null : grau),
        });
      });
  }, [projetoId]);

  function abrirInicio() {
    if (emAndamento) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Já existe uma eleição em andamento',
        detail: 'Conclua o processo atual antes de abrir outro.',
      });
      return;
    }

    const ultima = eleicoes.find((item) => item.status === 'concluida');
    if (ultima) {
      setPrimeira(false);
      setDataTermino(somarUmAno(ultima.data_termino_mandato));
    } else if (mandato?.emAndamento && mandato.fim) {
      setPrimeira(false);
      setDataTermino(mandato.fim);
    } else {
      setPrimeira(true);
      setDataTermino(mandato?.inicio ?? '');
    }
    setColaboradoresEleicao(porteProjeto.empregados ?? '');
    setGrauEleicao(porteProjeto.grau ?? porteProjeto.grauIndicado);
    setErrosPorte({});
    setModalData(true);
  }

  function seguirParaSindicato() {
    const novosPorte: Record<string, string> = {};
    if (colaboradoresEleicao === '' || Number(colaboradoresEleicao) < 0) {
      novosPorte['eleicao-colaboradores'] = 'Confirme a quantidade de colaboradores.';
    }
    if (grauEleicao == null) novosPorte['eleicao-grau'] = 'Confirme o grau de risco.';
    else if (porteProjeto.grauIndicado != null && grauEleicao < porteProjeto.grauIndicado) {
      novosPorte['eleicao-grau'] = `Não pode ficar abaixo do grau ${porteProjeto.grauIndicado} indicado pelo CNPJ.`;
    }
    if (!dataTermino || Object.keys(novosPorte).length) {
      if (!dataTermino) {
        setErroTermino(primeira ? 'Informe a data prevista da posse.' : 'Informe a data prevista para o término do mandato.');
      }
      setErrosPorte(novosPorte);
      setShakeTermino((n) => n + 1);
      return;
    }
    setErrosPorte({});
    setErroTermino('');
    setModalData(false);
    setModalSindicato(true);
  }

  async function confirmarInicio() {
    if (!projetoId || !dataTermino || colaboradoresEleicao === '' || grauEleicao == null) return;
    setSalvando(true);
    try {
      const colaboradores = Number(colaboradoresEleicao);
      await projetoService.salvarDadosCipa(
        projetoId,
        {
          quantidade_empregados: colaboradores,
          grau_risco: grauEleicao,
          dimensionamento_efetivos: dimensionarCipa(colaboradores, grauEleicao).efetivosPorLado,
          dimensionamento_editado_usuario: porteProjeto.grauIndicado != null && grauEleicao !== porteProjeto.grauIndicado,
        },
        ['quantidade_empregados', 'grau_risco'],
      );
      setPorteProjeto((atual) => ({ ...atual, empregados: colaboradores, grau: grauEleicao }));
      await criarEleicao({ projetoId, dataAncora: dataTermino, primeira });
      setModalSindicato(false);
      toast.current?.show({
        severity: 'success',
        summary: 'Processo eleitoral criado',
        detail: 'O cronograma foi gravado. Cada etapa abre 5 dias antes da data prevista.',
      });
      await carregar();
    } catch (erro) {
      toast.current?.show({
        severity: 'error',
        summary: 'Não foi possível iniciar',
        detail: erro instanceof Error ? erro.message : 'Erro ao gravar o cronograma.',
      });
    } finally {
      setSalvando(false);
    }
  }

  async function marcarConcluida(etapa: EtapaEleicao, observacao: string | null) {
    if (!emAndamento) return;
    setSalvando(true);
    try {
      await concluirEtapa(etapa.id, observacao);
      await encerrarEleicaoSeCompleta(emAndamento.id);
      setAberta(null);
      setResultadoApuracao('');
      await carregar();
    } catch (erro) {
      toast.current?.show({
        severity: 'error',
        summary: 'Não foi possível concluir a etapa',
        detail: erro instanceof Error ? erro.message : 'Erro ao gravar.',
      });
    } finally {
      setSalvando(false);
    }
  }

  async function consultarAntiga(eleicao: Eleicao) {
    setConsulta(eleicao);
    try {
      setEtapasConsulta(await listarEtapas(eleicao.id));
    } catch (erro) {
      toast.current?.show({
        severity: 'error',
        summary: 'Não foi possível abrir esta eleição',
        detail: erro instanceof Error ? erro.message : 'Erro ao consultar.',
      });
    }
  }

  function validarApuracao() {
    const novos: Record<string, string> = {};
    if (empregados === '' || Number(empregados) <= 0) novos['apuracao-empregados'] = 'Informe a quantidade de empregados.';
    if (votos === '' || Number(votos) < 0) novos['apuracao-votos'] = 'Informe a quantidade que votou.';
    else if (empregados !== '' && Number(votos) > Number(empregados)) novos['apuracao-votos'] = 'Os votos não podem passar dos empregados.';
    if (Object.keys(novos).length) {
      setErrosApuracao(novos);
      setShakeApuracao((n) => n + 1);
      setResultadoApuracao('');
      return;
    }
    setErrosApuracao({});
    const totalEmpregados = Number(empregados);
    const totalVotos = Number(votos);
    const resultado = avaliarApuracao(totalEmpregados, totalVotos, diaVotacao);
    setResultadoApuracao(resultado.motivo);
    if (!resultado.valida || !aberta) return;
    const texto = `Empregados: ${resultado.total_empregados}. Votos: ${resultado.total_votos}. Dia ${resultado.dia_votacao}. ${resultado.motivo}`;
    void marcarConcluida(aberta, texto);
  }

  const inicioPrevisto = primeira
    ? (dataTermino ? isoData(somarDias(lerData(dataTermino), DIAS_DA_POSSE_PRIMEIRA.iniciar_processo)) : '')
    : sugerirInicio(dataTermino || null);
  const eleicaoPrevista = primeira
    ? (dataTermino ? isoData(somarDias(lerData(dataTermino), DIAS_DA_POSSE_PRIMEIRA.realizacao_eleicao)) : '')
    : (dataTermino ? isoData(somarDias(lerData(dataTermino), -30)) : '');
  const definicaoAberta = ETAPAS.find((item) => item.codigo === aberta?.codigo);

  return (
    <PageShell
      title="Gestão das eleições"
      description="Acompanhe o processo eleitoral da CIPA conforme a NR-05 do Ministério do Trabalho e Emprego."
      actions={
        <Button label="Iniciar processo eleitoral" icon="pi pi-flag" onClick={abrirInicio} />
      }
    >
      <Toast ref={toast} />

      {!projetoId ? (
        <p className="eleicoes-aviso">Selecione um projeto para gerenciar a eleição da CIPA.</p>
      ) : null}

      <section className="eleicoes-painel" id="vigencia">
        <article
          className={`eleicoes-vigencia ${
            !vigencia || vigencia.diasRestantes < 0
              ? 'is-vencida'
              : vigencia.diasParaLimite <= 0
                ? 'is-alerta'
                : ''
          }`}
        >
          <h2>{vigencia?.implantacao ? 'Primeira CIPA' : 'Vigência da CIPA atual'}</h2>
          {vigencia ? (
            <>
              <p>
                {vigencia.implantacao
                  ? `Posse em ${formatarDataBr(vigencia.inicio)}. Mandato até ${formatarDataBr(vigencia.fim)}.`
                  : `De ${formatarDataBr(vigencia.inicio)} até ${formatarDataBr(vigencia.fim)}.`}
                {vigencia.implantacao
                  ? vigencia.diasRestantes >= 0
                    ? ` Faltam ${vigencia.diasRestantes} dia(s) para a posse.`
                    : ' A data da posse já passou.'
                  : vigencia.diasRestantes >= 0
                    ? ` Faltam ${vigencia.diasRestantes} dia(s).`
                    : ' O mandato já terminou.'}
              </p>
              <p>
                {vigencia.implantacao
                  ? `A primeira CIPA não usa os 60 dias de uma renovação. O processo deve abrir até ${formatarDataBr(vigencia.limiteEleicao)}, e a posse está em ${formatarDataBr(vigencia.inicio)}.`
                  : `A nova eleição deve ser convocada até ${formatarDataBr(vigencia.limiteEleicao)}, 60 dias antes do término (NR-05, item 5.5.1).`}
                {vigencia.diasParaLimite > 0
                  ? ` Faltam ${vigencia.diasParaLimite} dia(s) para esse prazo.`
                  : ' Esse prazo já chegou.'}
              </p>
            </>
          ) : (
            <p>Ainda não há mandato registrado. A vigência passa a contar depois da primeira posse.</p>
          )}
        </article>

        <div className="eleicoes-indicadores">
          <article className="eleicoes-indicador">
            <span>{vigencia?.implantacao ? 'Dias até a posse' : 'Dias de vigência'}</span>
            <strong>{indicadores.diasVigencia ?? '—'}</strong>
          </article>
          <article className="eleicoes-indicador">
            <span>Cronograma</span>
            <strong>{indicadores.progresso}%</strong>
          </article>
          <article className="eleicoes-indicador">
            <span>Etapas concluídas</span>
            <strong>
              {indicadores.etapasConcluidas}/{indicadores.etapasTotal}
            </strong>
          </article>
          <article className="eleicoes-indicador">
            <span>Atrasadas / liberadas</span>
            <strong>
              {indicadores.etapasAtrasadas}/{indicadores.etapasProximas}
            </strong>
          </article>
        </div>

        <div className="eleicoes-grupos">
          <h2>Próximos passos da eleição</h2>
          {acoes.length === 0 ? <p>Nenhuma ação sugerida para este momento.</p> : null}
          {grupos.map((grupo) => {
            const doGrupo = acoes.filter((acao) => acao.grupo === grupo.id);
            if (doGrupo.length === 0) return null;
            return (
            <section key={grupo.id}>
              <h3>{grupo.titulo}</h3>
              {doGrupo.map((acao) => (
                  <button
                    key={acao.id}
                    type="button"
                    className={`eleicoes-acao ${acao.urgente ? 'is-urgente' : ''}`}
                    onClick={() => abrirDestino(acao.destino)}
                  >
                    <span>
                      <strong>{acao.titulo}</strong>
                      <br />
                      {acao.detalhe}
                    </span>
                    <span>{acao.quando}</span>
                  </button>
              ))}
            </section>
            );
          })}
        </div>
      </section>

      {emAndamento ? (
        <section id="processo" className="eleicoes-secao">
          <p className="eleicoes-aviso">
            {emAndamento.primeira
              ? `Primeira CIPA. O processo começou em ${formatarDataBr(emAndamento.data_inicio)}. A posse abre o mandato, que vai até ${formatarDataBr(emAndamento.data_termino_mandato)}. O treinamento pode ser feito até 30 dias depois da posse.`
              : `Renovação. O mandato em curso termina em ${formatarDataBr(emAndamento.data_termino_mandato)}. O processo começou em ${formatarDataBr(emAndamento.data_inicio)}. A eleição fica 30 dias antes desse término e a posse no primeiro dia útil seguinte.`}
          </p>
          <ol className="eleicoes-trilha">
            {etapas.map((etapa) => {
              const liberada = etapaLiberada(etapa.data_prevista) || Boolean(etapa.concluida_em);
              const falta = diasAte(etapa.data_prevista);
              const classe = etapa.concluida_em
                ? 'is-concluida'
                : liberada
                  ? 'is-ativa'
                  : '';
              return (
                <li key={etapa.id}>
                  <button
                    type="button"
                    className={`eleicoes-card ${classe}`}
                    disabled={!liberada || carregando}
                    onClick={() => abrirEtapa(etapa)}
                  >
                    <span className="eleicoes-marca">{etapa.ordem}</span>
                    <span>
                      <p className="eleicoes-titulo">{etapa.titulo}</p>
                      <p className="eleicoes-norma">{etapa.norma}</p>
                    </span>
                    <span className="eleicoes-quando">
                      {formatarDataBr(etapa.data_prevista)}
                      <br />
                      {etapa.concluida_em
                        ? 'Concluída'
                        : liberada
                          ? 'Disponível'
                          : `Abre em ${falta - 5} dia(s)`}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </section>
      ) : (
        <section className="eleicoes-secao">
          <h2>Processo eleitoral</h2>
          <p>
            {carregando
              ? 'Carregando eleições...'
              : 'Nenhuma eleição em andamento. Inicie o processo para gerar o cronograma e os modelos de documento.'}
          </p>
        </section>
      )}

      <section id="atividades" className="eleicoes-secao">
        <h2>Atividades habituais</h2>
        <p>
          Reunião ordinária mensal, com ata assinada (NR-05, item 5.6.1), e a SIPAT uma vez por ano
          (item 5.3.1, “i”). As datas acima são o lembrete deste mandato.
        </p>
      </section>

      <section className="eleicoes-secao">
        <h2>Modelos da eleição</h2>
        <p>Abra o documento, altere o texto e imprima. Não depende do prazo da etapa.</p>
        <div className="eleicoes-lista">
          {ETAPAS.map((etapa) => (
            <button
              key={etapa.codigo}
              type="button"
              className="eleicoes-antiga"
              onClick={() =>
                setEditor({
                  titulo: etapa.titulo,
                  texto: textoModelo(etapa.codigo, projetoNome ?? 'Estabelecimento', formatarDataBr(isoData(new Date())), Boolean(emAndamento?.primeira) || implantacao),
                })
              }
            >
              <span>{etapa.titulo}</span>
              <span>{etapa.norma}</span>
            </button>
          ))}
        </div>
      </section>

      <EditorDocumento
        titulo={editor?.titulo ?? ''}
        textoInicial={editor?.texto ?? ''}
        aberto={Boolean(editor)}
        onFechar={() => setEditor(null)}
      />

      <section style={{ marginTop: '1.5rem' }}>
        <h2>Eleições anteriores</h2>
        {antigas.length === 0 ? (
          <p>Nenhuma eleição encerrada para consulta.</p>
        ) : (
          <div className="eleicoes-lista">
            {antigas.map((eleicao) => (
              <article key={eleicao.id} className="eleicoes-antiga">
                <span>
                  Término do mandato em {formatarDataBr(eleicao.data_termino_mandato)}
                </span>
                <span>
                  <strong>{eleicao.status === 'concluida' ? 'Concluída' : 'Cancelada'}</strong>
                  {' '}
                  <Button
                    label="Consultar"
                    text
                    onClick={() => consultarAntiga(eleicao)}
                  />
                </span>
              </article>
            ))}
          </div>
        )}
      </section>

      <Dialog
        header={primeira ? 'Data da posse da primeira CIPA' : 'Data do término do mandato'}
        visible={modalData}
        onHide={() => setModalData(false)}
        footer={
          <Button label="Continuar" onClick={seguirParaSindicato} />
        }
      >
        <p>
          {primeira
            ? 'Ainda não há CIPA. Informe a data da posse. O processo corre até essa data: a organização constitui a comissão eleitoral, a inscrição dura no mínimo 15 dias e o treinamento pode ser até 30 dias depois da posse.'
            : 'Há mandato em curso. A data abaixo é o término desse mandato. A convocação fica 60 dias antes e a eleição 30 dias antes, como pedem os itens 5.5.1 e 5.5.3 da NR-05.'}
        </p>
        <form className="cepi-form">
          <div className="cepi-form__grid">
            <CampoFormulario id="eleicao-termino" rotulo={primeira ? 'Data prevista da posse' : 'Data prevista para o término do mandato'} largo erro={erroTermino} shake={shakeTermino}>
              <InputText id="eleicao-termino" type="date" value={dataTermino} onChange={(evento) => { setDataTermino(evento.target.value); setErroTermino(''); }} />
            </CampoFormulario>
          </div>
          <h3 className="eleicoes-porte__titulo">
            Dimensionamento desta eleição
            <Badge
              value={porteProjeto.grauIndicado != null && grauEleicao != null && grauEleicao !== porteProjeto.grauIndicado ? 'Manual' : 'Automático'}
              severity={porteProjeto.grauIndicado != null && grauEleicao != null && grauEleicao !== porteProjeto.grauIndicado ? 'warn' : 'info'}
            />
          </h3>
          <p className="eleicoes-porte__texto">
            Confirme os dados de hoje. É com eles que a NR-05 define quantos membros serão eleitos.
          </p>
          <div className="cepi-form__grid">
            <CampoFormulario id="eleicao-colaboradores" rotulo="Quantidade de colaboradores" erro={errosPorte['eleicao-colaboradores']} shake={shakeTermino}>
              <InputText
                id="eleicao-colaboradores"
                type="number"
                min={0}
                value={colaboradoresEleicao}
                onChange={(evento) => {
                  setColaboradoresEleicao(evento.target.value === '' ? '' : Number(evento.target.value));
                  setErrosPorte((atual) => ({ ...atual, 'eleicao-colaboradores': '' }));
                }}
              />
            </CampoFormulario>
            <CampoFormulario id="eleicao-grau" rotulo="Grau de risco" erro={errosPorte['eleicao-grau']} shake={shakeTermino}>
              <Dropdown
                inputId="eleicao-grau"
                value={grauEleicao}
                options={[1, 2, 3, 4]
                  .filter((valor) => porteProjeto.grauIndicado == null || valor >= porteProjeto.grauIndicado)
                  .map((valor) => ({
                    label: valor === porteProjeto.grauIndicado ? `Grau ${valor} (indicado pelo CNPJ)` : `Grau ${valor}`,
                    value: valor,
                  }))}
                placeholder="Escolha o grau"
                onChange={(evento) => {
                  setGrauEleicao(evento.value);
                  setErrosPorte((atual) => ({ ...atual, 'eleicao-grau': '' }));
                }}
              />
            </CampoFormulario>
          </div>
          {(() => {
            const previa = dimensionarCipa(colaboradoresEleicao === '' ? null : Number(colaboradoresEleicao), grauEleicao);
            if (previa.modo === 'indefinido') return null;
            return (
              <p className="eleicoes-porte__previa">
                {previa.modo === 'designado'
                  ? 'Este porte pede 1 representante designado pela organização, sem eleição de comissão.'
                  : `Serão eleitos ${previa.efetivosPorLado} titular(es) e ${previa.suplentesPorLado} suplente(s) pelos empregados. A organização designa o mesmo número.`}
                {porteProjeto.grauIndicado != null && grauEleicao != null && grauEleicao > porteProjeto.grauIndicado
                  ? ` Grau acima do indicado: use só se o estabelecimento presta serviço dentro de uma empresa de grau ${grauEleicao}.`
                  : ''}
              </p>
            );
          })()}
        </form>
        {dataTermino ? (
          <p>
            {primeira
              ? `Início do processo em ${formatarDataBr(inicioPrevisto)}. Eleição em ${formatarDataBr(eleicaoPrevista)}. O mandato termina um ano depois da posse.`
              : `Início previsto do processo: ${formatarDataBr(inicioPrevisto)}. A votação fica 30 dias antes do término (item 5.5.3, "f").`}
          </p>
        ) : null}
      </Dialog>

      <Dialog
        header="Lembrete ao sindicato"
        visible={modalSindicato}
        onHide={() => setModalSindicato(false)}
        footer={
          <Button label="Ciente, criar cronograma" loading={salvando} onClick={confirmarInicio} />
        }
      >
        <p>
          Antes de seguir, comunique o sindicato da categoria preponderante sobre o início do
          processo eleitoral. A NR-05 (item 5.5.1.1) pede esse aviso com antecedência e com
          confirmação de entrega. Pode ser por meio eletrônico.
        </p>
        <p>O modelo dessa comunicação fica na segunda etapa da trilha.</p>
      </Dialog>

      <Dialog
        header={aberta?.titulo}
        visible={Boolean(aberta)}
        style={{ width: 'min(720px, 96vw)' }}
        onHide={() => setAberta(null)}
        footer={
          aberta && aberta.codigo !== 'registro_apuracao' && !aberta.concluida_em ? (
            <Button
              label="Marcar etapa como concluída"
              loading={salvando}
              onClick={() => marcarConcluida(aberta, null)}
            />
          ) : null
        }
      >
        {aberta && definicaoAberta ? (
          <div>
            <p>{explicaEtapa(definicaoAberta, Boolean(emAndamento?.primeira))}</p>
            <p>Data desta etapa: {formatarDataBr(aberta.data_prevista)}.</p>
            <h3>Modelo para editar e imprimir</h3>
            <Button
              label="Abrir modelo"
              icon="pi pi-file-edit"
              onClick={() =>
                setEditor({
                  titulo: aberta.titulo,
                  texto: textoModelo(
                    aberta.codigo,
                    projetoNome ?? 'Estabelecimento',
                    formatarDataBr(aberta.data_prevista),
                    Boolean(emAndamento?.primeira),
                  ),
                })
              }
            />

            {aberta.codigo === 'registro_apuracao' && !aberta.concluida_em ? (
              <form className="cepi-form eleicoes-apuracao" onSubmit={(evento) => evento.preventDefault()}>
                <div className="cepi-form__grid">
                  <CampoFormulario id="apuracao-empregados" rotulo="Quantidade de empregados" erro={errosApuracao['apuracao-empregados']} shake={shakeApuracao}>
                    <InputText
                      id="apuracao-empregados"
                      type="number"
                      min={1}
                      value={empregados}
                      onChange={(evento) => setEmpregados(evento.target.value === '' ? '' : Number(evento.target.value))}
                    />
                  </CampoFormulario>
                  <CampoFormulario id="apuracao-votos" rotulo="Quantidade que votou" erro={errosApuracao['apuracao-votos']} shake={shakeApuracao}>
                    <InputText
                      id="apuracao-votos"
                      type="number"
                      min={0}
                      value={votos}
                      onChange={(evento) => setVotos(evento.target.value === '' ? '' : Number(evento.target.value))}
                    />
                  </CampoFormulario>
                  <CampoFormulario id="apuracao-dia" rotulo="Dia da votação" largo>
                    <Dropdown
                      inputId="apuracao-dia"
                      value={diaVotacao}
                      options={[
                        { label: '1º dia — precisa de 50% ou mais', value: 1 },
                        { label: '2º dia — precisa de um terço ou mais', value: 2 },
                        { label: '3º dia — vale com qualquer número', value: 3 },
                      ]}
                      onChange={(evento) => setDiaVotacao(Number(evento.value))}
                    />
                  </CampoFormulario>
                </div>
                <div className="cepi-form__actions">
                  <Button label="Validar participação" onClick={validarApuracao} loading={salvando} />
                </div>
                {resultadoApuracao ? <p>{resultadoApuracao}</p> : null}
              </form>
            ) : null}

            {aberta.observacao ? <p>Registro: {aberta.observacao}</p> : null}
          </div>
        ) : null}
      </Dialog>

      <Dialog
        header="Consulta da eleição"
        visible={Boolean(consulta)}
        style={{ width: 'min(640px, 96vw)' }}
        onHide={() => setConsulta(null)}
      >
        {consulta ? (
          <div className="eleicoes-lista">
            <p>Término do mandato em {formatarDataBr(consulta.data_termino_mandato)}.</p>
            {etapasConsulta.map((etapa) => (
              <button
                key={etapa.id}
                type="button"
                className="eleicoes-card"
                onClick={() =>
                  setEditor({
                    titulo: etapa.titulo,
                    texto: textoModelo(
                      etapa.codigo,
                      projetoNome ?? 'Estabelecimento',
                      formatarDataBr(etapa.data_prevista),
                      consulta.primeira,
                    ),
                  })
                }
              >
                <span className="eleicoes-marca">{etapa.ordem}</span>
                <span>
                  <p className="eleicoes-titulo">{etapa.titulo}</p>
                  <p className="eleicoes-norma">
                    {formatarDataBr(etapa.data_prevista)}
                    {etapa.concluida_em ? ' · concluída' : ' · em aberto'}
                  </p>
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </Dialog>
    </PageShell>
  );
}
