import Link from 'next/link';
import {notFound} from 'next/navigation';
import {BarChart3, MapPinned, MousePointer2, Users, Globe2} from 'lucide-react';
import {Card} from '@/components/ui/card';
import {MetricBreakdownCard} from '@/components/dashboard/metric-breakdown-card';
import {AudienceOverview} from '@/components/dashboard/audience-overview-v3';
import {RegionPerformance,GenderAgeMatrix} from '@/components/dashboard/geography-cross-analysis';
import {Filters} from '@/components/dashboard/filters';
import {tenant,dashboardConfig} from '@/lib/auth/session';
import {filters,dashboardData} from '@/lib/metrics/query';
import {AudienceReportExport} from '@/components/dashboard/audience-report-export';
import {buildAudienceReport, type AudienceDimension, type AudienceReport} from '@/lib/reports/audience-report';

export const dynamic='force-dynamic';

const reports={
 'meta-audience':{title:'Meta Ads · Público e dispositivos',platform:'meta_ads',description:'Distribuição de resultados, perfis e aparelhos informada pela Meta.'},
 'google-audience':{title:'Google Ads · Demografia e localização',platform:'google_ads',description:'Perfil dos usuários, dispositivos e distribuição geográfica dos anúncios.'},
} as const;

const categories:{key:AudienceDimension;title:string;note?:string}[]=[
 {key:'gender',title:'Sexo / gênero'},
 {key:'age',title:'Faixa etária'},
 {key:'state',title:'Estado / região',note:'Distribuição observada; não equivale necessariamente à segmentação geográfica configurada.'},
 {key:'city',title:'Cidade'},
 {key:'device',title:'Dispositivos'},
];
export default async function Page({params:pendingParams,searchParams:pendingSearch}:{params:Promise<{organizationSlug:string;report:string}>;searchParams:Promise<Record<string,string|undefined>>}){
 const {organizationSlug,report}=await pendingParams;const search=await pendingSearch;
 if(report!=='meta-audience'&&report!=='google-audience'&&report!=='google-analytics')notFound();
 const {db,org,superAdmin}=await tenant(organizationSlug);
 const config=await dashboardConfig(organizationSlug);
 if(!config.enabled_pages.includes(report==='google-analytics'?'overview':'paid'))return <Card>Este relatório está indisponível nas configurações deste cliente.</Card>;
 const [{data:organizations}]=await Promise.all([superAdmin?db.from('organizations').select('name,slug').eq('status','active').order('name'):Promise.resolve({data:[{name:org.name,slug:org.slug}]})]);
 const f={...filters(search,org.timezone,org.currency),compare:'none' as const};
 if(report==='google-analytics'){
  return <main className="mx-auto max-w-[1680px] space-y-4"><header><p className="eyebrow">Inteligência comportamental</p><h1 className="mt-2 text-2xl font-semibold text-white">Google Analytics 4</h1><p className="mt-2 text-sm text-zinc-400">Sessões, usuários, origens de tráfego, engajamento, eventos e conversões do site.</p></header>
   <Filters value={f} organizations={organizations??[]} slug={org.slug} allowComparison={false}/>
   <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[{name:'Usuários ativos',icon:Users},{name:'Sessões',icon:BarChart3},{name:'Taxa de engajamento',icon:MousePointer2},{name:'Eventos importantes',icon:Globe2}].map(({name,icon:Icon})=><Card key={name}><Icon className="text-primary" size={18}/><p className="mt-4 text-sm text-zinc-400">{name}</p><strong className="mt-2 block text-2xl text-white">—</strong></Card>)}</div>
   <Card><h2 className="text-lg font-semibold">Fonte de dados GA4 ainda não conectada</h2><p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">Ainda não existe uma fonte de eventos do Google Analytics 4 homologada para este cliente. Não utilizar cliques do Google Ads como se fossem sessões ou usuários do Analytics. O painel permanecerá sem valores até que uma integração GA4 autorizada envie métricas com propriedade, data e dimensão de origem verificadas.</p>{superAdmin?<Link className="mt-5 inline-flex rounded-xl border border-white/15 px-4 py-3 text-sm text-white" href={`/${org.slug}/settings/integrations`}>Gerenciar fonte de dados</Link>:null}</Card>
  </main>;
 }
 const definition=reports[report];
 const data=await dashboardData(db,org.id,f,{platform:definition.platform,breakdowns:true});
 const rows=data.breakdowns;
 let audienceReport:AudienceReport;
 try {audienceReport=buildAudienceReport(rows,{organizationId:org.id,organizationName:org.name,organizationSlug:org.slug,timezone:org.timezone,platform:definition.platform,currency:f.currency,from:f.from,to:f.to,generatedAt:new Date().toISOString()});}
 catch {return <main className="mx-auto max-w-[1680px] space-y-4"><h1 className="text-2xl font-semibold">{definition.title}</h1><Filters value={f} organizations={organizations??[]} slug={org.slug} allowComparison={false}/><Card><p role="alert">Não foi possível consolidar os detalhamentos neste recorte. Verifique a origem, a moeda e a janela de atribuição com a agência. Nenhum total ou arquivo foi produzido.</p></Card></main>;}
 const breakdowns=audienceReport.groups;
 return <main className="mx-auto max-w-[1680px] space-y-3"><header><p className="eyebrow">Análise segmentada · {org.name}</p><h1 className="mt-2 text-3xl font-semibold text-white">{definition.title}</h1><p className="mt-2 text-sm text-zinc-400">{definition.description}</p></header>
   <Filters value={f} organizations={organizations??[]} slug={org.slug} allowComparison={false}/>
   <section aria-label="Origem e cobertura do relatório" className="space-y-3 rounded-xl border border-white/10 p-4"><p className="text-sm text-zinc-300">Período: {f.from} a {f.to} · Moeda: {f.currency} · Fuso da organização: {org.timezone}</p><p className="text-xs text-zinc-400">Fonte: detalhamentos de {definition.platform==='meta_ads'?'Meta Ads':'Google Ads'}. {audienceReport.sourceRecords} registros no recorte. Janela de atribuição: {audienceReport.attributionWindow||'não informada pela fonte'}.</p><p className="text-xs text-zinc-400">Cada dimensão é independente. Cobertura refere-se aos registros recebidos; não comprova completude da coleta. Totais incompletos ou inválidos permanecem indisponíveis. Datas diárias conforme recebidas da fonte, sem conversão neste relatório. Este relatório apresenta apenas o período selecionado.</p><AudienceReportExport report={audienceReport}/></section>
   <nav className="flex flex-wrap gap-2 text-xs font-semibold"><Link className="rounded-lg border border-white/15 px-4 py-2 text-zinc-300" href={`/${org.slug}/${definition.platform}`}>Campanhas</Link><span className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-primary">Público e dispositivos</span></nav>
   <AudienceOverview gender={breakdowns.gender} age={breakdowns.age} device={breakdowns.device}/>
   <RegionPerformance states={breakdowns.state} cities={breakdowns.city} currency={f.currency}/>
   {report==='meta-audience'?<GenderAgeMatrix available={false}/>:null}
   <div className="grid gap-4 xl:grid-cols-2">{categories.map(item=><MetricBreakdownCard key={item.key} title={item.title} rows={breakdowns[item.key]} currency={f.currency} note={item.note}/>)}<Card className="!p-5"><h2 className="text-base font-semibold text-white">País</h2><p className="mt-5 text-sm leading-6 text-zinc-400">A dimensão país ainda não foi incluída no contrato de dados deste integrador. Não será deduzida a partir de estados ou cidades. Esta análise será ativada quando a fonte fornecer o país da veiculação.</p></Card></div>

   {report==='google-audience'?<Card><div className="flex items-center gap-2"><MapPinned size={19} className="text-primary"/><h2 className="font-semibold">Mapa de distribuição geográfica</h2></div><p className="mt-3 text-sm leading-6 text-zinc-400">O mapa de campanhas exige dados geográficos reais do Google Ads ou coordenadas verificadas associadas às localidades reportadas. Os recortes disponíveis estão nas listas acima. Sem geometrias ou coordenadas verificadas, nenhuma posição será deduzida a partir do nome da localidade.</p></Card>:null}
  </main>;
}
