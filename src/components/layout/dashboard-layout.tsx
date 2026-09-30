'use client';

import {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode} from 'react';
import {applyList, isEmptyLayout, moveInList, toggleHidden, withBlocks, withGrid, type DashboardLayout, type ListLayout} from '@/lib/layout/schema';
import {promoteUserLayout, resetUserLayout, saveUserLayout} from '@/app/(tenant)/[organizationSlug]/layout-actions';

export type BlockDefinition = {id: string; label: string};
export type LayoutActions = {save: typeof saveUserLayout; reset: typeof resetUserLayout; promote: typeof promoteUserLayout};
const serverActions: LayoutActions = {save: saveUserLayout, reset: resetUserLayout, promote: promoteUserLayout};
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

type LayoutContextValue = {
  editing: boolean;
  setEditing: (value: boolean) => void;
  personalized: boolean;
  canPromote: boolean;
  status: SaveStatus;
  message: string | null;
  blocks: BlockDefinition[];
  blockState: () => {order: string[]; hidden: Set<string>};
  moveBlock: (from: string, to: string) => void;
  toggleBlock: (id: string) => void;
  gridState: (gridId: string, known: string[]) => {order: string[]; hidden: Set<string>};
  moveInGrid: (gridId: string, known: string[], from: string, to: string) => void;
  toggleInGrid: (gridId: string, known: string[], id: string) => void;
  importGrid: (gridId: string, order: string[]) => void;
  hasGrid: (gridId: string) => boolean;
  reset: () => void;
  promote: () => void;
};

const LayoutContext = createContext<LayoutContextValue | null>(null);

export function useDashboardLayout() {
  return useContext(LayoutContext);
}

export function DashboardLayoutProvider({
  slug, scope, initialLayout, initialPersonalized, canPromote, blocks, defaultBlockOrder, actions = serverActions, children,
}: {
  slug: string;
  scope: string;
  initialLayout: DashboardLayout;
  initialPersonalized: boolean;
  canPromote: boolean;
  blocks: BlockDefinition[];
  defaultBlockOrder: string[];
  /** Injeção usada nos testes de interface; em produção são as ações do servidor. */
  actions?: LayoutActions;
  children: ReactNode;
}) {
  const [layout, setLayout] = useState(initialLayout);
  const [personalized, setPersonalized] = useState(initialPersonalized);
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(layout);
  const target = useRef({slug, scope, actions});
  target.current = {slug, scope, actions};

  // Ordem "de fábrica" dos blocos: a definida pela agência, com os blocos ausentes no fim.
  const knownBlocks = useMemo(() => {
    const ids = blocks.map((block) => block.id);
    return [...defaultBlockOrder.filter((id) => ids.includes(id)), ...ids.filter((id) => !defaultBlockOrder.includes(id))];
  }, [blocks, defaultBlockOrder]);

  const persist = useCallback((next: DashboardLayout) => {
    latest.current = next;
    setLayout(next);
    setPersonalized(!isEmptyLayout(next));
    setStatus('saving');
    setMessage(null);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      timer.current = null;
      try {
        const result = await actions.save(slug, scope, latest.current);
        setStatus(result.ok ? 'saved' : 'error');
        setMessage(result.ok ? null : result.message ?? 'Não foi possível salvar.');
      } catch {
        setStatus('error');
        setMessage('Não foi possível salvar. Verifique a conexão.');
      }
    }, 600);
  }, [slug, scope, actions]);

  // Ao sair da tela com uma alteração ainda no intervalo de espera, envia em vez de descartar.
  useEffect(() => () => {
    if (!timer.current) return;
    clearTimeout(timer.current);
    timer.current = null;
    const {slug: currentSlug, scope: currentScope, actions: currentActions} = target.current;
    void currentActions.save(currentSlug, currentScope, latest.current).catch(() => undefined);
  }, []);

  const value = useMemo<LayoutContextValue>(() => ({
    editing, setEditing, personalized, canPromote, status, message, blocks,
    blockState: () => applyList(knownBlocks, layout.blocks),
    moveBlock: (from, to) => persist(withBlocks(layout, moveInList(layout.blocks, knownBlocks, from, to))),
    toggleBlock: (id) => persist(withBlocks(layout, toggleHidden(layout.blocks, id, knownBlocks))),
    gridState: (gridId, known) => applyList(known, layout.grids[gridId]),
    moveInGrid: (gridId, known, from, to) => persist(withGrid(layout, gridId, moveInList(layout.grids[gridId], known, from, to))),
    toggleInGrid: (gridId, known, id) => persist(withGrid(layout, gridId, toggleHidden(layout.grids[gridId], id, known))),
    importGrid: (gridId, order) => persist(withGrid(layout, gridId, {order, hidden: layout.grids[gridId]?.hidden ?? []})),
    hasGrid: (gridId) => Boolean(layout.grids[gridId]),
    reset: async () => {
      if (timer.current) clearTimeout(timer.current);
      const empty: DashboardLayout = {grids: {}};
      latest.current = empty;
      setLayout(empty);
      setPersonalized(false);
      setStatus('saving');
      const result = await actions.reset(slug, scope).catch(() => ({ok: false, message: 'Não foi possível restaurar o padrão.'}));
      setStatus(result.ok ? 'saved' : 'error');
      setMessage(result.ok ? 'Layout padrão restaurado.' : result.message ?? null);
      if (result.ok) window.location.reload();
    },
    promote: async () => {
      setStatus('saving');
      const result = await actions.promote(slug, scope).catch(() => ({ok: false, message: 'Não foi possível definir o padrão.'}));
      setStatus(result.ok ? 'saved' : 'error');
      setMessage(result.message ?? null);
    },
  }), [editing, personalized, canPromote, status, message, blocks, knownBlocks, layout, persist, slug, scope, actions]);

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
}
