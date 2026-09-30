'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect, useState} from 'react';
import {Building2, ChartNoAxesCombined, ChevronDown, Crown, Database, Facebook, Filter, Images, Instagram, LayoutDashboard, Leaf, LogOut, Megaphone, Palette, Plug, Settings, Users, type LucideIcon} from 'lucide-react';

type NavItem={key:string;label:string;icon:LucideIcon;requires?:string};
type NavGroup={id:string;label:string;icon:LucideIcon;items:NavItem[];/** Grupos recolhíveis começam abertos só se contiverem a página atual (ou se defaultOpen). */collapsible?:boolean;defaultOpen?:boolean};

const workspaceGroups:NavGroup[]=[
  {id:'overview',label:'Visão geral',icon:LayoutDashboard,items:[{key:'overview',label:'Visão geral',icon:LayoutDashboard,requires:'overview'}]},
  {id:'paid',label:'Mídia paga',icon:Megaphone,collapsible:true,defaultOpen:true,items:[
    {key:'paid',label:'Campanhas e métricas',icon:ChartNoAxesCombined,requires:'paid'},
    {key:'funnel',label:'Funil de conversão',icon:Filter,requires:'funnel'},
    {key:'paid-creatives',label:'Criativos dos anúncios',icon:Images,requires:'creatives'},
  ]},
  {id:'organic',label:'Orgânico',icon:Leaf,collapsible:true,defaultOpen:true,items:[
    {key:'organic',label:'Visão orgânica',icon:Leaf,requires:'organic'},
    {key:'facebook_organic',label:'Facebook',icon:Facebook,requires:'organic'},
    {key:'instagram_organic',label:'Instagram',icon:Instagram,requires:'organic'},
    {key:'organic-posts',label:'Posts publicados',icon:Images,requires:'organic'},
  ]},
  {id:'data',label:'Receita e dados externos',icon:Database,items:[{key:'external',label:'Receita e dados externos',icon:Database,requires:'external'}]},
  {id:'settings',label:'Configurações',icon:Settings,collapsible:true,items:[
    {key:'settings/dashboard',label:'Dashboard e funil',icon:Settings},
    {key:'settings/integrations',label:'Integrações',icon:Plug},
    {key:'settings/branding',label:'Aparência',icon:Palette},
  ]},
];

const agencyGroups:NavGroup[]=[
  {id:'agency',label:'Agência',icon:Building2,items:[
    {key:'admin',label:'Visão geral',icon:LayoutDashboard},
    {key:'admin/organizations',label:'Clientes',icon:Building2},
    {key:'admin/users',label:'Usuários',icon:Users},
  ]},
  {id:'system',label:'Sistema',icon:Plug,items:[{key:'admin/integrations',label:'Integrações',icon:Plug}]},
];

const storagePrefix='engaje:nav:v1:';

export function Navigation({slug,admin=false,enabled=[]}:{slug?:string;admin?:boolean;enabled?:string[]}){
  const path=usePathname();
  const scope=admin?'admin':slug??'workspace';
  const groups=(admin?agencyGroups:workspaceGroups).map((group)=>({...group,items:group.items.filter((item)=>!item.requires||enabled.includes(item.requires))})).filter((group)=>group.items.length);
  const hrefOf=(key:string)=>admin?`/${key}`:`/${slug}/${key}`;
  const isActive=(key:string)=>path===hrefOf(key);

  // Escolhas manuais do usuário (abrir/recolher) ficam só neste navegador; o grupo da página atual sempre aparece aberto.
  const [manual,setManual]=useState<Record<string,boolean>>({});
  useEffect(()=>{
    try{const stored=JSON.parse(localStorage.getItem(storagePrefix+scope)||'{}');if(stored&&typeof stored==='object'&&!Array.isArray(stored))setManual(stored as Record<string,boolean>);}catch{/* sem armazenamento local */}
  },[scope]);
  const toggle=(id:string,open:boolean)=>setManual((current)=>{
    const next={...current,[id]:!open};
    try{localStorage.setItem(storagePrefix+scope,JSON.stringify(next));}catch{/* ignora */}
    return next;
  });

  return <aside className="sticky top-0 z-40 flex w-full flex-col border-b border-white/[.08] bg-[#090d15] lg:fixed lg:inset-y-0 lg:w-[272px] lg:border-b-0 lg:border-r">
    <Link prefetch href="/" className="flex items-center gap-3 px-5 py-4 lg:px-6 lg:py-7"><span className="grid size-10 place-items-center rounded-2xl border border-primary/25 bg-primary/10 shadow-[0_0_30px_rgb(var(--primary-rgb)/.08)]"><Crown className="text-primary" size={21}/></span><div><strong className="block tracking-[-.025em]">Engaje Mídia Hub</strong><p className="muted mt-0.5 text-[8px] font-bold tracking-[.16em]">MARKETING INTELLIGENCE</p></div></Link>
    <div className="hidden px-6 lg:block"><div className="h-px bg-gradient-to-r from-primary/40 via-white/10 to-transparent"/></div>
    <nav aria-label={admin?'Navegação da agência':'Navegação do workspace'} className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:gap-1.5 lg:overflow-y-auto lg:px-4 lg:pb-5 lg:pt-5">
      {groups.map((group)=>{
        const single=group.items.length===1&&!group.collapsible;
        const hasActive=group.items.some((item)=>isActive(item.key));
        const open=!group.collapsible||hasActive||(manual[group.id]??group.defaultOpen??false);
        const GroupIcon=group.icon;
        return <div className="contents lg:block" key={group.id}>
          {group.collapsible?<button type="button" aria-expanded={open} aria-controls={`nav-${group.id}`} onClick={()=>toggle(group.id,open)} disabled={hasActive} className="group mt-2 hidden w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[11px] font-bold uppercase tracking-[.14em] text-zinc-500 transition hover:text-zinc-200 disabled:cursor-default lg:flex">
            <GroupIcon size={14} className={hasActive?'text-primary':''}/>
            <span className="flex-1">{group.label}</span>
            <span className="rounded-full bg-white/[.05] px-1.5 py-0.5 text-[9px] font-semibold tracking-normal text-zinc-500">{group.items.length}</span>
            <ChevronDown size={14} className={`transition ${open?'':'-rotate-90'} ${hasActive?'opacity-30':''}`}/>
          </button>:null}
          {!group.collapsible&&!single?<p className="eyebrow mb-2 mt-2 hidden px-3 text-[9px] lg:block">{group.label}</p>:null}
          <div id={`nav-${group.id}`} className={`contents lg:block lg:space-y-0.5 ${group.collapsible?'lg:ml-3 lg:border-l lg:border-white/[.07] lg:pl-2':''} ${open?'':'lg:hidden'}`}>
            {group.items.map(({key,label,icon:Icon})=>{
              const active=isActive(key);
              return <Link prefetch aria-current={active?'page':undefined} key={key} href={hrefOf(key)} className={`group relative flex items-center gap-3 whitespace-nowrap rounded-xl border px-4 py-2.5 text-xs font-medium transition lg:text-sm ${single?'lg:mt-1':''} ${active?'border-primary/20 bg-primary/[.09] text-primary shadow-[inset_3px_0_var(--primary)]':'border-transparent text-zinc-400 hover:border-white/[.06] hover:bg-white/[.035] hover:text-white'}`}><Icon className={active?'text-primary':'text-zinc-600 transition group-hover:text-zinc-300'} size={17}/>{label}</Link>;
            })}
          </div>
        </div>;
      })}
    </nav>
    <form action="/auth/signout" method="post" className="mt-auto hidden border-t border-white/[.07] lg:block"><button type="submit" className="flex w-full items-center gap-3 p-6 text-sm text-zinc-500 transition hover:bg-white/[.025] hover:text-white"><LogOut size={16}/>Sair da plataforma</button></form>
  </aside>;
}
