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
test('download rejects path-like and ambiguous CSV names before creating a local URL', () => {
 const invalid = [
  '', ' ', '.csv', '..csv', '...csv', '../report.csv', 'reports/data.csv', 'reports\\data.csv',
  'bad:name.csv', 'bad?.csv', 'bad\nname.csv', 'bad\u202Ename.csv', 'bad\u2066name.csv',
  'bad\u200Bname.csv', '\uFEFFbad.csv', 'bad\uD800.csv', 'bad\uDC00.csv',
  'bad.txt', ' bad.csv', 'bad.csv ', 'x'.repeat(252) + '.csv',
 ];
 for (const name of invalid) {
  const b = browser();
  assert.throws(() => downloadCsv('synthetic', name, b.port), /Invalid CSV filename/, JSON.stringify(name));
  assert.deepEqual(b.events, [], JSON.stringify(name));
 }
});

test('download preserves visible Unicode, joined emoji, uppercase extension and exact CSV bytes', async () => {
 const b = browser();
 const name = 'Relatório🧑‍💻_2026-11-02.CSV';
 downloadCsv('A;B\r\n1;0', name, b.port);
 assert.equal(b.anchor.download, name);
 assert.equal(await b.blob()?.text(), 'A;B\r\n1;0');
 assert.deepEqual(b.events, ['create', 'anchor', 'click', 'remove', 'defer']);
 b.cleanup();
 assert.equal(b.events.at(-1), 'revoke');
});

test('SEC-CSV-WINDOWS-DEVICE-001: reject Windows device names before creating a download', () => {
 const invalid = [
  'CON.csv', 'con.CSV', 'PRN.csv', 'aux.csv', 'NUL.csv', 'COM1.csv', 'com9.csv',
  'LPT1.csv', 'lpt9.csv', 'CONIN$.csv', 'CONOUT$.csv',
  'COM¹.csv', 'COM².csv', 'COM³.csv', 'LPT¹.csv', 'LPT².csv', 'LPT³.csv',
  'CON.backup.csv', 'COM1.report.csv', 'CON .csv', 'nul..csv',
 ];
 for (const name of invalid) {
  const b = browser();
  assert.throws(() => downloadCsv('synthetic', name, b.port), /Invalid CSV filename/, name);
  assert.deepEqual(b.events, [], 'no blob or anchor should exist for '+name);
 }
});

test('SEC-CSV-WINDOWS-DEVICE-001: legitimate similarly named exports preserve file bytes', async () => {
 const valid = ['COM0.csv', 'COM10.csv', 'LPT0.csv', 'LPT10.csv',
  'CON_relatorio.csv', 'Recon.csv', 'COM1-relatorio.csv', 'LPT9 draft.csv',
  'Relatório_2026-11-02.csv', 'Equipe🧑‍💻.CSV'];
 for (const name of valid) {
  const b = browser();
  downloadCsv('campo;zero\\r\\nconteúdo;0', name, b.port);
  assert.equal(b.anchor.download, name);
  assert.equal(await b.blob()?.text(), 'campo;zero\\r\\nconteúdo;0');
  assert.deepEqual(b.events, ['create','anchor','click','remove','defer']);
  b.cleanup();assert.equal(b.events.at(-1), 'revoke');
 }
});
