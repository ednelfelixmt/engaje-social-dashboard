import {createClient} from '@supabase/supabase-js';

const identities=[
 {email:'MEDIAHUB_A_EMAIL',password:'MEDIAHUB_A_PASSWORD',id:'079b2713-a99a-41a6-acc3-b129863ef7a6'},
 {email:'MEDIAHUB_B_EMAIL',password:'MEDIAHUB_B_PASSWORD',id:'4fd21c94-e93d-4e35-923b-b1ec4622fd94'}
] as const;
export async function verifyAuthPreflight(env:NodeJS.ProcessEnv){
 if(env.MEDIAHUB_SUPABASE_URL!=='https://ityidnsfhgotucgvcifq.supabase.co')throw new Error('Wrong project');
 const key=env.MEDIAHUB_PUBLISHABLE_KEY||'';
 if(key.length<20||key.startsWith('sb_secret_')||key.includes('service_role'))throw new Error('Publishable key missing or privileged');
 const clients=[];
 try{
  for(const item of identities){
   const email=env[item.email]||'',password=env[item.password]||'';
   if(!email||!password)throw new Error('Missing A/B credentials');
   const client=createClient(env.MEDIAHUB_SUPABASE_URL,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
   clients.push(client);
   const {data,error}=await client.auth.signInWithPassword({email,password});
   if(error||data.user?.id!==item.id)throw new Error('Synthetic user credentials or identity mismatch');
   const {data:admin,error:rpcError}=await client.rpc('is_super_admin');
   if(rpcError||admin!==false)throw new Error('Fixture has unexpected admin access');
  }
  process.stdout.write('PASS: both exact viewer Auth identities verified before Storage changes\\n');
 }finally{await Promise.allSettled(clients.map(client=>client.auth.signOut()));}
}
if(process.argv[1]&&/verify-phase02-auth-preflight\\.(ts|js)$/.test(process.argv[1]))verifyAuthPreflight(process.env).catch(err=>{process.stderr.write('FAIL: '+(err instanceof Error?err.message:'unknown')+'\\n');process.exitCode=1;});
