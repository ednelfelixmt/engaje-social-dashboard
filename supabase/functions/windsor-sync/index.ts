import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
const n=(v:unknown)=>Number.isFinite(Number(v))?Number(v):0;

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  const auth=req.headers.get("Authorization")||"";
  const url=Deno.env.get("SUPABASE_URL")!;
  const anon=Deno.env.get("SUPABASE_ANON_KEY")!;
  const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}}});
  const {data:{user}}=await userClient.auth.getUser();
  if(!user)return json({error:"Não autenticado"},401);
  const {data:profile}=await userClient.from("user_profiles").select("role,is_active").eq("id",user.id).single();
  if(!profile?.is_active||profile.role!=="super_admin")return json({error:"Acesso restrito ao superadministrador"},403);

  const admin=createClient(url,service);
  const started=new Date().toISOString();
  let logId:number|undefined;
  try{
    const key=Deno.env.get("WINDSOR_API_KEY");
    if(!key)throw new Error("Credencial Windsor não configurada");
    const body=await req.json().catch(()=>({}));
    const days=Math.min(Math.max(Number(body.days)||30,1),90);
    const to=new Date(),from=new Date(to);from.setUTCDate(from.getUTCDate()-days);
    const date=(d:Date)=>d.toISOString().slice(0,10);
    const fields=[
      "account_id","account_name","post_id","post_type","post_created_time","post_message",
      "post_permalink_url","post_full_picture","post_picture","post_impressions",
      "post_impressions_unique","post_engaged_users","post_reactions_like_total",
      "post_comments","post_shares","created_time","message","permalink_url",
      "full_picture","picture","source","impressions","impressions_unique"
    ].join(",");
    const endpoint=new URL("https://connectors.windsor.ai/facebook_organic");
    endpoint.searchParams.set("api_key",key);endpoint.searchParams.set("date_from",date(from));
    endpoint.searchParams.set("date_to",date(to));endpoint.searchParams.set("fields",fields);
    const wr=await fetch(endpoint);if(!wr.ok)throw new Error(`Windsor HTTP ${wr.status}`);
    const payload=await wr.json();const rows=Array.isArray(payload.data)?payload.data:[];
    const {data:accounts}=await admin.from("accounts").select("id,client_id");
    const accountMap=new Map((accounts||[]).map((a:any)=>[String(a.id),a.client_id]));
    const {data:log}=await admin.from("sync_log").insert({platform:"facebook_organic",sync_type:"manual",status:"running",started_at:started}).select("id").single();
    logId=log?.id;
    let posts=0,metrics=0,images=0,skipped=0;
    for(const r of rows){
      const accountId=String(r.account_id||"");const clientId=accountMap.get(accountId);
      const postId=String(r.post_id||"");if(!clientId||!postId){skipped++;continue;}
      const published=r.post_created_time||r.created_time||new Date().toISOString();
      const thumb=r.post_full_picture||r.full_picture||r.post_picture||r.picture||null;
      let permanent:string|null=null;
      if(thumb){
        try{
          const ir=await fetch(thumb);if(ir.ok){
            const blob=await ir.blob(),ext=(blob.type.split("/")[1]||"jpg").replace("jpeg","jpg");
            const path=`${clientId}/${postId.replace(/[^a-zA-Z0-9_-]/g,"_")}.${ext}`;
            const up=await admin.storage.from("social-media").upload(path,blob,{contentType:blob.type,upsert:true});
            if(!up.error){permanent=admin.storage.from("social-media").getPublicUrl(path).data.publicUrl+"?v="+Date.now();images++;}
          }
        }catch{}
      }
      const post={id:postId,account_id:accountId,client_id:clientId,platform:"facebook_organic",
        media_type:r.post_type||"post",media_url:r.source||null,thumbnail_url:permanent||thumb,
        permalink:r.post_permalink_url||r.permalink_url||null,caption:r.post_message||r.message||"",
        published_at:published,updated_at:new Date().toISOString()};
      const pu=await admin.from("posts").upsert(post,{onConflict:"id"});if(!pu.error)posts++;
      const metric={post_id:postId,account_id:accountId,client_id:clientId,synced_at:new Date().toISOString(),
        reach:n(r.post_impressions_unique??r.impressions_unique),impressions:n(r.post_impressions??r.impressions),
        engagement:n(r.post_engaged_users??r.engaged_users),like_count:n(r.post_reactions_like_total??r.reactions_like_total),
        comment_count:n(r.post_comments??r.comments),shares:n(r.post_shares??r.shares)};
      const mu=await admin.from("post_metrics").insert(metric);if(!mu.error)metrics++;
    }
    if(logId)await admin.from("sync_log").update({status:"success",finished_at:new Date().toISOString(),records_synced:posts,records_created:posts,records_updated:metrics}).eq("id",logId);
    return json({ok:true,received:rows.length,posts,metrics,images,skipped});
  }catch(e){
    if(logId)await admin.from("sync_log").update({status:"error",finished_at:new Date().toISOString(),error_message:String(e)}).eq("id",logId);
    return json({error:e instanceof Error?e.message:String(e)},500);
  }
});
