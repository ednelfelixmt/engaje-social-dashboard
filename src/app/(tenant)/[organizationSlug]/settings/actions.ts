'use server';

import {z} from 'zod';
import {revalidatePath} from 'next/cache';
import {editorAccess} from '@/lib/auth/session';
import {dashboardMetricKeys} from '@/lib/metrics/catalog';
import {funnelMetricDefinitions} from '@/lib/metrics/funnel-config';
import type {ActionState} from '@/components/action-form';

const imageSignatures:Record<string,(bytes:Uint8Array)=>boolean>={
  'image/png':b=>b.length>8&&b[0]===0x89&&b[1]===0x50&&b[2]===0x4e&&b[3]===0x47,
  'image/jpeg':b=>b.length>3&&b[0]===0xff&&b[1]===0xd8&&b[2]===0xff,
  'image/webp':b=>b.length>12&&String.fromCharCode(...b.slice(0,4))==='RIFF'&&String.fromCharCode(...b.slice(8,12))==='WEBP',
  'image/x-icon':b=>b.length>4&&b[0]===0&&b[1]===0&&b[2]===1&&b[3]===0,
  'image/vnd.microsoft.icon':b=>b.length>4&&b[0]===0&&b[1]===0&&b[2]===1&&b[3]===0,
};
export async function saveBranding(_:ActionState,f:FormData):Promise<ActionState>{
  const slug=z.string().parse(f.get('slug'));
  const {db,org,canEdit}=await editorAccess(slug);
  if(!canEdit)return {ok:false,message:'Você não tem permissão para alterar a identidade visual.'};
  const color=z.string().regex(/^#[0-9a-fA-F]{6}$/);
  const parsed=z.object({platform_name:z.string().min(2).max(100),primary_color:color,secondary_color:color,background_color:color,login_background_color:color}).safeParse(Object.fromEntries(f));
  if(!parsed.success)return {ok:false,message:'Confira nome e cores.'};
  const fields=['logo_path','favicon_path','login_background_path','dashboard_background_path'] as const;
  const paths:Record<string,string>={};
  const uploaded:string[]=[];
  const cleanup=()=>uploaded.length?db.storage.from('branding').remove(uploaded):Promise.resolve();
  for(const field of fields){
    const file=f.get(field);
    if(!(file instanceof File)||!file.size)continue;
    const validType=imageSignatures[file.type];
    if(file.size>10*1024*1024||!validType)return await cleanup(),{ok:false,message:'Envie PNG, JPG, WebP ou ICO de até 10 MB.'};
    if(!validType(new Uint8Array(await file.slice(0,16).arrayBuffer())))return await cleanup(),{ok:false,message:'O conteúdo do arquivo não corresponde ao formato informado.'};
    const ext=file.type==='image/jpeg'?'jpg':file.type==='image/webp'?'webp':file.type.includes('icon')?'ico':'png';
    const path=org.id+'/'+crypto.randomUUID()+'.'+ext;
    const {error}=await db.storage.from('branding').upload(path,file,{contentType:file.type});
    if(error)return await cleanup(),{ok:false,message:'Sem permissão para enviar imagem ou arquivo inválido.'};
    paths[field]=path;uploaded.push(path);
  }
  const replaced=Object.keys(paths).length?await db.from('branding').select(fields.join(',')).eq('organization_id',org.id).maybeSingle():null;
  const {error}=await db.from('branding').update({...parsed.data,...paths}).eq('organization_id',org.id);
  if(error){await cleanup();return {ok:false,message:'Não foi possível salvar a identidade visual.'};}
  const previous=replaced?.data as Record<string,string|null>|null;
  const stale=previous?Object.keys(paths).map((field)=>previous[field]).filter((path):path is string=>!!path&&path.startsWith(org.id+'/')):[];
  if(stale.length)await db.storage.from('branding').remove(stale);
  revalidatePath('/'+slug,'layout');revalidatePath('/login');
  return {ok:true,message:'Identidade visual atualizada.'};
}

export async function saveDashboard(_:ActionState,f:FormData):Promise<ActionState>{
  const slug=z.string().parse(f.get('slug'));
  const {db,org,canEdit}=await editorAccess(slug);
  if(!canEdit)return {ok:false,message:'Você não tem permissão para alterar o dashboard.'};
  const allowed=new Set<string>(dashboardMetricKeys);
  const enabledMetrics=[...new Set(f.getAll('enabled_metrics').map(String))];
  if(!enabledMetrics.length||enabledMetrics.some((metric)=>!allowed.has(metric)))return {ok:false,message:'Selecione ao menos uma métrica válida.'};
  const allowedPages=new Set(['overview','paid','meta_ads','google_ads','tiktok_ads','funnel','organic','facebook_organic','instagram_organic','tiktok_organic','creatives','external']);
  const enabledPages=[...new Set(f.getAll('enabled_pages').map(String))];
  if(enabledPages.some((page)=>!allowedPages.has(page)))return {ok:false,message:'Uma das páginas selecionadas é inválida.'};
  const funnelModel=z.enum(['lead_generation','messages','ecommerce','local_business','inside_sales','appointments','custom']).catch('custom').parse(f.get('funnel_model'));
  let funnelSteps:unknown;try{funnelSteps=JSON.parse(String(f.get('funnel_steps')||'[]'));}catch{return {ok:false,message:'Configuração do funil inválida.'};}
  const funnelStepSchema=z.array(z.object({metric:z.enum(funnelMetricDefinitions.map((item)=>item.key) as [typeof funnelMetricDefinitions[number]['key'],...typeof funnelMetricDefinitions[number]['key'][]]),label:z.string().trim().min(1).max(40)})).min(2).max(12).refine((steps)=>new Set(steps.map((step)=>step.metric)).size===steps.length,'Etapas repetidas');
  const parsedFunnel=funnelStepSchema.safeParse(funnelSteps);if(!parsedFunnel.success)return {ok:false,message:'Escolha entre 2 e 12 etapas válidas, sem repetições.'};
  const allowedWidgets=new Set(['kpis','funnel','campaigns','timeline','creatives','platforms']);
  const widgetOrder=[...new Set(f.getAll('widget_order').map(String))];
  if(!widgetOrder.length||widgetOrder.some((widget)=>!allowedWidgets.has(widget)))return {ok:false,message:'A ordem dos blocos é inválida.'};
  const targets:Record<string,number|null>={};
  for(const key of ['target_roas','target_roi','target_cpa','target_revenue','target_purchases']){const value=String(f.get(key)||'');targets[key]=value===''?null:Number(value);if(targets[key]!=null&&(!Number.isFinite(targets[key])||(key!=='target_roi'&&targets[key]!<0)))return {ok:false,message:'Metas inválidas.'};}
  const {error}=await db.from('dashboard_configs').update({enabled_pages:enabledPages,enabled_metrics:enabledMetrics,widget_order:widgetOrder,preferred_revenue_source:f.get('preferred_revenue_source')==='spreadsheet'?'spreadsheet':'crm',funnel_model:funnelModel,funnel_steps:parsedFunnel.data,only_platforms_with_data:true,...targets}).eq('organization_id',org.id);
  revalidatePath('/'+slug,'layout');
  return {ok:!error,message:error?'Configuração inválida.':'Dashboard atualizado com as métricas selecionadas.'};
}
