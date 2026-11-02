import type {Row} from '@/types/database.types';

/** Conjunto de dados do painel de marketing, montado só com métricas reais já sincronizadas. */
export const PAINEL_DAYS=60;
export const PAINEL_OBJECTIVES=['Reconhecimento','Tráfego','Engajamento','Leads','Vendas','Remarketing'] as const;
const PLATFORM_NAMES:Record<string,string>={meta_ads:'Meta Ads',google_ads:'Google Ads',tiktok_ads:'TikTok Ads'};
const FORMAT_NAMES:Record<string,string>={image:'Imagem',video:'Vídeo',carousel:'Carrossel',text:'Texto'};
export type BreakdownType='gender'|'age'|'device'|'state'|'city';
export const BREAKDOWN_TYPES:BreakdownType[]=['gender','age','device','state','city'];

export type AdRow=Pick<Row<'metrics_ads'>,'metric_date'|'platform'|'account_id'|'campaign_id'|'campaign_name'|'ad_id'|'spend'|'revenue'|'impressions'|'clicks'|'page_views'|'leads'|'message_leads'|'checkouts'|'purchases'>;
export type BreakdownRow=Pick<Row<'metrics_ads_breakdowns'>,'metric_date'|'platform'|'campaign_id'|'dimension_type'|'dimension_value'|'dimension_label'|'spend'|'revenue'|'impressions'|'clicks'|'leads'|'message_leads'|'purchases'>;
export type CrmRow=Pick<Row<'metrics_crm'>,'metric_date'|'channel'|'revenue'|'purchases'|'leads'>;
export type CreativeRow=Pick<Row<'creatives'>,'platform'|'campaign_id'|'ad_id'|'kind'|'name'|'thumbnail_url'>;

export type PainelDataset={
  end:string;days:number;currency:string;
  platforms:{id:string;name:string}[];
  campaigns:{id:string;n:string;p:number;o:number}[];
  ads:{id:string;n:string;f:string;c:number;t:string|null}[];
  /** [dia, campanha, anúncio, impressões, cliques, gasto, leads, vendas, receita, visualizações da página, checkouts] */
  rows:number[][];
  dims:Record<BreakdownType,string[]>;
  /** [dia, campanha, tipo, valor, impressões, cliques, gasto, leads, vendas, receita] */
  brk:number[][];
  /** [dia, canal, receita, compras, leads] */
  crm:(string|number)[][];
  crmChannels:string[];
};

const n=(v:number|null|undefined)=>typeof v==='number'&&Number.isFinite(v)?v:0;
const dayIndex=(end:string,date:string)=>PAINEL_DAYS-1-Math.round((Date.parse(end+'T12:00:00Z')-Date.parse(date+'T12:00:00Z'))/86400000);

export function normalizeDevice(raw:string){
  const v=raw.toLowerCase();
  if(/desktop|computer|pc/.test(v))return 'Desktop';
  if(/tablet|ipad/.test(v))return 'Tablet';
  if(/mobile|iphone|android|smartphone|phone|ios/.test(v))return 'Mobile';
  return 'Outros';
}
export function normalizeGender(raw:string){
  const v=raw.toLowerCase().trim();
  if(['female','feminino','f','mulher','women','woman'].includes(v))return 'Feminino';
  if(['male','masculino','m','homem','men','man'].includes(v))return 'Masculino';
  return 'Não informado';
}
export function inferObjective(name:string,t:{imp:number;clk:number;ld:number;sl:number;rv:number}){
  const label=name.toLowerCase();
  if(/remarketing|retargeting|retarget|rmkt/.test(label))return 5;
  if(t.sl>0||t.rv>0)return 4;
  if(t.ld>0)return 3;
  if(/engaj|engagement|interac|mensage|post/.test(label))return 2;
  if(/alcance|reconhec|branding|awareness|video view/.test(label))return 0;
  if(t.clk>0)return 1;
  return 0;
}

export function buildPainelDataset(input:{end:string;currency:string;ads:AdRow[];breakdowns:BreakdownRow[];crm:CrmRow[];creatives:CreativeRow[]}):PainelDataset{
  const {end}=input;
  const platformIds:string[]=[];
  const platformOf=(id:string)=>{let i=platformIds.indexOf(id);if(i<0){platformIds.push(id);i=platformIds.length-1;}return i;};
  const campaignIndex=new Map<string,number>();
  const campaigns:PainelDataset['campaigns']=[];
  const campaignTotals:{imp:number;clk:number;ld:number;sl:number;rv:number}[]=[];
  const adIndex=new Map<string,number>();
  const ads:PainelDataset['ads']=[];
  const creativeByAd=new Map<string,CreativeRow>();
  for(const c of input.creatives)if(c.ad_id)creativeByAd.set(`${c.platform}:${c.ad_id}`,c);
  const campaignOf=(platform:string,id:string,name:string)=>{
    const key=`${platform}:${id}`;let i=campaignIndex.get(key);
    if(i===undefined){i=campaigns.length;campaignIndex.set(key,i);campaigns.push({id:key,n:name||id,p:platformOf(platform),o:0});campaignTotals.push({imp:0,clk:0,ld:0,sl:0,rv:0});}
    return i;
  };
  const rows:number[][]=[];
  for(const r of input.ads){
    const d=dayIndex(end,r.metric_date);if(d<0||d>=PAINEL_DAYS)continue;
    const c=campaignOf(r.platform,r.campaign_id,r.campaign_name);
    const adKey=`${r.platform}:${r.ad_id}`;let a=adIndex.get(adKey);
    if(a===undefined){
      const cr=creativeByAd.get(adKey);
      a=ads.length;adIndex.set(adKey,a);
      ads.push({id:adKey,n:cr?.name?.trim()||`Anúncio ${r.ad_id}`,f:cr?FORMAT_NAMES[cr.kind]??'Imagem':'Não identificado',c,t:cr?.thumbnail_url??null});
    }
    const ld=n(r.leads)+n(r.message_leads);
    rows.push([d,c,a,n(r.impressions),n(r.clicks),n(r.spend),ld,n(r.purchases),n(r.revenue),n(r.page_views),n(r.checkouts)]);
    const t=campaignTotals[c];t.imp+=n(r.impressions);t.clk+=n(r.clicks);t.ld+=ld;t.sl+=n(r.purchases);t.rv+=n(r.revenue);
  }
  campaigns.forEach((c,i)=>{c.o=inferObjective(c.n,campaignTotals[i]);});

  const dims:Record<BreakdownType,string[]>={gender:['Feminino','Masculino','Não informado'],age:[],device:['Desktop','Mobile','Tablet','Outros'],state:[],city:[]};
  const brk:number[][]=[];
  const label=(type:BreakdownType,r:BreakdownRow)=>{
    const raw=(r.dimension_label?.trim()||r.dimension_value||'Não informado');
    if(type==='gender')return normalizeGender(r.dimension_value||raw);
    if(type==='device')return normalizeDevice(r.dimension_value||raw);
    return raw;
  };
  for(const r of input.breakdowns){
    const type=r.dimension_type as BreakdownType;const t=BREAKDOWN_TYPES.indexOf(type);if(t<0)continue;
    const d=dayIndex(end,r.metric_date);if(d<0||d>=PAINEL_DAYS)continue;
    const key=`${r.platform}:${r.campaign_id}`;const c=campaignIndex.get(key);if(c===undefined)continue;
    const text=label(type,r);let v=dims[type].indexOf(text);if(v<0){dims[type].push(text);v=dims[type].length-1;}
    brk.push([d,c,t,v,n(r.impressions),n(r.clicks),n(r.spend),n(r.leads)+n(r.message_leads),n(r.purchases),n(r.revenue)]);
  }
  const ageBefore=dims.age.slice();
  dims.age.sort((x,y)=>x.localeCompare(y,'pt-BR',{numeric:true}));
  const ageAt=new Map(dims.age.map((label,i)=>[label,i]));
  for(const row of brk)if(row[2]===BREAKDOWN_TYPES.indexOf('age'))row[3]=ageAt.get(ageBefore[row[3]])??row[3];

  const crmChannels:string[]=[];
  const crm:PainelDataset['crm']=[];
  for(const r of input.crm){
    const d=dayIndex(end,r.metric_date);if(d<0||d>=PAINEL_DAYS)continue;
    const ch=r.channel||'Sem canal';let i=crmChannels.indexOf(ch);if(i<0){crmChannels.push(ch);i=crmChannels.length-1;}
    crm.push([d,i,n(r.revenue),n(r.purchases),n(r.leads)]);
  }
  return {end,days:PAINEL_DAYS,currency:input.currency,
    platforms:platformIds.map(id=>({id,name:PLATFORM_NAMES[id]??id})),campaigns,ads,rows,dims,brk,crm,crmChannels};
}
