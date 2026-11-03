import {NextResponse} from 'next/server';
import {requireAdmin} from '@/lib/auth/session';
import {all} from '@/lib/metrics/query';
import {buildPainelDataset,PAINEL_DAYS,type AdRow,type BreakdownRow,type CrmRow,type CreativeRow} from '@/lib/painel/dataset';

export const dynamic='force-dynamic';

/** Painel da carteira: todos os clientes ativos da agência, em BRL, com o cliente como filtro. */
export async function GET(){
 const {db}=await requireAdmin();
 const end=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Cuiaba'}).format(new Date());
 const start=new Date(end+'T12:00:00Z');start.setUTCDate(start.getUTCDate()-(PAINEL_DAYS-1));
 const from=start.toISOString().slice(0,10);
 const currency='BRL';
 const {data:orgs,error}=await db.from('organizations').select('id,name').eq('is_agency',false).eq('status','active').order('name');
 if(error)throw error;
 const clients=(orgs??[]).map(o=>({id:o.id,name:o.name}));
 const ids=clients.map(c=>c.id);
 if(!ids.length)return NextResponse.json(buildPainelDataset({end,currency,ads:[],breakdowns:[],crm:[],creatives:[],clients}),{headers:{'Cache-Control':'private, no-store'}});
 const [ads,breakdowns,crm,creatives]=await Promise.all([
  all<AdRow>((a,b)=>db.from('metrics_ads').select('organization_id,metric_date,platform,account_id,campaign_id,campaign_name,ad_id,spend,revenue,impressions,clicks,page_views,leads,message_leads,checkouts,purchases').in('organization_id',ids).eq('currency',currency).gte('metric_date',from).lte('metric_date',end).order('id').range(a,b)),
  all<BreakdownRow>((a,b)=>db.from('metrics_ads_breakdowns').select('organization_id,metric_date,platform,campaign_id,dimension_type,dimension_value,dimension_label,spend,revenue,impressions,clicks,leads,message_leads,purchases').in('organization_id',ids).eq('currency',currency).in('dimension_type',['gender','age','device','state','city']).gte('metric_date',from).lte('metric_date',end).order('id').range(a,b)),
  all<CrmRow>((a,b)=>db.from('metrics_crm').select('organization_id,metric_date,channel,revenue,purchases,leads').in('organization_id',ids).eq('currency',currency).gte('metric_date',from).lte('metric_date',end).order('id').range(a,b)),
  all<CreativeRow&{organization_id:string}>((a,b)=>db.from('creatives').select('organization_id,platform,campaign_id,ad_id,kind,name,thumbnail_url').in('organization_id',ids).not('ad_id','is',null).order('id').range(a,b)),
 ]);
 return NextResponse.json(buildPainelDataset({end,currency,ads,breakdowns,crm,creatives,clients}),{headers:{'Cache-Control':'private, no-store'}});
}
