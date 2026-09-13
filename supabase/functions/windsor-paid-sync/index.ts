import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const APP_URL="https://mediahub.engajeperformance.com.br";
const cors={"Access-Control-Allow-Origin":APP_URL,"Access-Control-Allow-Headers":"authorization, apikey, content-type"};
const json=(v:unknown,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{...cors,"Content-Type":"application/json"}});
const n=(v:unknown)=>Number.isFinite(Number(v))?Number(v):0;
async function isAdmin(req:Request,url:string,anon:string){const c=createClient(url,anon,{global:{headers:{Authorization:req.headers.get("Authorization")||""}}});const {data:{user}}=await c.auth.getUser();if(!user)return null;const {data:p}=await c.from("user_profiles").select("role,is_active").eq("id",user.id).single();return p?.is_active&&p.role==="super_admin"?user:null;}
function key(parts:any[]){return parts.map(v=>String(v??"").replaceAll("|","_")).join("|");}

async function fetchRows(connector:string,apiKey:string,days:number){
  const defs:any={
    facebook:{platform:"meta_ads",fields:["date","account_id","account_name","campaign","campaign_id","adset_name","adset_id","ad_name","ad_id","impressions","reach","clicks","spend","cpm","cpc","ctr","frequency","actions_lead","actions_purchase","actions_messaging_conversation_started_7d"]},
    google_ads:{platform:"google_ads",fields:["date","account_id","account_name","campaign","campaign_id","ad_group","ad_group_id","ad_id","ad_name","impressions","clicks","spend","cpm","cpc","ctr","conversions","conversion_value"]}
  };
  const def=defs[connector];if(!def)throw new Error("Conector pago inválido");
  const run=async(fields:string[])=>{
    const u=new URL(`https://connectors.windsor.ai/${connector}`);u.searchParams.set("api_key",apiKey);u.searchParams.set("date_preset",`last_${days}d`);u.searchParams.set("fields",fields.join(","));u.searchParams.set("refresh_since",Math.min(days,30)+"d");u.searchParams.set("refresh_interval","1h");
    const r=await fetch(u,{headers:{Accept:"application/json","User-Agent":"Windsor/1.0"}});const p=await r.json().catch(()=>({}));if(!r.ok||p?.error)throw new Error(p?.error||p?.detail||`Windsor ${connector} HTTP ${r.status}`);return Array.isArray(p)?p:(Array.isArray(p?.data)?p.data:[]);
  };
  try{return {rows:await run(def.fields),platform:def.platform};}
  catch(e){const minimal=["date","account_id","account_name","campaign","campaign_id","impressions","clicks","spend","cpm","cpc","ctr"];return {rows:await run(minimal),platform:def.platform};}
}

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  const url=Deno.env.get("SUPABASE_URL")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!,service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const user=await isAdmin(req,url,anon);if(!user)return json({error:"Acesso restrito ao superadministrador"},403);
  const apiKey=Deno.env.get("WINDSOR_API_KEY");if(!apiKey)return json({error:"WINDSOR_API_KEY não configurada"},500);
  const admin=createClient(url,service);
  try{
    const body=await req.json().catch(()=>({}));const days=Math.min(Math.max(Number(body.days)||365,1),730);const only=String(body.connector||"");
    const connectors=only?[only]:["facebook","google_ads"];let received=0,upserted=0;const errors:any[]=[];
    const {data:mappings}=await admin.from("integration_accounts").select("connector,external_account_id,client_id").eq("provider_id","windsor");
    const map=new Map((mappings||[]).map((x:any)=>[`${x.connector}:${String(x.external_account_id).replace(/^act_/,"")}`,x.client_id||null]));
    for(const connector of connectors){
      try{
        const {rows,platform}=await fetchRows(connector,apiKey,days);received+=rows.length;
        for(const x of rows){
          const accountId=String(x.account_id||"");if(!accountId)continue;const lookup=String(accountId).replace(/^act_/,"");const clientId=map.get(`${connector}:${lookup}`)??map.get(`${connector}:${accountId}`)??null;
          const campaignId=String(x.campaign_id||"");const adsetId=String(x.adset_id||x.ad_group_id||"");const adId=String(x.ad_id||"");const date=String(x.date||"").slice(0,10);if(!date)continue;
          const conversions=n(x.conversions)||n(x.actions_lead)||n(x.actions_messaging_conversation_started_7d)||n(x.actions_purchase);
          const rec={row_key:key([platform,accountId,date,campaignId,adsetId,adId]),platform,provider_id:"windsor",connector,client_id:clientId,account_id:accountId,account_name:x.account_name||null,metric_date:date,campaign_id:campaignId||null,campaign_name:x.campaign||x.campaign_name||null,adset_id:adsetId||null,adset_name:x.adset_name||x.ad_group||null,ad_id:adId||null,ad_name:x.ad_name||null,impressions:n(x.impressions),reach:n(x.reach),clicks:n(x.clicks),spend:n(x.spend),cpm:n(x.cpm),cpc:n(x.cpc),ctr:n(x.ctr),frequency:n(x.frequency),conversions,conversion_value:n(x.conversion_value),raw:x,synced_at:new Date().toISOString()};
          const {error}=await admin.from("paid_media_metrics").upsert(rec,{onConflict:"row_key"});if(!error)upserted++;else errors.push({connector,accountId,error:error.message});
        }
        await admin.from("integration_accounts").update({last_sync_at:new Date().toISOString(),last_error:null,updated_at:new Date().toISOString()}).eq("provider_id","windsor").eq("connector",connector);
      }catch(e){errors.push({connector,error:e instanceof Error?e.message:String(e)});await admin.from("integration_accounts").update({last_error:e instanceof Error?e.message:String(e),updated_at:new Date().toISOString()}).eq("provider_id","windsor").eq("connector",connector);}
    }
    return json({ok:errors.length===0,received,upserted,errors,days});
  }catch(e){console.error(e);return json({error:e instanceof Error?e.message:String(e)},500);}
});
