import {readFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';

type Migration={version:string;name:string};
const versionPattern=/^\d{14}$/;
const namePattern=/^[A-Za-z][A-Za-z0-9_-]*$/;
const sqlFilename=/^(\d{14})_([A-Za-z][A-Za-z0-9_-]*)\.sql$/;

function checked(record:unknown):Migration{
 if(!record||typeof record!=='object')throw new Error('Invalid remote migration record');
 const value=record as Partial<Migration>;
 if(typeof value.version!=='string'||!versionPattern.test(value.version)||typeof value.name!=='string'||!namePattern.test(value.name)){
  throw new Error('Invalid remote migration version/name');
 }
 return {version:value.version,name:value.name};
}

/** Pure parsers; never open a database connection or read SQL contents. */
export function parseRemoteMigrationHistory(input:unknown):Migration[]{
 if(!input||typeof input!=='object'||!('migrations' in input)||!Array.isArray(input.migrations)){
  throw new Error('Expected a Supabase {migrations: [...]} JSON manifest');
 }
 return input.migrations.map(checked);
}

export function parseLocalMigrationFiles(files:readonly string[]):Migration[]{
 return files.filter(file=>file.endsWith('.sql')).map(file=>{
  const match=sqlFilename.exec(file);
  if(!match)throw new Error('Unsupported local SQL migration filename');
  return {version:match[1],name:match[2]};
 });
}

function duplicateVersions(records:readonly Migration[]):string[]{
 const count=new Map<string,number>();
 for(const record of records)count.set(record.version,(count.get(record.version)??0)+1);
 return [...count].filter(([,n])=>n>1).map(([v])=>v).sort();
}
const ordered=(a:Migration,b:Migration)=>a.version.localeCompare(b.version)||a.name.localeCompare(b.name);

/** Version identity is authoritative; matching names do not prove matching SQL. */
export function auditMigrationHistory(local:readonly Migration[],remote:readonly Migration[]){
 if(local.length===0||remote.length===0)throw new Error('Both migration inventories must be nonempty');
 for(const item of [...local,...remote])checked(item);
 const localByVersion=new Map(local.map(record=>[record.version,record]));
 const remoteByVersion=new Map(remote.map(record=>[record.version,record]));
 const remoteOnly=remote.filter(item=>!localByVersion.has(item.version)).sort(ordered);
 const localOnly=local.filter(item=>!remoteByVersion.has(item.version)).sort(ordered);
 const sameVersionDifferentName=local.filter(item=>remoteByVersion.has(item.version)&&remoteByVersion.get(item.version)?.name!==item.name)
  .map(item=>({local:item,remote:remoteByVersion.get(item.version)!}));
 const remoteNames=new Map<string,Migration[]>();
 for(const item of remoteOnly)remoteNames.set(item.name,[...(remoteNames.get(item.name)??[]),item]);
 const sameNameDifferentVersion=localOnly.flatMap(item=>(remoteNames.get(item.name)??[]).map(other=>({local:item,remote:other})));
 const duplicateLocalVersions=duplicateVersions(local);
 const duplicateRemoteVersions=duplicateVersions(remote);
 const aligned=remoteOnly.length===0&&localOnly.length===0&&sameVersionDifferentName.length===0
  &&duplicateLocalVersions.length===0&&duplicateRemoteVersions.length===0;
 return {
  aligned,
  counts:{local:local.length,remote:remote.length,matchingVersions:local.filter(item=>remoteByVersion.get(item.version)?.name===item.name).length},
  duplicateLocalVersions,duplicateRemoteVersions,
  remoteOnly,localOnly,sameVersionDifferentName,sameNameDifferentVersion,
 };
}


/** Detect NEW local migration-version collisions, not resolve the historic #211 drift. */
const legacyVersion='20260930230000';
const legacyFiles=[
 '20260930230000_organization_niche_sales_model.sql',
 '20260930230000_scheduled_sync_history_days.sql',
] as const;

export function auditLocalMigrationInventory(files:readonly string[]){
 const local=parseLocalMigrationFiles(files);
 if(local.length===0)throw new Error('Local migration inventory must be nonempty');
 const versions=new Map<string,string[]>();
 for(const entry of local){
  const names=versions.get(entry.version)??[];
  names.push(entry.version+'_'+entry.name+'.sql');
  versions.set(entry.version,names);
 }
 const observed=(versions.get(legacyVersion)??[]).sort();
 const expected=[...legacyFiles].sort();
 const baselineUnchanged=observed.length===expected.length&&observed.every((name,index)=>name===expected[index]);
 const newDuplicateVersions=duplicateVersions(local).filter(version=>version!==legacyVersion);
 return {
  regressionFree:baselineUnchanged&&newDuplicateVersions.length===0,
  localFiles:local.length,
  newDuplicateVersions,
  unresolvedLegacyCollision:{
   issue:211,version:legacyVersion,baselineUnchanged,
   expectedFiles:expected,observedFiles:observed,reconciliationPending:true,
  },
 };
}

/** Offline diagnostic only: accepts an explicitly exported manifest, never repairs migrations. */
if(process.argv[1]&&/audit-migration-history\.(?:ts|js)$/.test(process.argv[1])){
 try{
  if(process.argv.length!==3)throw new Error('Usage: npm run verify:migration-history -- <remote-migrations.json> or npm run verify:local-migrations');
  if(process.argv[2]==='--local-only'){
   const report=auditLocalMigrationInventory(readdirSync(resolve('supabase/migrations')));
   process.stdout.write(JSON.stringify(report,null,2)+'\n');
   if(!report.regressionFree)process.exitCode=1;
  }else{
   const contents=readFileSync(resolve(process.argv[2]),'utf8');
  let manifest:unknown;
  try{manifest=JSON.parse(contents) as unknown;}catch{throw new Error('Invalid JSON migration manifest');}
  const remote=parseRemoteMigrationHistory(manifest);
  const local=parseLocalMigrationFiles(readdirSync(resolve('supabase/migrations')));
  const report=auditMigrationHistory(local,remote);
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  if(!report.aligned)process.exitCode=1;
  }
 }catch(error){
  process.stderr.write('Migration history audit failed: '+(error instanceof Error?error.message:'unknown')+'\n');
  process.exitCode=1;
 }
}
