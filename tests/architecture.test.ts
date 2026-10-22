import test from 'node:test';
import assert from 'node:assert/strict';
import {checkSource} from '../scripts/check-architecture';

test('UI cannot import privileged server-side Supabase clients',()=>{
 assert.equal(checkSource('src/components/dashboard/x.tsx',"'use client'; import {session} from '@/lib/auth/session';").length,1);
 assert.equal(checkSource('src/components/ui/x.tsx',"'use client'; import {client} from '@/lib/supabase/server';").length,1);
});
test('server components may import safe server-side session without shipping it to browser',()=>{
 assert.deepEqual(checkSource('src/components/auth/branded-login.tsx',"import {serverClient} from '@/lib/supabase/server';"),[]);
});
test('analytics metric domain cannot import presentation modules',()=>{
 assert.equal(checkSource('src/lib/metrics/x.ts',"import {Panel} from '@/components/dashboard/panel';").length,1);
 assert.equal(checkSource('src/lib/metrics/x.ts',"import React from 'react';").length,1);
});
test('server side and application layers can depend on domain',()=>{
 assert.deepEqual(checkSource('src/app/x/page.tsx',"import {paidTotals} from '@/lib/metrics/paid-metrics';"),[]);
 assert.deepEqual(checkSource('src/lib/metrics/x.ts',"import {foo} from './foo';"),[]);
});
