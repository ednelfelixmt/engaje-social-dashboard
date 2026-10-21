import Link from 'next/link';
import {notFound} from 'next/navigation';
import {BarChart3, MapPinned, MonitorSmartphone, MousePointer2, Users, Globe2} from 'lucide-react';
import {Card} from '@/components/ui/card';
import {Filters} from '@/components/dashboard/filters';
import {tenant,dashboardConfig} from '@/lib/auth/session';
import {filters,dashboardData} from '@/lib/metrics/query';
import {money,number} from '@/lib/utils';
import type {Row} from '@/types/database.types';

const reports={
 'meta-audience':{title:'Meta Ads · Público e dispositivos',platform:'meta_ads',description:'Distribuição de resultados, perfis e aparelhos informada pela Meta.'},
 'google-audience':{title:'Google Ads · Demografia e localização',platform:'google_ads',description:'Perfil dos usuários, dispositivos e distribuição geográfica dos anúncios.'},
} as const;
type Dimension=Row<'metrics_ads_breakdowns'>['dimension_type'];
const categories:{key:Dimension;title:string;note?:string}[]=[
 {key:'gender',title:'Sexo / gênero'},
 {key:'age',title:'Faixa etária'},
 {key:'state',title:'Estado / região',note:'Distribuição observada; não equivale necessariamente à segmentação geográfica configurada.'},
 {key:'city',title:'Cidade'},
 {key:'device',title:'Dispositivos'},
];
const descriptions:Record<string,string>={male:'Masculino',female:'Feminino',unknown:'Não informado',desktop:'Desktop',mobile_app:'Mobile — aplicativo',mobile_web:'Mobile — navegador',mobile:'Mobile',tablet:'Tablet'};
function aggregations(rows:Row<'metrics_ads_breakdowns'>[],key:Dimension){
 const mapped=new Map<string,{label:string;spend:number;clicks:number|null;impressions:number|null;leads:number|null}>();
 for(const r of rows.filter(x=>x.dimension_type===key)){
   const id=r.dimension_value||r.dimension_label||'unknown',current=mapped.get(id)||{label:descriptions[id.toLowerCase()]||r.dimension_label||id,spend:0,clicks:null,impressions:null,leads:null};
   current.spend+=Number(r.spend||0);
   for(const k of ['clicks','impressions','leads'] as const){if(r[k]!=null)current[k]=(current[k]??0)+Number(r[k]);}
   mapped.set(id,current);
 }
 return [...mapped.values()].sort((a,b)=>(b.impressions??b.clicks??b.spend)-(a.impressions??a.clicks??a.spend));
}
function BreakdownCard({title,rows,currency,note}:{title:string;rows:ReturnType<typeof aggregations>;currency:string;note?:string}){
 const top=rows.slice(0,8);const max=Math.max(1,...top.map(x=>x.impressions??x.clicks??x.spend));
 return <Card className="min-w-0 !p-5"><h2 className="text-base font-semibold text-white">{title}</h2>{note?<p className="mt-2 text-xs leading-5 text-zinc-500">{note}</p>:null}
  {top.length?<div className="mt-5 space-y-4">{top.map((r,i)=>{const n=r.impressions??r.clicks??r.spend;return <div key={i}><div className="mb-2 flex items-center justify-between gap-3"><strong className="truncate text-xs font-medium text-zinc-200">{r.label}</strong><span className="whitespace-nowrap text-xs text-zinc-400">{r.impressions!=null?number(r.impressions)+' impressões':r.clicks!=null?number(r.clicks)+' cliques':money(r.spend,currency)}</span></div><div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-primary" style={{width:`${n/max*100}%`}} /></div></div>;})}</div>:<p className="mt-5 rounded-xl border border-dashed border-white/10 p-5 text-sm leading-6 text-zinc-400">A plataforma não enviou dados deste recorte no período. Nenhum público ou dispositivo foi estimado.</p>}
 </Card>;
}
export default async function Page({params:pendingParams,searchParams:pendingSearch}:{params:Promise<{organizationSlug:string;report:string}>;searchParams:Promise<Record<string,string|undefined>>}){
 const {organizationSlug,report}=await pendingParams;const search=await pendingSearch;
 if(report!=='meta-audience'&&report!=='google-audience'&&report!=='google-analytics')notFound();
 const {db,org,superAdmin}=await tenant(organizationSlug);
 const config=await dashboardConfig(organizationSlug);
 if(!config.enabled_pages.includes(report==='google-analytics'?'overview':'paid'))return <Card>Este relatório está indisponível nas configurações deste cliente.</Card>;
 const [{data:organizations}]=await Promise.all([superAdmin?db.from('organizations').select('name,slug').eq('status','active').order('name'):Promise.resolve({data:[{name:org.name,slug:org.slug}]})]);
 const f=filters(search,org.timezone,org.currency);
 if(report==='google-analytics'){
  return <main className="mx-auto max-w-[1680px] space-y-5"><header><p className="eyebrow">Inteligência comportamental</p><h1 className="mt-2 text-3xl font-semibold text-white">Google Analytics 4</h1><p className="mt-2 text-sm text-zinc-400">Sessões, usuários, origens de tráfego, engajamento, eventos e conversões do site.</p></header>
   <Filters value={f} organizations={organizations??[]} slug={org.slug}/>
   <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[{name:'Usuários ativos',icon:Users},{name:'Sessões',icon:BarChart3},{name:'Taxa de engajamento',icon:MousePointer2},{name:'Eventos importantes',icon:Globe2}].map(({name,icon:Icon})=><Card key={name}><Icon className="text-primary" size={18}/><p className="mt-4 text-sm text-zinc-400">{name}</p><strong className="mt-2 block text-2xl text-white">—</strong></Card>)}</div>
   <Card><h2 className="text-lg font-semibold">Fonte de dados GA4 ainda não conectada</h2><p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">Ainda não existe uma fonte de eventos do Google Analytics 4 homologada para este cliente. Não utilizar cliques do Google Ads como se fossem sessões ou usuários do Analytics. O painel permanecerá sem valores até que uma integração GA4 autorizada envie métricas com propriedade, data e dimensão de origem verificadas.</p><Link className="mt-5 inline-flex rounded-xl border border-white/15 px-4 py-3 text-sm text-white" href={`/${org.slug}/settings/integrations`}>Gerenciar fonte de dados</Link></Card>
  </main>;
 }
 const definition=reports[report];
 const data=await dashboardData(db,org.id,f,{platform:definition.platform,breakdowns:true,ads:true});
 const rows=data.breakdowns;
 const breakdowns=Object.fromEntries(categories.map(({key})=>[key,aggregations(rows,key)])) as Record<Dimension,ReturnType<typeof aggregations>>;
 return <main className="mx-auto max-w-[1680px] space-y-5"><header><p className="eyebrow">Análise segmentada · {org.name}</p><h1 className="mt-2 text-3xl font-semibold text-white">{definition.title}</h1><p className="mt-2 text-sm text-zinc-400">{definition.description}</p></header>
   <Filters value={f} organizations={organizations??[]} slug={org.slug}/>
   <nav className="flex flex-wrap gap-2 text-xs font-semibold"><Link className="rounded-lg border border-white/15 px-4 py-2 text-zinc-300" href={`/${org.slug}/${definition.platform}`}>Campanhas</Link><span className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-primary">Público e dispositivos</span></nav>
   <div className="grid gap-4 xl:grid-cols-2">{categories.map(item=><BreakdownCard key={item.key} title={item.title} rows={breakdowns[item.key]} currency={f.currency} note={item.note}/>)}<Card className="!p-5"><h2 className="text-base font-semibold text-white">País</h2><p className="mt-5 text-sm leading-6 text-zinc-400">A dimensão país ainda não foi incluída no contrato de dados deste integrador. Não será deduzida a partir de estados ou cidades. Esta análise será ativada quando a fonte fornecer o país da veiculação.</p></Card></div>
   {report==='google-audience'?<Card><div className="flex items-center gap-2"><MapPinned size={19} className="text-primary"/><h2 className="font-semibold">Mapa de distribuição geográfica</h2></div><p className="mt-3 text-sm leading-6 text-zinc-400">O mapa de campanhas exige dados geográficos reais do Google Ads ou coordenadas verificadas associadas às localidades reportadas. Não há registros do Google Ads nesta base. Assim que o extrator fornecer dados regionais, será possível desenhar as regiões com impressões, cliques, custos e conversões; até lá, nenhuma localização será inventada.</p></Card>:null}
  </main>;
}
