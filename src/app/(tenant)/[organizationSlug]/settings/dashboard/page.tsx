import {tenant} from '@/lib/auth/session';
import {dashboardMetricGroups} from '@/lib/metrics/catalog';
import {Card} from '@/components/ui/card';
import {ActionForm} from '@/components/action-form';
import {WidgetOrder} from '@/components/widget-order';
import {saveDashboard} from '../actions';

const pages = [
  ['overview','Visão geral'],['paid','Tráfego pago'],['funnel','Funil de vendas'],
  ['organic','Tráfego orgânico'],['creatives','Criativos e posts'],['external','Dados externos'],
] as const;

export default async function Page({params}:{params:{organizationSlug:string}}){
  const {db,org}=await tenant(params.organizationSlug);
  const {data:config,error}=await db.from('dashboard_configs').select('*').eq('organization_id',org.id).single();
  if(error)throw error;
  return <div className="space-y-6">
    <div><p className="eyebrow mb-2">Personalização analítica</p><h1 className="text-3xl font-semibold">Configurar dashboard</h1><p className="muted mt-2 max-w-3xl">Escolha as métricas que devem aparecer nos dashboards. Quando uma plataforma não fornecer um indicador selecionado, o sistema exibirá — em vez de fabricar zero.</p></div>
    <Card><ActionForm action={saveDashboard} label="Salvar configuração">
      <input type="hidden" name="slug" value={org.slug}/>
      <section><h2 className="text-lg font-semibold">Páginas habilitadas</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{pages.map(([key,label])=><label className="!flex-row rounded-xl border border-white/10 bg-black/10 p-4" key={key}><input type="checkbox" name="enabled_pages" value={key} defaultChecked={config.enabled_pages.includes(key)}/><span>{label}</span></label>)}</div></section>
      <section className="space-y-5"><div><h2 className="text-lg font-semibold">Métricas visíveis</h2><p className="muted mt-2 text-sm">As opções são aplicadas à visão geral e aos dashboards por plataforma.</p></div>{dashboardMetricGroups.map((group)=><fieldset className="rounded-2xl border border-white/10 bg-black/10 p-5" key={group.title}><legend className="px-2 font-semibold">{group.title}</legend><p className="muted mb-4 text-sm">{group.description}</p><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{group.metrics.map((metric)=><label className="!flex-row items-start rounded-xl border border-white/[.08] bg-white/[.025] p-4" key={metric.key}><input className="mt-1" type="checkbox" name="enabled_metrics" value={metric.key} defaultChecked={config.enabled_metrics.includes(metric.key)}/><span><strong className="block text-sm">{metric.label}</strong><small className="mt-1 block leading-5 text-zinc-500">{metric.description}</small></span></label>)}</div></fieldset>)}</section>
      <section><h2 className="text-lg font-semibold">Metas</h2><div className="field-grid mt-4">{(['target_roas','target_roi','target_cpa','target_revenue','target_purchases'] as const).map((key)=><label key={key}>{key.replace('target_','Meta de ')}<input type="number" step={key==='target_purchases'?'1':'0.01'} name={key} defaultValue={config[key]??''}/></label>)}</div></section>
      <label>Fonte preferida da receita<select name="preferred_revenue_source" defaultValue={config.preferred_revenue_source}><option value="crm">CRM</option><option value="spreadsheet">Planilha conciliada</option></select></label>
      <section><h2 className="mb-4 text-lg font-semibold">Ordem dos blocos</h2><WidgetOrder initial={config.widget_order}/></section>
      <p className="muted text-sm">Somente plataformas com dados são exibidas no dashboard.</p>
    </ActionForm></Card>
  </div>;
}
