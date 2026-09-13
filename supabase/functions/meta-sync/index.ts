import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const GRAPH="https://graph.facebook.com/v26.0";
const APP_URL="https://mediahub.engajeperformance.com.br";
const cors={"Access-Control-Allow-Origin":APP_URL,"Access-Control-Allow-Headers":"authorization, apikey, content-type"};
const json=(v:unknown,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{...cors,"Content-Type":"application/json"}});
const unbytes=(v:string)=>Uint8Array.from(atob(v),c=>c.charCodeAt(0));
const num=(v:unknown)=>Number.isFinite(Number(v))?Number(v):0;

async function cryptoKey(secret:string){return crypto.subtle.importKey("raw",await crypto.subtle.digest("SHA-256",new TextEncoder().encode(secret)),{name:"AES-GCM"},false,["decrypt"])}
async function decrypt(cipher:string,iv:string,secret:string){const raw=await crypto.subtle.decrypt({name:"AES-GCM",iv:unbytes(iv)},await cryptoKey(secret),unbytes(cipher));return new TextDecoder().decode(raw)}
function actionValue(actions:any[],names:string[]){for(const n of names){const a=(actions||[]).find(x=>x.action_type===n);if(a)return num(a.value)}return 0}
function resultFrom(actions:any[]){return actionValue(actions,["lead","onsite_conversion.lead_grouped","messaging_conversation_started_7d","purchase","omni_purchase","landing_page_view","video_thruplay_watched_actions"])}
async function isAdmin(req:Request,url:string,anon:string){const c=createClient(url,anon,{global:{headers:{Authorization:req.headers.get("Authorization")||""}}});const {data:{user}}=await c.auth.getUser();if(!user)return null;const {data:p}=await c.from("user_profiles").select("role,is_active").eq("id",user.id).single();return p?.is_active&&p.role==="super_admin"?user:null}

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  const url=Deno.env.get("SUPABASE_URL")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!,service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,secret=Deno.env.get("META_APP_SECRET")!;
  const user=await isAdmin(req,url,anon);if(!user)return json({error:"Acesso restrito ao superadministrador"},403);
  const admin=createClient(url,service);
  try{
    await admin.rpc("close_stale_sync_runs",{max_age:"15 minutes"}).catch(()=>null);
    const body=await req.json().catch(()=>({}));
    const clientId=String(body.client_id||"");const days=Math.min(Math.max(Number(body.days)||30,1),90);
    if(!clientId)return json({error:"client_id obrigatório"},400);
    let q=admin.from("meta_assets").select("id,connection_id,client_id,ad_account_id,name,status").eq("asset_type","ad_account").eq("client_id",clientId);
    if(body.ad_account_id)q=q.eq("ad_account_id",String(body.ad_account_id));
    const {data:assets,error:ae}=await q;if(ae)throw ae;if(!assets?.length)return json({error:"Nenhuma conta de anúncios Meta vinculada a este cliente"},404);
    const to=new Date(),from=new Date(to);from.setUTCDate(from.getUTCDate()-days);const since=from.toISOString().slice(0,10),until=to.toISOString().slice(0,10);
    let totalRows=0,totalUpserts=0;
    for(const asset of assets){
      const {data:conn,error:ce}=await admin.from("meta_connections").select("token_ciphertext,token_iv,status").eq("id",asset.connection_id).single();if(ce||!conn||conn.status!=="active")continue;
      const token=await decrypt(conn.token_ciphertext,conn.token_iv,secret);
      let next=`${GRAPH}/${asset.ad_account_id}/insights?level=ad&time_increment=1&limit=500&fields=account_id,campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,impressions,reach,clicks,spend,cpm,cpc,ctr,frequency,actions&time_range=${encodeURIComponent(JSON.stringify({since,until}))}&access_token=${encodeURIComponent(token)}`;
      while(next){
        const r=await fetch(next);const payload=await r.json();if(!r.ok||payload.error)throw new Error(payload.error?.message||`Meta HTTP ${r.status}`);
        const rows=Array.isArray(payload.data)?payload.data:[];totalRows+=rows.length;
        for(const x of rows){const actions=Array.isArray(x.actions)?x.actions:[];const rec={ad_id:String(x.ad_id),ad_name:x.ad_name||null,adset_id:x.adset_id||null,adset_name:x.adset_name||null,campaign_id:x.campaign_id||null,campaign_name:x.campaign_name||null,account_id:String(x.account_id||asset.ad_account_id),client_id:clientId,date_start:x.date_start,date_stop:x.date_stop,impressions:num(x.impressions),reach:num(x.reach),clicks:num(x.clicks),spend:num(x.spend),cpm:num(x.cpm),cpc:num(x.cpc),ctr:num(x.ctr),frequency:num(x.frequency),results:resultFrom(actions),actions,synced_at:new Date().toISOString()};const {error}=await admin.from("meta_ad_metrics").upsert(rec,{onConflict:"ad_id,date_start,date_stop"});if(!error)totalUpserts++;}
        next=payload.paging?.next||"";
      }
      await admin.from("meta_assets").update({last_synced_at:new Date().toISOString(),last_error:null,status:"active"}).eq("id",asset.id);
    }
    return json({ok:true,client_id:clientId,received:totalRows,upserted:totalUpserts,since,until});
  }catch(e){console.error(e);return json({error:e instanceof Error?e.message:String(e)},500)}
});
