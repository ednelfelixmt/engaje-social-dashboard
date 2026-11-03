import {notFound} from 'next/navigation';
import {tenant,dashboardConfig} from '@/lib/auth/session';

export const metadata={title:'Painel de marketing'};

// Painel de marketing em tela única (9 páginas). A interface vive em
// public/painel e lê os dados reais em ./dados (métricas sincronizadas do cliente).
export default async function Page({params:pending}:{params:Promise<{organizationSlug:string}>}){
 const {organizationSlug}=await pending;
 const {superAdmin}=await tenant(organizationSlug);
 const config=await dashboardConfig(organizationSlug);
 if(!config.enabled_pages.includes('overview'))notFound();
 // Tela cheia: o painel traz a própria navegação (menu lateral, filtros e paginação) e cobre o menu antigo.
 return <iframe title="Painel de marketing" src={`/painel/index.html?org=${encodeURIComponent(organizationSlug)}${superAdmin?'&admin=1':''}`} className="painel-frame" style={{position:'fixed',inset:0,zIndex:60,width:'100%',height:'100%',border:0,background:'#f4f6fb'}}/>;
}
