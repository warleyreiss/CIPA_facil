import { useState, useEffect, useRef, useCallback } from 'react';
import type { ChangeEvent } from 'react';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Button } from 'primereact/button';
import { InputSwitch } from 'primereact/inputswitch';
import { FloatLabel } from 'primereact/floatlabel';
import { Dropdown } from 'primereact/dropdown';
import { Toast } from 'primereact/toast';
import { Dialog } from 'primereact/dialog';
import { Badge } from '../../components/ui/Badge';
import { cn as classNames } from '../../lib/cn';
import { useProjeto } from '../../contexts/ProjetoContext';
import { projetoService } from '../../lib/projetoService';
import { supabase } from '../../lib/supabaseClient';
import { consultarCnpj } from '../../lib/consultaCnpj';
import { dimensionarCipa, quadroVigente } from '../../lib/quadroCipa';
import { formatarDataBr, isoData } from '../../lib/eleicao/etapasEleicao';
import TourSpotlightConfigProjeto from '../../components/TourSpotlightConfigProjeto';
import {
  cnpjObrigatorioValido,
  cnpjOpcionalValido,
  formatarCnpj,
  razaoSocialObrigatoriaValida,
} from '../../lib/documentoUtils';
import { assinaturaService } from '../../lib/assinaturaService';
import { useRecursoPlano } from '../../hooks/useRecursoPlano';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  deveExibirConfigTour,
  marcarConfigTourVisto,
} from '../../lib/storageService';
/*
 * Alertas semanais e-mail + WhatsApp (desativados no front):
 * import WhatsAppAlertaVerificacao from '../../components/WhatsAppAlertaVerificacao';
 * import { WHATSAPP_OTP_UI_HABILITADA } from '../../lib/whatsappAlertaOtpService';
 * import { telefoneWhatsAppValido } from '../../lib/telefoneUtils';
 */

const TOUR_CONFIG_ATIVO = false;
const ESPERA_CONFIRMACAO_MS = 90_000;

type QuadroDimensionado = ReturnType<typeof dimensionarCipa>;

type ConfirmacaoQuadro = {
  grauSubiu: boolean;
  quadroCresceu: boolean;
  grauCnpj: number | null;
  grauNovo: number | null;
  empregadosAntes: number | null;
  empregadosNovo: number | null;
  quadroAntes: QuadroDimensionado;
  quadroNovo: QuadroDimensionado;
  fimMandato: string | null;
};

function ModalConfirmacaoQuadro({
  dados,
  salvando,
  descrever,
  onCancelar,
  onConfirmar,
}: {
  dados: ConfirmacaoQuadro | null;
  salvando: boolean;
  descrever: (quadro: QuadroDimensionado) => string;
  onCancelar: () => void;
  onConfirmar: () => void;
}) {
  const [decorrido, setDecorrido] = useState(0);
  const aberto = dados != null;

  useEffect(() => {
    if (!aberto) return;
    const inicio = Date.now();
    setDecorrido(0);
    const timer = window.setInterval(() => {
      const passou = Math.min(Date.now() - inicio, ESPERA_CONFIRMACAO_MS);
      setDecorrido(passou);
      if (passou >= ESPERA_CONFIRMACAO_MS) window.clearInterval(timer);
    }, 250);
    return () => window.clearInterval(timer);
  }, [aberto]);

  if (!dados) return null;
  const liberado = decorrido >= ESPERA_CONFIRMACAO_MS;
  const restante = Math.ceil((ESPERA_CONFIRMACAO_MS - decorrido) / 1000);
  const progresso = Math.round((decorrido / ESPERA_CONFIRMACAO_MS) * 100);
  const prazo = dados.fimMandato
    ? `o fim do mandato atual, em ${formatarDataBr(dados.fimMandato)}`
    : 'o fim do próximo mandato';
  const titulo = dados.grauSubiu && dados.quadroCresceu
    ? 'Aumentar o grau de risco e o quadro da comissão?'
    : dados.grauSubiu
      ? `Usar o grau ${dados.grauNovo} em vez do grau ${dados.grauCnpj}?`
      : 'Aumentar o quadro da comissão?';

  return (
    <Dialog
      visible
      onHide={onCancelar}
      header={titulo}
      dismissableMask={false}
      style={{ width: 'min(560px, 94vw)' }}
      footer={
        <div className="config-confirma-rodape">
          <div className="config-confirma-espera" aria-live="polite">
            <div className="config-confirma-espera__barra" aria-hidden>
              <span style={{ width: `${progresso}%` }} />
            </div>
            <small>
              {liberado ? 'Leitura concluída. Você já pode confirmar.' : `Leia com atenção. Confirmação liberada em ${restante}s.`}
            </small>
          </div>
          <div className="config-confirma-rodape__acoes">
            <Button type="button" label="Cancelar" outlined onClick={onCancelar} disabled={salvando} />
            <Button
              type="button"
              label="Confirmar e salvar mesmo assim"
              severity="danger"
              disabled={!liberado}
              loading={salvando}
              onClick={onConfirmar}
            />
          </div>
        </div>
      }
    >
      <div className="config-confirma-grau">
        <p className="config-confirma-grau__irreversivel">
          <i className="pi pi-lock" aria-hidden />
          <span>
            <strong>Esta ação não pode ser desfeita até {prazo}.</strong> Pela NR-05, a CIPA não pode ter o número de
            representantes reduzido antes do término do mandato. Mesmo que depois você volte o grau de risco ou diminua os
            colaboradores, a comissão continua com o quadro maior até lá.
          </span>
        </p>
        {dados.grauSubiu ? (
          <p>
            <strong>Quando alterar o grau:</strong> só se o estabelecimento presta serviço dentro das instalações de outra
            empresa cuja atividade tem grau de risco maior. Nesse caso vale o risco do local, e não o da atividade
            registrada no CNPJ (grau {dados.grauCnpj}).
          </p>
        ) : null}
        {dados.quadroCresceu && !dados.grauSubiu ? (
          <p>
            <strong>Por que o quadro cresce:</strong> a quantidade de colaboradores passou de {dados.empregadosAntes ?? '—'}{' '}
            para {dados.empregadosNovo ?? '—'}, e o Quadro I da NR-05 pede mais membros para esse porte.
          </p>
        ) : null}
        <p>
          <strong>O que muda no projeto:</strong>
        </p>
        <ul>
          <li>Hoje: {descrever(dados.quadroAntes)}.</li>
          <li>Depois de salvar: {descrever(dados.quadroNovo)}.</li>
          <li>A comissão atual passa a aparecer como incompleta até as novas vagas serem preenchidas.</li>
          <li>Os limites de membros e as próximas eleições seguem o novo quadro.</li>
          {dados.grauSubiu ? (
            <li>O dimensionamento fica marcado como Manual. A escolha é de responsabilidade da empresa e pode ser cobrada em fiscalização.</li>
          ) : null}
        </ul>
      </div>
    </Dialog>
  );
}

const somenteDigitos = (valor: unknown) => String(valor ?? '').replace(/\D/g, '');

function SwitchRow({
  title,
  desc,
  checked,
  onChange,
  disabled,
  tourId,
}: {
  title: string;
  desc: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
  tourId?: string;
}) {
  return (
    <div
      className={classNames('config-switch', checked && 'is-on')}
      data-tour={tourId || undefined}
    >
      <div className="config-switch__copy">
        <span className="config-switch__title">{title}</span>
        <span className="config-switch__desc">{desc}</span>
      </div>
      <InputSwitch checked={checked} onChange={(e) => onChange(!!e.value)} disabled={disabled} />
    </div>
  );
}

export default function DadosPrincipais() {
  const { projetoId, assinatura, atualizarStatusOnboarding, selecionarProjeto } = useProjeto();
  // userData — usado na UI de alertas WhatsApp (comentada)
  const toast = useRef<Toast>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { tem, rotulosPlanos } = useRecursoPlano();
  const podeLogoPadrao = tem('config_logo_padrao');

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [usarLogoPadraoAssinatura, setUsarLogoPadraoAssinatura] = useState(false);
  const [tourAberto, setTourAberto] = useState(false);
  const [dadosCarregados, setDadosCarregados] = useState(false);
  const [consultandoCnpj, setConsultandoCnpj] = useState(false);
  const [grauDoCnpj, setGrauDoCnpj] = useState<number | null>(null);
  const [confirmacao, setConfirmacao] = useState<ConfirmacaoQuadro | null>(null);
  const cnpjConsultado = useRef('');
  const grauSalvo = useRef<number | null>(null);
  const empregadosSalvo = useRef<number | null>(null);

  const isEmpresarial = assinatura?.assinatura_tipo?.toUpperCase() === 'EMPRESARIAL';

  useEffect(() => {
    if (projetoId) void carregarDados();
  }, [projetoId, assinatura?.id]);

  useEffect(() => {
    if (!TOUR_CONFIG_ATIVO || !projetoId || !dadosCarregados) return;
    const viaState = (location.state as { tourConfig?: boolean } | null)?.tourConfig === true;
    if (viaState || deveExibirConfigTour(projetoId)) {
      setTourAberto(true);
      if (viaState) {
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [projetoId, dadosCarregados]);

  const getPeriodicidadeAtiva = useCallback(() => false, []);

  const carregarDados = async () => {
    setDadosCarregados(false);
    const data = await projetoService.getDados(projetoId!);
    const cnpjSalvo = formatarCnpj(data?.cnpj || '');
    cnpjConsultado.current = '';
    grauSalvo.current = data?.grau_risco == null ? null : Number(data.grau_risco);
    empregadosSalvo.current = data?.quantidade_empregados == null ? null : Number(data.quantidade_empregados);
    setFormData({
      ...(data || {}),
      cnpj: cnpjSalvo,
      dimensionamento_editado_usuario: data?.dimensionamento_editado_usuario === true,
    });
    if (assinatura?.id) {
      const assData = await assinaturaService.getDadosAssinatura(assinatura.id);
      setUsarLogoPadraoAssinatura(!!assData?.usar_logo_padrao_projetos);
    }
    setDadosCarregados(true);
    void buscarCnpj(cnpjSalvo, data?.dimensionamento_editado_usuario === true);
  };

  const buscarCnpj = async (cnpj: string, manterGrauEscolhido = false) => {
    const digitos = somenteDigitos(cnpj);
    if (!cnpjObrigatorioValido(cnpj) || digitos === cnpjConsultado.current) return;
    cnpjConsultado.current = digitos;
    setConsultandoCnpj(true);
    try {
      const empresa = await consultarCnpj(cnpj);
      if (cnpjConsultado.current !== digitos) return;
      const grauCnpj = empresa.grauRisco ?? null;
      setGrauDoCnpj(grauCnpj);
      setFormData((prev: any) => {
        const manterGrau = manterGrauEscolhido && prev.grau_risco != null;
        const grau = manterGrau ? prev.grau_risco : grauCnpj;
        return {
          ...prev,
          razao_social: empresa.razaoSocial || '',
          cnae: empresa.cnae || null,
          cnae_descricao: empresa.cnaeDescricao || null,
          grau_risco: grau,
          dimensionamento_editado_usuario: grau != null && grau !== grauCnpj,
        };
      });
      if (empresa.grauRisco == null) {
        toast.current?.show({
          severity: 'warn',
          detail: 'Não encontramos o grau de risco da atividade deste CNPJ. Confira o número ou escolha o grau.',
        });
      }
    } catch (erro) {
      if (cnpjConsultado.current !== digitos) return;
      cnpjConsultado.current = '';
      toast.current?.show({
        severity: 'error',
        detail: erro instanceof Error ? erro.message : 'Não foi possível consultar este CNPJ.',
      });
    } finally {
      if (cnpjConsultado.current === digitos || cnpjConsultado.current === '') setConsultandoCnpj(false);
    }
  };

  const alterarCnpj = (valor: string) => {
    const cnpj = formatarCnpj(valor);
    const mudou = somenteDigitos(cnpj) !== somenteDigitos(formData.cnpj);
    setFormData((prev: any) =>
      mudou
        ? {
            ...prev,
            cnpj,
            razao_social: '',
            cnae: null,
            cnae_descricao: null,
            grau_risco: null,
            dimensionamento_editado_usuario: false,
          }
        : { ...prev, cnpj },
    );
    if (!mudou) return;
    setGrauDoCnpj(null);
    if (cnpjObrigatorioValido(cnpj)) {
      void buscarCnpj(cnpj);
    } else {
      cnpjConsultado.current = '';
      setConsultandoCnpj(false);
    }
  };

  const handleUploadLogo = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !projetoId) return;
    const file = files[0];
    if (file.size > 10 * 1024 * 1024) {
      toast.current?.show({ severity: 'error', detail: 'A logo deve ter no máximo 10MB' });
      return;
    }

    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${projetoId}/logo_${Date.now()}.${fileExt}`;
    try {
      const { error } = await supabase.storage.from('logos').upload(fileName, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('logos').getPublicUrl(fileName);
      const novaLogoUrl = data.publicUrl;
      setFormData((prev: any) => ({ ...prev, logo_url: novaLogoUrl }));
      await projetoService.updateDados(projetoId, { logo_url: novaLogoUrl });
      if (usarLogoPadraoAssinatura && assinatura?.id) {
        await assinaturaService.salvarLogoPadrao(assinatura.id, novaLogoUrl, true);
      }
      if (formData.nome) selecionarProjeto(projetoId, formData.nome, novaLogoUrl);
      await atualizarStatusOnboarding();
      toast.current?.show({ severity: 'success', detail: 'Logo atualizada e salva com sucesso!' });
    } catch (error: any) {
      toast.current?.show({ severity: 'error', detail: 'Erro no upload: ' + error.message });
    } finally {
      setUploading(false);
    }
  };

  const descreverQuadro = (quadro: ReturnType<typeof dimensionarCipa>) =>
    quadro.modo === 'indefinido'
      ? 'sem quadro definido'
      : quadro.modo === 'designado'
        ? '1 representante designado'
        : `${quadro.efetivosPorLado} titular(es) e ${quadro.suplentesPorLado} suplente(s) de cada lado`;

  /** Com mandato em vigência, um quadro menor não se aplica à comissão atual. */
  const mandatoPreservado = (empregados: number | null, grau: number | null) => {
    const fim = formData.data_fim_mandato ? String(formData.data_fim_mandato) : '';
    const ativo = formData.cipa_em_andamento === true && fim !== '' && fim >= isoData(new Date());
    const lerNumero = (valor: unknown) => (valor == null || valor === '' ? null : Number(valor));
    const doMandato = {
      empregados: lerNumero(formData.quadro_mandato_empregados) ?? empregadosSalvo.current,
      grau: lerNumero(formData.quadro_mandato_grau) ?? grauSalvo.current,
    };
    const { preservado } = quadroVigente(
      dimensionarCipa(empregados, grau),
      ativo ? doMandato : null,
      fim,
      isoData(new Date()),
    );
    return { ativo, preservado, ...doMandato, quadro: dimensionarCipa(doMandato.empregados, doMandato.grau) };
  };

  const handleSalvar = async (): Promise<boolean> => {
    const nome = String(formData.nome || '').trim();
    if (!nome) {
      toast.current?.show({ severity: 'error', detail: 'Informe o nome do projeto.' });
      return false;
    }
    if (!cnpjObrigatorioValido(formData.cnpj)) {
      toast.current?.show({
        severity: 'error',
        detail: 'O CNPJ é obrigatório. É com ele que puxamos o grau de risco e o dimensionamento da CIPA.',
      });
      return false;
    }
    if (isEmpresarial && !razaoSocialObrigatoriaValida(formData.razao_social)) {
      toast.current?.show({
        severity: 'error',
        detail: 'Razão social obrigatória para operação Empresarial.',
      });
      return false;
    }
    const quantidadeInformada = formData.quantidade_empregados;
    const quantidadeEmpregados = quantidadeInformada === '' || quantidadeInformada == null
      ? null
      : Number(quantidadeInformada);
    if (quantidadeEmpregados == null || !Number.isFinite(quantidadeEmpregados) || quantidadeEmpregados < 0) {
      toast.current?.show({ severity: 'error', detail: 'Informe a quantidade de colaboradores do estabelecimento.' });
      return false;
    }
    const grauInformado = formData.grau_risco;
    const grauRisco = grauInformado === '' || grauInformado == null ? null : Number(grauInformado);
    if (grauRisco == null || ![1, 2, 3, 4].includes(grauRisco)) {
      toast.current?.show({
        severity: 'error',
        detail: consultandoCnpj
          ? 'Aguarde a consulta do CNPJ terminar.'
          : 'Escolha o grau de risco. O CNPJ não trouxe um grau conhecido.',
      });
      return false;
    }
    if (grauDoCnpj != null && grauRisco < grauDoCnpj) {
      toast.current?.show({
        severity: 'error',
        detail: `O grau de risco não pode ficar abaixo do grau ${grauDoCnpj} da atividade do CNPJ.`,
      });
      return false;
    }
    const manual = grauDoCnpj != null ? grauRisco !== grauDoCnpj : formData.dimensionamento_editado_usuario === true;
    const calculado = dimensionarCipa(quantidadeEmpregados, grauRisco);
    const mandato = mandatoPreservado(quantidadeEmpregados, grauRisco);
    const payload = {
      nome,
      cnpj: formatarCnpj(formData.cnpj),
      razao_social: String(formData.razao_social || '').trim() || null,
      cnae: formData.cnae || null,
      cnae_descricao: formData.cnae_descricao || null,
      quantidade_empregados: quantidadeEmpregados,
      grau_risco: grauRisco,
      dimensionamento_editado_usuario: manual,
      dimensionamento_efetivos: calculado.efetivosPorLado,
      ...(mandato.ativo
        ? {
            quadro_mandato_empregados: mandato.preservado ? mandato.empregados : quantidadeEmpregados,
            quadro_mandato_grau: mandato.preservado ? mandato.grau : grauRisco,
          }
        : {}),
    };

    setLoading(true);
    try {
      const { puladas } = await projetoService.salvarDadosCipa(projetoId!, payload, [
        'quantidade_empregados',
        'grau_risco',
      ]);
      grauSalvo.current = grauRisco;
      empregadosSalvo.current = quantidadeEmpregados;
      setFormData((prev: any) => ({ ...prev, ...payload }));
      await atualizarStatusOnboarding();
      if (mandato.preservado && !puladas.includes('quadro_mandato_empregados')) {
        toast.current?.show({
          severity: 'info',
          life: 9000,
          detail: `Dados salvos. O mandato atual continua com ${descreverQuadro(mandato.quadro)}. Pela NR-05 a comissão não pode ser reduzida antes do fim do mandato; o novo quadro vale a partir da próxima eleição.`,
        });
      } else {
        toast.current?.show({ severity: 'success', detail: 'Dados salvos com sucesso!' });
      }
      return true;
    } catch (e: any) {
      toast.current?.show({
        severity: 'error',
        detail: e?.message || e?.details || 'Erro ao salvar os dados do projeto',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const pedirSalvar = () => {
    const lerNumero = (valor: unknown) => (valor == null || valor === '' ? null : Number(valor));
    const grauNovo = lerNumero(formData.grau_risco);
    const empregadosNovo = lerNumero(formData.quantidade_empregados);
    const quadroAntes = dimensionarCipa(empregadosSalvo.current, grauSalvo.current);
    const quadroNovo = dimensionarCipa(empregadosNovo, grauNovo);
    const grauSubiu = grauNovo != null
      && grauDoCnpj != null
      && grauNovo > grauDoCnpj
      && grauNovo > (grauSalvo.current ?? 0);
    const quadroCresceu = quadroAntes.modo !== 'indefinido'
      && (quadroNovo.titularesPermitidos ?? 0) > (quadroAntes.titularesPermitidos ?? 0);
    if (!grauSubiu && !quadroCresceu) {
      void handleSalvar();
      return;
    }
    const fim = formData.data_fim_mandato ? String(formData.data_fim_mandato) : '';
    const mandatoAtivo = formData.cipa_em_andamento === true && fim !== '' && fim >= isoData(new Date());
    setConfirmacao({
      grauSubiu,
      quadroCresceu,
      grauCnpj: grauDoCnpj,
      grauNovo,
      empregadosAntes: empregadosSalvo.current,
      empregadosNovo,
      quadroAntes,
      quadroNovo,
      fimMandato: mandatoAtivo ? fim : null,
    });
  };

  const handleToggleLogoPadrao = async (ativo: boolean) => {
    if (!assinatura?.id || !projetoId) return;
    setUsarLogoPadraoAssinatura(ativo);
    try {
      await assinaturaService.salvarLogoPadrao(assinatura.id, formData.logo_url ?? null, ativo);
      if (ativo && formData.logo_url) {
        toast.current?.show({
          severity: 'success',
          detail: 'Logo padrão aplicada a todos os projetos da assinatura.',
        });
      } else if (!ativo) {
        toast.current?.show({
          severity: 'info',
          detail: 'Cada projeto voltará a usar apenas sua logo individual.',
        });
      }
    } catch (e: unknown) {
      setUsarLogoPadraoAssinatura(!ativo);
      const msg = e instanceof Error ? e.message : 'Erro ao salvar preferência de logo.';
      toast.current?.show({ severity: 'error', detail: msg });
    }
  };

  const quantidadeVista = formData.quantidade_empregados == null || formData.quantidade_empregados === ''
    ? null
    : Number(formData.quantidade_empregados);
  const grauVista = formData.grau_risco == null || formData.grau_risco === '' ? null : Number(formData.grau_risco);
  const quadroVista = dimensionarCipa(
    Number.isFinite(quantidadeVista) ? quantidadeVista : null,
    Number.isFinite(grauVista) ? grauVista : null,
  );
  const dimensionamentoManual = formData.dimensionamento_editado_usuario === true;
  const mandatoVista = mandatoPreservado(
    Number.isFinite(quantidadeVista) ? quantidadeVista : null,
    Number.isFinite(grauVista) ? grauVista : null,
  );

  return (
    <>
      <Toast ref={toast} />
      <ModalConfirmacaoQuadro
        dados={confirmacao}
        salvando={loading}
        descrever={descreverQuadro}
        onCancelar={() => setConfirmacao(null)}
        onConfirmar={async () => {
          const ok = await handleSalvar();
          if (ok) setConfirmacao(null);
        }}
      />

      <div className="config-dados">
        <div className="config-dados__layout">
          <aside className="config-block config-logo">
            <header className="config-block__head">
              <h3 className="config-block__title">Identidade visual</h3>
            </header>

            <div className="config-logo__preview">
              {formData.logo_url ? (
                <img src={formData.logo_url} alt="Logo do projeto" className="config-logo__img" />
              ) : (
                <div className="config-logo__placeholder" aria-hidden>
                  <i className="pi pi-briefcase" />
                </div>
              )}
              <Button
                icon={uploading ? 'pi pi-spin pi-spinner' : 'pi pi-camera'}
                className="p-button-rounded p-button-sm p-button-success config-logo__upload"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                tooltip="Alterar logo"
                tooltipOptions={{ position: 'top' }}
                aria-label="Alterar logo"
              />
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleUploadLogo}
                accept="image/*"
                className="hidden"
              />
            </div>

            <p className="config-logo__hint">PNG ou JPG · máx. 10 MB</p>

            <hr className="config-dados__sep" />

            {podeLogoPadrao ? (
              <SwitchRow
                title="Usar em todos os projetos"
                desc="Define esta imagem como logo padrão da assinatura."
                checked={usarLogoPadraoAssinatura}
                onChange={handleToggleLogoPadrao}
                disabled={!formData.logo_url || uploading}
              />
            ) : (
              <div
                role="button"
                tabIndex={0}
                className="config-switch config-switch--locked"
                onClick={() => navigate('/upgrade')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate('/upgrade');
                  }
                }}
                title={`Disponível em: ${rotulosPlanos('config_logo_padrao')}`}
                aria-label={`Usar em todos os projetos. Disponível em ${rotulosPlanos('config_logo_padrao')}. Clique para ver planos.`}
              >
                <div className="config-switch__copy">
                  <span className="config-switch__title">Usar em todos os projetos</span>
                  <span className="config-switch__desc">
                    Disponível em: {rotulosPlanos('config_logo_padrao')}
                  </span>
                </div>
                <span className="config-switch__lock" aria-hidden>
                  <i className="pi pi-lock" />
                </span>
              </div>
            )}
          </aside>

          <div className="config-dados__main">
            <section className="config-block">
              <header className="config-block__head">
                <h3 className="config-block__title">Projeto</h3>
                <p className="config-block__hint">Nome usado na CIPA deste estabelecimento</p>
              </header>
              <div className="config-block__body">
                <div className="field">
                  <FloatLabel>
                    <InputText
                      id="nome_projeto"
                      value={formData.nome || ''}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      onBlur={(e) =>
                        setFormData((prev: any) => ({ ...prev, nome: e.target.value.trim() }))
                      }
                      className="w-full"
                    />
                    <label htmlFor="nome_projeto">Nome do projeto *</label>
                  </FloatLabel>
                </div>
              </div>
            </section>

            <section className="config-block">
              <header className="config-block__head">
                <h3 className="config-block__title">Dimensionamento da CIPA</h3>
                <Badge
                  value={dimensionamentoManual ? 'Manual' : 'Automático'}
                  severity={dimensionamentoManual ? 'warn' : 'info'}
                />
              </header>
              <div className="config-block__body">
                <p className="config-block__hint">
                  {dimensionamentoManual
                    ? 'O grau de risco foi alterado por você. O Quadro I da NR-05 recalcula os titulares com este grau.'
                    : 'O Quadro I da NR-05 calcula os titulares a partir dos colaboradores e do grau de risco do CNPJ.'}
                </p>
                <div className="config-grid">
                  <div className="field">
                    <FloatLabel>
                      <InputText
                        id="cnpj"
                        value={formData.cnpj || ''}
                        inputMode="numeric"
                        onChange={(e) => alterarCnpj(e.target.value)}
                        className={classNames('w-full', {
                          'p-invalid': !cnpjObrigatorioValido(formData.cnpj),
                        })}
                      />
                      <label htmlFor="cnpj">CNPJ *</label>
                    </FloatLabel>
                    <small className="text-color-secondary text-xs block">
                      {consultandoCnpj
                        ? 'Consultando o CNPJ...'
                        : 'Obrigatório. Ao informar ou trocar o CNPJ, puxamos a razão social e o grau de risco.'}
                    </small>
                    {formData.cnpj && !cnpjOpcionalValido(formData.cnpj) ? (
                      <small className="p-error">CNPJ inválido (00.000.000/0000-00).</small>
                    ) : null}
                  </div>
                  <div className="field">
                    <FloatLabel>
                      <InputText
                        id="razao_social"
                        value={formData.razao_social || ''}
                        onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                        onBlur={(e) =>
                          setFormData((prev: any) => ({
                            ...prev,
                            razao_social: e.target.value.trim(),
                          }))
                        }
                        className={classNames('w-full', {
                          'p-invalid': isEmpresarial && !razaoSocialObrigatoriaValida(formData.razao_social),
                        })}
                      />
                      <label htmlFor="razao_social">Razão social{isEmpresarial ? ' *' : ''}</label>
                    </FloatLabel>
                  </div>
                  <div className="field">
                    <FloatLabel>
                      <InputNumber
                        inputId="quantidade_empregados"
                        value={formData.quantidade_empregados ?? null}
                        onValueChange={(evento) =>
                          setFormData({ ...formData, quantidade_empregados: evento.value ?? null })
                        }
                        min={0}
                        className="w-full"
                      />
                      <label htmlFor="quantidade_empregados">Quantidade de colaboradores *</label>
                    </FloatLabel>
                  </div>
                  <div className="field">
                    <FloatLabel>
                      <Dropdown
                        inputId="grau_risco"
                        value={formData.grau_risco ?? null}
                        options={[1, 2, 3, 4]
                          .filter((valor) => grauDoCnpj == null || valor >= grauDoCnpj)
                          .map((valor) => ({
                            label: valor === grauDoCnpj ? `Grau ${valor} (do CNPJ)` : `Grau ${valor}`,
                            value: valor,
                          }))}
                        disabled={consultandoCnpj}
                        onChange={(evento) =>
                          setFormData({
                            ...formData,
                            grau_risco: evento.value,
                            dimensionamento_editado_usuario: grauDoCnpj == null || evento.value !== grauDoCnpj,
                          })
                        }
                        className="w-full"
                      />
                      <label htmlFor="grau_risco">Grau de risco *</label>
                    </FloatLabel>
                    <small className="text-color-secondary text-xs block">
                      Altere só se o estabelecimento presta serviço dentro de uma empresa de grau maior. Não pode
                      ficar abaixo do grau do CNPJ.
                    </small>
                  </div>
                </div>
                {formData.cnae_descricao ? (
                  <small className="text-color-secondary text-xs block">
                    Atividade principal: {formData.cnae ? `${formData.cnae} — ` : ''}{formData.cnae_descricao}
                  </small>
                ) : null}
                <small className="text-color-secondary text-xs block">
                  {quadroVista.modo === 'indefinido'
                    ? 'Informe a quantidade de colaboradores.'
                    : quadroVista.modo === 'designado'
                      ? `Grau ${grauVista}: este porte pede um representante designado, não uma comissão completa.`
                      : `Grau ${grauVista}: ${quadroVista.efetivosPorLado} titular(es) de cada lado, ${quadroVista.titularesPermitidos} no total.`}
                </small>
                {mandatoVista.preservado ? (
                  <small className="config-aviso-mandato">
                    O mandato atual continua com {descreverQuadro(mandatoVista.quadro)}. Pela NR-05, a comissão não pode
                    ser reduzida antes do fim do mandato; este quadro vale a partir da próxima eleição.
                  </small>
                ) : null}
                {dimensionamentoManual && grauDoCnpj != null ? (
                  <Button
                    type="button"
                    label={`Voltar ao grau ${grauDoCnpj} do CNPJ`}
                    outlined
                    onClick={() =>
                      setFormData({ ...formData, grau_risco: grauDoCnpj, dimensionamento_editado_usuario: false })
                    }
                  />
                ) : null}
              </div>
            </section>

            <div className="config-actions config-actions--end">
              <span data-tour="config-salvar">
                <Button
                  label="Salvar configurações"
                  icon="pi pi-save"
                  onClick={pedirSalvar}
                  loading={loading}
                />
              </span>
            </div>
          </div>
        </div>
      </div>

      <TourSpotlightConfigProjeto
        open={tourAberto}
        getPeriodicidadeAtiva={getPeriodicidadeAtiva}
        onSalvarEConcluir={handleSalvar}
        onConcluido={() => {
          if (projetoId) marcarConfigTourVisto(projetoId);
          setTourAberto(false);
        }}
      />
    </>
  );
}
