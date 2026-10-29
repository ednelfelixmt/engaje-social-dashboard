import test from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import type {Database} from '../src/types/database.types';
import {loadTypescript} from './helpers/load-typescript';
const query=loadTypescript<typeof import('../src/lib/metrics/query')>(new URL('../src/lib/metrics/query.ts',import.meta.url),(id,native)=>id==='server-only'?{}:id==='@/lib/auth/session'?{}:native(id));
const f={from:'2026-10-20',to:'2026-10-21',currency:'BRL',compare:'previous_period' as const};
function client(paginate=false){
 const calls:URL[]=[];
 const db=createClient<Database>('https://synthetic.supabase.co','synthetic-public-key',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:async(input)=>{
  const url=new URL(String(input));calls.push(url);assert.equal(url.origin,'https://synthetic.supabase.co');
  const rows=paginate&&url.searchParams.get('offset')==='0'?Array.from({length:1000},(_,i)=>({id:'synthetic-'+i})):[];
  return new Response(JSON.stringify(rows),{status:200,headers:{'content-type':'application/json'}});
 }}});
 return {db,calls};
}

test('real SDK requests retain organization, currency, platform, campaign and both Meta aliases across periods',async()=>{
 const c=client();await query.dashboardData(c.db,'synthetic-a',f,{platform:'meta_ads',campaign:{account:'act_123',campaign:'campaign-1'},ads:true,adsComparison:true});assert.equal(c.calls.length,2);
 for(const url of c.calls){assert.equal(url.pathname,'/rest/v1/metrics_ads');assert.equal(url.searchParams.get('organization_id'),'eq.synthetic-a');assert.equal(url.searchParams.get('currency'),'eq.BRL');assert.equal(url.searchParams.get('platform'),'eq.meta_ads');assert.equal(url.searchParams.get('account_id'),'in.(123,act_123)');assert.equal(url.searchParams.get('campaign_id'),'eq.campaign-1');assert.equal(url.searchParams.get('order'),'id.asc');}
 assert.deepEqual(c.calls[0].searchParams.getAll('metric_date'),['gte.2026-10-20','lte.2026-10-21']);assert.deepEqual(c.calls[1].searchParams.getAll('metric_date'),['gte.2026-10-18','lte.2026-10-19']);
});

test('non-Meta account aliases remain literal and opaque identifiers cannot inject another query key',async()=>{
 const c=client(),id='campaign?organization_id=eq.other&currency=eq.USD';
 await query.dashboardData(c.db,'synthetic-a',{...f,compare:'none'},{platform:'google_ads',campaign:{account:'act_123',campaign:id},ads:true,adsComparison:true});assert.equal(c.calls.length,1);const url=c.calls[0];assert.equal(url.searchParams.get('account_id'),'eq.act_123');assert.equal(url.searchParams.get('campaign_id'),'eq.'+id);assert.deepEqual(url.searchParams.getAll('organization_id'),['eq.synthetic-a']);assert.deepEqual(url.searchParams.getAll('currency'),['eq.BRL']);
});

test('every paginated campaign request preserves the scope and deterministic ordering',async()=>{
 const c=client(true);const data=await query.dashboardData(c.db,'synthetic-a',{...f,compare:'none'},{platform:'meta_ads',campaign:{account:'123',campaign:'one'},ads:true});assert.equal(data.ads.length,1000);assert.equal(c.calls.length,2);assert.deepEqual(c.calls.map(u=>u.searchParams.get('offset')),['0','1000']);
 for(const url of c.calls){assert.equal(url.searchParams.get('limit'),'1000');assert.equal(url.searchParams.get('campaign_id'),'eq.one');assert.equal(url.searchParams.get('account_id'),'in.(123,act_123)');assert.equal(url.searchParams.get('organization_id'),'eq.synthetic-a');}
});

test('malformed selection or unsupported dataset combinations fail before any read',async()=>{
 const c=client();for(const options of [{campaign:{account:'123',campaign:'one'},ads:true},{platform:'meta_ads',campaign:{account:'',campaign:'one'},ads:true},{platform:'meta_ads',campaign:{account:'123',campaign:'one'},crm:true},{platform:'meta_ads',campaign:{account:'123',campaign:'one'},breakdowns:true}])await assert.rejects(query.dashboardData(c.db,'synthetic-a',f,options));assert.equal(c.calls.length,0);
});

test('SEC-CAMPAIGN-SELECT-GRAIN-001: invalid campaign identity performs no SDK reads',async()=>{
 const c=client();
 for(const [account,campaign] of [
  [' 123','one'],['123 ','one'],['act_ 123','one'],['act_\u00a0123','one'],
  ['123',' one'],['123','one '],['123','one\u00a0'],
 ]){
  await assert.rejects(
   query.dashboardData(c.db,'synthetic-a',f,{platform:'meta_ads',campaign:{account,campaign},ads:true}),
   /Invalid campaign query scope/,
  );
 }
 assert.equal(c.calls.length,0);
});
