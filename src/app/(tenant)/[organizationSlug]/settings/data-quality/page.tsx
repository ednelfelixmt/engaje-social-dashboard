import Link from 'next/link';
import {Database,ExternalLink,ShieldCheck} from 'lucide-react';
import {agencyTenant} from '@/lib/auth/session';
import {Card} from '@/components/ui/card';
import {SyncJobHistory} from '@/components/dashboard/sync-job-history';
import {buildDataQuality} from '@/lib/metrics/data-quality';
import {readDataQuality} from '@/lib/metrics/data-quality-query';
export const dynamic='force-dynamic';
const names:Record<string,string>={meta_ads:'Meta Ads',google_ads:'Google Ads',tiktok_ads:'TikTok Ads'};
function labelDate(v:string|null){return v?v.slice(0,10).split('-').reverse().join('/'):'—';}
export default async function Page({params:pending}:{params:Promise<{organizationSlug:string}>}){
 const {organizationSlug}=await pending,{db,org}=await agencyTenant(organizationSlug);
 let report:ReturnType<typeof buildDataQuality>;
 try{
  const scope={organizationId:org.id,businessDate:new Intl.DateTimeFormat('en-CA',{timeZone:org.timezone}).format(new Date()),generatedAt:new Date().toISOString()};
  const input=await readDataQuality(db,scope);
  report=buildDataQuality(input,{...scope,generatedAt:new Date().toISOString()});
 }catch{return <main><Card><p role="alert">Não foi possível validar o diagnóstico deste cliente. Nenhum indicador parcial foi exibido. Verifique a origem em ambiente autorizado.</p></Card></main>;}
 const {items}=report;
 return <main className="mx-auto max-w-[1600px] space-y-5">
 <header className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-wider text-zinc-500">Configurações / Integrações</p><h1 className="mt-2 text-2xl font-semibold text-white">Qualidade e cobertura dos dados</h1><p className="mt-2 text-sm text-zinc-400">Diagnóstico técnico de {org.name}, restrito aos administradores da agência.</p></div><Link href={`/${org.slug}/settings/integrations`} className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs text-zinc-200"><ExternalLink size={14}/>Gerenciar conexões</Link></header>
 <p className="text-xs text-zinc-500">Diagnóstico gerado em {report.scope.generatedAt} (UTC). Data local de referência: {report.scope.businessDate}. Campos ausentes ou inválidos não são zeros presumidos.</p>
 {report.unsupportedMetricRows?<Card><p role="status">{report.unsupportedMetricRows} registro(s) de mídia com plataforma não reconhecida neste diagnóstico. Não foram atribuídos a um canal conhecido.</p></Card>:null}
 <div className="grid gap-3 sm:grid-cols-3">
  <Card className="!p-4"><p className="text-xs text-zinc-400">Registros de campanhas</p><p className="mt-2 text-2xl font-semibold">{report.rows.toLocaleString('pt-BR')}</p><p className="mt-2 text-xs text-zinc-500">Linhas armazenadas — não indica campanhas únicas</p></Card>
  <Card className="!p-4"><p className="text-xs text-zinc-400">Detalhamentos demográficos</p><p className="mt-2 text-2xl font-semibold">{report.dimensions.toLocaleString('pt-BR')}</p><p className="mt-2 text-xs text-zinc-500">Inclui diferentes dimensões e períodos</p></Card>
  <Card className="!p-4"><p className="text-xs text-zinc-400">Conexões habilitadas registradas</p><p className="mt-2 text-2xl font-semibold">{items.reduce((n,r)=>n+r.connected,0)}</p><p className="mt-2 text-xs text-zinc-500">Conectadas e habilitadas; não garante coleta</p></Card>
 </div>
 <section className="grid gap-4 xl:grid-cols-3">{items.map(item=><Card key={item.platform} className="!p-4"><div className="flex items-center justify-between gap-2"><h2 className="font-semibold">{names[item.platform]}</h2><span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${item.status==='recent'?'border-emerald-400/30 text-emerald-300':item.status==='delayed'?'border-amber-400/30 text-amber-200':item.status==='invalid'?'border-rose-400/30 text-rose-300':'border-white/15 text-zinc-400'}`}>{item.status==='recent'?'Última data recente':item.status==='delayed'?'Última data antiga':item.status==='invalid'?(item.days?(item.invalidDates||item.futureDates?'Datas inconsistentes':'Coletas sem validação'):'Sem data histórica válida'):'Sem histórico'}</span></div>
 <div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs text-zinc-500">Campanhas</p><strong>{item.campaigns}</strong></div><div><p className="text-xs text-zinc-500">Dias com dados</p><strong>{item.days}</strong></div><div><p className="text-xs text-zinc-500">Primeira data</p><strong>{labelDate(item.first)}</strong></div><div><p className="text-xs text-zinc-500">Última data</p><strong>{labelDate(item.latest)}</strong></div></div>
 <div className="mt-4 rounded-lg border border-white/10 bg-black/15 p-3 text-xs leading-5 text-zinc-400"><div className="flex items-center justify-between"><span>Conexões registradas</span><strong className="text-white">{item.integrations}</strong></div><div className="mt-2 flex items-center justify-between"><span>Conexões em erro / expiradas</span><strong className={item.expired?'text-amber-200':'text-zinc-200'}>{item.expired}</strong></div><div className="mt-2 flex items-center justify-between"><span>Última coleta válida UTC</span><strong className="text-zinc-200">{item.lastReceived??'—'}</strong></div></div>
 {item.age!==null?<p className="mt-3 text-xs text-zinc-500">O último dia de métricas está a {item.age} dia(s) da data local.</p>:<p className="mt-3 text-xs text-zinc-500">{item.rows?'Existem registros, mas nenhuma data histórica válida para diagnosticar atualidade.':'Nenhuma métrica armazenada para este canal.'}</p>}
 {(item.invalidDates||item.futureDates||item.unknownCollections)?<p role="status" className="mt-3 text-xs text-amber-200">Datas inválidas: {item.invalidDates}. Datas futuras: {item.futureDates}. Coletas desconhecidas ou futuras: {item.unknownCollections}. Essas entradas não comprovam atualidade ou completude.</p>:null}
 </Card>)}</section>
 <div className="grid gap-4 lg:grid-cols-2">
 <Card className="!p-4"><div className="flex items-center gap-2"><Database size={18} className="text-primary"/><h2 className="font-semibold">Cobertura de dimensões</h2></div><p className="mt-2 text-xs leading-5 text-zinc-400">Contagem de registros por dimensão. Idade e gênero separados não permitem cruzamento real de perfis.</p>
 <div className="mt-3 space-y-3">{items.map(item=><div key={item.platform} className="rounded-lg border border-white/10 p-3"><p className="text-xs font-semibold">{names[item.platform]}</p><div className="mt-2 flex flex-wrap gap-2">{['age','gender','age_gender','device','state','city','country'].map(d=><span key={d} className={`rounded-md border px-2 py-1 text-[10px] ${item.breakdowns[d]?'border-emerald-400/20 text-emerald-200':'border-white/10 text-zinc-500'}`}>{d}: {item.breakdowns[d]??0}</span>)}</div></div>)}</div></Card>
 <SyncJobHistory jobs={report.jobs}/>
 </div>
 <Card className="!p-4"><div className="flex items-center gap-2"><ShieldCheck size={18} className="text-primary"/><h2 className="font-semibold">Interpretação e próximos passos</h2></div><p className="mt-3 text-sm leading-6 text-zinc-400">Dias sem registros não comprovam falha: podem representar ausência de anúncios. Compare com histórico de veiculação e logs de API antes de abrir um incidente. Credenciais expiradas devem ser renovadas com autorização do titular. Uma sincronização só é considerada homologada após conferir métricas com a fonte oficial.</p><Link className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-black" href={`/${org.slug}/settings/integrations`}>Revisar integrações e revalidar</Link></Card>
 </main>;
}
