import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const APP_URL="https://mediahub.engajeperformance.com.br";
const cors={"Access-Control-Allow-Origin":APP_URL,"Access-Control-Allow-Headers":"authorization, apikey, content-type"};
const json=(v:unknown,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{...cors,"Content-Type":"application/json"}});
const n=(v:unknown)=>Number.isFinite(Number(v))?Number(v):0;
async function isAdmin(req:Request,url:string,anon:string){const c=createClient(url,anon,{global:{headers:{Authorization:req.headers.get("Authorization")||""}}});const {data:{user}}=await c.auth.getUser();if(!user)return null;const {data:p}=await c.from("user_profiles").select("role,is_active").eq("id",user.id).single();return p?.is_active&&p.role==="super_admin"?user:null;}
async function getRows(connector:string,key:string,days:number,fields:string[]){const u=new URL(`https://connectors.windsor.ai/${connector}`);u.searchParams.set("api_key",key);u.searchParams.set("date_preset",`last_${days}d`);u.searchParams.set("fields",fields.join(","));u.searchParams.set("refresh_since",Math.min(days,30)+"d");u.searchParams.set("refresh_interval","1h");const r=await fetch(u,{headers:{Accept:"application/json","User-Agent":"Windsor/1.0"}});const p=await r.json().catch(()=>({}));if(!r.ok||p?.error)throw new Error(p?.error||p?.detail||`Windsor ${connector} HTTP ${r.status}`);return Array.isArray(p)?p:(Array.isArray(p?.data)?p.data:[]);}
async function permanentImage(admin:any,clientId:string,postId:string,url:string|null){if(!url)return null;try{const r=await fetch(url);if(!r.ok)return url;const blob=await r.blob(),ext=(blob.type.split("/")[1]||"jpg").replace("jpeg","jpg");const path=`${clientId}/${postId.replace(/[^a-zA-Z0-9_-]/g,"_")}.${ext}`;const up=await admin.storage.from("social-media").upload(path,blob,{contentType:blob.type,upsert:true});return up.error?url:admin.storage.from("social-media").getPublicUrl(path).data.publicUrl+"?v="+Date.now();}catch{return url;}}

Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 const url=Deno.env.get("SUPABASE_URL")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!,service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;const user=await isAdmin(req,url,anon);if(!user)return json({error:"Acesso restrito ao superadministrador"},403);const apiKey=Deno.env.get("WINDSOR_API_KEY");if(!apiKey)return json({error:"WINDSOR_API_KEY não configurada"},500);const admin=createClient(url,service);
 try{
  const body=await req.json().catch(()=>({}));const days=Math.min(Math.max(Number(body.days)||365,1),730);const {data:accounts}=await admin.from("accounts").select("id,client_id,platform");const accountMap=new Map((accounts||[]).map((a:any)=>[`${a.platform}:${a.id}`,a.client_id]));let posts=0,metrics=0,skipped=0;const errors:any[]=[];
  const sources=[
   {connector:"facebook_organic",platform:"facebook_organic",fields:["account_id","post_id","post_type","post_created_time","post_message","post_permalink_url","post_full_picture","post_picture","post_impressions","post_impressions_unique","post_engaged_users","post_reactions_like_total","post_comments","post_shares"]},
   {connector:"instagram",platform:"instagram",fields:["date","account_id","media_id","media_type","media_url","media_thumbnail_url","media_permalink","media_caption","media_comments_count","media_like_count","media_impressions","media_reach","media_engagement","media_saved","media_shares","views"]}
  ];
  for(const s of sources){
   try{
    const rows=await getRows(s.connector,apiKey,days,s.fields);
    for(const r of rows){
      const accountId=String(r.account_id||"");const clientId=accountMap.get(`${s.platform}:${accountId}`);const postId=String(r.post_id||r.media_id||"");if(!clientId||!postId){skipped++;continue;}
      const published=r.post_created_time||r.date||new Date().toISOString();const rawThumb=r.post_full_picture||r.post_picture||r.media_thumbnail_url||r.media_url||null;const thumb=await permanentImage(admin,String(clientId),postId,rawThumb);
      const post={id:postId,account_id:accountId,client_id:clientId,platform:s.platform,source_provider:"windsor",media_type:r.post_type||r.media_type||"post",media_url:r.media_url||null,thumbnail_url:thumb,permalink:r.post_permalink_url||r.media_permalink||null,caption:r.post_message||r.media_caption||"",published_at:published,updated_at:new Date().toISOString()};
      const pu=await admin.from("posts").upsert(post,{onConflict:"id"});if(!pu.error)posts++;
      const metric={post_id:postId,account_id:accountId,client_id:clientId,source_provider:"windsor",synced_at:new Date().toISOString(),reach:n(r.post_impressions_unique??r.media_reach),impressions:n(r.post_impressions??r.media_impressions??r.views),engagement:n(r.post_engaged_users??r.media_engagement),like_count:n(r.post_reactions_like_total??r.media_like_count),comment_count:n(r.post_comments??r.media_comments_count),saved:n(r.media_saved),shares:n(r.post_shares??r.media_shares),views:n(r.views)};
      const mu=await admin.from("post_metrics").insert(metric);if(!mu.error)metrics++;
    }
    await admin.from("sync_log").insert({platform:s.platform,sync_type:"full_rebuild",status:"success",records_synced:rows.length,records_created:posts,records_updated:metrics,started_at:new Date().toISOString(),finished_at:new Date().toISOString()});
   }catch(e){errors.push({connector:s.connector,error:e instanceof Error?e.message:String(e)});await admin.from("sync_log").insert({platform:s.platform,sync_type:"full_rebuild",status:"error",error_message:e instanceof Error?e.message:String(e),started_at:new Date().toISOString(),finished_at:new Date().toISOString()});}
  }
  return json({ok:errors.length===0,posts,metrics,skipped,errors,days,provider:"windsor"});
 }catch(e){console.error(e);return json({error:e instanceof Error?e.message:String(e)},500);}
});
