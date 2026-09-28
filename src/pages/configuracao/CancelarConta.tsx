import { useState, useRef } from 'react';
import { InputText } from 'primereact/inputtext';
import { FloatLabel } from 'primereact/floatlabel';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Dialog } from 'primereact/dialog';
import { Toast } from 'primereact/toast';
import { Message } from 'primereact/message';
import { cn as classNames } from '../../lib/cn';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { assinaturaService } from '../../lib/assinaturaService';
import { useProjeto } from '../../contexts/ProjetoContext';
import { useConfigPermissoes } from '../../hooks/useConfigPermissoes';
import { emailValido, formatarEmailDigitacao } from '../../lib/telefoneUtils';
import { isPlanoGratuito as planoEhGratuito } from '../../lib/recursosPlano';

const FRASE_CONFIRMACAO = 'CANCELAR CONTA';

export default function CancelarConta() {
  const { assinatura, userData } = useConfigPermissoes();
  const { inicializarUsuario } = useProjeto();
  const navigate = useNavigate();
  const toast = useRef<Toast>(null);

  const [aceiteConsequencias, setAceiteConsequencias] = useState(false);
  const [aceiteIrreversivel, setAceiteIrreversivel] = useState(false);
  const [emailConfirmacao, setEmailConfirmacao] = useState('');
  const [fraseConfirmacao, setFraseConfirmacao] = useState('');
  const [modalFinalAberto, setModalFinalAberto] = useState(false);
  const [processando, setProcessando] = useState(false);

  const emailTitular = (userData?.email ?? '').trim().toLowerCase();
  const isPlanoGratuito = planoEhGratuito(assinatura?.plano_tipo);
  const jaAgendado = !!assinatura?.cancel_at_period_end || !!assinatura?.encerrar_conta_agendado;

  const emailFormatadoOk = !emailConfirmacao || emailValido(emailConfirmacao);
  const emailConfere =
    emailConfirmacao.trim().toLowerCase() === emailTitular && emailTitular.length > 0;
  const emailValidoConfirmacao = emailFormatadoOk && emailConfere;
  const fraseValida = fraseConfirmacao.trim().toUpperCase() === FRASE_CONFIRMACAO;
  const podeAbrirConfirmacaoFinal =
    aceiteConsequencias &&
    aceiteIrreversivel &&
    emailValidoConfirmacao &&
    fraseValida &&
    !jaAgendado &&
    !processando;

  const executarCancelamento = async () => {
    if (!assinatura?.id || !podeAbrirConfirmacaoFinal) return;
    setProcessando(true);
    try {
      const resultado = await assinaturaService.cancelarAssinatura(assinatura.id, emailConfirmacao.trim());
      setModalFinalAberto(false);

      if (resultado.modo === 'imediato') {
        toast.current?.show({ severity: 'success', summary: 'Conta encerrada', detail: resultado.mensagem, life: 4000 });
        setTimeout(async () => { await supabase.auth.signOut(); navigate('/login', { replace: true }); }, 1500);
        return;
      }

      toast.current?.show({
        severity: 'success', summary: 'Cancelamento agendado',
        detail: resultado.dataEncerramento ? `${resultado.mensagem} Acesso até ${new Date(resultado.dataEncerramento).toLocaleDateString('pt-BR')}.` : resultado.mensagem,
        life: 8000,
      });

      if (userData && inicializarUsuario) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) await inicializarUsuario(user, true, true);
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Não foi possível cancelar a assinatura.';
      toast.current?.show({ severity: 'error', summary: 'Erro', detail: msg });
    } finally { setProcessando(false); }
  };

  if (jaAgendado) {
    return (
      <Message
        severity="warn"
        text={`O encerramento da conta já está agendado${assinatura?.plano_fim_periodo ? ` para ${new Date(assinatura.plano_fim_periodo).toLocaleDateString('pt-BR')}` : ''}. Você mantém acesso até essa data; depois a conta será bloqueada.`}
      />
    );
  }

  const dialogFooter = (
    <div className="flex justify-content-end gap-2">
      <Button label="Voltar" icon="pi pi-times" severity="secondary" text onClick={() => setModalFinalAberto(false)} disabled={processando} />
      <Button label={processando ? 'Processando...' : 'Sim, cancelar definitivamente'} icon="pi pi-exclamation-triangle" severity="danger" loading={processando} onClick={executarCancelamento} />
    </div>
  );

  return (
    <>
      <Toast ref={toast} />

      <p className="config-lead">
        Isto afeta a <strong>assinatura completa</strong>
        {isPlanoGratuito
          ? ': no plano gratuito o encerramento é imediato e todos perdem o acesso.'
          : ': em planos pagos o cancelamento é agendado para o fim do período já pago; depois disso a conta é encerrada (não permanece no plano gratuito).'}
      </p>

      <ul className="config-danger-list">
        <li>Todos os projetos da conta deixam de ser editáveis após o encerramento.</li>
        <li>Colaboradores convidados perdem acesso quando a assinatura encerrar.</li>
        <li>
          {isPlanoGratuito
            ? 'Você será desconectado assim que o cancelamento for confirmado.'
            : 'Você mantém acesso até a data de fim do ciclo vigente; em seguida o acesso é bloqueado.'}
        </li>
      </ul>

      <div className="config-danger-box">
        <div className="config-check-list">
          <div className="config-check">
            <Checkbox
              inputId="aceite-consequencias"
              className="config-check__box"
              checked={aceiteConsequencias}
              onChange={(e) => setAceiteConsequencias(!!e.checked)}
            />
            <label htmlFor="aceite-consequencias">
              Entendo que o cancelamento vale para toda a equipe e todos os projetos da assinatura.
            </label>
          </div>
          <div className="config-check">
            <Checkbox
              inputId="aceite-irreversivel"
              className="config-check__box"
              checked={aceiteIrreversivel}
              onChange={(e) => setAceiteIrreversivel(!!e.checked)}
            />
            <label htmlFor="aceite-irreversivel">
              Confirmo que quero encerrar a assinatura (não apenas um projeto).
            </label>
          </div>
        </div>

        <div className="config-danger-box__field">
          <span className="config-danger-box__label">E-mail do titular</span>
          <div className="config-danger-box__email" title={emailTitular || undefined}>
            <i className="pi pi-envelope" aria-hidden />
            <strong>{emailTitular || '—'}</strong>
          </div>
        </div>

        <div className="config-danger-box__field">
          <small className="config-danger-box__label">Redigite o e-mail acima para confirmar:</small>
          <FloatLabel>
            <InputText
              id="email-cancelamento"
              type="email"
              inputMode="email"
              autoComplete="off"
              value={emailConfirmacao}
              onChange={(e) => setEmailConfirmacao(formatarEmailDigitacao(e.target.value))}
              className={classNames('w-full', {
                'p-invalid': emailConfirmacao.length > 0 && !emailValidoConfirmacao,
              })}
            />
            <label htmlFor="email-cancelamento">Confirmação do e-mail</label>
          </FloatLabel>
          {emailConfirmacao && !emailFormatadoOk && (
            <small className="p-error">Informe um e-mail válido.</small>
          )}
          {emailConfirmacao && emailFormatadoOk && !emailConfere && (
            <small className="p-error">O e-mail não confere com o titular da conta.</small>
          )}
        </div>

        <div className="config-danger-box__field config-danger-box__field--last">
          <small className="config-danger-box__label">
            Digite <strong>{FRASE_CONFIRMACAO}</strong> para prosseguir:
          </small>
          <FloatLabel>
            <InputText
              id="frase-cancelamento"
              value={fraseConfirmacao}
              onChange={(e) => setFraseConfirmacao(e.target.value.toUpperCase())}
              className={classNames('w-full', {
                'p-invalid': fraseConfirmacao.length > 0 && !fraseValida,
              })}
              autoComplete="off"
            />
            <label htmlFor="frase-cancelamento">{FRASE_CONFIRMACAO}</label>
          </FloatLabel>
          {fraseConfirmacao && !fraseValida && (
            <small className="p-error">A frase digitada não confere.</small>
          )}
        </div>
      </div>

      <div className="config-actions config-actions--end">
        <Button
          label="Cancelar assinatura da conta"
          icon="pi pi-ban"
          severity="danger"
          disabled={!podeAbrirConfirmacaoFinal}
          onClick={() => setModalFinalAberto(true)}
        />
      </div>

      <Dialog
        header="Confirmação final — assinatura"
        visible={modalFinalAberto}
        style={{ width: 'min(520px, 94vw)' }}
        modal
        closable={!processando}
        dismissableMask={!processando}
        onHide={() => !processando && setModalFinalAberto(false)}
        footer={dialogFooter}
      >
        <p className="m-0 line-height-3">
          Última confirmação. Ao continuar, a assinatura
          {isPlanoGratuito
            ? ' será encerrada imediatamente e sua sessão será finalizada.'
            : ' será marcada para cancelamento ao fim do período vigente.'}
          {' '}Isto não é a inativação de um único projeto.
        </p>
      </Dialog>
    </>
  );
}
