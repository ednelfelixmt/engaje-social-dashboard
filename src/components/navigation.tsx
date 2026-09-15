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

  return <aside className="z-20 flex w-full flex-col border-r border-white/10 bg-[#121218] lg:fixed lg:inset-y-0 lg:w-60">
    <Link href="/" className="flex items-center gap-3 p-7"><Crown className="text-primary" size={27} /><div><strong className="tracking-tight">Engaje Mídia Hub</strong><p className="muted mt-1 text-[10px]">INTELIGÊNCIA DE MARKETING</p></div></Link>
    <p className="eyebrow px-7 pb-3 pt-5">{admin ? 'AGÊNCIA' : 'WORKSPACE'}</p>
    <nav className="flex gap-1 overflow-x-auto px-3 lg:flex-col">{list.map(([key, label, Icon]) => {
      const href = admin ? `/${key}` : `/${slug}/${key}`;
      const isPlatform = platformItems.some(([platformKey]) => platformKey === key);
      return <Link key={key} href={href} className={`flex items-center gap-3 whitespace-nowrap rounded-xl px-4 py-3 text-sm ${isPlatform ? 'lg:ml-4 lg:py-2.5 lg:text-xs' : ''} ${path === href ? 'bg-primary/10 text-primary' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}><Icon size={isPlatform ? 16 : 18} />{label}</Link>;
    })}</nav>
    <button className="mt-auto flex items-center gap-3 p-7 text-sm text-zinc-500" onClick={async () => {await browserClient().auth.signOut(); router.replace('/login'); router.refresh();}}><LogOut size={16} />Sair da plataforma</button>
  </aside>;
}
