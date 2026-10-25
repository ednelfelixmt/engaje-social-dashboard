import {createClient} from '@supabase/supabase-js';

/** Production-only, read-only authenticated isolation; synthetic identities must already exist. */
export function validate(env:NodeJS.ProcessEnv){
 if(env.MEDIAHUB_PROD_READONLY_ACK!=='YES_READ_ONLY')throw new Error('Explicit production acknowledgement required');
 const url=env.MEDIAHUB_SUPABASE_URL;
 if(url!=='https://ityidnsfhgotucgvcifq.supabase.co')throw new Error('Wrong Supabase project');
 const key=env.MEDIAHUB_PUBLISHABLE_KEY||'';
 if(key.length<20||key.startsWith('sb_secret_')||key.includes('service_role'))throw new Error('Requires publishable key');
 const a={email:env.MEDIAHUB_A_EMAIL||'',password:env.MEDIAHUB_A_PASSWORD||'',slug:env.MEDIAHUB_A_SLUG||''};
 const b={email:env.MEDIAHUB_B_EMAIL||'',password:env.MEDIAHUB_B_PASSWORD||'',slug:env.MEDIAHUB_B_SLUG||''};
 const files=[env.MEDIAHUB_A_BRANDING_FILE||'',env.MEDIAHUB_B_BRANDING_FILE||''];
 const allowExisting=env.MEDIAHUB_PROD_EXISTING_FIXTURE_ACK==='YES_EXPLICIT_FIXTURE_USERS';
 const expectedUserIds=[env.MEDIAHUB_A_USER_ID||'',env.MEDIAHUB_B_USER_ID||''];
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
 const existingAuthorized=allowExisting&&a.slug==='homologacao-a-20261024'&&b.slug==='homologacao-b-20261024'
  &&expectedUserIds.every(id=>uuid.test(id))&&expectedUserIds[0].toLowerCase()!==expectedUserIds[1].toLowerCase();
 if((!a.email.endsWith('.test')||!b.email.endsWith('.test'))&&!existingAuthorized)throw new Error('Requires synthetic .test accounts or explicit, identity-bound fixture authorization');
 if(!a.password||!b.password||!a.slug||!b.slug||a.email.toLowerCase()===b.email.toLowerCase()||a.slug.toLowerCase()===b.slug.toLowerCase())throw new Error('Two distinct synthetic fixtures required');
 if(files.some(path=>!path||path.includes('..')||path.startsWith('/'))||files[0]===files[1])throw new Error('Two distinct private branding file fixtures required');
 if(files.some(path=>!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\/.+/.test(path)))throw new Error('Private file fixtures require organization UUID prefix');
 return {url,key,a,b,files,expectedUserIds,existingAuthorized};
}
function assert(value:unknown,message:string):asserts value{if(!value)throw new Error('Isolation failure: '+message);}
export async function verifyProductionIsolation(env:NodeJS.ProcessEnv){
 const cfg=validate(env);
 const clients=[cfg.a,cfg.b].map(()=>createClient(cfg.url,cfg.key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}));
 try{
  const ids:string[]=[];
  const users:string[]=[];
  for(let i=0;i<2;i++){
   const client=clients[i], fixture=i===0?cfg.a:cfg.b;
   const {data:auth,error:authError}=await client.auth.signInWithPassword({email:fixture.email,password:fixture.password});
   assert(!authError&&auth.user?.id,'fixture sign in');
   if(cfg.existingAuthorized)assert(auth.user.id.toLowerCase()===cfg.expectedUserIds[i].toLowerCase(),'signed-in user must match exact authorized synthetic identity');
   users.push(auth.user.id);
   const {data:org,error:orgError}=await client.from('organizations').select('id,is_agency').eq('slug',fixture.slug);
   assert(!orgError&&org?.length===1&&!org[0].is_agency,'visible non-agency organization');
   ids.push(org[0].id);
   const {data:member,error:memberError}=await client.from('organization_members').select('is_active,role').eq('user_id',auth.user.id).eq('organization_id',org[0].id);
   assert(!memberError&&member?.length===1&&member[0].is_active===true&&member[0].role==='viewer','limited own membership');
   const {data:admin,error:adminError}=await client.rpc('is_super_admin');
   assert(!adminError&&admin===false,'not superadmin');
  }
  assert(ids[0]!==ids[1]&&users[0]!==users[1],'different orgs and users');
  assert(cfg.files.every((path,i)=>path.split('/')[0].toLowerCase()===ids[i].toLowerCase()),'private fixtures must use actual organization UUID prefix');
  const tables=['organizations','organization_members','dashboard_configs','integrations','metrics_ads','metrics_ads_breakdowns','metrics_organic','metrics_crm','creatives','client_asset_assignments','sync_jobs','integration_alerts'];
  for(let i=0;i<2;i++){
   const client=clients[i],foreign=ids[1-i];
   for(const table of tables){
    const field=table==='organizations'?'id':'organization_id';
    const {data,error}=await client.from(table).select(field).eq(field,foreign).limit(1);
    assert(!error&&data?.length===0,'foreign table '+table);
   }
   const {data:connections,error:connectionError}=await client.from('platform_connections').select('id').eq('target_organization_id',foreign).limit(1);
   assert(!connectionError&&connections?.length===0,'foreign platform connections');
   const {data:foreignAssets,error:foreignAssetError}=await clients[1-i].from('client_asset_assignments').select('asset_id').eq('organization_id',foreign).limit(100);
   assert(!foreignAssetError&&foreignAssets&&foreignAssets.length>0,'foreign tenant requires assigned asset fixture');
   if(foreignAssets.length){
    const {data:assets,error:assetsError}=await client.from('platform_assets').select('id').in('id',foreignAssets.map(row=>row.asset_id)).limit(100);
    assert(!assetsError&&assets?.length===0,'foreign platform assets');
   }
   const {data:otherSigned,error:otherSignedError}=await client.storage.from('branding').createSignedUrl(cfg.files[1-i],60);
   assert(!!otherSignedError&&!otherSigned?.signedUrl,'foreign private file signed URL denied');
   const {data:ownSigned,error:ownSignedError}=await client.storage.from('branding').createSignedUrl(cfg.files[i],60);
   assert(!ownSignedError&&!!ownSigned?.signedUrl,'own private file signed URL permitted');
   const {data:own,error:ownError}=await client.from('organizations').select('id').eq('id',ids[i]);
   assert(!ownError&&own?.length===1,'own org accessible');
  }
  process.stdout.write('PASS: two-way authenticated table, connection and asset read isolation (production; read-only)\n');
 }finally{await Promise.allSettled(clients.map(c=>c.auth.signOut()));}
}
if(process.argv[1]&&/verify-production-isolation\.(ts|js)$/.test(process.argv[1])){
 verifyProductionIsolation(process.env).catch(e=>{process.stderr.write('FAIL: '+(e instanceof Error?e.message:'unknown')+'\n');process.exitCode=1;});
}
