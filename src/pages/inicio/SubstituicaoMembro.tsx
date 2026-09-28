import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { CampoFormulario } from '../../components/forms/CampoFormulario';
import { BadgeCargo, cargoDoMembro } from '../../components/BadgeCargo';
import { formatarDataBr, isoData, lerData, somarDias } from '../../lib/eleicao/etapasEleicao';
import {
  MOTIVOS_DESLIGAMENTO,
  registrarSubstituicao,
  type FormaIngresso,
  type MembroCipa,
  type MotivoDesligamento,
} from '../../lib/gestaoCipaService';

type Forma = 'membro_existente' | 'nova_pessoa' | 'vaga_aberta';

type Props = {
  saindo: MembroCipa;
  membros: MembroCipa[];
  faltasOrdinarias: number;
  onCancelar: () => void;
  onConcluido: (titulo: string, texto: string) => void;
  onErro: (texto: string) => void;
};

function somarDiasUteis(data: Date, dias: number): Date {
  let atual = data;
  let contados = 0;
  while (contados < dias) {
    atual = somarDias(atual, 1);
    const semana = atual.getDay();
    if (semana !== 0 && semana !== 6) contados += 1;
  }
  return atual;
}

function nomeCargo(item: MembroCipa) {
  return `${item.nome} · ${cargoDoMembro(item).rotulo}`;
}

/** Regras de substituição da NR-05 conforme o cargo de quem sai. */
function regrasDoCargo(saindo: MembroCipa, ativos: MembroCipa[]) {
  const doLado = ativos.filter((item) => item.representacao === saindo.representacao && item.id !== saindo.id);
  const suplentes = doLado.filter((item) => item.condicao === 'suplente');
  const empregados = saindo.representacao === 'empregados';

  if (saindo.funcao === 'presidente') {
    return {
      explicacao: 'A organização indica o novo presidente em até dois dias úteis, de preferência entre os membros da CIPA.',
      candidatos: doLado,
      rotuloCandidato: 'Membro da organização que assume a presidência',
      formas: ['membro_existente', 'nova_pessoa'] as Forma[],
      formaNova: 'designacao' as FormaIngresso,
      rotuloNova: 'Nova pessoa designada pela organização',
      suplentesDaVaga: suplentes,
      prazoDiasUteis: 2,
    };
  }
  if (saindo.funcao === 'vice') {
    return {
      explicacao: 'Os titulares dos empregados escolhem o novo vice-presidente entre eles, em até dois dias úteis. A vaga de titular que abre passa a um suplente dos empregados.',
      candidatos: doLado.filter((item) => item.condicao === 'titular'),
      rotuloCandidato: 'Titular dos empregados escolhido para vice',
      formas: ['membro_existente', 'nova_pessoa'] as Forma[],
      formaNova: 'eleicao_extraordinaria' as FormaIngresso,
      rotuloNova: 'Eleito em eleição extraordinária',
      suplentesDaVaga: suplentes,
      prazoDiasUteis: 2,
    };
  }
  if (saindo.condicao === 'titular') {
    return empregados
      ? {
          explicacao: suplentes.length
            ? 'A vaga de titular dos empregados passa a um suplente dos empregados, pela ordem de votação.'
            : 'Não há suplente dos empregados. A NR-05 pede eleição extraordinária, com os prazos do processo reduzidos pela metade. O eleito faz o treinamento em até 30 dias da posse.',
          candidatos: suplentes,
          rotuloCandidato: 'Suplente dos empregados que assume',
          formas: (suplentes.length ? ['membro_existente', 'vaga_aberta'] : ['nova_pessoa', 'vaga_aberta']) as Forma[],
          formaNova: 'eleicao_extraordinaria' as FormaIngresso,
          rotuloNova: 'Eleito em eleição extraordinária',
          suplentesDaVaga: [],
          prazoDiasUteis: null,
        }
      : {
          explicacao: 'A organização completa a vaga com um suplente da organização ou designa outra pessoa.',
          candidatos: suplentes,
          rotuloCandidato: 'Suplente da organização que assume',
          formas: (suplentes.length ? ['membro_existente', 'nova_pessoa', 'vaga_aberta'] : ['nova_pessoa', 'vaga_aberta']) as Forma[],
          formaNova: 'designacao' as FormaIngresso,
          rotuloNova: 'Nova pessoa designada pela organização',
          suplentesDaVaga: [],
          prazoDiasUteis: null,
        };
  }
  return empregados
    ? {
        explicacao: 'A saída de um suplente dos empregados não obriga substituição. Uma nova pessoa só entra por eleição extraordinária.',
        candidatos: [],
        rotuloCandidato: '',
        formas: ['vaga_aberta', 'nova_pessoa'] as Forma[],
        formaNova: 'eleicao_extraordinaria' as FormaIngresso,
        rotuloNova: 'Eleito em eleição extraordinária',
        suplentesDaVaga: [],
        prazoDiasUteis: null,
      }
    : {
        explicacao: 'A organização pode designar outra pessoa para a suplência ou deixar a vaga aberta.',
        candidatos: [],
        rotuloCandidato: '',
        formas: ['nova_pessoa', 'vaga_aberta'] as Forma[],
        formaNova: 'designacao' as FormaIngresso,
        rotuloNova: 'Nova pessoa designada pela organização',
        suplentesDaVaga: [],
        prazoDiasUteis: null,
      };
}

export default function SubstituicaoMembro({ saindo, membros, faltasOrdinarias, onCancelar, onConcluido, onErro }: Props) {
  const hoje = isoData(new Date());
  const ativos = useMemo(() => membros.filter((item) => item.situacao !== 'encerrado'), [membros]);
  const regras = useMemo(() => regrasDoCargo(saindo, ativos), [saindo, ativos]);
  const fimPrevisto = saindo.fim_mandato;
  const fimSugerido = hoje < saindo.inicio_mandato ? saindo.inicio_mandato : hoje > fimPrevisto ? fimPrevisto : hoje;

  const motivos = (Object.keys(MOTIVOS_DESLIGAMENTO) as MotivoDesligamento[]).filter((motivo) => {
    if (motivo === 'faltas_sem_justificativa') return saindo.condicao === 'titular';
    if (motivo === 'redesignacao_organizacao') return saindo.representacao === 'organizacao';
    return true;
  });

  const [motivo, setMotivo] = useState<MotivoDesligamento | null>(
    faltasOrdinarias > 4 && saindo.condicao === 'titular' ? 'faltas_sem_justificativa' : null,
  );
  const [descricao, setDescricao] = useState('');
  const [fimReal, setFimReal] = useState(fimSugerido);
  const forma: Forma = regras.candidatos.length ? 'membro_existente' : 'vaga_aberta';
  const exigeSubstituto = saindo.funcao === 'presidente' || saindo.funcao === 'vice';
  const [promovidoId, setPromovidoId] = useState<string | null>(null);
  const [suplenteVagaId, setSuplenteVagaId] = useState<string | null>(null);
  const [inicio, setInicio] = useState(isoData(somarDias(lerData(fimSugerido), 1)));
  const [erros, setErros] = useState<Record<string, string>>({});
  const [shake, setShake] = useState(0);
  const [salvando, setSalvando] = useState(false);

  const promovido = regras.candidatos.find((item) => item.id === promovidoId) ?? null;
  const vagaDeTitularAbre = exigeSubstituto
    && forma === 'membro_existente'
    && promovido?.condicao === 'titular';
  const limiteSubstituto = regras.prazoDiasUteis && fimReal
    ? isoData(somarDiasUteis(lerData(fimReal), regras.prazoDiasUteis))
    : null;
  const inicioEfetivo = fimReal ? isoData(somarDias(lerData(fimReal), 1)) : '';
  const foraDoPrazo = Boolean(limiteSubstituto && inicioEfetivo && inicioEfetivo > limiteSubstituto);

  function validar(): Record<string, string> {
    const novos: Record<string, string> = {};
    if (!motivo) novos['sub-motivo'] = 'Escolha o motivo do desligamento.';
    if (descricao.trim().length < 10) novos['sub-descricao'] = 'Escreva as observações com pelo menos 10 caracteres.';
    if (!fimReal) novos['sub-fim-real'] = 'Informe o último dia de exercício.';
    else if (fimReal < saindo.inicio_mandato) novos['sub-fim-real'] = 'O desligamento não pode ser antes do início do mandato.';
    else if (fimReal > fimPrevisto) novos['sub-fim-real'] = 'Depois do fim previsto o mandato já terminou. Não é caso de desligamento.';
    if (forma === 'membro_existente' && !promovido) novos['sub-candidato'] = 'Escolha quem assume o cargo.';
    return novos;
  }

  async function gravar(evento: React.FormEvent) {
    evento.preventDefault();
    const novos = validar();
    if (Object.keys(novos).length) {
      setErros(novos);
      setShake((n) => n + 1);
      return;
    }
    setErros({});
    setSalvando(true);
    try {
      await registrarSubstituicao({
        saindo,
        motivo: motivo!,
        descricao,
        fimReal,
        inicioSubstituto: inicio,
        promovido: forma === 'membro_existente' ? promovido : null,
        suplenteDaVaga: vagaDeTitularAbre ? regras.suplentesDaVaga.find((item) => item.id === suplenteVagaId) ?? null : null,
        novaPessoa: null,
      });
      onConcluido(
        forma === 'vaga_aberta' ? 'Membro desligado' : 'Substituição registrada',
        forma === 'vaga_aberta'
          ? `${saindo.nome} saiu em ${formatarDataBr(fimReal)}. A vaga fica aberta.`
          : `${saindo.nome} saiu em ${formatarDataBr(fimReal)}. Quem assume segue até ${formatarDataBr(fimPrevisto)}.`,
      );
    } catch (erro) {
      onErro(erro instanceof Error ? erro.message : 'Não foi possível registrar.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form className="painel-layout membros-form" onSubmit={gravar}>
      <div className="painel-corpo painel-corpo--fill">
        <div className="substituicao-saindo">
          <div>
            <strong>{saindo.nome}</strong>
            <BadgeCargo funcao={saindo.funcao} condicao={saindo.condicao} />
          </div>
          <small>
            {saindo.representacao === 'empregados' ? 'Empregados' : 'Organização'} · mandato de {formatarDataBr(saindo.inicio_mandato)} a {formatarDataBr(fimPrevisto)} (fim previsto)
          </small>
        </div>

        <p className="membros-form__nota">{regras.explicacao}</p>

        <div className="membros-form__campos">
          <CampoFormulario id="sub-motivo" rotulo="Motivo do desligamento *" largo erro={erros['sub-motivo']} shake={shake}>
            <Dropdown
              inputId="sub-motivo"
              value={motivo}
              options={motivos.map((item) => ({ label: MOTIVOS_DESLIGAMENTO[item], value: item }))}
              onChange={(evento) => setMotivo(evento.value)}
            />
          </CampoFormulario>
          {motivo === 'faltas_sem_justificativa' && faltasOrdinarias <= 4 ? (
            <p className="substituicao-alerta">
              A perda do mandato vale a partir da quinta falta em reunião ordinária sem justificativa. O sistema registra {faltasOrdinarias}. Confira as atas antes de seguir.
            </p>
          ) : null}
          {motivo === 'desligamento_organizacao' && saindo.representacao === 'empregados' ? (
            <p className="substituicao-alerta">
              Quem foi eleito pelos empregados tem estabilidade desde o registro da candidatura até um ano após o fim do mandato. A dispensa sem justa causa nesse período é vedada.
            </p>
          ) : null}
          <CampoFormulario id="sub-descricao" rotulo="Observações *" largo erro={erros['sub-descricao']} shake={shake}>
            <InputTextarea id="sub-descricao" rows={3} value={descricao} onChange={(evento) => setDescricao(evento.target.value)} />
          </CampoFormulario>
          <CampoFormulario id="sub-fim-real" rotulo="Último dia de exercício (fim real) *" largo erro={erros['sub-fim-real']} shake={shake}>
            <InputText
              id="sub-fim-real"
              type="date"
              value={fimReal}
              onChange={(evento) => {
                setFimReal(evento.target.value);
                if (evento.target.value) setInicio(isoData(somarDias(lerData(evento.target.value), 1)));
              }}
            />
          </CampoFormulario>

          {forma === 'membro_existente' ? (
            <CampoFormulario id="sub-candidato" rotulo={`${regras.rotuloCandidato} *`} largo erro={erros['sub-candidato']} shake={shake}>
              <Dropdown
                inputId="sub-candidato"
                value={promovidoId}
                options={regras.candidatos.map((item) => ({ label: nomeCargo(item), value: item.id }))}
                onChange={(evento) => setPromovidoId(evento.value)}
              />
            </CampoFormulario>
          ) : exigeSubstituto ? (
            <p className="substituicao-alerta">Ninguém da comissão pode assumir este cargo. Cadastre o membro antes de registrar a substituição.</p>
          ) : (
            <p className="substituicao-alerta">Não há suplente para assumir. O membro será desligado e a vaga fica aberta.</p>
          )}

          {vagaDeTitularAbre && regras.suplentesDaVaga.length ? (
            <CampoFormulario id="sub-suplente-vaga" rotulo="Suplente que assume a vaga de titular" largo>
              <Dropdown
                inputId="sub-suplente-vaga"
                value={suplenteVagaId}
                options={regras.suplentesDaVaga.map((item) => ({ label: item.nome, value: item.id }))}
                onChange={(evento) => setSuplenteVagaId(evento.value)}
                showClear
              />
            </CampoFormulario>
          ) : null}

          {forma === 'membro_existente' ? (
            <p className="membros-form__nota">
              Quem assume completa o mandato em curso até {formatarDataBr(fimPrevisto)}. O mandato não recomeça.
            </p>
          ) : null}
          {foraDoPrazo && limiteSubstituto ? (
            <p className="substituicao-alerta">
              A NR-05 pede o substituto em até dois dias úteis, ou seja, até {formatarDataBr(limiteSubstituto)}. O registro segue, mas fica fora desse prazo.
            </p>
          ) : null}
        </div>
      </div>
      <div className="form-rodape">
        <div className="form-rodape-ajuda" />
        <div className="form-rodape-acoes">
          <span className="form-rodape-obrigatorio">*Campos obrigatórios</span>
          <Button type="button" label="Cancelar" outlined onClick={onCancelar} />
          <Button
            type="submit"
            label={forma === 'vaga_aberta' ? 'Desligar' : 'Substituir'}
            loading={salvando}
            disabled={forma === 'vaga_aberta' && exigeSubstituto}
          />
        </div>
      </div>
    </form>
  );
}
