import test from 'node:test';
import assert from 'node:assert/strict';
import {listTenantStorage,removeTenantStorage} from '../supabase/functions/_shared/tenant-storage';

const org='10000000-0000-4000-8000-000000000001';
const file=(name:string)=>({name,id:'synthetic-file'});
test('Storage lists all pages and nested folders under the exact tenant prefix',async()=>{
 const entries:{name:string;id:string|null}[]=Array.from({length:1100},(_,i)=>file('file-'+String(i).padStart(4,'0')));
 entries.splice(0,0,{name:'nested',id:null});
 const calls:{prefix:string;offset:number}[]=[];
 const bucket={
  async list(prefix:string,options:{limit:number;offset:number;sortBy:{column:string;order:'asc'}}){
   assert.equal(options.sortBy.column,'name');assert.equal(options.sortBy.order,'asc');
   assert.ok(prefix===org||prefix===org+'/nested');
   calls.push({prefix,offset:options.offset});
   const all=prefix===org?entries:[file('private.csv')];
   return {data:all.slice(options.offset,options.offset+options.limit),error:null};
  },
  async remove(){throw new Error('enumeration must not remove objects');},
 };
 const paths=await listTenantStorage(bucket,org);
 assert.equal(paths.length,1101);
 assert.ok(paths.includes(org+'/nested/private.csv'));
 assert.ok(paths.includes(org+'/file-1099'));
 assert.equal(new Set(paths).size,1101);
 assert.ok(calls.some(call=>call.offset===1000));
 assert.ok(paths.every(path=>path.startsWith(org+'/')));
});
test('Storage enumeration fails closed on a later page failure or malformed object',async()=>{
 for(const data of [[file('../other')],[file('nested/file')],[file('..')],[{name:'no-id'}]]){
  await assert.rejects(listTenantStorage({
   list:async()=>({data:data as {name:string;id:string}[],error:null}),
   remove:async()=>({error:null}),
  },org));
 }
 let calls=0;
 await assert.rejects(listTenantStorage({
  list:async()=>++calls===1?{data:Array.from({length:100},(_,i)=>file(String(i))),error:null}:{data:null,error:new Error('synthetic')},
  remove:async()=>({error:null}),
 },org),/conferir/);
 assert.equal(calls,2);
 await assert.rejects(listTenantStorage({
  list:async()=>{throw new Error('must not query invalid prefix');},remove:async()=>({error:null}),
 },'../other'),/Prefixo/);
});
test('Storage removal uses bounded batches and reports errors',async()=>{
 const paths=Array.from({length:1101},(_,i)=>org+'/'+i);
 const batches:string[][]=[];
 const bucket={list:async()=>({data:[],error:null}),remove:async(items:string[])=>{batches.push(items);return {error:null};}};
 await removeTenantStorage(bucket,paths);
 assert.ok(batches.every(items=>items.length<=100));
 assert.deepEqual(batches.flat(),paths);
 await assert.rejects(removeTenantStorage({...bucket,remove:async()=>({error:new Error('synthetic')})},paths),/limpeza/);
});
