import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const APP_URL="https://mediahub.engajeperformance.com.br";
const GRAPH="https://graph.facebook.com/v26.0";
const REDIRECT="https://ityidnsfhgotucgvcifq.supabase.co/functions/v1/meta-auth/callback";
const cors={"Access-Control-Allow-Origin":APP_URL,"Access-Control-Allow-Headers":"authorization, apikey, content-type"};
const json=(v:unknown,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{...cors,"Content-Type":"application/json"}});
const bytes=(v:Uint8Array)=>btoa(String.fromCharCode(...v));
const unbytes=(v:string)=>Uint8Array.from(atob(v),c=>c.charCodeAt(0));
const base64urlDecode=(v:string)=>unbytes((v.replaceAll("-","+").replaceAll("_","/")+"===").slice(0,v.length+(4-v.length%4)%4));

async function key(secret:string){
  return crypto.subtle.importKey("raw",await crypto.subtle.digest("SHA-256",new TextEncoder().encode(secret)),{name:"AES-GCM"},false,["encrypt"]);
}
async function encrypt(value:string,secret:string){
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const data=await crypto.subtle.encrypt({name:"AES-GCM",iv},await key(secret),new TextEncoder().encode(value));
  return {token_ciphertext:bytes(new Uint8Array(data)),token_iv:bytes(iv)};
}
async function sign(value:string,secret:string){
  const k=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  return bytes(new Uint8Array(await crypto.subtle.sign("HMAC",k,new TextEncoder().encode(value)))).replaceAll("+","-").replaceAll("/","_").replaceAll("=","");
}
async function isAdmin(req:Request,url:string,anon:string){
  const c=createClient(url,anon,{global:{headers:{Authorization:req.headers.get("Authorization")||""}}});
  const {data:{user}}=await c.auth.getUser(); if(!user)return null;
  const {data:p}=await c.from("user_profiles").select("role,is_active").eq("id",user.id).single();
  return p?.is_active&&p.role==="super_admin"?user:null;
}

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  const url=Deno.env.get("SUPABASE_URL")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!;
  const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,appId=Deno.env.get("META_APP_ID")!;
  const secret=Deno.env.get("META_APP_SECRET")!;
  if(!appId||!secret)return json({error:"Credenciais Meta não configuradas"},500);
  const current=new URL(req.url);
  try{
    if(current.pathname.endsWith("/callback")){
      const code=current.searchParams.get("code"),raw=current.searchParams.get("state")||"",error=current.searchParams.get("error_message");
      if(error)return Response.redirect(APP_URL+"/?meta=error&reason="+encodeURIComponent(error),302);
      const [payload,sig]=raw.split("."); if(!payload||!sig||await sign(payload,secret)!==sig)throw new Error("Estado OAuth inválido");
      const state=JSON.parse(new TextDecoder().decode(base64urlDecode(payload)));
      if(Date.now()>state.exp||!code)throw new Error("Autorização expirada");
      const tokenUrl=new URL(GRAPH+"/oauth/access_token");
      tokenUrl.searchParams.set("client_id",appId);tokenUrl.searchParams.set("client_secret",secret);
      tokenUrl.searchParams.set("redirect_uri",REDIRECT);tokenUrl.searchParams.set("code",code);
      const short=await (await fetch(tokenUrl)).json();if(!short.access_token)throw new Error(short.error?.message||"Token não recebido");
      const longUrl=new URL(GRAPH+"/oauth/access_token");longUrl.searchParams.set("grant_type","fb_exchange_token");
      longUrl.searchParams.set("client_id",appId);longUrl.searchParams.set("client_secret",secret);longUrl.searchParams.set("fb_exchange_token",short.access_token);
      const long=await (await fetch(longUrl)).json();const access=long.access_token||short.access_token;
      const me=await (await fetch(GRAPH+"/me?fields=id,name&access_token="+encodeURIComponent(access))).json();
      if(!me.id)throw new Error(me.error?.message||"Usuário Meta não identificado");
      const enc=await encrypt(access,secret),admin=createClient(url,service);
      const {data:connection,error:ce}=await admin.from("meta_connections").upsert({
        meta_user_id:me.id,meta_user_name:me.name,...enc,connected_by:state.uid,status:"active",last_error:null,
        token_expires_at:long.expires_in?new Date(Date.now()+long.expires_in*1000).toISOString():null,updated_at:new Date().toISOString()
      },{onConflict:"meta_user_id,connected_by"}).select("id").single();
      if(ce)throw ce;
      const pages=await (await fetch(GRAPH+"/me/accounts?limit=200&fields=id,name,access_token,picture,instagram_business_account{id,username,name,profile_picture_url}&access_token="+encodeURIComponent(access))).json();
      for(const p of pages.data||[]){
        await admin.from("meta_assets").upsert({id:"page:"+p.id,connection_id:connection.id,asset_type:"facebook_page",name:p.name,page_id:p.id,picture_url:p.picture?.data?.url,status:"discovered",updated_at:new Date().toISOString()});
        if(p.instagram_business_account)await admin.from("meta_assets").upsert({id:"instagram:"+p.instagram_business_account.id,connection_id:connection.id,asset_type:"instagram",name:p.instagram_business_account.name||p.instagram_business_account.username||p.name,username:p.instagram_business_account.username,page_id:p.id,instagram_account_id:p.instagram_business_account.id,picture_url:p.instagram_business_account.profile_picture_url,status:"discovered",updated_at:new Date().toISOString()});
      }
      const ads=await (await fetch(GRAPH+"/me/adaccounts?limit=200&fields=id,account_id,name,currency,timezone_name,account_status&access_token="+encodeURIComponent(access))).json();
      for(const a of ads.data||[])await admin.from("meta_assets").upsert({id:"ad:"+a.id,connection_id:connection.id,asset_type:"ad_account",name:a.name,ad_account_id:a.id,currency:a.currency,timezone_name:a.timezone_name,status:a.account_status===1?"discovered":"disabled",updated_at:new Date().toISOString()});
      return Response.redirect(APP_URL+"/?meta=connected",302);
    }
    const user=await isAdmin(req,url,anon);if(!user)return json({error:"Acesso restrito ao superadministrador"},403);
    const stateObj={uid:user.id,exp:Date.now()+10*60*1000,nonce:crypto.randomUUID()};
    const payload=bytes(new TextEncoder().encode(JSON.stringify(stateObj))).replaceAll("+","-").replaceAll("/","_").replaceAll("=","");
    const state=payload+"."+await sign(payload,secret);
    const auth=new URL("https://www.facebook.com/v26.0/dialog/oauth");
    auth.searchParams.set("client_id",appId);auth.searchParams.set("redirect_uri",REDIRECT);auth.searchParams.set("state",state);
    auth.searchParams.set("response_type","code");
    auth.searchParams.set("scope","business_management,ads_read,pages_show_list,pages_read_engagement,instagram_basic");
    return json({url:auth.toString()});
  }catch(e){console.error(e);return current.pathname.endsWith("/callback")?Response.redirect(APP_URL+"/?meta=error",302):json({error:e instanceof Error?e.message:String(e)},500);}
});
