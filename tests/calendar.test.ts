import test from 'node:test';
import assert from 'node:assert/strict';
import {alignCalendarPeriods,calendarDays} from '../src/lib/metrics/calendar';

test('calendar includes each day and validates leap day and dates',()=>{
 assert.deepEqual(calendarDays('2024-02-28','2024-03-01'),['2024-02-28','2024-02-29','2024-03-01']);
 assert.throws(()=>calendarDays('2026-02-30','2026-03-01'));
 assert.throws(()=>calendarDays('2026-03-02','2026-03-01'));
});
test('missing data stays missing rather than zero',()=>{
 const curr=calendarDays('2026-10-01','2026-10-03');
 const prev=calendarDays('2026-09-28','2026-09-30');
 const chart=alignCalendarPeriods(curr,prev,new Map([['2026-10-01',0],['2026-10-03',14]]),new Map([['2026-09-29',8]]));
 assert.deepEqual(chart.map(v=>v.current),[0,null,14]);
 assert.deepEqual(chart.map(v=>v.previous),[null,8,null]);
 assert.deepEqual(chart.map(v=>v.index),[1,2,3]);
});
