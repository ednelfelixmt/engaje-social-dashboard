import type {ReactNode} from 'react';
import {BarChart3, ChevronDown, Filter, LayoutDashboard, SlidersHorizontal, Target} from 'lucide-react';
import {tenant} from '@/lib/auth/session';
import {Card} from '@/components/ui/card';
import {ActionForm} from '@/components/action-form';
import {WidgetOrder} from '@/components/widget-order';
import {FunnelConfigurator} from '@/components/funnel-configurator';
import {MetricSelector} from '@/components/metric-selector';
import {parseFunnelSteps, type FunnelModel, businessNiches, salesModels, suggestFunnelModel, type BusinessNiche, type SalesModel} from '@/lib/metrics/funnel-config';
import {saveDashboard} from '../actions';

const pages = [
  ['overview','Visão geral'],['paid','Tráfego pago'],['funnel','Funil de vendas'],
  ['organic','Tráfego orgânico'],['creatives','Criativos e posts'],['external','Dados externos'],
] as const;

const targetFields=[
  ['target_roas','ROAS desejado','Ex.: 4,00'],
  ['target_roi','ROI desejado (%)','Ex.: 150'],
  ['target_cpa','CPA máximo','Ex.: 50,00'],
  ['target_revenue','Receita desejada','Ex.: 100000,00'],
  ['target_purchases','Vendas desejadas','Ex.: 100'],
] as const;

function SettingsSection({number,title,description,icon:Icon,children,open=false}:{number:string;title:string;description:string;icon:typeof LayoutDashboard;children:ReactNode;open?:boolean}){
  return <details open={open} className="group overflow-hidden rounded-2xl border border-white/10 bg-black/10">
    <summary className="cursor-pointer list-none p-5 sm:p-6"><div className="flex items-center gap-4"><span className="grid size-10 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-sm font-bold text-primary">{number}</span><span className="min-w-0 flex-1"><span className="flex items-center gap-2 font-semibold text-white"><Icon size={17} className="text-primary"/>{title}</span><span className="muted mt-1 block text-xs leading-5 sm:text-sm">{description}</span></span><ChevronDown className="shrink-0 text-zinc-600 transition group-open:rotate-180" size={18}/></div></summary>
    <div className="border-t border-white/[.07] p-5 sm:p-6">{children}</div>
  </details>;
}

export default async function Page({params: params_}:{params:Promise<{organizationSlug:string}>}){
  const params=await params_;
  const {db,org}=await tenant(params.organizationSlug);
  const {data:config,error}=await db.from('dashboard_configs').select('*').eq('organization_id',org.id).single();
  if(error)throw error;
  return <div className="mx-auto max-w-6xl space-y-6">
    <div><p className="eyebrow mb-2">Personalização analítica</p><h1 className="text-3xl font-semibold">Configurar dashboard</h1><p className="muted mt-2 max-w-3xl">Configure em quatro passos. Abra somente a área que deseja alterar; as demais configurações permanecem preservadas.</p></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
      ['1','Estrutura','Páginas e blocos',LayoutDashboard],['2','Métricas','Indicadores visíveis',BarChart3],['3','Funil','Modelo e etapas',Filter],['4','Metas','Objetivos do projeto',Target],
    ].map(([number,title,description,Icon])=><div key={String(number)} className="flex items-center gap-3 rounded-xl border border-white/[.08] bg-white/[.025] p-4"><span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-xs font-bold text-primary">{number as string}</span><div><strong className="block text-sm">{title as string}</strong><span className="text-xs text-zinc-600">{description as string}</span></div><Icon className="ml-auto text-zinc-700" size={17}/></div>)}</div>
    <Card className="!p-4 sm:!p-6"><ActionForm action={saveDashboard} label="Salvar todas as configurações">
      <input type="hidden" name="slug" value={org.slug}/>
      <SettingsSection number="1" title="Estrutura do dashboard" description="Defina quais páginas aparecem para este projeto." icon={LayoutDashboard} open>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{pages.map(([key,label])=><label className="!flex-row items-center rounded-xl border border-white/10 bg-white/[.025] p-4 transition hover:border-primary/25" key={key}><input type="checkbox" name="enabled_pages" value={key} defaultChecked={config.enabled_pages.includes(key)}/><span className="text-sm font-medium">{label}</span></label>)}</div>
        <details className="mt-5 rounded-xl border border-white/[.08] bg-black/10"><summary className="flex cursor-pointer list-none items-center gap-2 p-4 text-sm font-semibold"><SlidersHorizontal size={16} className="text-primary"/>Organização avançada dos blocos<ChevronDown className="ml-auto text-zinc-600" size={16}/></summary><div className="border-t border-white/[.07] p-4"><WidgetOrder initial={config.widget_order}/></div></details>
      </SettingsSection>
      <SettingsSection number="2" title="Métricas visíveis" description="Use um modelo pronto ou personalize somente os indicadores necessários." icon={BarChart3}>
        <MetricSelector initial={config.enabled_metrics}/>
      </SettingsSection>
      <SettingsSection number="3" title="Funil de conversão" description="Escolha o modelo do negócio e ajuste as etapas somente se necessário." icon={Filter}>
        <FunnelConfigurator initialModel={config.funnel_model as FunnelModel} initialSteps={parseFunnelSteps(config.funnel_steps)} suggestedModel={org.niche&&org.sales_model?suggestFunnelModel(org.niche as BusinessNiche,org.sales_model as SalesModel):null} suggestionReason={org.niche&&org.sales_model?`${businessNiches.find((item)=>item.id===org.niche)?.label??''} · ${salesModels.find((item)=>item.id===org.sales_model)?.label??''}`:null}/>
      </SettingsSection>
      <SettingsSection number="4" title="Metas e fonte de receita" description="Defina objetivos para destacar desempenho bom ou abaixo do esperado." icon={Target}>
        <div className="field-grid">{targetFields.map(([key,label,placeholder])=><label key={key}>{label}<input type="number" step={key==='target_purchases'?'1':'0.01'} name={key} placeholder={placeholder} defaultValue={config[key]??''}/></label>)}</div>
        <label className="mt-5 block">Fonte principal da receita<select name="preferred_revenue_source" defaultValue={config.preferred_revenue_source}><option value="crm">CRM integrado</option><option value="spreadsheet">Planilha conciliada</option></select><small className="muted mt-2 block">Quando houver receita nas duas fontes, esta opção define qual terá prioridade nos cálculos.</small></label>
      </SettingsSection>
      <p className="rounded-xl border border-emerald-400/15 bg-emerald-400/[.05] p-4 text-xs leading-5 text-emerald-100/70">O sistema mostra somente plataformas com dados. Indicadores indisponíveis permanecem como “—”; nenhum valor é inventado.</p>
    </ActionForm></Card>
  </div>;
}
