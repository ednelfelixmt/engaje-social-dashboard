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

test('client pages cannot dynamically import server-only auth modules',()=>{
 assert.equal(checkSource('src/app/example/client.tsx',"'use client'; const x=import('@/lib/auth/session');").length,1);
});
test('client components cannot reference privileged environment variables',()=>{
 assert.equal(checkSource('src/components/x.tsx',"'use client'; const x=process.env.SUPABASE_SERVICE_ROLE_KEY;").length,1);
 assert.equal(checkSource('src/components/x.tsx',"'use client'; const x=process.env['DATABASE_URL'];").length,1);
 assert.deepEqual(checkSource('src/components/x.tsx',"'use client'; const x=process.env.NEXT_PUBLIC_SUPABASE_URL;"),[]);
});
test('server-only actions can access protected environment variables',()=>{
 assert.deepEqual(checkSource('src/app/auth/actions.ts',"'use server'; const x=process.env.SUPABASE_SERVICE_ROLE_KEY;"),[]);
});
