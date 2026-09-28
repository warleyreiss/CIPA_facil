import * as React from 'react';
import { useMemo, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { cn } from '../../lib/cn';

type PickListProps = {
  source?: any[];
  target?: any[];
  onChange?: (e: { source: any[]; target: any[] }) => void;
  itemTemplate?: (item: any) => React.ReactNode;
  sourceHeader?: React.ReactNode;
  targetHeader?: React.ReactNode;
  className?: string;
  dataKey?: string;
  filter?: boolean;
  filterBy?: string;
  sourceFilterPlaceholder?: string;
  targetFilterPlaceholder?: string;
  showSourceControls?: boolean;
  showTargetControls?: boolean;
  sourceStyle?: React.CSSProperties;
  targetStyle?: React.CSSProperties;
  breakpoint?: string;
  [key: string]: any;
};

function itemKey(item: any, dataKey: string | undefined, index: number) {
  if (dataKey && item && item[dataKey] != null) return String(item[dataKey]);
  return String(index);
}

function itemLabel(item: any) {
  return String(item?.descricao ?? item?.label ?? item?.nome ?? item?.nomenclatura ?? item ?? '');
}

function filterItems(items: any[], query: string, filterBy: string) {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) => {
    const raw = filterBy && item ? item[filterBy] : itemLabel(item);
    return String(raw ?? '').toLowerCase().includes(q);
  });
}

export function PickList({
  source = [],
  target = [],
  onChange,
  itemTemplate,
  sourceHeader = 'Disponíveis',
  targetHeader = 'Selecionados',
  className,
  dataKey = 'id',
  filter = false,
  filterBy = 'descricao',
  sourceFilterPlaceholder = 'Buscar…',
  targetFilterPlaceholder = 'Buscar…',
  sourceStyle,
  targetStyle,
}: PickListProps) {
  const [sourceQuery, setSourceQuery] = useState('');
  const [targetQuery, setTargetQuery] = useState('');

  const sourceFiltered = useMemo(
    () => (filter ? filterItems(source, sourceQuery, filterBy) : source),
    [filter, source, sourceQuery, filterBy],
  );
  const targetFiltered = useMemo(
    () => (filter ? filterItems(target, targetQuery, filterBy) : target),
    [filter, target, targetQuery, filterBy],
  );

  const moveToTarget = (item: any) => {
    onChange?.({
      source: source.filter((x) => x !== item),
      target: [...target, item],
    });
  };

  const moveToSource = (item: any) => {
    onChange?.({
      target: target.filter((x) => x !== item),
      source: [...source, item],
    });
  };

  const moveAllToTarget = () => {
    if (sourceFiltered.length === 0) return;
    const moving = new Set(sourceFiltered);
    onChange?.({
      source: source.filter((x) => !moving.has(x)),
      target: [...target, ...sourceFiltered],
    });
  };

  const moveAllToSource = () => {
    if (targetFiltered.length === 0) return;
    const moving = new Set(targetFiltered);
    onChange?.({
      target: target.filter((x) => !moving.has(x)),
      source: [...source, ...targetFiltered],
    });
  };

  const renderItem = (item: any, index: number, onItem: (item: any) => void, dir: 'to-target' | 'to-source') => (
    <button
      key={itemKey(item, dataKey, index)}
      type="button"
      className={cn('cepi-picklist__item', dir === 'to-target' ? 'cepi-picklist__item--add' : 'cepi-picklist__item--remove')}
      onClick={() => onItem(item)}
      title={dir === 'to-target' ? 'Incluir nos obrigatórios' : 'Remover dos obrigatórios'}
    >
      <span className="cepi-picklist__item-label">
        {itemTemplate ? itemTemplate(item) : itemLabel(item)}
      </span>
      <i
        className={cn('pi', dir === 'to-target' ? 'pi-plus' : 'pi-times')}
        aria-hidden
      />
    </button>
  );

  const Panel = ({
    tone,
    title,
    count,
    total,
    query,
    onQuery,
    placeholder,
    items,
    emptyLabel,
    onItem,
    dir,
    style,
  }: {
    tone: 'source' | 'target';
    title: React.ReactNode;
    count: number;
    total: number;
    query: string;
    onQuery: (v: string) => void;
    placeholder: string;
    items: any[];
    emptyLabel: string;
    onItem: (item: any) => void;
    dir: 'to-target' | 'to-source';
    style?: React.CSSProperties;
  }) => (
    <div className={cn('cepi-picklist__panel', `cepi-picklist__panel--${tone}`)}>
      <div className="cepi-picklist__panel-head">
        <span className="cepi-picklist__panel-title">{title}</span>
        <span className="cepi-picklist__panel-count" aria-label={`${count} de ${total}`}>
          {filter && query.trim() ? `${count}/${total}` : total}
        </span>
      </div>
      {filter && (
        <div className="cepi-picklist__filter">
          <i className="pi pi-search" aria-hidden />
          <input
            type="search"
            value={query}
            placeholder={placeholder}
            onChange={(e) => onQuery(e.target.value)}
            className="cepi-picklist__filter-input"
            aria-label={typeof title === 'string' ? `Buscar em ${title}` : 'Buscar'}
          />
        </div>
      )}
      <div className="cepi-picklist__list" style={style} role="listbox">
        {items.length === 0 ? (
          <div className="cepi-picklist__empty">{emptyLabel}</div>
        ) : (
          items.map((item, i) => renderItem(item, i, onItem, dir))
        )}
      </div>
    </div>
  );

  return (
    <div className={cn('cepi-picklist', className)}>
      <Panel
        tone="source"
        title={sourceHeader}
        count={sourceFiltered.length}
        total={source.length}
        query={sourceQuery}
        onQuery={setSourceQuery}
        placeholder={sourceFilterPlaceholder}
        items={sourceFiltered}
        emptyLabel={source.length === 0 ? 'Nenhum EPI disponível' : 'Nenhum resultado'}
        onItem={moveToTarget}
        dir="to-target"
        style={sourceStyle}
      />

      <div className="cepi-picklist__controls" aria-label="Mover itens">
        <Button
          type="button"
          size="icon-sm"
          variant="secondary"
          icon="pi pi-angle-right"
          className="cepi-picklist__transfer"
          disabled={sourceFiltered.length === 0}
          onClick={() => sourceFiltered[0] && moveToTarget(sourceFiltered[0])}
          title="Incluir primeiro da lista"
          aria-label="Incluir item"
        />
        <Button
          type="button"
          size="icon-sm"
          variant="secondary"
          icon="pi pi-angle-double-right"
          className="cepi-picklist__transfer"
          disabled={sourceFiltered.length === 0}
          onClick={moveAllToTarget}
          title="Incluir todos (filtrados)"
          aria-label="Incluir todos"
        />
        <Button
          type="button"
          size="icon-sm"
          variant="secondary"
          icon="pi pi-angle-double-left"
          className="cepi-picklist__transfer"
          disabled={targetFiltered.length === 0}
          onClick={moveAllToSource}
          title="Remover todos (filtrados)"
          aria-label="Remover todos"
        />
        <Button
          type="button"
          size="icon-sm"
          variant="secondary"
          icon="pi pi-angle-left"
          className="cepi-picklist__transfer"
          disabled={targetFiltered.length === 0}
          onClick={() => targetFiltered[0] && moveToSource(targetFiltered[0])}
          title="Remover primeiro da lista"
          aria-label="Remover item"
        />
      </div>

      <Panel
        tone="target"
        title={targetHeader}
        count={targetFiltered.length}
        total={target.length}
        query={targetQuery}
        onQuery={setTargetQuery}
        placeholder={targetFilterPlaceholder}
        items={targetFiltered}
        emptyLabel={target.length === 0 ? 'Nenhum obrigatório ainda' : 'Nenhum resultado'}
        onItem={moveToSource}
        dir="to-source"
        style={targetStyle}
      />
    </div>
  );
}
