import test from 'node:test';
import assert from 'node:assert/strict';
import {validateOrganizationUpdateRequest} from '../src/lib/auth/organization-update-guards';

test('rejects requested funnel missing both dependent settings before database writes',()=>{
 const result=validateOrganizationUpdateRequest({applyFunnel:true,niche:null,salesModel:null});
 assert.equal(result.ok,false);
 if(!result.ok)assert.match(result.message,/Nenhuma alteração foi salva/);
});
test('rejects incomplete funnel when only niche is present',()=>{
 assert.equal(validateOrganizationUpdateRequest({applyFunnel:true,niche:'retail',salesModel:null}).ok,false);
});
test('rejects incomplete funnel when only sales model is present',()=>{
 assert.equal(validateOrganizationUpdateRequest({applyFunnel:true,niche:null,salesModel:'whatsapp'}).ok,false);
});
test('permits general organization edits without applying funnel',()=>{
 assert.deepEqual(validateOrganizationUpdateRequest({applyFunnel:false,niche:null,salesModel:null}),{ok:true});
});
test('permits funnel request with both required settings',()=>{
 assert.deepEqual(validateOrganizationUpdateRequest({applyFunnel:true,niche:'retail',salesModel:'whatsapp'}),{ok:true});
});
