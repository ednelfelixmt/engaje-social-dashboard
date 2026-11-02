'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect,useRef,useState} from 'react';
import {LogOut,Menu,X} from 'lucide-react';

function initials(name:string){return name.trim().split(/\s+/).map(word=>word[0]).slice(0,2).join('').toUpperCase()||'•';}

/** Cabeçalho do dashboard de cliente: logo e nome em destaque, encolhe ao rolar e vira menu no celular. */
export function ClientHeader({slug,name,logoUrl}:{slug:string;name:string;logoUrl:string|null}){
  const pathname=usePathname()??'';
  const [compact,setCompact]=useState(false);
  const [open,setOpen]=useState(false);
  const [failed,setFailed]=useState(false);
  const menu=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const onScroll=()=>setCompact(window.scrollY>24);
    onScroll();window.addEventListener('scroll',onScroll,{passive:true});
    return()=>window.removeEventListener('scroll',onScroll);
  },[]);
  useEffect(()=>{
    if(!open)return;
    const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false);};
    const onDown=(event:PointerEvent)=>{if(menu.current&&!menu.current.contains(event.target as Node))setOpen(false);};
    document.addEventListener('keydown',onKey);document.addEventListener('pointerdown',onDown);
    return()=>{document.removeEventListener('keydown',onKey);document.removeEventListener('pointerdown',onDown);};
  },[open]);
  useEffect(()=>{setOpen(false);},[pathname]);
  const reportsActive=pathname.startsWith(`/${slug}/reports`);
  const dashboardsActive=pathname.startsWith(`/${slug}`)&&!reportsActive;
  return <header className={`client-dashboard-header client-header tv-hide${compact?' is-compact':''}`} data-client-dashboard-header>
    <div className="client-header__identity">
      <span className="client-header__logo">{logoUrl&&!failed?<img src={logoUrl} alt={`Logo de ${name}`} onError={()=>setFailed(true)}/>:<b aria-hidden>{initials(name)}</b>}</span>
      <div className="client-header__text"><span>Painel de resultados</span><strong title={name}>{name}</strong></div>
    </div>
    <div className="client-header__menu" ref={menu}>
      <button type="button" className="client-header__toggle" aria-expanded={open} aria-controls="client-header-nav" aria-label={open?'Fechar menu':'Abrir menu'} onClick={()=>setOpen(value=>!value)}>{open?<X size={20} aria-hidden/>:<Menu size={20} aria-hidden/>}</button>
      <nav id="client-header-nav" className={`client-header__nav${open?' is-open':''}`} aria-label="Navegação do cliente">
        <Link href="/" aria-current={dashboardsActive?'page':undefined}>Dashboards</Link>
        <Link href={`/${slug}/reports`} aria-current={reportsActive?'page':undefined}>Relatórios</Link>
        <form action="/auth/signout" method="post"><button type="submit"><LogOut size={15} aria-hidden/>Sair</button></form>
      </nav>
    </div>
  </header>;
}
