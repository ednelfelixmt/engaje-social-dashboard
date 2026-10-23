import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const sql=readFileSync(new URL('../supabase/migrations/20260921090000_disconnect_integration.sql',import.meta.url),'utf8');

test('destructive integration disconnect remains service-role-only in bootstrap migration',()=>{
 assert.match(sql,/security\s+definer/i);
 assert.match(sql,/revoke\s+all\s+on\s+function\s+public\.disconnect_integration\s*\(\s*uuid\s*,\s*uuid\s*\)\s+from\s+public\s*,\s*anon\s*,\s*authenticated\s*;/i);
 assert.match(sql,/grant\s+execute\s+on\s+function\s+public\.disconnect_integration\s*\(\s*uuid\s*,\s*uuid\s*\)\s+to\s+service_role\s*;/i);
 assert.doesNotMatch(sql,/grant\s+execute\s+on\s+function\s+public\.disconnect_integration[^;]*to\s+(?:authenticated|anon|public)\b/i);
});
