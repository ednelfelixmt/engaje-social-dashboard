import {useId} from 'react';

/** Calendar positions are preserved; missing observations split the stroke. */
export function AnalyticsSparkline({values,color}: {values:(number|null)[];color:string}) {
  const id = useId().replace(/:/g, '');
  // Finite signed values can still overflow when subtracting opposite extremes.
  // Scan without spread arguments so long daily histories remain safe to inspect.
  let min = Infinity, max = -Infinity;
  for (const value of values) {
    if (value === null || !Number.isFinite(value)) continue;
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  if (min === Infinity) return <span className="studio-sparkline-empty">Sem série diária</span>;
  const span = max - min;
  // Halving before subtraction prevents overflow while retaining the endpoints.
  const safeSpan = Number.isFinite(span) ? span : max / 2 - min / 2;
  const segments:{x:number;y:number}[][] = []; let segment:{x:number;y:number}[] = [];
  values.forEach((value,index) => {
    if (value === null || !Number.isFinite(value)) { if (segment.length) segments.push(segment); segment = []; return; }
    const position = span === 0 ? 0.5 : Number.isFinite(span) ? (value - min) / safeSpan : (value / 2 - min / 2) / safeSpan;
    segment.push({x:values.length === 1 ? 55 : index/(values.length-1)*110,y:span === 0 ? 17 : 30-position*26});
  });
  if (segment.length) segments.push(segment);
  return <svg className="studio-sparkline" viewBox="0 0 110 36" aria-hidden="true" focusable="false">
    <defs><linearGradient id={'spark-'+id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".22"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>
    {segments.map((points,index) => {const path=points.map((p,i)=>(i?'L':'M')+p.x.toFixed(2)+','+p.y.toFixed(2)).join(' ');return <g key={index}><path d={path+' L'+points[points.length-1].x+',36 L'+points[0].x+',36 Z'} fill={'url(#spark-'+id+')'} stroke="none"/>{points.length===1?<circle cx={points[0].x} cy={points[0].y} r="2.5" fill={color}/>:<path d={path} stroke={color} fill="none" strokeWidth="2.2" strokeLinecap="round"/>}</g>;})}
  </svg>;
}
