'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect, useState} from 'react';
import {Building2, ChartNoAxesCombined, ChevronDown, Crown, Database, Filter, Images, LayoutDashboard, LogOut, Megaphone, Menu, PanelLeftClose, PanelLeftOpen, Palette, Plug, Settings, Share2, Users, type LucideIcon} from 'lucide-react';

type NavItem={key:string;label:string;icon:LucideIcon;requires?:string};
type NavGroup={id:string;label:string;icon:LucideIcon;items:NavItem[];/** Grupos recolhíveis começam abertos só se contiverem a página atual (ou se defaultOpen). */collapsible?:boolean;defaultOpen?:boolean};

const workspaceGroups:NavGroup[]=[
  {id:'overview',label:'Visão geral',icon:LayoutDashboard,items:[{key:'overview',label:'Visão geral',icon:LayoutDashboard,requires:'overview'}]},
  {id:'intelligence',label:'Inteligência estratégica',icon:ChartNoAxesCombined,items:[{key:'reports/analytics',label:'Análise 360',icon:ChartNoAxesCombined,requires:'overview'},{key:'reports',label:'Central de relatórios',icon:Database},{key:'intelligence',label:'Análises e relatórios',icon:ChartNoAxesCombined,requires:'overview'},{key:'reports/methodology',label:'Guia de métricas',icon:Database,requires:'overview'}]},
  {id:'meta',label:'Meta Ads',icon:Megaphone,collapsible:true,defaultOpen:true,items:[
    {key:'meta_ads',label:'Campanhas Meta Ads',icon:ChartNoAxesCombined,requires:'paid'},
    {key:'reports/meta-audience',label:'Público e dispositivos',icon:Users,requires:'paid'},
  ]},
  {id:'google',label:'Google Ads',icon:Megaphone,collapsible:true,defaultOpen:true,items:[
    {key:'google_ads',label:'Campanhas Google Ads',icon:ChartNoAxesCombined,requires:'paid'},
    {key:'reports/google-audience',label:'Demografia e geografia',icon:Users,requires:'paid'},
  ]},
  {id:'organic',label:'Conteúdos orgânicos',icon:Images,items:[{key:'reports/organic-content',label:'Publicações e contadores',icon:Images,requires:'organic'},{key:'reports/organic-accounts',label:'Dados recebidos por conta',icon:ChartNoAxesCombined,requires:'organic'}]},
  {id:'analytics',label:'Google Analytics',icon:ChartNoAxesCombined,items:[
    {key:'reports/google-analytics',label:'Comportamento no site',icon:ChartNoAxesCombined,requires:'overview'},
  ]},
  {id:'paid',label:'Outras análises',icon:Filter,collapsible:true,items:[
    {key:'paid',label:'Mídia paga consolidada',icon:ChartNoAxesCombined,requires:'paid'},
    {key:'reports/performance',label:'Relatório executivo',icon:ChartNoAxesCombined,requires:'paid'},
    {key:'reports/targets',label:'Metas e referências',icon:ChartNoAxesCombined,requires:'paid'},
    {key:'reports/funnel',label:'Relatório de funil',icon:Filter,requires:'funnel'},
    {key:'funnel',label:'Funil de conversão',icon:Filter,requires:'funnel'},
    {key:'paid-creatives',label:'Criativos dos anúncios',icon:Images,requires:'creatives'},
  ]},
  {id:'data',label:'Receita e dados externos',icon:Database,items:[{key:'external',label:'Registros e importação',icon:Database,requires:'external'},{key:'reports/revenue',label:'Análise de receita',icon:ChartNoAxesCombined,requires:'external'}]},
  {id:'settings',label:'Configurações',icon:Settings,collapsible:true,items:[
    {key:'settings/dashboard',label:'Dashboard e funil',icon:Settings},
    {key:'settings/integrations',label:'Integrações',icon:Plug},
    {key:'settings/data-quality',label:'Qualidade dos dados',icon:Database},
    {key:'settings/branding',label:'Aparência',icon:Palette},
    {key:'sharing',label:'Compartilhar dashboards',icon:Share2},
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

export function Navigation({slug,admin=false,enabled=[],canShare=false,organizationName,logoUrl}:{slug?:string;admin?:boolean;enabled?:string[];canShare?:boolean;organizationName?:string;logoUrl?:string|null}){
  const path=usePathname();
  const scope=admin?'admin':slug??'workspace';
  const groups=(admin?agencyGroups:workspaceGroups).filter((group)=>admin||canShare||group.id!=='settings').map((group)=>({...group,items:group.items.filter((item)=>(!['sharing','settings/data-quality'].includes(item.key)||canShare)&&(!item.requires||enabled.includes(item.requires)))})).filter((group)=>group.items.length);
  const hrefOf=(key:string)=>admin?`/${key}`:`/${slug}/${key}`;
  const isActive=(key:string)=>path===hrefOf(key);

  // Escolhas manuais do usuário (abrir/recolher) ficam só neste navegador; o grupo da página atual sempre aparece aberto.
  const [manual,setManual]=useState<Record<string,boolean>>({});
  const [collapsed,setCollapsed]=useState(false);
  const [mobileOpen,setMobileOpen]=useState(false);
  const [logoFailed,setLogoFailed]=useState(false);
  useEffect(()=>{try{setCollapsed(localStorage.getItem(storagePrefix+'collapsed')==='true');}catch{/* optional preference */}},[]);
  useEffect(()=>{setMobileOpen(false);},[path]);
  const collapse=()=>setCollapsed(current=>{try{localStorage.setItem(storagePrefix+'collapsed',String(!current));}catch{/* optional preference */}return !current;});
  useEffect(()=>{
    try{const stored=JSON.parse(localStorage.getItem(storagePrefix+scope)||'{}');if(stored&&typeof stored==='object'&&!Array.isArray(stored))setManual(stored as Record<string,boolean>);}catch{/* sem armazenamento local */}
  },[scope]);
  const toggle=(id:string,open:boolean)=>setManual((current)=>{
    const next={...current,[id]:!open};
    try{localStorage.setItem(storagePrefix+scope,JSON.stringify(next));}catch{/* ignora */}
    return next;
  });

  return <aside data-report-navigation data-collapsed={collapsed} data-mobile-open={mobileOpen} className="sticky top-0 z-40 flex w-full flex-col border-b border-white/[.08] bg-[#090d15] lg:fixed lg:inset-y-0 lg:w-[272px] lg:border-b-0 lg:border-r">
    <div className="navigation-brand"><Link prefetch href={slug?`/${encodeURIComponent(slug)}/reports/analytics`:'/admin'} title={organizationName??'Engaje Mídia Hub'}><span className="navigation-logo">{logoUrl&&!logoFailed?<img src={logoUrl} alt="" onError={()=>setLogoFailed(true)}/>:organizationName?<b>{organizationName.split(/\s+/).map(s=>s[0]).slice(0,2).join('')}</b>:<Crown className="text-primary" size={21}/>}</span><div className="navigation-label"><strong>{organizationName??'Engaje Mídia Hub'}</strong><small>MARKETING INTELLIGENCE</small></div></Link><button type="button" className="navigation-mobile-toggle" aria-label="Abrir navegação" aria-expanded={mobileOpen} onClick={()=>setMobileOpen(!mobileOpen)}><Menu size={21}/></button></div>
    <button type="button" className="navigation-collapse" aria-label={collapsed?'Expandir menu lateral':'Recolher menu lateral'} aria-expanded={!collapsed} onClick={collapse}>{collapsed?<PanelLeftOpen size={19}/>:<PanelLeftClose size={19}/>}<span className="navigation-label">Recolher menu</span></button>
    <div className="hidden px-6 lg:block"><div className="h-px bg-gradient-to-r from-primary/40 via-white/10 to-transparent"/></div>
    <nav aria-label={admin?'Navegação da agência':'Navegação do workspace'} className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:gap-1.5 lg:overflow-y-auto lg:px-4 lg:pb-5 lg:pt-5">
      {groups.map((group)=>{
        const single=group.items.length===1&&!group.collapsible;
        const hasActive=group.items.some((item)=>isActive(item.key));
        const open=collapsed||!group.collapsible||hasActive||(manual[group.id]??group.defaultOpen??false);
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
              return <Link prefetch aria-label={label} title={label} aria-current={active?'page':undefined} key={key} href={hrefOf(key)} className={`group relative flex items-center gap-3 whitespace-nowrap rounded-xl border px-4 py-2.5 text-xs font-medium transition lg:text-sm ${single?'lg:mt-1':''} ${active?'border-primary/20 bg-primary/[.09] text-primary shadow-[inset_3px_0_var(--primary)]':'border-transparent text-zinc-400 hover:border-white/[.06] hover:bg-white/[.035] hover:text-white'}`}><Icon className={active?'text-primary':'text-zinc-600 transition group-hover:text-zinc-300'} size={17}/><span className="navigation-label">{label}</span></Link>;
            })}
          </div>
        </div>;
      })}
    </nav>
    <form action="/auth/signout" method="post" className="navigation-signout mt-auto border-t border-white/[.07]"><button type="submit" aria-label="Sair da plataforma" title="Sair da plataforma" className="flex w-full items-center gap-3 p-6 text-sm text-zinc-500 transition hover:bg-white/[.025] hover:text-white"><LogOut size={16}/><span className="navigation-label">Sair da plataforma</span></button></form>
  </aside>;
}
