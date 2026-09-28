import * as React from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/cn';
import { cepi } from '../../lib/cepi-ui';
import { BP_MOBILE, useMediaQuery } from '../../hooks/useMediaQuery';
import { Button } from './Button';
import { Input } from './Input';
import { Select } from './Select';

export type DataTableColumn<T = any> = {
  field?: string;
  header?: React.ReactNode;
  body?: (row: T) => React.ReactNode;
  /** Valor textual para exportação CSV (prioritário sobre field/body). */
  exportBody?: (row: T) => string | number | null | undefined;
  sortable?: boolean;
  frozen?: boolean;
  alignFrozen?: 'left' | 'right';
  style?: React.CSSProperties;
  className?: string;
  headerClassName?: string;
  [key: string]: any;
};

export interface DataTableProps<T = any> {
  value?: T[];
  columns?: DataTableColumn<T>[];
  children?: React.ReactNode;
  loading?: boolean;
  paginator?: boolean;
  rows?: number;
  rowsPerPageOptions?: number[];
  globalFilter?: string;
  onGlobalFilterChange?: (v: string) => void;
  emptyMessage?: React.ReactNode;
  className?: string;
  tableClassName?: string;
  tableStyle?: React.CSSProperties;
  scrollable?: boolean;
  scrollHeight?: string;
  rowHover?: boolean;
  size?: 'small' | 'normal';
  onRowClick?: (e: { data: T; originalEvent: React.MouseEvent }) => void;
  /** Classe da linha — string fixa ou função por registro. */
  rowClassName?: string | ((data: T) => string | undefined | null);
  header?: React.ReactNode;
  /** Conteúdo à esquerda do rodapé (ex.: link de ajuda). */
  footerStart?: React.ReactNode;
  sortField?: string;
  sortOrder?: 1 | -1 | 0 | null;
  resizableColumns?: boolean;
  columnResizeMode?: string;
  showGridlines?: boolean;
  stripedRows?: boolean;
  [key: string]: any;
}

/** Campos no estilo Prime (`cargo_funcoes.nomenclatura`, `ghe.descricao`). */
function resolveFieldData(data: Record<string, unknown>, field?: string): unknown {
  if (!field || data == null) return undefined;
  if (!field.includes('.')) return data[field];
  return field.split('.').reduce<unknown>((obj, key) => {
    if (obj == null || typeof obj !== 'object') return undefined;
    return (obj as Record<string, unknown>)[key];
  }, data);
}

function headerToExportLabel(header: React.ReactNode, fallback?: string): string {
  if (typeof header === 'string' || typeof header === 'number') return String(header);
  return fallback || 'Coluna';
}

function escaparCsv(valor: unknown): string {
  const texto = valor === null || valor === undefined ? '' : String(valor);
  if (/[;"\n\r]/.test(texto)) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

function valorExportavelCelula<T>(col: DataTableColumn<T>, row: T): string {
  if (col.exportBody) {
    const v = col.exportBody(row);
    return v == null ? '' : String(v);
  }
  if (col.field) {
    const v = resolveFieldData(row as Record<string, unknown>, col.field);
    if (v == null) return '';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  }
  if (col.body) {
    const rendered = col.body(row);
    if (typeof rendered === 'string' || typeof rendered === 'number') return String(rendered);
  }
  return '';
}

function baixarCsv(conteudo: string, fileName: string) {
  const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.csv') ? fileName : `${fileName}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function estimarLarguraFrozenRem(col: DataTableColumn<any>): number {
  const header = typeof col.header === 'string' ? col.header : '';
  if (header === 'Ações' || header === 'Acao' || header === 'Ação' || (!col.field && col.body)) {
    return 5.75;
  }
  if (
    col.field === 'status_prazo' ||
    header === 'Status' ||
    String(col.headerClassName || '').includes('status')
  ) {
    return 6.5;
  }
  return 7;
}

/** Deslocamento `right` (rem) para colunas frozen à direita, empilhadas da borda. */
function offsetFrozenRightRem(cols: DataTableColumn<any>[], colIndex: number): number | null {
  const frozen = cols
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => c.frozen && c.alignFrozen !== 'left');
  const pos = frozen.findIndex((f) => f.i === colIndex);
  if (pos < 0) return null;
  let offset = 0;
  for (let k = pos + 1; k < frozen.length; k++) {
    offset += estimarLarguraFrozenRem(frozen[k].c);
  }
  return offset;
}

function columnsFromChildren<T>(children: React.ReactNode): DataTableColumn<T>[] {
  const cols: DataTableColumn<T>[] = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    const p = child.props as DataTableColumn<T>;
    cols.push(p);
  });
  return cols;
}

export function Column(_props: DataTableColumn<any>) {
  return null;
}

export interface DataTableRef {
  exportCSV: (options?: any) => void;
  [key: string]: any;
}

function DataTableInner<T extends Record<string, any>>(
  {
    value = [],
    columns: columnsProp,
    children,
    loading,
    paginator,
    rows = 10,
    rowsPerPageOptions = [10, 20, 50],
    globalFilter,
    emptyMessage = 'Nenhum registro encontrado',
    className,
    tableClassName,
    tableStyle,
    scrollable,
    scrollHeight,
    rowHover = true,
    size = 'small',
    onRowClick,
    rowClassName,
    header,
    footerStart,
    sortField,
    sortOrder,
  }: DataTableProps<T>,
  ref: React.ForwardedRef<DataTableRef>,
) {
  const cols = columnsProp ?? columnsFromChildren<T>(children);
  const isMobile = useMediaQuery(BP_MOBILE);
  const [sorting, setSorting] = React.useState<SortingState>(() =>
    sortField ? [{ id: sortField, desc: sortOrder === -1 }] : [],
  );
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: rows,
  });

  React.useEffect(() => {
    setPagination((p) => (p.pageSize === rows ? p : { pageIndex: 0, pageSize: rows }));
  }, [rows]);

  React.useEffect(() => {
    setPagination((p) => (p.pageIndex === 0 ? p : { ...p, pageIndex: 0 }));
  }, [globalFilter]);

  const columnDefs = React.useMemo<ColumnDef<T, any>[]>(
    () =>
      cols.map((c, i) => {
        const base: ColumnDef<T, unknown> = {
          id: c.field || `col-${i}`,
          header: () => c.header,
          cell: ({ row }) =>
            c.body
              ? c.body(row.original)
              : c.field
                ? (resolveFieldData(row.original, c.field) as React.ReactNode)
                : null,
          enableSorting: !!c.sortable,
          meta: c,
        };
        if (c.field?.includes('.')) {
          return {
            ...base,
            accessorFn: (row: T) => resolveFieldData(row, c.field),
          } as ColumnDef<T, unknown>;
        }
        if (c.field) {
          return { ...base, accessorKey: c.field } as ColumnDef<T, unknown>;
        }
        return base;
      }),
    [cols],
  );

  const table = useReactTable({
    data: value,
    columns: columnDefs,
    state: {
      sorting,
      globalFilter,
      pagination,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: 'includesString',
    autoResetPageIndex: false,
  });

  const frozenRightOffsets = cols.map((_, i) => offsetFrozenRightRem(cols, i));
  const totalRegistros = table.getFilteredRowModel().rows.length;
  const pageCount = Math.max(1, table.getPageCount());
  const { pageIndex, pageSize } = pagination;
  const de = totalRegistros === 0 ? 0 : pageIndex * pageSize + 1;
  const ate = Math.min((pageIndex + 1) * pageSize, totalRegistros);

  React.useEffect(() => {
    const maxIndex = Math.max(0, table.getPageCount() - 1);
    if (pagination.pageIndex > maxIndex) {
      setPagination((p) => ({ ...p, pageIndex: maxIndex }));
    }
  }, [totalRegistros, pagination.pageIndex, pagination.pageSize, table]);

  React.useImperativeHandle(
    ref,
    () => ({
      exportCSV: (options?: { fileName?: string; selectionOnly?: boolean }) => {
        const exportCols = cols.filter((c) => {
          if (c.exportable === false) return false;
          const header = typeof c.header === 'string' ? c.header : '';
          if (header === 'Ações' || header === 'Acao' || header === 'Ação') return false;
          return Boolean(c.field || c.exportBody);
        });
        if (exportCols.length === 0) return;

        const dataRows = table.getPrePaginationRowModel().rows.map((r) => r.original);
        if (dataRows.length === 0) return;

        const headerLine = exportCols
          .map((c) => escaparCsv(headerToExportLabel(c.header, c.field)))
          .join(';');
        const bodyLines = dataRows.map((row) =>
          exportCols.map((c) => escaparCsv(valorExportavelCelula(c, row))).join(';'),
        );
        const csv = `\uFEFF${[headerLine, ...bodyLines].join('\n')}`;
        const stamp = new Date().toISOString().slice(0, 10);
        baixarCsv(csv, options?.fileName || `exportacao-${stamp}`);
      },
    }),
    [cols, table],
  );

  const flexFill = scrollHeight === 'flex' || scrollHeight === '100%';
  const scrollBody = flexFill || scrollable;

  // Mobile: sem colunas frozen (elas esmagam o viewport) + minWidth proporcional às colunas
  const resolvedTableStyle = React.useMemo<React.CSSProperties>(() => {
    if (!isMobile) return tableStyle ?? {};
    const colCount = Math.max(cols.length, 1);
    const mobileMin = `${Math.max(colCount * 6.5, 28)}rem`;
    return {
      ...(tableStyle ?? {}),
      minWidth: mobileMin,
      width: 'max-content',
    };
  }, [isMobile, tableStyle, cols.length]);

  return (
    <div
      className={cn(
        cepi.table.shell,
        'p-datatable',
        flexFill && 'p-datatable-flex cepi-table-shell--flex',
        (size === 'small' || className?.includes('p-datatable-sm')) && 'cepi-table-shell--compact',
        !rowHover && 'cepi-table-shell--no-hover',
        isMobile && 'cepi-table-shell--mobile',
        className,
      )}
    >
      {header ? <div className={cn(cepi.table.toolbar, 'p-datatable-header')}>{header}</div> : null}
      <div
        className={cn(
          'cepi-table-scroll',
          scrollBody && 'overflow-auto',
          flexFill && 'min-h-0 flex-1',
        )}
        style={
          !flexFill && scrollHeight && scrollHeight !== 'flex'
            ? { maxHeight: scrollHeight }
            : undefined
        }
      >
        <table className={cn(cepi.table.table, tableClassName)} style={resolvedTableStyle}>
          <thead className={cepi.table.thead}>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h, headerIndex) => {
                  const meta = h.column.columnDef.meta as DataTableColumn<T> | undefined;
                  const sorted = h.column.getIsSorted();
                  const isStatusHead = meta?.headerClassName?.includes('cepi-table__th--status');
                  const frozenRightPx = frozenRightOffsets[headerIndex];
                  const stickyRight = !isMobile && meta?.frozen && meta.alignFrozen !== 'left';
                  const stickyLeft = !isMobile && meta?.frozen && meta.alignFrozen === 'left';
                  return (
                    <th
                      key={h.id}
                      style={{
                        ...meta?.style,
                        ...(isMobile && !meta?.style?.minWidth && !meta?.style?.width
                          ? { minWidth: '6.5rem' }
                          : null),
                        ...(isMobile && (meta?.header === 'Ações' || (!meta?.field && !!meta?.body))
                          ? { minWidth: '5.5rem', width: '1%' }
                          : null),
                        ...(stickyRight && frozenRightPx != null
                          ? { right: `${frozenRightPx}rem` }
                          : null),
                      }}
                      className={cn(
                        cepi.table.th,
                        stickyRight && 'sticky z-[2] bg-[var(--table-head-bg)] shadow-[-1px_0_0_0_var(--border)]',
                        stickyLeft && 'sticky left-0 z-[2] bg-[var(--table-head-bg)]',
                        meta?.headerClassName,
                        h.column.getCanSort() && 'cursor-pointer select-none hover:text-text-1',
                      )}
                      onClick={h.column.getToggleSortingHandler()}
                    >
                      <span
                        className={cn(
                          'cepi-table__th-inner flex w-full items-center gap-1',
                          isStatusHead ? 'justify-center' : 'justify-start',
                        )}
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {h.column.getCanSort() ? (
                          sorted === 'asc' ? (
                            <ArrowUp className="h-3.5 w-3.5 shrink-0" />
                          ) : sorted === 'desc' ? (
                            <ArrowDown className="h-3.5 w-3.5 shrink-0" />
                          ) : (
                            <ArrowUpDown className="h-3.5 w-3.5 shrink-0 opacity-40" />
                          )
                        ) : null}
                      </span>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={cols.length} className={cepi.table.empty}>
                  Carregando...
                </td>
              </tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={cols.length} className={cepi.table.empty}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => {
                const rowTone =
                  typeof rowClassName === 'function'
                    ? rowClassName(row.original)
                    : rowClassName;
                return (
                <tr
                  key={row.id}
                  className={cn(cepi.table.row, onRowClick && 'cursor-pointer', rowTone)}
                  onClick={(e) => {
                    const target = e.target as HTMLElement | null;
                    if (
                      target?.closest(
                        'button, a, input, textarea, select, label, .cepi-table-actions, [data-row-click-ignore]',
                      )
                    ) {
                      return;
                    }
                    onRowClick?.({ data: row.original, originalEvent: e });
                  }}
                >
                  {row.getVisibleCells().map((cell, cellIndex) => {
                    const meta = cell.column.columnDef.meta as DataTableColumn<T> | undefined;
                    const isActionsCell =
                      (!meta?.field || meta?.header === 'Ações') && !!meta?.body;
                    const isEquipamentosCell = meta?.header === 'Equipamentos Vinculados';
                    const frozenRightPx = frozenRightOffsets[cellIndex];
                    const stickyRight = !isMobile && meta?.frozen && meta.alignFrozen !== 'left';
                    const stickyLeft = !isMobile && meta?.frozen && meta.alignFrozen === 'left';
                    return (
                      <td
                        key={cell.id}
                        style={{
                          ...meta?.style,
                          ...(isMobile && !meta?.style?.minWidth && !meta?.style?.width
                            ? { minWidth: '6.5rem' }
                            : null),
                          ...(isMobile && isActionsCell
                            ? { minWidth: '5.5rem', width: '1%' }
                            : null),
                          ...(stickyRight && frozenRightPx != null
                            ? { right: `${frozenRightPx}rem` }
                            : null),
                        }}
                        className={cn(
                          cepi.table.td,
                          isActionsCell ? 'cepi-table__td--actions' : undefined,
                          isEquipamentosCell ? 'cepi-table__td--wrap' : undefined,
                          stickyRight && 'sticky z-[1] bg-surface shadow-[-1px_0_0_0_var(--border)]',
                          stickyLeft && 'sticky left-0 z-[1] bg-surface',
                          meta?.className,
                          meta?.frozen && !isMobile && 'w-[1%] whitespace-nowrap',
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {(paginator || footerStart) ? (
        <div className={cn(cepi.table.footer, 'p-paginator cepi-table__footer--compact')}>
          {footerStart ? (
            <div className="cepi-table__footer-start">{footerStart}</div>
          ) : (
            <span className="cepi-table__footer-start" aria-hidden />
          )}

          {paginator ? (
            <div className="cepi-table__pager">
              <span className="cepi-table__pager-total" title="Registros no filtro atual">
                {totalRegistros === 0 ? (
                  '0 registros'
                ) : (
                  <>
                    <span className="cepi-table__pager-sep">Registro</span>
                    <strong>
                      {de}–{ate}
                    </strong>
                    <span className="cepi-table__pager-sep">de</span>
                    <strong>{totalRegistros}</strong>
                  </>
                )}
              </span>

              <span className="cepi-table__pager-divider" aria-hidden />

              <div className="cepi-table__pager-nav">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  disabled={!table.getCanPreviousPage()}
                  onClick={() => table.previousPage()}
                  aria-label="Página anterior"
                  icon={<ChevronLeft className="h-3.5 w-3.5" />}
                />
                <span className="cepi-table__pager-page">
                  {pageIndex + 1}/{pageCount}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  disabled={!table.getCanNextPage()}
                  onClick={() => table.nextPage()}
                  aria-label="Próxima página"
                  icon={<ChevronRight className="h-3.5 w-3.5" />}
                />
              </div>

              <span className="cepi-table__pager-divider" aria-hidden />

              <label className="cepi-table__pager-rows">
                <span className="cepi-table__pager-rows-label">Itens/pág.</span>
                <Select
                  value={pageSize}
                  options={rowsPerPageOptions.map((n) => ({ label: String(n), value: n }))}
                  onChange={(e) => {
                    setPagination({ pageIndex: 0, pageSize: Number(e.value) });
                  }}
                  className="cepi-table__pager-select"
                />
              </label>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export const DataTable = React.forwardRef(DataTableInner) as <T extends Record<string, any> = any>(
  props: DataTableProps<T> & { ref?: React.Ref<DataTableRef> },
) => React.ReactElement | null;

/** Allows `useRef<DataTable>(null)` / `useRef<DataTable<Row>>(null)` alongside the component. */
export type DataTable<_T = any> = DataTableRef;

export function DataTableSearch({
  value,
  onChange,
  placeholder = 'Buscar...',
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn('max-w-xs', className)}
    />
  );
}
