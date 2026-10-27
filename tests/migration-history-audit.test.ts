import test from 'node:test';
import assert from 'node:assert/strict';
import {auditMigrationHistory,parseLocalMigrationFiles,parseRemoteMigrationHistory} from '../scripts/audit-migration-history';

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
