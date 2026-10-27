import test from 'node:test';
import assert from 'node:assert/strict';
import {auditMigrationHistory,auditLocalMigrationInventory,parseLocalMigrationFiles,parseRemoteMigrationHistory} from '../scripts/audit-migration-history';

const local=['20261001010000_one.sql','20261002020000_two.sql'];
const remote={migrations:[{version:'20261001010000',name:'one'},{version:'20261002020000',name:'two'}]};

test('aligned versions and names pass without credentials',()=>{
 const result=auditMigrationHistory(parseLocalMigrationFiles(local),parseRemoteMigrationHistory(remote));
 assert.equal(result.aligned,true);
 assert.equal(result.counts.matchingVersions,2);
 assert.deepEqual(result.remoteOnly,[]);
});

test('mismatched timestamps are drift even if migration names match',()=>{
 const result=auditMigrationHistory(parseLocalMigrationFiles(['20261001010000_one.sql']),parseRemoteMigrationHistory({migrations:[{version:'20261001020000',name:'one'}]}));
 assert.equal(result.aligned,false);
 assert.equal(result.remoteOnly.length,1);
 assert.equal(result.localOnly.length,1);
 assert.equal(result.sameNameDifferentVersion.length,1);
});

test('same version but changed name requires manual review',()=>{
 const result=auditMigrationHistory(parseLocalMigrationFiles(['20261001010000_alpha.sql']),parseRemoteMigrationHistory({migrations:[{version:'20261001010000',name:'beta'}]}));
 assert.equal(result.aligned,false);
 assert.equal(result.sameVersionDifferentName[0].remote.name,'beta');
});

test('duplicate versions on either side fail closed',()=>{
 const list=parseLocalMigrationFiles(['20261001010000_a.sql','20261001010000_b.sql']);
 const parsed=parseRemoteMigrationHistory({migrations:[{version:'20261001010000',name:'a'}]});
 const first=auditMigrationHistory(list,parsed);
 assert.deepEqual(first.duplicateLocalVersions,['20261001010000']);
 assert.equal(first.aligned,false);
 const duplicate=auditMigrationHistory(parsed,[...parsed,...parsed]);
 assert.deepEqual(duplicate.duplicateRemoteVersions,['20261001010000']);
 assert.equal(duplicate.aligned,false);
});

test('unknown remote/local records and empty inventories cannot be treated as aligned',()=>{
 assert.throws(()=>parseRemoteMigrationHistory({migrations:null}),/manifest/);
 assert.throws(()=>parseRemoteMigrationHistory({migrations:[{version:'bad',name:'one'}]}),/version\/name/);
 assert.throws(()=>parseLocalMigrationFiles(['20261001010000-valid.sql']),/Unsupported/);
 assert.throws(()=>auditMigrationHistory([],parseRemoteMigrationHistory(remote)),/nonempty/);
 assert.throws(()=>auditMigrationHistory(parseLocalMigrationFiles(local),[]),/nonempty/);
});

test('non-SQL files are ignored, but unsafely named SQL is rejected',()=>{
 assert.deepEqual(parseLocalMigrationFiles(['README.md','20261001010000_one.sql']),[{version:'20261001010000',name:'one'}]);
 assert.throws(()=>parseLocalMigrationFiles(['migration.sql']),/Unsupported/);
});

const legacyTestFiles=[
 '20260930230000_organization_niche_sales_model.sql',
 '20260930230000_scheduled_sync_history_days.sql',
];

test('local guard allows only the unchanged baseline and reports unresolved #211',()=>{
 const report=auditLocalMigrationInventory([...legacyTestFiles,'20261028010101_new.sql']);
 assert.equal(report.regressionFree,true);
 assert.equal(report.unresolvedLegacyCollision.issue,211);
 assert.equal(report.unresolvedLegacyCollision.reconciliationPending,true);
 assert.deepEqual(report.newDuplicateVersions,[]);
});

test('local guard rejects a newly duplicated version',()=>{
 const report=auditLocalMigrationInventory([...legacyTestFiles,'20261028010101_one.sql','20261028010101_two.sql']);
 assert.equal(report.regressionFree,false);
 assert.deepEqual(report.newDuplicateVersions,['20261028010101']);
});

test('local guard rejects a third file in the legacy version',()=>{
 const report=auditLocalMigrationInventory([...legacyTestFiles,'20260930230000_third.sql']);
 assert.equal(report.regressionFree,false);
 assert.equal(report.unresolvedLegacyCollision.baselineUnchanged,false);
});

test('local guard fails on removal or rename of legacy files',()=>{
 for(const f of [[legacyTestFiles[0]],[legacyTestFiles[0],'20260930230000_renamed.sql'],['20261028010101_unrelated.sql']]){
  assert.equal(auditLocalMigrationInventory(f).regressionFree,false);
 }
});

test('local guard rejects empty or malformed inventories',()=>{
 assert.throws(()=>auditLocalMigrationInventory([]),/nonempty/);
 assert.throws(()=>auditLocalMigrationInventory([...legacyTestFiles,'20261028010101-invalid.sql']),/Unsupported/);
});
