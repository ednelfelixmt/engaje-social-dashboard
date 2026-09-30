/**
 * Layout do dashboard: ordem e visibilidade de blocos e de cards.
 * Módulo puro (sem servidor nem React), usado pelo cliente, pelas ações e pelos testes.
 */
export type ListLayout = {order: string[]; hidden: string[]};
export type DashboardLayout = {grids: Record<string, ListLayout>; blocks?: ListLayout};

const idPattern = /^[A-Za-z0-9:_.-]{1,64}$/;
export const MAX_IDS = 200;
export const MAX_GRIDS = 20;
export const scopePattern = /^[a-z0-9_-]{1,40}$/;

export const emptyLayout = (): DashboardLayout => ({grids: {}});

function ids(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item === 'string' && idPattern.test(item) && seen.size < MAX_IDS) seen.add(item);
  }
  return [...seen];
}

function list(value: unknown): ListLayout | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const order = ids(row.order);
  const hidden = ids(row.hidden);
  return order.length || hidden.length ? {order, hidden} : null;
}

/** Aceita qualquer JSON e devolve um layout válido e limitado; lixo vira layout vazio. */
export function parseLayout(value: unknown): DashboardLayout {
  const result = emptyLayout();
  if (!value || typeof value !== 'object' || Array.isArray(value)) return result;
  const raw = value as Record<string, unknown>;
  if (raw.grids && typeof raw.grids === 'object' && !Array.isArray(raw.grids)) {
    for (const [key, entry] of Object.entries(raw.grids as Record<string, unknown>).slice(0, MAX_GRIDS)) {
      const parsed = idPattern.test(key) ? list(entry) : null;
      if (parsed) result.grids[key] = parsed;
    }
  }
  const blocks = list(raw.blocks);
  if (blocks) result.blocks = blocks;
  return result;
}

export function isEmptyLayout(layout: DashboardLayout) {
  return !Object.keys(layout.grids).length && !layout.blocks;
}

/**
 * Aplica ordem e ocultação a uma lista de ids conhecidos. Ids salvos que não existem mais
 * são ignorados e ids novos (ativados depois pela agência) entram no fim, visíveis.
 */
export function applyList(known: string[], layout?: ListLayout | null): {order: string[]; hidden: Set<string>} {
  const knownSet = new Set(known);
  const saved = (layout?.order ?? []).filter((id) => knownSet.has(id));
  const order = [...saved, ...known.filter((id) => !saved.includes(id))];
  const hidden = new Set((layout?.hidden ?? []).filter((id) => knownSet.has(id)));
  return {order, hidden};
}

/** Layout efetivo: o pessoal tem prioridade sobre o padrão do cliente, escopo a escopo. */
export function effectiveLayout(personal: unknown, clientDefault: unknown): {layout: DashboardLayout; personalized: boolean} {
  const mine = parseLayout(personal);
  if (!isEmptyLayout(mine)) return {layout: mine, personalized: true};
  return {layout: parseLayout(clientDefault), personalized: false};
}

export function withGrid(layout: DashboardLayout, key: string, next: ListLayout): DashboardLayout {
  return {...layout, grids: {...layout.grids, [key]: next}};
}

export function withBlocks(layout: DashboardLayout, next: ListLayout): DashboardLayout {
  return {...layout, blocks: next};
}

export function toggleHidden(current: ListLayout | undefined, id: string, known: string[]): ListLayout {
  const base = applyList(known, current);
  const hidden = new Set(base.hidden);
  if (hidden.has(id)) hidden.delete(id); else hidden.add(id);
  return {order: base.order, hidden: [...hidden]};
}

export function moveInList(current: ListLayout | undefined, known: string[], from: string, to: string): ListLayout {
  const base = applyList(known, current);
  const order = [...base.order];
  const a = order.indexOf(from), b = order.indexOf(to);
  if (a < 0 || b < 0 || a === b) return {order: base.order, hidden: [...base.hidden]};
  order.splice(a, 1);
  order.splice(b, 0, from);
  return {order, hidden: [...base.hidden]};
}
