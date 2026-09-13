import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const cors={"Access-Control-Allow-Origin":"https://mediahub.engajeperformance.com.br","Access-Control-Allow-Headers":"authorization, apikey, content-type"};
const json=(v:unknown,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{...cors,"Content-Type":"application/json"}});

async function isAdmin(req:Request,url:string,anon:string){
  const c=createClient(url,anon,{global:{headers:{Authorization:req.headers.get("Authorization")||""}}});
  const {data:{user}}=await c.auth.getUser();if(!user)return null;
  const {data:p}=await c.from("user_profiles").select("role,is_active").eq("id",user.id).single();
  return p?.is_active&&p.role==="super_admin"?user:null;
}

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  const url=Deno.env.get("SUPABASE_URL")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!;
  const user=await isAdmin(req,url,anon);if(!user)return json({error:"Acesso restrito ao superadministrador"},403);
  const key=Deno.env.get("WINDSOR_API_KEY");if(!key)return json({error:"WINDSOR_API_KEY não configurada"},500);
  try{
    const body=await req.json().catch(()=>({}));
    const connector=String(body.connector||"").trim();
    if(!connector)return json({error:"connector obrigatório"},400);
    const endpoint=`https://onboard.windsor.ai/api/mcp/connectors/${encodeURIComponent(connector)}/connect-info?api_key=${encodeURIComponent(key)}`;
    const r=await fetch(endpoint,{headers:{Accept:"application/json"}});const data=await r.json().catch(()=>({}));
    if(!r.ok)return json({error:data?.detail||data?.error||`Windsor HTTP ${r.status}`},r.status);
    if(!data?.connect_url)return json({error:"Windsor não retornou URL de conexão para este conector"},502);
    return json({ok:true,connector,auth_type:data.auth_type||null,connect_url:data.connect_url,fields:Array.isArray(data.fields)?data.fields:[]});
  }catch(e){return json({error:e instanceof Error?e.message:String(e)},500)}
});
