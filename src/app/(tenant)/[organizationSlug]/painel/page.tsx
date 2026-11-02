import {notFound} from 'next/navigation';
import {tenant,dashboardConfig} from '@/lib/auth/session';

export const metadata={title:'Painel de marketing'};

// Painel de marketing em tela única (9 páginas). A interface vive em
// public/painel e usa dados de demonstração até o adaptador de dados reais.
export default async function Page({params:pending}:{params:Promise<{organizationSlug:string}>}){
 const {organizationSlug}=await pending;
 await tenant(organizationSlug);
 const config=await dashboardConfig(organizationSlug);
 if(!config.enabled_pages.includes('overview'))notFound();
 return <iframe title="Painel de marketing" src="/painel/index.html" className="painel-frame" style={{width:'100%',height:'calc(100vh - 120px)',minHeight:640,border:0,borderRadius:16,background:'transparent'}}/>;
}
