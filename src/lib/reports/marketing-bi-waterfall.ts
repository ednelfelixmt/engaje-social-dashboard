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
    const next=running+row.change;
    const magnitude=Math.abs(row.change);
    if (!Number.isFinite(next) || next<0 || !Number.isFinite(magnitude)) return null;
    bars.push({name:row.name,base:Math.min(running,next),magnitude,change:row.change});
    running=next;
  }
  bars.push({name:'Atual',base:0,magnitude:report.end,change:null});
  return bars;
}
