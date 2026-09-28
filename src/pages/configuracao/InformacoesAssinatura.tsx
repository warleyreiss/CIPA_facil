import { useState, useEffect, useRef } from 'react';
import { Toast } from 'primereact/toast';
import { SelectButton } from 'primereact/selectbutton';
import { Badge } from 'primereact/badge';
import { Message } from 'primereact/message';
import { FloatLabel } from 'primereact/floatlabel';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { cnpj as cnpjValidator } from 'cpf-cnpj-validator';
import { useProjeto } from '../../contexts/ProjetoContext';
import { assinaturaService, type AssinaturaModel } from '../../lib/assinaturaService';
import { projetoService } from '../../lib/projetoService';
import {
  cnpjObrigatorioValido,
  formatarCnpj,
  razaoSocialObrigatoriaValida,
} from '../../lib/documentoUtils';
import { cn as classNames } from '../../lib/cn';
import OverlayStatusPlano from '../../components/OverlayStatusPlano';
import { useConfigPermissoes } from '../../hooks/useConfigPermissoes';
import ConfigAccessNotice from '../../components/config/ConfigAccessNotice';

export type { AssinaturaModel };

type TipoAssinatura = 'AUTONOMO' | 'EMPRESARIAL';

function montarFallbackAssinatura(
  assinatura: Partial<AssinaturaModel> | null | undefined,
  userData: { nome_completo?: string | null; email?: string | null } | null | undefined
): AssinaturaModel | null {
  if (!assinatura?.id) return null;
  return {
    id: assinatura.id,
    stripe_customer_id: assinatura.stripe_customer_id ?? null,
    stripe_subscription_id: assinatura.stripe_subscription_id ?? null,
    stripe_price_id: assinatura.stripe_price_id ?? null,
    proprietario_id: assinatura.proprietario_id ?? null,
    assinatura_tipo: assinatura.assinatura_tipo ?? null,
    plano_tipo: assinatura.plano_tipo ?? null,
    plano_status: assinatura.plano_status ?? null,
    plano_regra_id: assinatura.plano_regra_id ?? null,
    dias_tolerancia: assinatura.dias_tolerancia ?? 0,
    cancel_at_period_end: !!assinatura.cancel_at_period_end,
    encerrar_conta_agendado: !!assinatura.encerrar_conta_agendado,
    data_inicio: assinatura.data_inicio ?? null,
    proxima_fatura: assinatura.proxima_fatura ?? null,
    plano_fim_periodo: assinatura.plano_fim_periodo ?? null,
    data_falha_pagamento: assinatura.data_falha_pagamento ?? null,
    created_at: assinatura.created_at ?? null,
    responsavel_nome: userData?.nome_completo || undefined,
    responsavel_email: userData?.email || undefined,
  };
}

export default function InformacoesAssinatura() {
  const { assinatura, userData, projetoId, setAssinatura } = useProjeto();
  const { isProprietario } = useConfigPermissoes();
  const toast = useRef<Toast>(null);
  const [fetching, setFetching] = useState(true);
  const [updatingTipo, setUpdatingTipo] = useState(false);
  const [dados, setDados] = useState<AssinaturaModel | null>(null);
  const [erroCarga, setErroCarga] = useState<string | null>(null);

  /** Fluxo pendente: exige CNPJ + razão social antes de confirmar Empresarial. */
  const [pendenteEmpresarial, setPendenteEmpresarial] = useState(false);
  const [cnpj, setCnpj] = useState('');
  const [razaoSocial, setRazaoSocial] = useState('');
  const [submittedFiscal, setSubmittedFiscal] = useState(false);
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);

  const tiposOpcoes = [
    { label: 'Autônomo', value: 'AUTONOMO' },
    { label: 'Empresarial', value: 'EMPRESARIAL' },
  ];

  const cnpjOk = cnpjObrigatorioValido(cnpj);
  const razaoOk = razaoSocialObrigatoriaValida(razaoSocial);
  const erroCnpj = submittedFiscal && !cnpjOk;
  const erroRazao = submittedFiscal && !razaoOk;

  useEffect(() => {
    if (!assinatura?.id) {
      setFetching(false);
      setDados(null);
      setErroCarga('Nenhuma assinatura vinculada à sessão atual.');
      return;
    }
    void carregarAssinatura();
  }, [assinatura?.id]);

  const carregarAssinatura = async () => {
    if (!assinatura?.id) return;
    const fallback = montarFallbackAssinatura(assinatura, userData);
    try {
      setFetching(true);
      setErroCarga(null);
      const data = await assinaturaService.getDadosAssinatura(assinatura.id);
      if (data) {
        setDados({
          ...data,
          responsavel_nome:
            data.responsavel_nome ||
            (isProprietario ? userData?.nome_completo : undefined) ||
            undefined,
          responsavel_email:
            data.responsavel_email ||
            (isProprietario ? userData?.email : undefined) ||
            undefined,
        });
      } else {
        setDados(fallback);
        if (!fallback) setErroCarga('Não foi possível carregar os dados da assinatura.');
      }
    } catch (error) {
      console.error('Erro ao carregar assinatura:', error);
      setDados(fallback);
      if (!fallback) {
        setErroCarga('Não foi possível ler os registros da assinatura.');
      }
      toast.current?.show({
        severity: 'warn',
        summary: 'Leitura parcial',
        detail: 'Exibindo dados da sessão. Alguns detalhes podem estar incompletos.',
      });
    } finally {
      setFetching(false);
    }
  };

  const carregarDadosFiscaisProjeto = async () => {
    if (!projetoId) {
      setCnpj('');
      setRazaoSocial('');
      return { cnpjValido: false, razaoValida: false, cnpjFmt: '', razao: '' };
    }
    const proj = await projetoService.getDados(projetoId);
    const cnpjFmt = formatarCnpj(proj?.cnpj || '');
    const razao = (proj?.razao_social || '').trim();
    setCnpj(cnpjFmt);
    setRazaoSocial(razao);
    return {
      cnpjValido: cnpjObrigatorioValido(cnpjFmt),
      razaoValida: razaoSocialObrigatoriaValida(razao),
      cnpjFmt,
      razao,
    };
  };

  const aplicarTipo = async (novoTipo: TipoAssinatura) => {
    if (!dados?.id) return;
    await assinaturaService.updateConfiguracoes(dados.id, { assinatura_tipo: novoTipo });
    setDados((prev) => (prev ? { ...prev, assinatura_tipo: novoTipo } : null));
    setAssinatura({
      ...(assinatura ?? {}),
      ...(dados ?? {}),
      id: dados.id,
      assinatura_tipo: novoTipo,
    });
    setPendenteEmpresarial(false);
    setSubmittedFiscal(false);
    toast.current?.show({
      severity: 'success',
      summary: 'Sucesso',
      detail: `Classificação alterada para ${novoTipo === 'EMPRESARIAL' ? 'Empresarial' : 'Autônomo'}!`,
      life: 2000,
    });
  };

  const buscarCnpjBrasilApi = async (valor: string) => {
    const clean = valor.replace(/\D/g, '');
    if (clean.length !== 14) return;
    if (!cnpjValidator.isValid(clean)) {
      toast.current?.show({ severity: 'error', detail: 'CNPJ inválido' });
      return;
    }
    setBuscandoCnpj(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data?.razao_social) {
        setRazaoSocial(String(data.razao_social).trim());
      }
    } catch {
      /* silencioso: usuário pode preencher manualmente */
    } finally {
      setBuscandoCnpj(false);
    }
  };

  const confirmarEmpresarial = async () => {
    setSubmittedFiscal(true);
    if (!cnpjObrigatorioValido(cnpj) || !razaoSocialObrigatoriaValida(razaoSocial)) {
      toast.current?.show({
        severity: 'error',
        summary: 'Dados incompletos',
        detail: 'Informe um CNPJ válido e a razão social para classificar como Empresarial.',
      });
      return;
    }
    if (!projetoId) {
      toast.current?.show({
        severity: 'error',
        detail: 'Selecione um projeto antes de alterar o tipo de operação.',
      });
      return;
    }

    setUpdatingTipo(true);
    try {
      await projetoService.updateDados(projetoId, {
        cnpj: formatarCnpj(cnpj),
        razao_social: razaoSocial.trim(),
      });
      await aplicarTipo('EMPRESARIAL');
    } catch {
      toast.current?.show({
        severity: 'error',
        summary: 'Erro',
        detail: 'Não foi possível salvar os dados fiscais e alterar a classificação.',
      });
    } finally {
      setUpdatingTipo(false);
    }
  };

  const handleAlterarTipoAssinatura = async (novoTipo: TipoAssinatura) => {
    if (!isProprietario || !dados?.id || novoTipo === dados.assinatura_tipo) return;

    if (novoTipo === 'AUTONOMO') {
      setPendenteEmpresarial(false);
      setSubmittedFiscal(false);
      setUpdatingTipo(true);
      try {
        await aplicarTipo('AUTONOMO');
      } catch {
        toast.current?.show({
          severity: 'error',
          summary: 'Erro',
          detail: 'Não foi possível alterar a classificação da conta.',
        });
      } finally {
        setUpdatingTipo(false);
      }
      return;
    }

    // EMPRESARIAL: exige CNPJ + razão social no projeto ativo
    setUpdatingTipo(true);
    try {
      const fiscal = await carregarDadosFiscaisProjeto();
      if (fiscal.cnpjValido && fiscal.razaoValida) {
        await aplicarTipo('EMPRESARIAL');
      } else {
        setPendenteEmpresarial(true);
        setSubmittedFiscal(false);
        toast.current?.show({
          severity: 'info',
          summary: 'Dados fiscais',
          detail: 'Para Empresarial, informe CNPJ e razão social válidos.',
          life: 3500,
        });
      }
    } catch {
      setPendenteEmpresarial(true);
      toast.current?.show({
        severity: 'warn',
        detail: 'Preencha CNPJ e razão social para continuar.',
      });
    } finally {
      setUpdatingTipo(false);
    }
  };

  const formatarData = (dataString: string | null | undefined) => {
    if (!dataString || isNaN(Date.parse(dataString))) return 'Não informada';
    return new Date(dataString).toLocaleDateString('pt-BR');
  };

  const getSeverityStatus = (status: string | null): 'success' | 'warning' | 'danger' | 'info' => {
    if (!status) return 'info';
    const s = status.toLowerCase();
    if (s === 'active' || s === 'ativo') return 'success';
    if (s === 'past_due' || s === 'atrasado') return 'warning';
    return 'danger';
  };

  const tipoSelectValue = pendenteEmpresarial ? 'EMPRESARIAL' : dados?.assinatura_tipo;

  return (
    <>
      <Toast ref={toast} />

      {fetching && (
        <div className="config-lead" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <i className="pi pi-spin pi-spinner" aria-hidden />
          Sincronizando dados da conta…
        </div>
      )}

      {!fetching && !dados && (
        <Message severity="warn" text={erroCarga || 'Não foi possível carregar os dados da assinatura.'} />
      )}

      {!fetching && dados && (
        <>
          {!isProprietario && (
            <ConfigAccessNotice
              title="Visualização limitada"
              message="Você pode consultar o plano ativo. Alterações de tipo de operação e cobrança são exclusivas do titular da assinatura."
            />
          )}

          <div className="config-stats">
            <div className="config-stat">
              <span className="config-stat__label">Plano</span>
              <span className="config-stat__value">{dados.plano_tipo || '—'}</span>
            </div>
            <div className="config-stat">
              <span className="config-stat__label">Status</span>
              <Badge
                value={(dados.plano_status || 'INATIVO').toUpperCase()}
                severity={getSeverityStatus(dados.plano_status ?? null)}
              />
            </div>
            <div className="config-stat">
              <span className="config-stat__label">Desde</span>
              <span className="config-stat__value">{formatarData(dados.data_inicio)}</span>
            </div>
           
          </div>

          <div className="config-assinatura__layout">
            <section className="config-block">
              <header className="config-block__head">
                <h3 className="config-block__title">Uso do plano</h3>
              </header>
              <OverlayStatusPlano />
            </section>

            <div className="config-dados__main">
              <section className="config-block">
                <header className="config-block__head">
                  <h3 className="config-block__title">Tipo de operação</h3>
                </header>
                <div className="config-block__body">
                  {isProprietario ? (
                    <div className="flex flex-column gap-3">
                      <div className="flex align-items-center gap-3">
                        <SelectButton
                          value={tipoSelectValue}
                          options={tiposOpcoes}
                          onChange={(e) => e.value && void handleAlterarTipoAssinatura(e.value)}
                          disabled={updatingTipo}
                        />
                        {updatingTipo && <i className="pi pi-spin pi-spinner" aria-hidden />}
                      </div>

                      {pendenteEmpresarial && (
                        <div className="flex flex-column gap-3">
                          <Message
                            severity="info"
                            text="Para classificar como Empresarial, informe CNPJ e razão social do projeto ativo. O CNPJ será validado."
                          />
                          <div className="config-grid">
                            <div className="field">
                              <FloatLabel>
                                <InputText
                                  id="ass-cnpj"
                                  value={cnpj}
                                  inputMode="numeric"
                                  disabled={updatingTipo || buscandoCnpj}
                                  onChange={(e) => {
                                    setCnpj(formatarCnpj(e.target.value));
                                    setSubmittedFiscal(false);
                                  }}
                                  onBlur={(e) => void buscarCnpjBrasilApi(e.target.value)}
                                  className={classNames('w-full', { 'p-invalid': erroCnpj })}
                                />
                                <label htmlFor="ass-cnpj">CNPJ *</label>
                              </FloatLabel>
                              {erroCnpj && (
                                <small className="p-error">
                                  {!cnpj.replace(/\D/g, '')
                                    ? 'CNPJ obrigatório.'
                                    : 'CNPJ inválido (00.000.000/0000-00).'}
                                </small>
                              )}
                            </div>
                            <div className="field">
                              <FloatLabel>
                                <InputText
                                  id="ass-razao"
                                  value={razaoSocial}
                                  disabled={updatingTipo || buscandoCnpj}
                                  onChange={(e) => {
                                    setRazaoSocial(e.target.value);
                                    setSubmittedFiscal(false);
                                  }}
                                  onBlur={(e) => setRazaoSocial(e.target.value.trim())}
                                  className={classNames('w-full', { 'p-invalid': erroRazao })}
                                />
                                <label htmlFor="ass-razao">Razão social *</label>
                              </FloatLabel>
                              {erroRazao && (
                                <small className="p-error">Informe a razão social (mín. 2 caracteres).</small>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <Button
                              type="button"
                              label="Confirmar Empresarial"
                              icon="pi pi-check"
                              loading={updatingTipo || buscandoCnpj}
                              onClick={() => void confirmarEmpresarial()}
                            />
                            <Button
                              type="button"
                              label="Cancelar"
                              severity="secondary"
                              outlined
                              disabled={updatingTipo}
                              onClick={() => {
                                setPendenteEmpresarial(false);
                                setSubmittedFiscal(false);
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="config-meta__value">
                      {dados.assinatura_tipo === 'EMPRESARIAL' ? 'Empresarial' : 'Autônomo'}
                    </span>
                  )}
                </div>
              </section>

              <section className="config-block">
                <header className="config-block__head">
                  <h3 className="config-block__title">Titular responsável</h3>
                </header>
                <div className="config-meta-grid">
                  <div className="config-meta">
                    <span className="config-meta__label">Nome completo</span>
                    <span className="config-meta__value">
                      {dados.responsavel_nome || 'Não preenchido'}
                    </span>
                  </div>
                  <div className="config-meta">
                    <span className="config-meta__label">E-mail administrativo</span>
                    <span className="config-meta__value config-meta__value--mono">
                      {dados.responsavel_email || 'Não associado'}
                    </span>
                  </div>
                </div>
              </section>

              <section className="config-block">
                <header className="config-block__head">
                  <h3 className="config-block__title">Informações de cobrança</h3>
                </header>
                <div className="config-billing config-meta-grid">
                  <div className="config-meta">
                    <span className="config-meta__label">Próxima fatura</span>
                    <span className="config-meta__value">
                      {dados.cancel_at_period_end || dados.encerrar_conta_agendado ? (
                        <span style={{ color: 'var(--warning)' }}>
                          {dados.encerrar_conta_agendado
                            ? `Encerramento de conta agendado: ${formatarData(dados.plano_fim_periodo)}`
                            : `Cancelamento agendado: ${formatarData(dados.plano_fim_periodo)}`}
                        </span>
                      ) : (
                        formatarData(dados.proxima_fatura)
                      )}
                    </span>
                  </div>
                  <div className="config-meta">
                    <span className="config-meta__label">ID do cliente (Stripe)</span>
                    <span
                      className="config-meta__value config-meta__value--mono"
                      title={dados.stripe_customer_id || ''}
                    >
                      {dados.stripe_customer_id || 'Ambiente local'}
                    </span>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </>
      )}
    </>
  );
}
