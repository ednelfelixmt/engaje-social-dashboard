import {NextResponse} from 'next/server';
import {tenant} from '@/lib/auth/session';
import {all} from '@/lib/metrics/query';
import {buildPainelDataset,PAINEL_DAYS,type AdRow,type BreakdownRow,type CrmRow,type CreativeRow} from '@/lib/painel/dataset';

export const dynamic='force-dynamic';

export async function GET(_request:Request,{params:pending}:{params:Promise<{organizationSlug:string}>}){
 const {organizationSlug}=await pending;
 const {db,org}=await tenant(organizationSlug);
 const end=new Intl.DateTimeFormat('en-CA',{timeZone:org.timezone}).format(new Date());
 const start=new Date(end+'T12:00:00Z');start.setUTCDate(start.getUTCDate()-(PAINEL_DAYS-1));
 const from=start.toISOString().slice(0,10);
 const currency=org.currency;
 const [ads,breakdowns,crm,creatives]=await Promise.all([
  all<AdRow>((a,b)=>db.from('metrics_ads').select('metric_date,platform,account_id,campaign_id,campaign_name,ad_id,spend,revenue,impressions,clicks,page_views,leads,message_leads,checkouts,purchases').eq('organization_id',org.id).eq('currency',currency).gte('metric_date',from).lte('metric_date',end).order('id').range(a,b)),
  all<BreakdownRow>((a,b)=>db.from('metrics_ads_breakdowns').select('metric_date,platform,campaign_id,dimension_type,dimension_value,dimension_label,spend,revenue,impressions,clicks,leads,message_leads,purchases').eq('organization_id',org.id).eq('currency',currency).in('dimension_type',['gender','age','device','state','city']).gte('metric_date',from).lte('metric_date',end).order('id').range(a,b)),
  all<CrmRow>((a,b)=>db.from('metrics_crm').select('metric_date,channel,revenue,purchases,leads').eq('organization_id',org.id).eq('currency',currency).gte('metric_date',from).lte('metric_date',end).order('id').range(a,b)),
  all<CreativeRow>((a,b)=>db.from('creatives').select('platform,campaign_id,ad_id,kind,name,thumbnail_url').eq('organization_id',org.id).not('ad_id','is',null).order('id').range(a,b)),
 ]);
 const data=buildPainelDataset({end,currency,ads,breakdowns,crm,creatives});
 return NextResponse.json(data,{headers:{'Cache-Control':'private, no-store'}});
}
