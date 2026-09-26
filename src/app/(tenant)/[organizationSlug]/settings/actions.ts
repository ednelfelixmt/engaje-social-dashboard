'use server';

import {z} from 'zod';
import {revalidatePath} from 'next/cache';
import {tenant} from '@/lib/auth/session';
import {dashboardMetricKeys} from '@/lib/metrics/catalog';
import {funnelMetricDefinitions} from '@/lib/metrics/funnel-config';
import type {ActionState} from '@/components/action-form';

export async function saveBranding(_:ActionState,f:FormData):Promise<ActionState>{const slug=z.string().parse(f.get('slug'));const {db,org}=await tenant(slug);const color=z.string().regex(/^#[0-9a-fA-F]{6}$/);const parsed=z.object({platform_name:z.string().min(2).max(100),primary_color:color,secondary_color:color,background_color:color,login_background_color:color}).safeParse(Object.fromEntries(f));if(!parsed.success)return {ok:false,message:'Confira nome e cores.'};const paths:Record<string,string>={};for(const field of ['logo_path','favicon_path','login_background_path','dashboard_background_path']){const file=f.get(field);if(file instanceof File&&file.size){if(file.size>10*1024*1024||!['image/png','image/jpeg','image/webp','image/x-icon','image/vnd.microsoft.icon'].includes(file.type))return {ok:false,message:'Envie PNG, JPG, WebP ou ICO de até 10 MB.'};const ext=file.type==='image/jpeg'?'jpg':file.type==='image/webp'?'webp':file.type.includes('icon')?'ico':'png';const path=org.id+'/'+crypto.randomUUID()+'.'+ext;const {error}=await db.storage.from('branding').upload(path,file,{contentType:file.type});if(error)return {ok:false,message:'Sem permissão para enviar imagem ou arquivo inválido.'};paths[field]=path;}}const {error}=await db.from('branding').update({...parsed.data,...paths}).eq('organization_id',org.id);revalidatePath('/'+slug,'layout');revalidatePath('/login');return {ok:!error,message:error?'Não foi possível salvar a identidade visual.':'Identidade visual atualizada.'};}

export async function saveDashboard(_:ActionState,f:FormData):Promise<ActionState>{
  const slug=z.string().parse(f.get('slug'));
  const {db,org}=await tenant(slug);
  const allowed=new Set<string>(dashboardMetricKeys);
  const enabledMetrics=[...new Set(f.getAll('enabled_metrics').map(String))];
  if(!enabledMetrics.length||enabledMetrics.some((metric)=>!allowed.has(metric)))return {ok:false,message:'Selecione ao menos uma métrica válida.'};
  const enabledPages=[...new Set(f.getAll('enabled_pages').map(String))];
  const funnelModel=z.enum(['lead_generation','messages','ecommerce','local_business','custom']).catch('custom').parse(f.get('funnel_model'));
  let funnelSteps:unknown;try{funnelSteps=JSON.parse(String(f.get('funnel_steps')||'[]'));}catch{return {ok:false,message:'Configuração do funil inválida.'};}
  const funnelStepSchema=z.array(z.object({metric:z.enum(funnelMetricDefinitions.map((item)=>item.key) as [typeof funnelMetricDefinitions[number]['key'],...typeof funnelMetricDefinitions[number]['key'][]]),label:z.string().trim().min(1).max(40)})).min(2).max(8).refine((steps)=>new Set(steps.map((step)=>step.metric)).size===steps.length,'Etapas repetidas');
  const parsedFunnel=funnelStepSchema.safeParse(funnelSteps);if(!parsedFunnel.success)return {ok:false,message:'Escolha entre 2 e 8 etapas válidas, sem repetições.'};
  const targets:Record<string,number|null>={};
  for(const key of ['target_roas','target_roi','target_cpa','target_revenue','target_purchases']){const value=String(f.get(key)||'');targets[key]=value===''?null:Number(value);if(targets[key]!=null&&(!Number.isFinite(targets[key])||(key!=='target_roi'&&targets[key]!<0)))return {ok:false,message:'Metas inválidas.'};}
  const {error}=await db.from('dashboard_configs').update({enabled_pages:enabledPages,enabled_metrics:enabledMetrics,widget_order:f.getAll('widget_order').map(String),preferred_revenue_source:f.get('preferred_revenue_source')==='spreadsheet'?'spreadsheet':'crm',funnel_model:funnelModel,funnel_steps:parsedFunnel.data,only_platforms_with_data:true,...targets}).eq('organization_id',org.id);
  revalidatePath('/'+slug,'layout');
  return {ok:!error,message:error?'Configuração inválida.':'Dashboard atualizado com as métricas selecionadas.'};
}
