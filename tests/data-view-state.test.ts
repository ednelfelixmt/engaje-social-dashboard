import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveDataView} from '../src/lib/ui/data-view-state';

test('loading and errors never become zero-valued charts',()=>{
 assert.equal(resolveDataView({loading:true,available:true,items:[1]}).status,'loading');
 assert.equal(resolveDataView({loading:false,available:true,error:new Error('failed'),items:[1]}).status,'error');
});
test('distinguishes empty, disconnected, unsynchronized and real data',()=>{
 assert.equal(resolveDataView({loading:false,available:false,items:[]}).status,'unavailable');
 assert.equal(resolveDataView({loading:false,available:true}).status,'unavailable');
 assert.equal(resolveDataView({loading:false,available:true,items:[]}).status,'empty');
 const ready=resolveDataView({loading:false,available:true,items:[0]});
 assert.equal(ready.status,'ready');
 if(ready.status==='ready')assert.deepEqual(ready.data,[0]);
});
