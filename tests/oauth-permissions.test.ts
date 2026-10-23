import test from 'node:test';
import assert from 'node:assert/strict';
import {verifiedOAuthScopes,missingOAuthScopes} from '../supabase/functions/_shared/oauth-permissions';

test('no provider response never becomes granted permissions',()=>{
 assert.deepEqual(verifiedOAuthScopes(null),[]);
 assert.deepEqual(verifiedOAuthScopes(undefined),[]);
 assert.deepEqual(verifiedOAuthScopes([]),[]);
});
test('provider grants are preserved but never expanded to requested scopes',()=>{
 const actual=verifiedOAuthScopes(['ads_read','ads_read',' ','']);
 assert.deepEqual(actual,['ads_read']);
 assert.deepEqual(missingOAuthScopes(['ads_read','business_management','pages_show_list'],actual),['business_management','pages_show_list']);
});
test('absence of permission verification keeps every required integration scope missing',()=>{
 const verified=verifiedOAuthScopes([]);
 assert.deepEqual(missingOAuthScopes(['ads_read','pages_show_list'],verified),['ads_read','pages_show_list']);
});
