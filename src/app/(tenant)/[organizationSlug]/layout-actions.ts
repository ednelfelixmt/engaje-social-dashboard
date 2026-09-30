'use server';

import {z} from 'zod';
import {revalidatePath} from 'next/cache';
import {editorAccess, tenant} from '@/lib/auth/session';
import {isEmptyLayout, parseLayout, scopePattern, type DashboardLayout} from '@/lib/layout/schema';
import type {Json} from '@/types/database.types';

export type LayoutResult = {ok: boolean; message?: string};

const target = z.object({slug: z.string().min(1).max(80), scope: z.string().regex(scopePattern)});

export async function saveUserLayout(slug: string, scope: string, raw: unknown): Promise<LayoutResult> {
  const parsedTarget = target.safeParse({slug, scope});
  if (!parsedTarget.success) return {ok: false, message: 'Tela inválida.'};
  const {db, org, user} = await tenant(parsedTarget.data.slug);
  const layout = parseLayout(raw);
  // Layout vazio equivale a "restaurar padrão": remove a linha em vez de gravar um objeto vazio.
  if (isEmptyLayout(layout)) return resetUserLayout(slug, scope);
  const {error} = await db.from('user_dashboard_layouts').upsert(
    {user_id: user.id, organization_id: org.id, scope: parsedTarget.data.scope, layout: layout as unknown as Json},
    {onConflict: 'user_id,organization_id,scope'},
  );
  return error ? {ok: false, message: 'Não foi possível salvar a sua visão.'} : {ok: true};
}

export async function resetUserLayout(slug: string, scope: string): Promise<LayoutResult> {
  const parsedTarget = target.safeParse({slug, scope});
  if (!parsedTarget.success) return {ok: false, message: 'Tela inválida.'};
  const {db, org, user} = await tenant(parsedTarget.data.slug);
  const {error} = await db.from('user_dashboard_layouts').delete().eq('user_id', user.id).eq('organization_id', org.id).eq('scope', parsedTarget.data.scope);
  return error ? {ok: false, message: 'Não foi possível restaurar o padrão.'} : {ok: true};
}

/** Promove a visão pessoal do editor/admin a padrão de todos os usuários do cliente nesta tela. */
export async function promoteUserLayout(slug: string, scope: string): Promise<LayoutResult> {
  const parsedTarget = target.safeParse({slug, scope});
  if (!parsedTarget.success) return {ok: false, message: 'Tela inválida.'};
  const {db, org, user, canEdit} = await editorAccess(parsedTarget.data.slug);
  if (!canEdit) return {ok: false, message: 'Somente editores e administradores definem o padrão do cliente.'};
  const [{data: mine}, {data: config}] = await Promise.all([
    db.from('user_dashboard_layouts').select('layout').eq('user_id', user.id).eq('organization_id', org.id).eq('scope', parsedTarget.data.scope).maybeSingle(),
    db.from('dashboard_configs').select('default_layouts').eq('organization_id', org.id).single(),
  ]);
  const layout: DashboardLayout = parseLayout(mine?.layout);
  if (isEmptyLayout(layout)) return {ok: false, message: 'Personalize a tela antes de definir o padrão do cliente.'};
  const current = config?.default_layouts && typeof config.default_layouts === 'object' && !Array.isArray(config.default_layouts) ? config.default_layouts : {};
  const next = {...current, [parsedTarget.data.scope]: layout} as unknown as Json;
  const {error} = await db.from('dashboard_configs').update({default_layouts: next}).eq('organization_id', org.id);
  if (error) return {ok: false, message: 'Não foi possível definir o padrão do cliente.'};
  revalidatePath('/' + org.slug, 'layout');
  return {ok: true, message: 'Esta visão agora é o padrão do cliente.'};
}
