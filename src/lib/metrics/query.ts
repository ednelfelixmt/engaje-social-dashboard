import 'server-only';
import {z} from 'zod';
import {calendarDays,comparisonPeriod} from './calendar';
import {tenant} from '@/lib/auth/session';
import type {Row} from '@/types/database.types';
import {campaignSelection} from './campaign-selection';
export type Filters={from:string;to:string;compare:'none'|'previous_period'|'previous_year';currency:string};
const iso=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s=>!isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s);
export function filters(search:Record<string,string|undefined>,timezone:string,currency:string):Filters{const today=new Intl.DateTimeFormat('en-CA',{timeZone:timezone}).format(new Date());const end=new Date(today+'T12:00:00Z');end.setUTCDate(end.getUTCDate()-29);const from=iso.safeParse(search.from),to=iso.safeParse(search.to);const result={from:from.success?from.data:end.toISOString().slice(0,10),to:to.success?to.data:today,compare:z.enum(['none','previous_period','previous_year']).catch('previous_period').parse(search.compare),currency:/^[A-Z]{3}$/.test(search.currency||'')?search.currency!:currency};if(result.from>result.to)throw new Error('A data inicial deve anteceder a final.');try{calendarDays(result.from,result.to);}catch{throw new Error('Selecione um intervalo de até dois anos.');}return result;}
export function previous(f:Filters){return {...f,...comparisonPeriod(f.from,f.to,f.compare)};}
export async function all<T>(query:(from:number,to:number)=>PromiseLike<{data:T[]|null;error:unknown}>){const rows:T[]=[];for(let offset=0;;offset+=1000){const {data,error}=await query(offset,offset+999);if(error)throw error;rows.push(...(data||[]));if(!data||data.length<1000)return rows;}}
export {sum,totals} from './aggregation';
type DashboardDb=Awaited<ReturnType<typeof tenant>>['db'];
type DashboardDataOptions={
  platform?:string|null;
  campaign?:{account:string;campaign:string};
  ads?:boolean;
  adsComparison?:boolean;
  breakdowns?:boolean;
  crm?:boolean;
  crmComparison?:boolean;
  organic?:boolean;
  organicComparison?:boolean;
  organicAccounts?:boolean;
  organicAccountsComparison?:boolean;
  creatives?:boolean;
  creativeLimit?:number;
  creativePeriod?:boolean;
  adCampaigns?:boolean;
};

export async function dashboardData(db:DashboardDb,organizationId:string,f:Filters,options:DashboardDataOptions={}){
  const platform=options.platform??null;
  const selectedCampaign=options.campaign?campaignSelection({platform,account:options.campaign.account,campaign:options.campaign.campaign}):null;
  if(options.campaign&&!selectedCampaign)throw new Error('Invalid campaign query scope');
  if(selectedCampaign&&[options.breakdowns,options.crm,options.crmComparison,options.organic,options.organicComparison,options.organicAccounts,options.organicAccountsComparison,options.creatives,options.adCampaigns].some(Boolean))throw new Error('Campaign selector only supports ad reads');
  const readAds=(range:Filters)=>all<Row<'metrics_ads'>>((a,b)=>{
    let query=db.from('metrics_ads').select('*').eq('organization_id',organizationId).eq('currency',f.currency).gte('metric_date',range.from).lte('metric_date',range.to).order('id');
    if(platform)query=query.eq('platform',platform as Row<'metrics_ads'>['platform']);
    if(selectedCampaign){
      query=query.eq('campaign_id',selectedCampaign.campaign);
      query=selectedCampaign.platform==='meta_ads'?query.in('account_id',[selectedCampaign.account,'act_'+selectedCampaign.account]):query.eq('account_id',selectedCampaign.account);
    }
    return query.range(a,b);
  });
  const readBreakdowns=(range:Filters)=>all<Row<'metrics_ads_breakdowns'>>((a,b)=>{
    let query=db.from('metrics_ads_breakdowns').select('*').eq('organization_id',organizationId).eq('currency',f.currency).gte('metric_date',range.from).lte('metric_date',range.to).order('id');
    if(platform)query=query.eq('platform',platform as Row<'metrics_ads_breakdowns'>['platform']);
    return query.range(a,b);
  });
  const readCrm=(range:Filters)=>all<Row<'metrics_crm'>>((a,b)=>db.from('metrics_crm').select('*').eq('organization_id',organizationId).eq('currency',f.currency).gte('metric_date',range.from).lte('metric_date',range.to).order('id').range(a,b));
  const readOrganic=(range:Filters)=>all<Row<'metrics_organic'>>((a,b)=>{
    let query=db.from('metrics_organic').select('*').eq('organization_id',organizationId).gte('metric_date',range.from).lte('metric_date',range.to).order('id');
    if(platform)query=query.eq('platform',platform as Row<'metrics_organic'>['platform']);
    return query.range(a,b);
  });
  const readOrganicAccounts=(range:Filters)=>all<Row<'metrics_organic_accounts'>>((a,b)=>{
    let query=db.from('metrics_organic_accounts').select('*').eq('organization_id',organizationId).gte('metric_date',range.from).lte('metric_date',range.to).order('metric_date').order('id');
    if(platform)query=query.eq('platform',platform as Row<'metrics_organic_accounts'>['platform']);
    return query.range(a,b);
  });
  const readCreatives=()=>{
    const createQuery=()=>{
      let query=db.from('creatives').select('*').eq('organization_id',organizationId).order('published_at',{ascending:false}).order('id');
      if(options.creativePeriod!==false)query=query.gte('published_at',f.from+'T00:00:00Z').lt('published_at',new Date(Date.parse(f.to)+86400000).toISOString());
      if(platform)query=query.eq('platform',platform as Row<'creatives'>['platform']);
      return query;
    };
    if(options.creativeLimit)return createQuery().limit(options.creativeLimit).then(({data,error})=>{if(error)throw error;return data??[];});
    return all<Row<'creatives'>>((a,b)=>createQuery().range(a,b));
  };
  const readCampaigns=()=>all<Row<'ad_campaigns'>>((a,b)=>{
    let query=db.from('ad_campaigns').select('*').eq('organization_id',organizationId).order('name').order('id');
    if(platform)query=query.eq('platform',platform as Row<'ad_campaigns'>['platform']);
    return query.range(a,b);
  });
  const comparisonRange=f.compare==='none'?null:previous(f);
  const [ads,adsComparison,breakdowns,crm,crmComparison,organic,organicComparison,organicAccounts,organicAccountsComparison,creatives,adCampaigns]=await Promise.all([
    options.ads?readAds(f):Promise.resolve([]),
    options.adsComparison&&comparisonRange?readAds(comparisonRange):Promise.resolve([]),
    options.breakdowns?readBreakdowns(f):Promise.resolve([]),
    options.crm?readCrm(f):Promise.resolve([]),
    options.crmComparison&&comparisonRange?readCrm(comparisonRange):Promise.resolve([]),
    options.organic?readOrganic(f):Promise.resolve([]),
    options.organicComparison&&comparisonRange?readOrganic(comparisonRange):Promise.resolve([]),
    options.organicAccounts?readOrganicAccounts(f):Promise.resolve([]),
    options.organicAccountsComparison&&comparisonRange?readOrganicAccounts(comparisonRange):Promise.resolve([]),
    options.creatives?readCreatives():Promise.resolve([]),
    options.adCampaigns?readCampaigns():Promise.resolve([]),
  ]);
  return {ads,adsComparison,breakdowns,crm,crmComparison,organic,organicComparison,organicAccounts,organicAccountsComparison,creatives,adCampaigns};
}
