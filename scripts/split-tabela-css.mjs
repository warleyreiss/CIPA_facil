import fs from 'fs';
import path from 'path';

/**
 * Migração inicial: fatia public/tabela-showcase.css em src/assets/css/listas/.
 * Após a migração, o showcase usa app.css + tabela-showcase.css (só layout).
 * Edite os módulos em listas/ diretamente; não reexecute sem restaurar o CSS completo.
 */

const SHOWCASE = 'C:/Users/warle/OneDrive/Desktop/Controle_EPI_Web/public/tabela-showcase.css';
const LISTAS = path.resolve('src/assets/css/listas');

const lines = fs.readFileSync(SHOWCASE, 'utf8').split(/\r?\n/);

function slice(start, end) {
  return lines.slice(start - 1, end).join('\n');
}

function write(file, content, title) {
  const body = `/* ${title} */\n\n${content.trim()}\n`;
  fs.writeFileSync(path.join(LISTAS, file), body);
  console.log('wrote', file);
}

// Sections from tabela-showcase.css (1-based line numbers)
write('card.css', slice(252, 293), 'Listas — card-table, container, título');
write('tabelas.css', [slice(295, 389), slice(391, 478)].join('\n\n'), 'Listas — DataTable, colunas, linhas, frozen');
write(
  'cabecalho.css',
  [slice(480, 544), slice(773, 792)].join('\n\n'),
  'Listas — toolbar, busca, filtros Controle EPI'
);

// Ações: botões da toolbar (escopados) + coluna de ações
const botoesToolbar = slice(546, 637)
  .replace(/^\.p-button-sm/gm, '.header-table .p-button-sm, .historico-fornecimento-toolbar__actions .p-button-sm, .tabela-empty-action .p-button-sm, .movimentacao-epi-filtro .p-button-sm, .esocial-toolbar__acoes .p-button-sm, .consulta-ca-avulsa__acoes .p-button-sm, .fornecedores-epi-form .p-button-sm')
  .replace(/^\.p-button-success/gm, '.header-table .p-button-success, .historico-fornecimento-toolbar__actions .p-button-success, .tabela-empty-action .p-button-success, .movimentacao-epi-filtro .p-button-success, .esocial-toolbar__acoes .p-button-success, .consulta-ca-avulsa__acoes .p-button-success, .fornecedores-epi-form .p-button-success')
  .replace(/^\.p-button-secondary/gm, '.header-table .p-button-secondary, .historico-fornecimento-toolbar__actions .p-button-secondary')
  .replace(/^\.p-button-outlined/gm, '.header-table .p-button-outlined, .historico-fornecimento-toolbar__actions .p-button-outlined, .tabela-empty-action .p-button-outlined')
  .replace(/^\.p-button-text/gm, '.header-table .p-button-text')
  .replace(/^\.p-button:disabled/gm, '.header-table .p-button:disabled, .historico-fornecimento-toolbar__actions .p-button:disabled');

write('acoes.css', [botoesToolbar, slice(639, 683)].join('\n\n'), 'Listas — botões toolbar e coluna ações');

write('celulas.css', [slice(685, 771), slice(897, 913)].join('\n\n'), 'Listas — tags, badges e células');
write('rodape.css', [slice(794, 895), slice(915, 983)].join('\n\n'), 'Listas — paginador, footer, loading, empty');
write('movimentacao.css', slice(985, 1033), 'Listas — movimentação EPI dual panel');
write('historico-fornecimento.css', slice(1035, 1140), 'Listas — histórico fornecimento');
write('fornecedores.css', slice(1142, 1164), 'Listas — fornecedores embarcado');
write('consulta-ca-avulsa.css', slice(1166, 1292), 'Listas — consulta CA avulsa');
write('controle-epi-extras.css', slice(1294, 1395), 'Listas — menu extras sidebar');
write('esocial-tabela.css', slice(1397, 1424), 'Listas — tabela eSocial');
write('compacta.css', slice(1579, 1594), 'Listas — tabela compacta em sidebar');
write('utilities.css', slice(976, 983), 'Listas — utilitários tabela-util-*');

const responsive = `/* Responsivo — listas */
@media (max-width: 992px) {
  .movimentacao-epi-panels {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .card-table {
    margin: var(--sp-2, 4px);
  }

  .header-table {
    flex-direction: column;
    align-items: stretch;
  }

  .p-inputtext-table .p-inputtext,
  .header-table .p-input-icon-left .p-inputtext {
    width: 100%;
    min-width: unset;
  }

  .container-tabela-full {
    height: calc(100vh - 60px);
  }

  .p-datatable-thead th,
  .p-datatable-tbody td {
    padding: 0.3125rem var(--sp-3);
  }
}

@media (max-width: 640px) {
  .consulta-ca-avulsa__resultado-head {
    flex-direction: column;
    align-items: flex-start;
  }
}`;

write('responsive.css', responsive, 'Listas — responsivo');

// Legado: recursos-adicionais tab + container full height + tiered menu
const legado = fs.readFileSync(path.join(LISTAS, 'cabecalho.css'), 'utf8');
const cardLegado = `
.container-tabela-full {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 70px);
  overflow: hidden;
  gap: var(--sp-3);
}

.card-table-adicionais .p-datatable-table {
  border-top: 3px solid var(--table-tab-bg) !important;
}

.p-datatable-header .recursos-adicionais {
  background-color: var(--table-tab-bg);
  border-radius: var(--fr) var(--fr) 0 0;
  padding: 10px 16px;
  position: relative;
  display: inline-flex;
  align-items: center;
  margin-bottom: 0;
  color: #f8fafc;
  font-size: var(--font-sm);
  font-weight: 500;
}

.recursos-adicionais::before,
.recursos-adicionais::after {
  content: "";
  position: absolute;
  bottom: 0;
  width: 16px;
  height: 16px;
  background-color: transparent;
  pointer-events: none;
}

.recursos-adicionais::before {
  left: -16px;
  border-bottom-right-radius: var(--fr);
  box-shadow: 8px 0 0 0 var(--table-tab-bg);
}

.recursos-adicionais::after {
  right: -16px;
  border-bottom-left-radius: var(--fr);
  box-shadow: -8px 0 0 0 var(--table-tab-bg);
}

.p-datatable-custom.p-datatable {
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
  min-height: 0;
}

.p-datatable-custom .p-datatable-wrapper {
  flex: 1;
  min-height: 0;
}

.card-table--split .p-datatable {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.splitbutton-filtro {
  display: none !important;
}

.datatable-row--clickable {
  cursor: pointer;
}
`;

fs.writeFileSync(
  path.join(LISTAS, 'card.css'),
  `/* Listas — card-table, container, título */\n\n${slice(252, 293).trim()}\n\n${cardLegado.trim()}\n`
);

const tieredMenu = `
.header-table-tieredMenu.p-tieredmenu {
  background: var(--surface) !important;
  border: 1px solid var(--border) !important;
  border-radius: var(--fr) !important;
  box-shadow: none !important;
  padding: 6px !important;
  min-width: 200px !important;
}

.header-table-tieredMenu .p-menuitem-content {
  border-radius: var(--fr) !important;
  transition: background var(--ft) !important;
}

.header-table-tieredMenu .p-menuitem-link {
  padding: 0.55rem 0.75rem !important;
  gap: 0.5rem !important;
  color: var(--text-1) !important;
}

.header-table-tieredMenu .p-menuitem-content:hover {
  background: var(--green-ghost) !important;
}

.header-table-tieredMenu .p-menuitem-content:hover .p-menuitem-text,
.header-table-tieredMenu .p-menuitem-content:hover .p-menuitem-icon {
  color: var(--green-hover) !important;
}

.header-table-tieredMenu .pi-file-excel {
  color: var(--green) !important;
}

.header-table-split-title {
  font-size: var(--ffs);
  font-weight: 700;
  color: var(--text-1);
  margin-right: auto;
  letter-spacing: -0.01em;
}

.tabela-row-interactive {
  cursor: pointer;
}

.p-datatable .p-datatable-tbody > tr.p-datatable-emptymessage > td {
  position: relative;
  height: 320px;
  background: transparent !important;
  border: none !important;
}

.tabela-info {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  width: 100%;
  max-width: 360px;
  padding: 24px;
  pointer-events: auto;
}
`;

fs.appendFileSync(path.join(LISTAS, 'cabecalho.css'), `\n\n${tieredMenu.trim()}\n`);

// p-datatable-tbody empty inside datatable
fs.appendFileSync(
  path.join(LISTAS, 'rodape.css'),
  `
.p-datatable .p-datatable-emptymessage td {
  padding: 48px 24px;
  text-align: center;
  color: var(--text-3);
}
`
);

console.log('done');
