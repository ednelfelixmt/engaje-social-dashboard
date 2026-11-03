import type {Metadata} from 'next';import {DesignEffects} from '@/components/layout/design-effects';import './globals.css';import './report-studio.css';import './marketing-bi.css';import './agency-studio.css';import './admin-control.css';
import './chart-studio.css';
import './client-shell.css';
import './design-system.css';
import './unified-theme.css';
export const metadata:Metadata={title:'Engaje Mídia Hub',description:'Inteligência de marketing para decisões com dados reais'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang='pt-BR' className='dark'><head><link rel='preconnect' href='https://fonts.googleapis.com'/><link rel='preconnect' href='https://fonts.gstatic.com' crossOrigin=''/><link rel='stylesheet' href='https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap'/></head><body>{children}<DesignEffects/></body></html>;}
