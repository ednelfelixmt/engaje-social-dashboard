import test from 'node:test';
import assert from 'node:assert/strict';
import {checkSource} from '../scripts/check-architecture';

test('UI cannot import privileged server-side Supabase clients',()=>{
 assert.equal(checkSource('src/components/dashboard/x.tsx',"import {session} from '@/lib/auth/session';").length,1);
 assert.equal(checkSource('src/components/ui/x.tsx',"import {client} from '@/lib/supabase/server';").length,1);
});
test('analytics metric domain cannot import presentation modules',()=>{
 assert.equal(checkSource('src/lib/metrics/x.ts',"import {Panel} from '@/components/dashboard/panel';").length,1);
 assert.equal(checkSource('src/lib/metrics/x.ts',"import React from 'react';").length,1);
});
test('server side and application layers can depend on domain',()=>{
 assert.deepEqual(checkSource('src/app/x/page.tsx',"import {paidTotals} from '@/lib/metrics/paid-metrics';"),[]);
 assert.deepEqual(checkSource('src/lib/metrics/x.ts',"import {foo} from './foo';"),[]);
});
