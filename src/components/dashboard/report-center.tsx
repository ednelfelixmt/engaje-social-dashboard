'use client';

import Link from 'next/link';
import {useState} from 'react';
import {ArrowUpRight,ChartNoAxesCombined,FileBarChart2,Filter,Users,Images,BookOpen,Search,Clock3} from 'lucide-react';
import {reportCatalog,reportHref,type ReportContext,type ReportPath} from '@/lib/reports/report-catalog';

type Category='all'|'performance'|'audience'|'content'|'guide';
const categories:{key:Category;label:string}[]=[{key:'all',label:'Todos'},{key:'performance',label:'Resultados e funis'},{key:'audience',label:'Público e regiões'},{key:'content',label:'Conteúdo'},{key:'guide',label:'Metodologia'}];
const categoryOf=(path:ReportPath):Category=>path.includes('audience')?'audience':path.startsWith('organic')||path==='creatives'?'content':path==='methodology'?'guide':'performance';
const icons={performance:ChartNoAxesCombined,audience:Users,content:Images,guide:BookOpen,all:FileBarChart2};
export function ReportCenter({slug,enabled,context}:{slug:string;enabled:string[];context:ReportContext}) {
 const [query,setQuery]=useState(''),[category,setCategory]=useState<Category>('all');
 const normalized=query.trim().toLocaleLowerCase('pt-BR');
 const visible=reportCatalog.filter(item=>(category==='all'||categoryOf(item.path)===category)&&(!normalized||(item.title+' '+item.description).toLocaleLowerCase('pt-BR').includes(normalized)));
 const availableCount=reportCatalog.filter(item=>enabled.includes(item.requires)).length;
 return <div className="studio-report-center">
  <section className="studio-reports-hero"><div><span className="studio-kicker"><FileBarChart2 size={16} aria-hidden/>Biblioteca de inteligência</span><h2>Encontre a história<br/>por trás dos números.</h2><p>Da visão executiva ao detalhe de cada canal. Seu período acompanha a análise.</p>{enabled.includes('overview')?<Link href={reportHref(slug,'analytics',context)}>Explorar Análise 360 <ArrowUpRight size={19} aria-hidden/></Link>:null}</div><div className="studio-library-count"><strong>{availableCount}<span>/{reportCatalog.length}</span></strong><p>relatórios habilitados</p><span>Disponibilidade por configuração da agência</span></div></section>
  <div className="studio-report-discovery"><div className="studio-report-categories" role="group" aria-label="Categorias de relatórios">{categories.map(item=><button type="button" key={item.key} aria-pressed={category===item.key} onClick={()=>setCategory(item.key)}>{item.label}</button>)}</div><label className="studio-report-search"><Search size={17} aria-hidden/><input value={query} onChange={event=>setQuery(event.target.value)} aria-label="Buscar relatórios" placeholder="Buscar relatório..."/></label></div>
  <p className="studio-result-count" role="status">{visible.length} relatórios encontrados</p>
  <section aria-label="Relatórios disponíveis" className="studio-report-grid">{visible.map(item=>{const available=enabled.includes(item.requires),group=categoryOf(item.path),Icon=item.path==='funnel'?Filter:icons[group];return <article key={item.path} className="studio-report-card" data-category={group}>
   <div className="studio-report-card-top"><span className="studio-report-icon"><Icon aria-hidden size={23}/></span><span>{item.formats}</span></div><h2>{item.title}</h2><p>{item.description}</p><div className="studio-report-card-bottom">{available?<Link href={reportHref(slug,item.path,context)}>Abrir relatório <ArrowUpRight aria-hidden size={17}/><span className="sr-only">: {item.title}</span></Link>:<p>Desabilitado na configuração deste cliente. Solicite à agência.</p>}</div></article>;})}</section>
  {!visible.length?<div className="studio-report-empty"><Search size={28} aria-hidden/><h3>Nenhum relatório encontrado</h3><p>Experimente outro nome ou categoria.</p><button type="button" onClick={()=>{setQuery('');setCategory('all');}}>Limpar busca e filtros</button></div>:null}
  <section className="studio-upcoming"><Clock3 aria-hidden size={23}/><div><h2>Google Analytics · Em preparação</h2><p>O relatório de comportamento no site depende de uma origem GA4 autorizada e ingerida. Cliques de anúncios não são sessões do site.</p></div></section>
  <p className="studio-scale-note">Disponibilidade no menu depende da configuração. A presença de um relatório não comprova conexão, coleta completa ou homologação da origem. Os relatórios sem comparação recebem apenas o período atual.</p>
 </div>;
}
