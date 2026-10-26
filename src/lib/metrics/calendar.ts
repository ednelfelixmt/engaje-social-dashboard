/**
 * Calendar helpers for analytic periods: UTC calendar dates, not timestamps.
 * Source freshness/coverage and attribution windows are separate concerns.
 */
const DAY=86400000;
function dateMs(day:string):number {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day))throw new Error('Invalid ISO calendar day');
 const ms=Date.parse(day+'T00:00:00.000Z');
 if(!Number.isFinite(ms)||new Date(ms).toISOString().slice(0,10)!==day)throw new Error('Invalid calendar date');
 return ms;
}
function shiftedYearDate(date: Date, years: number) {
 const month = date.getUTCMonth();
 date.setUTCFullYear(date.getUTCFullYear() + years);
 if (date.getUTCMonth() !== month) date.setUTCDate(0);
 return date;
}
export function calendarDays(from:string,to:string):string[]{
 const a=dateMs(from),b=dateMs(to);
 if(b<a)throw new Error('Calendar period must be ascending');
 if(b>shiftedYearDate(new Date(a),2).getTime())throw new Error('Calendar period exceeds two years');
 return Array.from({length:Math.round((b-a)/DAY)+1},(_,i)=>new Date(a+i*DAY).toISOString().slice(0,10));
}
/** Compare by each period's calendar position; gaps remain null, not zero. */
export function alignCalendarPeriods<T>(
 currentDates:readonly string[],
 previousDates:readonly string[],
 current:ReadonlyMap<string,T>,
 previous:ReadonlyMap<string,T>
):{index:number;currentDate:string|null;previousDate:string|null;current:T|null;previous:T|null}[]{
 return Array.from({length:Math.max(currentDates.length,previousDates.length)},(_,i)=>({
  index:i+1,
  currentDate:currentDates[i]??null,
  previousDate:previousDates[i]??null,
  current:currentDates[i]!==undefined?current.get(currentDates[i])??null:null,
  previous:previousDates[i]!==undefined?previous.get(previousDates[i])??null:null,
 }));
}

/** Inclusive previous period, or prior-year endpoints with Feb 29 clamped to Feb 28. */
export function comparisonPeriod(from: string, to: string, mode: 'none' | 'previous_period' | 'previous_year') {
 const days = calendarDays(from, to).length;
 if (mode === 'none') return {from, to};
 const shifted = (day: string) => {
  const date = new Date(dateMs(day));
  if (mode === 'previous_year') {
   shiftedYearDate(date, -1);
  } else date.setUTCDate(date.getUTCDate() - days);
  const result = date.toISOString().slice(0, 10);
  dateMs(result); // Reject unsupported ISO-year boundaries rather than truncating them.
  return result;
 };
 return {from: shifted(from), to: shifted(to)};
}
