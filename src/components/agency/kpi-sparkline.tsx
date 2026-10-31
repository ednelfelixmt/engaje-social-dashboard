const WIDTH=100,HEIGHT=28,PAD=4;

/**
 * Mini evolution of one KPI. Intervals without a valid observation break the line (never interpolated, never zero);
 * an isolated observation is drawn as a dot. Decorative: the KPI card already announces the value.
 */
export function KpiSparkline({values}:{values:readonly (number|null)[]}) {
 const known=values.filter((value):value is number=>value!==null&&Number.isFinite(value));
 if(known.length<2)return <span className="agency-kpi-spark" data-empty aria-hidden/>;
 const low=Math.min(...known),high=Math.max(...known),span=high-low;
 const x=(index:number)=>values.length===1?WIDTH/2:index/(values.length-1)*WIDTH;
 const y=(value:number)=>span===0?HEIGHT/2:HEIGHT-PAD-(value-low)/span*(HEIGHT-PAD*2);
 const runs:{x:number;y:number}[][]=[];
 values.forEach((value,index)=>{
  if(value===null||!Number.isFinite(value)){runs.push([]);return;}
  if(!runs.length)runs.push([]);
  runs[runs.length-1].push({x:x(index),y:y(value)});
 });
 const paths=runs.filter(run=>run.length>0).map(run=>run.length===1?'M'+run[0].x.toFixed(2)+' '+run[0].y.toFixed(2)+'h0':'M'+run.map(point=>point.x.toFixed(2)+' '+point.y.toFixed(2)).join('L'));
 return <svg className="agency-kpi-spark" viewBox={'0 0 '+WIDTH+' '+HEIGHT} preserveAspectRatio="none" aria-hidden focusable="false">
  {paths.map((d,index)=><path key={index} d={d} data-dot={d.endsWith('h0')||undefined}/>)}
 </svg>;
}
