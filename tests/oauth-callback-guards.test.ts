import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../supabase/functions/engaje-integrations/index.ts',import.meta.url),'utf8');
const callback=source.slice(source.indexOf("if(req.method==='GET'&&url.pathname.endsWith('/callback'))"));
test('OAuth callback rejects invalid or expired signed state',()=>{
 assert.match(callback,/safeEqual\(signature,await stateHmac\(signed\)\)/);
 assert.match(callback,/Number\(expiry\)>=Date\.now\(\)/);
});
test('OAuth callback consumes pending integration once and verifies nonce',()=>{
 assert.match(callback,/\.eq\('status','pending'\)\.select\('\*'\)\.single\(\)/);
 assert.match(callback,/pending\.config\.nonce!==nonce/);
});
test('OAuth callback checks user membership and organization status again',()=>{
 assert.match(callback,/\.eq\('user_id',actorId\)\.eq\('is_active',true\)/);
 assert.match(callback,/if\(!authorized\)throw new Error/);
 assert.match(callback,/if\(!org\|\|org\.status!=='active'\)throw new Error/);
});
