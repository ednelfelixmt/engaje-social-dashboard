'use client';

import Link from 'next/link';
import {usePathname, useRouter} from 'next/navigation';
import {Activity, Building2, ChartNoAxesCombined, Crown, Database, Facebook, Filter, Images, Instagram, LayoutDashboard, Leaf, LogOut, Palette, Plug, Settings, Users, Youtube} from 'lucide-react';
import {browserClient} from '@/lib/supabase/browser';
import {platformDashboards} from '@/lib/metrics/platforms';
import type {Platform} from '@/types/domain';

const icons = {meta_ads: ChartNoAxesCombined, google_ads: ChartNoAxesCombined, tiktok_ads: Activity, facebook_organic: Facebook, instagram_organic: Instagram, tiktok_organic: Activity, youtube: Youtube, google_business: Building2} as const;
const mainItems = [['overview', 'Visão geral', LayoutDashboard], ['paid', 'Tráfego pago', ChartNoAxesCombined], ['funnel', 'Funil de vendas', Filter], ['organic', 'Tráfego orgânico', Leaf], ['creatives', 'Criativos & posts', Images], ['external', 'Dados externos', Database]] as const;
const settingsItems = [['settings/branding', 'Personalização', Palette], ['settings/dashboard', 'Configurar dashboard', Settings], ['settings/integrations', 'Integradores', Plug]] as const;

export function Navigation({slug, admin = false, enabled = [], availablePlatforms = []}: {slug?: string; admin?: boolean; enabled?: string[]; availablePlatforms?: Platform[]}) {
  const path = usePathname();
  const router = useRouter();
  const available = new Set(availablePlatforms);
  const platformItems = platformDashboards
    .filter((item) => available.has(item.platform) && enabled.includes(item.group))
    .map((item) => [item.route, item.label, icons[item.platform]] as const);
  const list = admin
    ? [['admin', 'Visão da agência', LayoutDashboard], ['admin/organizations', 'Clientes', Building2], ['admin/users', 'Usuários', Users], ['admin/integrations', 'Integrações', Plug]] as const
    : [...mainItems.filter(([key]) => enabled.includes(key)), ...platformItems, ...settingsItems];

  return <aside className="sticky top-0 z-40 flex w-full flex-col border-b border-white/[.08] bg-[#090d15]/95 backdrop-blur-xl lg:fixed lg:inset-y-0 lg:w-[272px] lg:border-b-0 lg:border-r">
    <Link href="/" className="flex items-center gap-3 px-5 py-4 lg:px-6 lg:py-7"><span className="grid size-10 place-items-center rounded-2xl border border-primary/25 bg-primary/10 shadow-[0_0_30px_rgb(var(--primary-rgb)/.08)]"><Crown className="text-primary" size={21} /></span><div><strong className="block tracking-[-.025em]">Engaje Mídia Hub</strong><p className="muted mt-0.5 text-[8px] font-bold tracking-[.16em]">MARKETING INTELLIGENCE</p></div></Link>
    <div className="hidden px-6 lg:block"><div className="h-px bg-gradient-to-r from-primary/40 via-white/10 to-transparent" /></div>
    <p className="eyebrow hidden px-7 pb-3 pt-7 lg:block">{admin ? 'AGÊNCIA' : 'WORKSPACE'}</p>
    <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-y-auto lg:px-4 lg:pb-5">{list.map(([key, label, Icon]) => {
      const href = admin ? `/${key}` : `/${slug}/${key}`;
      const isPlatform = platformItems.some(([platformKey]) => platformKey === key);
      const active = path === href;
      return <Link key={key} href={href} className={`group relative flex items-center gap-3 whitespace-nowrap rounded-xl border px-4 py-2.5 text-xs font-medium transition lg:text-sm ${isPlatform ? 'lg:ml-5 lg:py-2.5 lg:text-xs' : ''} ${active ? 'border-primary/20 bg-primary/[.09] text-primary shadow-[inset_3px_0_var(--primary)]' : 'border-transparent text-zinc-400 hover:border-white/[.06] hover:bg-white/[.035] hover:text-white'}`}><Icon className={active ? 'text-primary' : 'text-zinc-600 transition group-hover:text-zinc-300'} size={isPlatform ? 15 : 17} />{label}</Link>;
    })}</nav>
    <button className="mt-auto hidden items-center gap-3 border-t border-white/[.07] p-6 text-sm text-zinc-500 transition hover:bg-white/[.025] hover:text-white lg:flex" onClick={async () => {await browserClient().auth.signOut(); router.replace('/login'); router.refresh();}}><LogOut size={16} />Sair da plataforma</button>
  </aside>;
}
