import {requireAdmin} from '@/lib/auth/session';

export const metadata={title:'Painel da carteira'};

// Painel de marketing da agência inteira, em tela cheia, com filtro por cliente.
export default async function Page(){
 await requireAdmin();
 return <iframe title="Painel da carteira" src="/painel/index.html?agency=1&admin=1" className="painel-frame" style={{position:'fixed',inset:0,zIndex:60,width:'100%',height:'100%',border:0,background:'#f4f6fb'}}/>;
}
