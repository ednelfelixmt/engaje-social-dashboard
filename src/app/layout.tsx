import type {Metadata} from 'next';import './globals.css';import './report-studio.css';import './marketing-bi.css';import './agency-studio.css';
export const metadata:Metadata={title:'Engaje Mídia Hub',description:'Inteligência de marketing para decisões com dados reais'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang='pt-BR' className='dark'><body>{children}</body></html>;}
