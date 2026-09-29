'use client';

import Link from 'next/link';
import {usePathname, useRouter} from 'next/navigation';
import {Building2, ChartNoAxesCombined, Crown, Database, Filter, Images, LayoutDashboard, Leaf, LogOut, Palette, Plug, Settings, Users, type LucideIcon} from 'lucide-react';
import {browserClient} from '@/lib/supabase/browser';

type NavItem={key:string;label:string;icon:LucideIcon;requires?:string};
type NavGroup={label:string;items:NavItem[]};

const workspaceGroups:NavGroup[]=[
  {label:'Visão',items:[{key:'overview',label:'Visão geral',icon:LayoutDashboard,requires:'overview'}]},
  {label:'Análises',items:[
    {key:'paid',label:'Mídia paga',icon:ChartNoAxesCombined,requires:'paid'},
    {key:'organic',label:'Conteúdo orgânico',icon:Leaf,requires:'organic'},
    {key:'funnel',label:'Funil de conversão',icon:Filter,requires:'funnel'},
    {key:'creatives',label:'Criativos e posts',icon:Images,requires:'creatives'},
  ]},
  {label:'Dados',items:[{key:'external',label:'Receita e dados externos',icon:Database,requires:'external'}]},
  {label:'Configurações',items:[
    {key:'settings/dashboard',label:'Dashboard e funil',icon:Settings},
    {key:'settings/integrations',label:'Integrações',icon:Plug},
    {key:'settings/branding',label:'Aparência',icon:Palette},
  ]},
];

const agencyGroups:NavGroup[]=[
  {label:'Agência',items:[
    {key:'admin',label:'Visão geral',icon:LayoutDashboard},
    {key:'admin/organizations',label:'Clientes',icon:Building2},
    {key:'admin/users',label:'Usuários',icon:Users},
  ]},
  {label:'Sistema',items:[{key:'admin/integrations',label:'Integrações',icon:Plug}]},
];

export function Navigation({slug,admin=false,enabled=[]}:{slug?:string;admin?:boolean;enabled?:string[]}){
  const path=usePathname();
  const router=useRouter();
  const groups=(admin?agencyGroups:workspaceGroups).map((group)=>({...group,items:group.items.filter((item)=>!item.requires||enabled.includes(item.requires))})).filter((group)=>group.items.length);

  return <aside className="sticky top-0 z-40 flex w-full flex-col border-b border-white/[.08] bg-[#090d15]/95 backdrop-blur-xl lg:fixed lg:inset-y-0 lg:w-[272px] lg:border-b-0 lg:border-r">
    <Link href="/" className="flex items-center gap-3 px-5 py-4 lg:px-6 lg:py-7"><span className="grid size-10 place-items-center rounded-2xl border border-primary/25 bg-primary/10 shadow-[0_0_30px_rgb(var(--primary-rgb)/.08)]"><Crown className="text-primary" size={21}/></span><div><strong className="block tracking-[-.025em]">Engaje Mídia Hub</strong><p className="muted mt-0.5 text-[8px] font-bold tracking-[.16em]">MARKETING INTELLIGENCE</p></div></Link>
    <div className="hidden px-6 lg:block"><div className="h-px bg-gradient-to-r from-primary/40 via-white/10 to-transparent"/></div>
    <nav aria-label={admin?'Navegação da agência':'Navegação do workspace'} className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:gap-6 lg:overflow-y-auto lg:px-4 lg:pb-5 lg:pt-6">
      {groups.map((group)=><div className="contents lg:block lg:space-y-1" key={group.label}>
        <p className="eyebrow mb-2 hidden px-3 text-[9px] lg:block">{group.label}</p>
        {group.items.map(({key,label,icon:Icon})=>{
          const href=admin?`/${key}`:`/${slug}/${key}`;
          const active=path===href;
          return <Link aria-current={active?'page':undefined} key={key} href={href} className={`group relative flex items-center gap-3 whitespace-nowrap rounded-xl border px-4 py-2.5 text-xs font-medium transition lg:text-sm ${active?'border-primary/20 bg-primary/[.09] text-primary shadow-[inset_3px_0_var(--primary)]':'border-transparent text-zinc-400 hover:border-white/[.06] hover:bg-white/[.035] hover:text-white'}`}><Icon className={active?'text-primary':'text-zinc-600 transition group-hover:text-zinc-300'} size={17}/>{label}</Link>;
        })}
      </div>)}
    </nav>
    <button type="button" className="mt-auto hidden items-center gap-3 border-t border-white/[.07] p-6 text-sm text-zinc-500 transition hover:bg-white/[.025] hover:text-white lg:flex" onClick={async()=>{await browserClient().auth.signOut();router.replace('/login');router.refresh();}}><LogOut size={16}/>Sair da plataforma</button>
  </aside>;
}
