import Link from 'next/link';
import {Activity, ArrowUpRight, Building2, CircleDollarSign, Eye, MessageSquareText, Plug, Radio} from 'lucide-react';
import {requireAdmin} from '@/lib/auth/session';
import {all} from '@/lib/metrics/query';
import {money, number} from '@/lib/utils';
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import type {Row} from '@/types/database.types';

type Organization = Row<'organizations'>;
type Integration = Pick<Row<'integrations'>,'organization_id'|'status'|'is_enabled'|'last_synced_at'>;
type Branding = Pick<Row<'branding'>,'organization_id'|'logo_path'>;

function summarize(rows:Row<'metrics_ads'>[]){
  const spend=rows.reduce((sum,row)=>sum+Number(row.spend),0);
  const impressions=rows.reduce((sum,row)=>sum+Number(row.impressions??0),0);
  const reachRows=rows.filter((row)=>row.reach!=null);
  const leadRows=rows.filter((row)=>row.leads!=null);
  const reach=reachRows.length?reachRows.reduce((sum,row)=>sum+Number(row.reach),0):null;
  const leads=leadRows.length?leadRows.reduce((sum,row)=>sum+Number(row.leads),0):null;
  return {spend,impressions,reach,leads,cpl:leads&&spend?spend/leads:null};
}

function latestSync(rows:Integration[]){
  return rows.map((item)=>item.last_synced_at).filter(Boolean).sort().at(-1)??null;
}

function dateLabel(value:string|null){
  return value?new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'America/Cuiaba'}).format(new Date(value)):'Sem sincronização';
}

export default async function Admin(){
  const {db}=await requireAdmin();
  const from=new Date();from.setUTCDate(from.getUTCDate()-29);
  const [{data:orgs,error},{data:integrations,error:integrationError},{data:brandings,error:brandingError},metrics]=await Promise.all([
    db.from('organizations').select('*').eq('is_agency',false).order('name'),
    db.from('integrations').select('organization_id,status,is_enabled,last_synced_at').eq('is_enabled',true),
    db.from('branding').select('organization_id,logo_path'),
    all<Row<'metrics_ads'>>((start,end)=>db.from('metrics_ads').select('*').gte('metric_date',from.toISOString().slice(0,10)).order('id').range(start,end)),
  ]);
  if(error)throw error;if(integrationError)throw integrationError;if(brandingError)throw brandingError;
  const organizations=orgs??[];
  const brandingByOrg=new Map((brandings??[]).map((item)=>[item.organization_id,item]));
  const logoEntries=await Promise.all(organizations.map(async(org)=>{
    const path=brandingByOrg.get(org.id)?.logo_path;
    const url=path?(await db.storage.from('branding').createSignedUrl(path,3600)).data?.signedUrl:null;
    return [org.id,url??null] as const;
  }));
  const logos=new Map(logoEntries);
  const rowsByOrg=new Map<string,Row<'metrics_ads'>[]>();
  for(const row of metrics)rowsByOrg.set(row.organization_id,[...(rowsByOrg.get(row.organization_id)??[]),row]);
  const clientRows=organizations.map((org)=>{
    const rows=rowsByOrg.get(org.id)??[];
    const connections=(integrations??[]).filter((item)=>item.organization_id===org.id);
    return {org,summary:summarize(rows),connections,lastSync:latestSync(connections),logo:logos.get(org.id)??null};
  });
  const active=clientRows.filter((item)=>item.org.status==='active');
  const currencies=[...new Set(active.filter((item)=>item.summary.spend>0).map((item)=>item.org.currency))];
  const agencySummary=summarize(metrics.filter((row)=>active.some((item)=>item.org.id===row.organization_id)));
  const commonCurrency=currencies.length===1?currencies[0]:null;
  const maximumSpend=Math.max(1,...clientRows.map((item)=>item.summary.spend));

  return <div className="mx-auto max-w-[1900px] space-y-7">
    <header className="dashboard-hero flex flex-wrap items-end justify-between gap-6"><div className="relative z-10"><p className="eyebrow mb-3">CENTRAL DE PERFORMANCE</p><h1 className="display-title !text-[clamp(2rem,3.5vw,4rem)]">Visão da agência</h1><p className="muted mt-3 max-w-2xl text-sm">Dados reais dos últimos 30 dias, consolidados por cliente.</p></div><Button className="relative z-10" asChild><Link href="/admin/organizations">+ Novo cliente</Link></Button></header>

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="!p-5"><Building2 className="text-primary" size={19}/><p className="muted mt-5 text-xs">Clientes ativos</p><strong className="data-value mt-1 block text-3xl">{active.length}</strong></Card>
      <Card className="!p-5"><CircleDollarSign className="text-cyan-300" size={19}/><p className="muted mt-5 text-xs">Investimento · 30 dias</p><strong className="data-value mt-1 block text-3xl">{commonCurrency?money(agencySummary.spend,commonCurrency):'—'}</strong>{!commonCurrency&&currencies.length>1?<small className="mt-2 block text-amber-300">Moedas diferentes não são somadas</small>:null}</Card>
      <Card className="!p-5"><Eye className="text-violet-300" size={19}/><p className="muted mt-5 text-xs">Alcance registrado</p><strong className="data-value mt-1 block text-3xl">{number(agencySummary.reach)}</strong></Card>
      <Card className="!p-5"><MessageSquareText className="text-emerald-300" size={19}/><p className="muted mt-5 text-xs">Leads registrados</p><strong className="data-value mt-1 block text-3xl">{number(agencySummary.leads)}</strong></Card>
    </section>

    <section><div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">CARTEIRA DE CLIENTES</p><h2 className="mt-2 text-2xl font-semibold">Desempenho por cliente</h2></div><p className="muted text-xs">Ordenação alfabética · período móvel de 30 dias</p></div>
      {clientRows.length?<div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">{clientRows.map(({org,summary,connections,lastSync,logo})=>{
        const connected=connections.some((item)=>item.status==='connected');
        return <Card className="group relative overflow-hidden !p-0 transition hover:-translate-y-1 hover:border-primary/30" key={org.id}>
          <div className="h-1 bg-white/[.05]"><div className="h-full bg-gradient-to-r from-primary to-cyan-300" style={{width:`${summary.spend/maximumSpend*100}%`}}/></div>
          <div className="p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div className="flex min-w-0 items-center gap-3">{logo?<span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-white p-1.5"><img src={logo} alt={`Logo ${org.name}`} className="h-full w-full object-contain"/></span>:<span className="grid size-12 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/10 font-bold text-primary">{org.name.slice(0,2).toUpperCase()}</span>}<div className="min-w-0"><h3 className="truncate text-lg font-semibold">{org.name}</h3><p className="mt-1 flex items-center gap-2 text-[11px] text-zinc-500"><Radio size={12} className={connected?'text-emerald-400':'text-red-400'}/>{connected?'Integração ativa':'Integração pendente'} · {dateLabel(lastSync)}</p></div></div><Link href={`/${org.slug}/overview`} aria-label={`Abrir ${org.name}`} className="rounded-xl border border-white/10 p-2 text-zinc-500 transition hover:border-primary/30 hover:text-primary"><ArrowUpRight size={18}/></Link></div>
            <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-4"><div><p className="text-[10px] uppercase tracking-wider text-zinc-600">Investimento</p><strong className="data-value mt-1 block text-sm">{money(summary.spend,org.currency)}</strong></div><div><p className="text-[10px] uppercase tracking-wider text-zinc-600">Alcance</p><strong className="data-value mt-1 block text-sm">{number(summary.reach)}</strong></div><div><p className="text-[10px] uppercase tracking-wider text-zinc-600">Leads</p><strong className="data-value mt-1 block text-sm">{number(summary.leads)}</strong></div><div><p className="text-[10px] uppercase tracking-wider text-zinc-600">CPL</p><strong className="data-value mt-1 block text-sm">{money(summary.cpl,org.currency)}</strong></div></div>
            <div className="mt-5 flex items-center justify-between border-t border-white/[.07] pt-4"><span className={`status-pill ${org.status==='active'?'status-active':'status-inactive'}`}>{org.status==='active'?'Ativo':'Pausado'}</span><Link href={`/${org.slug}/paid`} className="text-xs font-semibold text-primary hover:underline">Analisar desempenho</Link></div>
          </div>
        </Card>;
      })}</div>:<Card className="py-16 text-center"><Activity className="mx-auto text-zinc-600" size={32}/><h3 className="mt-4">Nenhum cliente cadastrado</h3></Card>}
    </section>

    <Card className="flex flex-wrap items-center justify-between gap-4 !p-5"><div className="flex items-center gap-3"><Plug className="text-primary"/><div><strong>Integrações operacionais</strong><p className="muted mt-1 text-xs">{(integrations??[]).filter((item)=>item.status==='connected').length} conexões ativas na carteira</p></div></div><Button variant="outline" asChild><Link href="/admin/integrations">Gerenciar integrações</Link></Button></Card>
  </div>;
}
