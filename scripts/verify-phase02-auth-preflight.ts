import {isPublicSupabaseKey} from './supabase-public-key';
import {createClient} from '@supabase/supabase-js';

class AuthPreflightError extends Error{}
const identities=[
 {email:'MEDIAHUB_A_EMAIL',password:'MEDIAHUB_A_PASSWORD',id:'079b2713-a99a-41a6-acc3-b129863ef7a6'},
 {email:'MEDIAHUB_B_EMAIL',password:'MEDIAHUB_B_PASSWORD',id:'4fd21c94-e93d-4e35-923b-b1ec4622fd94'}
] as const;
export async function verifyAuthPreflight(env:NodeJS.ProcessEnv){
 if(env.MEDIAHUB_SUPABASE_URL!=='https://ityidnsfhgotucgvcifq.supabase.co')throw new AuthPreflightError('Wrong project');
 const key=env.MEDIAHUB_PUBLISHABLE_KEY||'';
 if(!isPublicSupabaseKey(key))throw new AuthPreflightError('Publishable key missing or privileged');
 const clients=[];
 try{
  for(const item of identities){
   const email=env[item.email]||'',password=env[item.password]||'';
   if(!email||!password)throw new AuthPreflightError('Missing A/B credentials');
   const client=createClient(env.MEDIAHUB_SUPABASE_URL,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
   clients.push(client);
   const {data,error}=await client.auth.signInWithPassword({email,password});
   if(error||data.user?.id!==item.id)throw new AuthPreflightError('Synthetic user credentials or identity mismatch');
   const expectedOrg=item.id==='079b2713-a99a-41a6-acc3-b129863ef7a6'?'c4c77b35-03a4-417a-94c2-e845d48679c1':'10289f2d-23b9-4c86-a10e-0503bcc2de79';
   const {data:member,error:memberError}=await client.from('organization_members').select('role,is_active').eq('organization_id',expectedOrg).eq('user_id',item.id).single();
   if(memberError||member?.role!=='viewer'||member.is_active!==true)throw new AuthPreflightError('Synthetic fixture must be an active viewer');
   const {data:admin,error:rpcError}=await client.rpc('is_super_admin');
   if(rpcError||admin!==false)throw new AuthPreflightError('Fixture has unexpected admin access');
  }
  process.stdout.write('PASS: both exact viewer Auth identities verified before Storage changes\n');
 }catch(error){if(error instanceof AuthPreflightError)throw error;throw new AuthPreflightError('Synthetic Auth service preflight did not complete');}finally{await Promise.allSettled(clients.map(client=>client.auth.signOut({scope:'local'})));}
}
if(process.argv[1]&&/verify-phase02-auth-preflight\.(ts|js)$/.test(process.argv[1]))verifyAuthPreflight(process.env).catch(err=>{process.stderr.write('FAIL: '+(err instanceof Error?err.message:'unknown')+'\n');process.exitCode=1;});
