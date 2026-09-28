import { useEffect, useMemo, useRef, useState } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { Tooltip } from 'primereact/tooltip';
import { useProjeto } from '../../contexts/ProjetoContext';
import {
  projetoService,
  type HistoricoAlteracaoProjetoItem,
} from '../../lib/projetoService';
import { TableEmptyState } from '../../components/tables/TableEmptyState';
import { CadastroSection } from '../../components/forms/CadastroSection';

const LABELS_CAMPO: Record<string, string> = {
  nome: 'Nome do projeto',
  cnpj: 'CNPJ',
  razao_social: 'Razão social',
  inscricao_estadual: 'Inscrição estadual',
  inscricao_municipal: 'Inscrição municipal',
  cnae: 'CNAE',
  regime_tributario: 'Regime tributário',
  logradouro: 'Logradouro',
  numero: 'Número',
  complemento: 'Complemento',
  bairro: 'Bairro',
  cidade: 'Cidade',
  estado: 'Estado',
  cep: 'CEP',
  logo_url: 'Logo',
  periodicidade_troca: 'Controle de periodicidade',
  controle_estoque: 'Controle de estoque',
  dias_iminencia_troca: 'Dias de iminência',
  obrigar_guia_tamanhos_colaborador: 'Guia de tamanhos',
  notificar_vencimentos_email: 'Alertas por e-mail',
  notificar_vencimentos_whatsapp: 'Alertas por WhatsApp',
  telefone_whatsapp_notificacao: 'WhatsApp de alertas',
  telefone_whatsapp_verificado_em: 'WhatsApp verificado em',
  assinatura_digital_modo: 'Modo de assinatura digital',
  validacao_digital: 'Validação digital',
  obrigar_cracha_colaborador: 'Obrigar crachá',
  obrigar_cartao_colaborador: 'Obrigar cartão',
  status: 'Status do projeto',
};

function labelCampo(campo: string) {
  return LABELS_CAMPO[campo] || campo;
}

function formatarValor(valor: unknown): string {
  if (valor === null || valor === undefined || valor === '') return '—';
  if (typeof valor === 'boolean') return valor ? 'Sim' : 'Não';
  if (typeof valor === 'object') return JSON.stringify(valor);
  return String(valor);
}

function formatarDataBusca(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function HistoricoAlteracaoProjeto() {
  const { projetoId } = useProjeto();
  const toast = useRef<Toast>(null);
  const [registros, setRegistros] = useState<HistoricoAlteracaoProjetoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');

  const carregar = async () => {
    if (!projetoId) return;
    setLoading(true);
    try {
      const data = await projetoService.listarHistoricoAlteracoes(projetoId);
      setRegistros(data);
    } catch (e: any) {
      toast.current?.show({
        severity: 'error',
        detail: e?.message ?? 'Erro ao carregar histórico.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, [projetoId]);

  const filtrados = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return registros;
    return registros.filter((r) => {
      const quem = (r.alterado_por_nome || 'sistema').toLowerCase();
      const campos = (r.campos_alterados || []).map(labelCampo).join(' ').toLowerCase();
      const data = formatarDataBusca(r.created_at).toLowerCase();
      return quem.includes(q) || campos.includes(q) || data.includes(q);
    });
  }, [registros, filtro]);

  const dataTemplate = (row: HistoricoAlteracaoProjetoItem) => {
    if (!row.created_at) return <span className="historico-funcoes__muted">—</span>;
    const d = new Date(row.created_at);
    const dia = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return (
      <div className="historico-funcoes__data">
        <span className="historico-funcoes__data-dia">{dia}</span>
        <span className="historico-funcoes__data-hora">{hora}</span>
      </div>
    );
  };

  const camposTemplate = (row: HistoricoAlteracaoProjetoItem) => {
    const campos = row.campos_alterados || [];
    if (campos.length === 0) {
      return <span className="historico-funcoes__muted">—</span>;
    }

    const linhas = campos.map((campo) => {
      const mudanca = row.alteracoes?.[campo];
      return `${labelCampo(campo)}: ${formatarValor(mudanca?.antes)} → ${formatarValor(mudanca?.depois)}`;
    });

    const visiveis = campos.slice(0, 3);
    const rest = campos.length - visiveis.length;

    return (
      <div
        className="funcoes-epis-tags equipamentos-tooltip-target"
        data-pr-tooltip={linhas.join('\n')}
        data-pr-position="top"
        data-pr-mousetrack={true}
        data-pr-mousetracktop={15}
      >
        {visiveis.map((campo) => (
          <Tag key={campo} value={labelCampo(campo)} severity="info" className="funcoes-epis-tag" />
        ))}
        {rest > 0 && <Tag value={`+${rest}`} severity="secondary" className="funcoes-epis-more" />}
      </div>
    );
  };

  const detalheTemplate = (row: HistoricoAlteracaoProjetoItem) => {
    const campos = row.campos_alterados || [];
    if (campos.length === 0) return <span className="historico-funcoes__muted">—</span>;

    return (
      <ul className="historico-projeto__detalhe" style={{ margin: 0, paddingLeft: '1.1rem' }}>
        {campos.map((campo) => {
          const mudanca = row.alteracoes?.[campo];
          return (
            <li key={campo} style={{ marginBottom: '0.2rem' }}>
              <strong>{labelCampo(campo)}</strong>
              {': '}
              <span className="historico-funcoes__muted">{formatarValor(mudanca?.antes)}</span>
              {' → '}
              <span>{formatarValor(mudanca?.depois)}</span>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="historico-funcoes historico-projeto">
      <Toast ref={toast} />
      <Tooltip target=".equipamentos-tooltip-target" className="tooltip-preline" />

      <header className="historico-funcoes__intro" style={{ marginBottom: '0.75rem' }}>
        <span className="historico-funcoes__intro-icon" aria-hidden>
          <i className="pi pi-history" />
        </span>
        <div className="historico-funcoes__intro-copy">
          <span className="historico-funcoes__label">Auditoria</span>
          <p className="historico-funcoes__intro-text">
            Registro automático das mudanças nas configurações deste projeto (dados, operação,
            assinatura digital e status).
          </p>
        </div>
        <div className="historico-funcoes__chip" aria-label={`${registros.length} registros`}>
          <span className="historico-funcoes__chip-n">{registros.length}</span>
          <span className="historico-funcoes__chip-l">alterações</span>
        </div>
      </header>

      <CadastroSection variant="table" className="mb-0 historico-funcoes__secao">
        <header className="historico-mov__secao-head">
          <div className="historico-mov__secao-title">
            <span className="historico-mov__label">Registros</span>
            <span className="historico-mov__count">{filtrados.length}</span>
          </div>
          <span className="historico-mov__secao-hint">Mais recentes primeiro</span>
          <div className="historico-mov__secao-acoes">
            <Button
              type="button"
              icon="pi pi-refresh"
              className="p-button-sm p-button-text p-button-secondary"
              onClick={carregar}
              loading={loading}
              tooltip="Atualizar"
              aria-label="Atualizar histórico"
            />
            <span className="p-input-icon-left historico-mov__filtro">
              <i className="pi pi-search" />
              <InputText
                type="search"
                value={filtro}
                className="p-inputtext-sm"
                placeholder="Filtrar…"
                onChange={(e) => setFiltro(e.target.value)}
              />
            </span>
          </div>
        </header>

        <div className="cadastro-section__table-scroll historico-funcoes__scroll">
          <DataTable
            value={filtrados}
            loading={loading}
            className="p-datatable-sm historico-mov__table historico-funcoes__table"
            emptyMessage={
              <TableEmptyState
                icon="clipboard"
                dense
                title={filtro.trim() ? 'Nenhum resultado' : 'Nenhuma alteração registrada'}
                description={
                  filtro.trim()
                    ? 'Ajuste o filtro para ver outros registros.'
                    : 'Ao salvar mudanças nas configurações, elas aparecem aqui.'
                }
              />
            }
            paginator={filtrados.length > 10}
            rows={10}
            rowHover
            size="small"
          >
            <Column
              field="created_at"
              header="Quando"
              body={dataTemplate}
              style={{ width: '7.5rem' }}
            />
            <Column
              field="alterado_por_nome"
              header="Quem"
              body={(r: HistoricoAlteracaoProjetoItem) => (
                <span title={r.alterado_por_nome || undefined}>
                  {r.alterado_por_nome || 'Sistema'}
                </span>
              )}
              style={{ minWidth: '8rem' }}
            />
            <Column
              header="Campos"
              body={camposTemplate}
              style={{ minWidth: '10rem' }}
            />
            <Column
              header="Detalhe"
              body={detalheTemplate}
              style={{ minWidth: '14rem' }}
            />
          </DataTable>
        </div>
      </CadastroSection>
    </div>
  );
}
