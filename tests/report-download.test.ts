import test from 'node:test';
import assert from 'node:assert/strict';
import {downloadCsv, type DownloadPort} from '../src/lib/export/download';
function browser(){
 const events:string[]=[];let blob:Blob|undefined;let cleanup:(()=>void)|undefined;
 const anchor={href:'',download:'',click(){events.push('click');},remove(){events.push('remove');}};
 const port:DownloadPort={createUrl(value){blob=value;events.push('create');return 'blob:synthetic';},createAnchor(){events.push('anchor');return anchor;},revokeUrl(url){assert.equal(url,'blob:synthetic');events.push('revoke');},defer(fn){cleanup=fn;events.push('defer');}};
 return {events,anchor,port,blob:()=>blob,cleanup:()=>cleanup?.()};
}
test('download creates local CSV only on invocation and defers URL cleanup',async()=>{
 const b=browser();assert.deepEqual(b.events,[]);downloadCsv('\ufeff"Synthetic"','synthetic.csv',b.port);
 assert.equal(b.anchor.href,'blob:synthetic');assert.equal(b.anchor.download,'synthetic.csv');assert.equal(b.blob()?.type,'text/csv;charset=utf-8');assert.equal(await b.blob()?.text(),'"Synthetic"');assert.deepEqual([...new Uint8Array(await b.blob()!.arrayBuffer())].slice(0,3),[239,187,191]);
 assert.deepEqual(b.events,['create','anchor','click','remove','defer']);b.cleanup();assert.equal(b.events.at(-1),'revoke');
});
test('click failure still removes the anchor and schedules cleanup',()=>{
 const b=browser();b.anchor.click=()=>{throw new Error('Synthetic click failure');};assert.throws(()=>downloadCsv('x','x.csv',b.port),/click failure/);assert.ok(b.events.includes('remove'));b.cleanup();assert.equal(b.events.at(-1),'revoke');
});
test('anchor creation and removal failures cannot leak the object URL',()=>{
 const b=browser();b.port.createAnchor=()=>{throw new Error('Synthetic anchor failure');};assert.throws(()=>downloadCsv('x','x.csv',b.port),/anchor failure/);b.cleanup();assert.equal(b.events.at(-1),'revoke');
 const c=browser();c.anchor.remove=()=>{throw new Error('Synthetic cleanup failure');};assert.throws(()=>downloadCsv('x','x.csv',c.port),/cleanup failure/);c.cleanup();assert.equal(c.events.at(-1),'revoke');
});
test('defer failure falls back to immediate object URL cleanup',()=>{
 const b=browser();b.port.defer=()=>{throw new Error('Synthetic timer failure');};downloadCsv('x','x.csv',b.port);assert.equal(b.events.at(-1),'revoke');
});
