import test from 'node:test';
import assert from 'node:assert/strict';
import {alignCalendarPeriods,calendarDays,comparisonPeriod,isValidCalendarDay} from '../src/lib/metrics/calendar';

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


test('prior year clamps leap-day endpoints instead of silently entering March', () => {
 assert.deepEqual(comparisonPeriod('2024-02-29', '2024-02-29', 'previous_year'), {from: '2023-02-28', to: '2023-02-28'});
 assert.deepEqual(comparisonPeriod('2024-02-29', '2024-03-01', 'previous_year'), {from: '2023-02-28', to: '2023-03-01'});
 assert.deepEqual(comparisonPeriod('2024-02-01', '2024-02-29', 'previous_year'), {from: '2023-02-01', to: '2023-02-28'});
 assert.deepEqual(comparisonPeriod('2000-02-29', '2000-03-01', 'previous_year'), {from: '1999-02-28', to: '1999-03-01'});
});

test('previous inclusive period retains day count across leap day, year and DST dates', () => {
 for (const [from, to] of [['2024-02-28', '2024-03-01'], ['2026-01-01', '2026-01-01'], ['2026-03-08', '2026-03-10'], ['2026-11-01', '2026-11-03']]) {
  const period = comparisonPeriod(from, to, 'previous_period');
  assert.equal(calendarDays(period.from, period.to).length, calendarDays(from, to).length);
  assert.equal(Date.parse(from) - Date.parse(period.to), 86400000);
 }
});

test('annual comparison preserves the actual calendar without manufacturing a leap-day observation', () => {
 const period = comparisonPeriod('2025-02-28', '2025-03-01', 'previous_year');
 assert.deepEqual(period, {from: '2024-02-28', to: '2024-03-01'});
 const chart = alignCalendarPeriods(calendarDays('2025-02-28', '2025-03-01'), calendarDays(period.from, period.to), new Map(), new Map());
 assert.equal(chart.length, 3); assert.equal(chart[2].currentDate, null); assert.equal(chart[2].current, null);
});

test('comparison rejects impossible, inverted and excessive ranges and leaves none unchanged', () => {
 assert.throws(() => comparisonPeriod('2026-02-29', '2026-03-01', 'previous_year'));
 assert.throws(() => comparisonPeriod('2026-03-02', '2026-03-01', 'previous_period'));
 assert.throws(() => comparisonPeriod('2022-01-01', '2026-01-01', 'previous_year'));
 assert.throws(() => comparisonPeriod('0000-01-01', '0000-01-01', 'previous_year'));
 assert.deepEqual(comparisonPeriod('2026-01-01', '2026-01-02', 'none'), {from: '2026-01-01', to: '2026-01-02'});
});


test('two calendar years include a leap day and the shifted comparison remains representable', () => {
 assert.equal(calendarDays('2023-03-01', '2025-03-01').length, 732);
 assert.throws(() => calendarDays('2023-03-01', '2025-03-02'));
 const period = comparisonPeriod('2024-03-01', '2026-03-01', 'previous_year');
 assert.equal(calendarDays(period.from, period.to).length, 732);
 assert.throws(() => calendarDays('2024-02-29', '2026-03-01'));
});

test('calendar day predicate refuses impossible, rolled-over and noncanonical dates', () => {
 for (const invalid of ['2026-02-29','2026-02-30','2026-04-31','2026-13-01','2026-2-01','2026-10-01T00:00:00Z','not-a-date']) {
  assert.equal(isValidCalendarDay(invalid),false,invalid);
 }
 for (const valid of ['2024-02-29','2026-02-28','2026-12-31']) {
  assert.equal(isValidCalendarDay(valid),true,valid);
 }
});
