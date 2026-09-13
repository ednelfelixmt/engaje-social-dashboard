import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const APP_URL="https://mediahub.engajeperformance.com.br";
const cors={"Access-Control-Allow-Origin":APP_URL,"Access-Control-Allow-Headers":"authorization, apikey, content-type"};
const json=(v:unknown,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{...cors,"Content-Type":"application/json"}});
async function isAdmin(req:Request,url:string,anon:string){const c=createClient(url,anon,{global:{headers:{Authorization:req.headers.get("Authorization")||""}}});const {data:{user}}=await c.auth.getUser();if(!user)return null;const {data:p}=await c.from("user_profiles").select("role,is_active").eq("id",user.id).single();return p?.is_active&&p.role==="super_admin"?user:null;}

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  const url=Deno.env.get("SUPABASE_URL")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!,service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const user=await isAdmin(req,url,anon);if(!user)return json({error:"Acesso restrito ao superadministrador"},403);
  const key=Deno.env.get("WINDSOR_API_KEY");if(!key)return json({error:"WINDSOR_API_KEY não configurada"},500);
  const admin=createClient(url,service);
  try{
    const wanted=["facebook","google_ads"];
    const discovered:any[]=[];
    for(const connector of wanted){
      const endpoint=new URL("https://onboard.windsor.ai/api/common/ds-accounts");
      endpoint.searchParams.set("datasource",connector);endpoint.searchParams.set("api_key",key);
      const r=await fetch(endpoint,{headers:{Accept:"application/json","User-Agent":"Windsor/1.0"}});const data=await r.json().catch(()=>[]);
      if(!r.ok)throw new Error((data as any)?.detail||(data as any)?.error||`Windsor ${connector} HTTP ${r.status}`);
      const rows=Array.isArray(data)?data:(Array.isArray((data as any)?.data)?(data as any).data:[]);
      for(const x of rows){
        const accountId=String(x.account_id||x.id||"");if(!accountId)continue;
        const rec={provider_id:"windsor",connector,external_account_id:accountId,account_name:x.account_name||x.name||accountId,status:x.status||"active",metadata:x,last_discovered_at:new Date().toISOString(),updated_at:new Date().toISOString()};
        const {data:row,error}=await admin.from("integration_accounts").upsert(rec,{onConflict:"provider_id,connector,external_account_id"}).select("id,provider_id,connector,external_account_id,account_name,client_id,status,last_sync_at,last_error").single();
        if(error)throw error;discovered.push(row);
      }
    }
    return json({ok:true,accounts:discovered,count:discovered.length});
  }catch(e){console.error(e);return json({error:e instanceof Error?e.message:String(e)},500);}
});
