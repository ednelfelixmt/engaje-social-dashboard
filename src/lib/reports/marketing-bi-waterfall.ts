import type {marketingDrivers} from './marketing-bi';

type DriverReport = ReturnType<typeof marketingDrivers>;
export type MarketingWaterfallBar = {name:string;base:number;magnitude:number;change:number|null};

/**
 * A reconciled total can be finite even when an intermediate waterfall step
 * overflows (e.g. a large positive correction followed by its reversal).
 * Never hand non-finite SVG coordinates to a chart or silently re-order facts.
 * Return null for the plot; callers can still show the original table.
 */
export function projectMarketingWaterfall(report:DriverReport):MarketingWaterfallBar[]|null {
  if (!report.available || report.start===null || report.end===null ||
      !Number.isFinite(report.start) || !Number.isFinite(report.end) ||
      report.start<0 || report.end<0) return null;
  const shown=report.rows.slice(0,8).map(row=>({name:row.name,change:row.change}));
  if (report.rows.length>8) {
    let rest=0;
    for (const row of report.rows.slice(8)) {
      rest+=row.change;
      if (!Number.isFinite(rest)) return null;
    }
    shown.push({name:'Demais campanhas',change:rest});
  }
  let running=report.start;
  const bars:MarketingWaterfallBar[]=[{name:'Comparativo',base:0,magnitude:running,change:null}];
  for (const row of shown) {
    if (!Number.isFinite(row.change)) return null;
    const rawNext=running+row.change;
    const magnitude=Math.abs(row.change);
    // Subtracting ordinary decimal measurements can leave a tiny negative
    // rounding residual at zero. Tolerate only a bounded relative ULP error;
    // genuine negative geometry and non-finite intermediates still fail closed.
    const scale=Math.max(Math.abs(running),Math.abs(row.change));
    const tolerance=Number.EPSILON*scale*(shown.length+2);
    if (!Number.isFinite(rawNext) || rawNext < -tolerance || !Number.isFinite(magnitude)) return null;
    const next=rawNext<0?0:rawNext;
    bars.push({name:row.name,base:Math.min(running,next),magnitude,change:row.change});
    running=next;
  }
  // The independently aggregated endpoint must agree with the visible steps.
  // Sorting campaigns and grouping the tail can introduce a few floating-point
  // ULPs; tolerate that arithmetic noise, not a missing or contradictory driver.
  const scale=Math.max(Math.abs(report.start),Math.abs(report.end),...shown.map(row=>Math.abs(row.change)));
  const tolerance=Number.EPSILON*scale*(shown.length+2);
  if (!shown.length || !Number.isFinite(tolerance) || Math.abs(running-report.end)>tolerance) return null;
  bars.push({name:'Atual',base:0,magnitude:report.end,change:null});
  return bars;
}
