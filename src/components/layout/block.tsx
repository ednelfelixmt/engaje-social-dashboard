'use client';

import type {ReactNode} from 'react';
import {cn} from '@/lib/utils';
import {useDashboardLayout} from '@/components/layout/dashboard-layout';

/** Bloco da tela: aplica a ordem e a ocultação escolhidas pelo usuário (ou o padrão do cliente). */
export function Block({id, className, children}: {id: string; className?: string; children: ReactNode}) {
  const layout = useDashboardLayout();
  if (!layout) return <div className={className}>{children}</div>;
  const {order, hidden} = layout.blockState();
  const rank = order.indexOf(id);
  const isHidden = hidden.has(id);
  if (isHidden && !layout.editing) return null;
  return <div className={cn(className, isHidden && 'opacity-40 saturate-0')} style={{order: rank < 0 ? order.length : rank}} data-block={id}>{children}</div>;
}
