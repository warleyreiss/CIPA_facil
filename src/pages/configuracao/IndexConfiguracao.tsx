import type { ReactNode, MouseEvent } from 'react';
import { useRef, useState } from 'react';
import { Panel } from 'primereact/panel';
import DadosPrincipais from './DadosPrincipais';
import UsuariosColaboradores from './UsuariosColaboradores';
import DeletarProjeto from './DeletarProjeto';
import CancelarConta from './CancelarConta';
import InformacoesAssinatura from './InformacoesAssinatura';
import ControleFinanceiro from './ControleFinanceiro';
import LinkAjudaSuporte from '../../components/LinkAjudaSuporte';
import OverlayRecursoPlano, { PainelRecursoBloqueado } from '../../components/OverlayRecursoPlano';
import { useConfigPermissoes } from '../../hooks/useConfigPermissoes';
import { useRecursoPlano } from '../../hooks/useRecursoPlano';
import { cn } from '../../lib/cn';
import type { RecursoId } from '../../lib/recursosPlano';
import type { SuporteTemaSlug } from '../../lib/suporteTemas';

const SECAO_EQUIPE_ATIVA = false;

interface ConfigSectionProps {
  icon: string;
  title: string;
  description: string;
  temaAjuda: SuporteTemaSlug;
  ajudaExtra?: ReactNode;
  variant?: 'default' | 'danger';
  defaultCollapsed?: boolean;
  locked?: boolean;
  lockedHint?: string;
  onLockedClick?: (e: MouseEvent) => void;
  children: ReactNode;
}

function ConfigSection({
  icon,
  title,
  description,
  temaAjuda,
  ajudaExtra,
  variant = 'default',
  defaultCollapsed = false,
  locked = false,
  lockedHint,
  onLockedClick,
  children,
}: ConfigSectionProps) {
  const headerTemplate = (options: any) => {
    const aberto = !options.collapsed;
    return (
      <button
        type="button"
        className={cn(
          'config-index__toggle',
          variant === 'danger' && 'config-index__toggle--danger',
          aberto && 'is-open',
          locked && 'is-locked'
        )}
        onClick={(e) => {
          if (locked) {
            onLockedClick?.(e);
            return;
          }
          options.onTogglerClick(e);
        }}
        aria-expanded={locked ? false : aberto}
        title={locked ? lockedHint : undefined}
      >
        <span className="config-index__toggle-icon" aria-hidden>
          <i className={locked ? 'pi pi-lock' : icon} />
        </span>
        <span className="config-index__toggle-copy">
          <span className="config-index__toggle-title">{title}</span>
          <span className="config-index__toggle-desc">
            {locked && lockedHint ? lockedHint : description}
          </span>
        </span>
        <i
          className={cn(
            'pi config-index__toggle-chevron',
            locked ? 'pi-lock' : aberto ? 'pi-angle-up' : 'pi-angle-down'
          )}
          aria-hidden
        />
      </button>
    );
  };

  return (
    <Panel
      headerTemplate={headerTemplate}
      toggleable={!locked}
      collapsed={locked || defaultCollapsed}
      className={cn('config-index__panel', variant === 'danger' && 'config-index__panel--danger')}
    >
      <div className="config-index__body">
        {children}
        {!locked && (
          <footer className="config-index__section-foot">
            <LinkAjudaSuporte tema={temaAjuda} />
            {ajudaExtra}
          </footer>
        )}
      </div>
    </Panel>
  );
}

export default function IndexConfiguracao() {
  const { isGestor, isProprietario } = useConfigPermissoes();
  const { tem, planoTipoRaw, rotulosPlanos } = useRecursoPlano();
  const overlayRecursoRef = useRef<any>(null);
  const [recursoOverlay, setRecursoOverlay] = useState<RecursoId | null>(null);

  const abrirOverlay = (recurso: RecursoId) => (e: MouseEvent) => {
    setRecursoOverlay(recurso);
    overlayRecursoRef.current?.toggle(e);
  };

  const podeEquipe = tem('config_equipe');
  const podeExcluir = tem('config_excluir_projeto');

  return (
    <div className="config-index">
      <OverlayRecursoPlano ref={overlayRecursoRef} recurso={recursoOverlay} planoTipo={planoTipoRaw} />
      <header className="config-index__hero">
        <div>
          <p className="config-index__kicker">Ambiente ativo</p>
          <h1 className="config-index__title">Configurações do projeto</h1>
          <p className="config-index__subtitle">
            Dados do estabelecimento, dimensionamento da CIPA e assinatura.
          </p>
        </div>
        <LinkAjudaSuporte tema="primeiros_passos" />
      </header>

      <div className="config-index__sections">
        {isGestor && (
          <ConfigSection
            icon="pi pi-cog"
            title="Dados do Projeto"
            description="Nome, CNPJ, quantidade de colaboradores e o dimensionamento da CIPA."
            temaAjuda="primeiros_passos"
          >
            <DadosPrincipais />
          </ConfigSection>
        )}

        {/*isGestor && (
         
          <ConfigSection
            icon="pi pi-history"
            title="Histórico de alterações"
            description="Auditoria das mudanças salvas nas configurações deste projeto."
            temaAjuda="primeiros_passos"
            defaultCollapsed
          >
            <HistoricoAlteracaoProjeto />
          </ConfigSection>
          
        )*/}

        {SECAO_EQUIPE_ATIVA && (
          <ConfigSection
            icon="pi pi-users"
            title="Equipe e Colaboradores"
            description="Convide membros, defina níveis de acesso e gerencie vínculos por projeto."
            temaAjuda="convidar_usuario"
            defaultCollapsed={isGestor}
            locked={!podeEquipe}
            lockedHint={`Disponível em: ${rotulosPlanos('config_equipe')}`}
            onLockedClick={abrirOverlay('config_equipe')}
          >
            {podeEquipe ? (
              <UsuariosColaboradores />
            ) : (
              <PainelRecursoBloqueado recurso="config_equipe" planoTipo={planoTipoRaw} mostrarAjuda={false} />
            )}
          </ConfigSection>
        )}

        {isProprietario && (
          <ConfigSection
            icon="pi pi-id-card"
            title="Assinatura da plataforma"
            description="Plano contratado, limites de uso, tipo de operação e dados de cobrança."
            temaAjuda="informacoes_assinatura"
          >
            <InformacoesAssinatura />
          </ConfigSection>
        )}

        {isProprietario && (
          <ConfigSection
            icon="pi pi-wallet"
            title="Controle Financeiro"
            description="Faturas, portal de pagamento Stripe e upgrade de plano."
            temaAjuda="faturas_cobranca"
            defaultCollapsed
          >
            <ControleFinanceiro />
          </ConfigSection>
        )}

        {isGestor && (
          <ConfigSection
            icon="pi pi-trash"
            title="Excluir projeto"
            description="Inativa apenas o projeto ativo. A assinatura e a cobrança continuam."
            temaAjuda="excluir_projeto"
            variant="danger"
            defaultCollapsed
            locked={!podeExcluir}
            lockedHint={`Disponível em: ${rotulosPlanos('config_excluir_projeto')}`}
            onLockedClick={abrirOverlay('config_excluir_projeto')}
          >
            {podeExcluir ? (
              <>
                <div className="config-danger-alert" role="note">
                  <i className="pi pi-exclamation-triangle" aria-hidden />
                  <div>
                    <strong>Zona de perigo</strong>
                    <p>
                      Esta ação remove só o ambiente atual. Outros projetos da conta não são afetados.
                    </p>
                  </div>
                </div>
                <DeletarProjeto />
              </>
            ) : (
              <PainelRecursoBloqueado recurso="config_excluir_projeto" planoTipo={planoTipoRaw} mostrarAjuda={false} />
            )}
          </ConfigSection>
        )}

        {isProprietario && (
          <ConfigSection
            icon="pi pi-ban"
            title="Excluir assinatura"
            description="Cancela o plano inteiro — todos os projetos e usuários da conta."
            temaAjuda="faturas_cobranca"
            variant="danger"
            defaultCollapsed
          >
            <div className="config-danger-alert" role="note">
              <i className="pi pi-exclamation-triangle" aria-hidden />
              <div>
                <strong>Zona de perigo</strong>
                <p>
                  Esta ação encerra a assinatura completa. Não use se quiser apenas remover um
                  projeto.
                </p>
              </div>
            </div>
            <CancelarConta />
          </ConfigSection>
        )}
      </div>
    </div>
  );
}
