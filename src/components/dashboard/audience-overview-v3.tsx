'use client';
import {Card} from '@/components/ui/card';
import {ChartFrame} from '@/components/charts/chart-frame';
import {DonutChart} from '@/components/charts/composition-charts';
import {TimeSeriesChart,type TimePoint} from '@/components/charts/time-series-chart';
import {sum} from '@/lib/metrics/aggregation';
import {number} from '@/lib/utils';
import {breakdownMetricValue, validObservation, type BreakdownPoint as Point} from '@/lib/reports/audience-report';
const complete=(rows:Point[])=>sum(rows,'impressions')!=null;
const emptyMessage=(rows:Point[],isComplete:boolean,none:string)=>rows.length&&!isComplete?'Distribuição indisponível: cobertura incompleta.':isComplete?'Zero impressões informadas.':none;
export function AudienceOverview({gender,age,device}:{gender:Point[];age:Point[];device:Point[]}){
 const genderComplete=complete(gender),deviceComplete=complete(device);
 const genderRows=(genderComplete?gender:[]).filter(r=>r.impressions!=null&&r.impressions>0).map((r,i)=>({id:'g'+i,label:r.label,value:r.impressions!}));
 const deviceRows=(deviceComplete?device:[]).filter(r=>r.impressions!=null&&r.impressions>0).map((r,i)=>({id:'d'+i,label:r.label,value:r.impressions!}));
 const ageRows=[...age].filter(r=>validObservation(r.impressions)||validObservation(r.clicks)).sort((a,b)=>a.label.localeCompare(b.label,undefined,{numeric:true}));
 const agePoints:TimePoint[]=ageRows.map(r=>({label:r.label,detail:'Faixa etária '+r.label,current:breakdownMetricValue(r,'impressions'),secondary:breakdownMetricValue(r,'clicks')}));
 return <section className="grid gap-3 xl:grid-cols-3" aria-label="Análise demográfica gráfica">
  <Card className="!p-4"><h2 className="text-sm font-semibold">Distribuição por sexo</h2><p className="mt-1 text-xs text-zinc-400">Participação nas impressões disponíveis</p><div className="mt-3"><ChartFrame bare hideTitle title="Impressões por sexo" height="auto" empty={genderRows.length?null:emptyMessage(gender,genderComplete,'Sem dados de sexo.')}><DonutChart slices={genderRows} format={{kind:'count'}} centerLabel="Impressões" ariaLabel="Distribuição das impressões por sexo"/></ChartFrame></div></Card>
  <Card className="!p-4"><h2 className="text-sm font-semibold">Faixas etárias</h2><p className="mt-1 text-xs text-zinc-400">Impressões (colunas) e cliques (linha, eixo direito)</p><div className="mt-3"><ChartFrame bare hideTitle title="Impressões e cliques por faixa etária" height={270} empty={agePoints.length?null:'Sem dados de faixa etária.'}
    legend={[{label:'Impressões',color:'var(--chart-primary)'},{label:'Cliques (eixo direito)',color:'var(--chart-secondary)',kind:'line'}]}
    table={{columns:['Faixa','Impressões','Cliques'],rows:agePoints.map(p=>[p.label,number(p.current),number(p.secondary??null)])}}>
    <TimeSeriesChart points={agePoints} format={{kind:'count'}} mode="columns" name="Impressões" allLabels secondary={{name:'Cliques',format:{kind:'count'}}} ariaLabel="Impressões e cliques por faixa etária"/>
  </ChartFrame></div></Card>
  <Card className="!p-4"><h2 className="text-sm font-semibold">Dispositivos</h2><p className="mt-1 text-xs text-zinc-400">Distribuição dos eventos de entrega</p><div className="mt-3"><ChartFrame bare hideTitle title="Impressões por dispositivo" height="auto" empty={deviceRows.length?null:emptyMessage(device,deviceComplete,'Sem dados de dispositivos.')}><DonutChart slices={deviceRows} format={{kind:'count'}} centerLabel="Impressões" ariaLabel="Distribuição das impressões por dispositivo"/></ChartFrame></div></Card>
  <p className="text-xs leading-5 text-zinc-400 xl:col-span-3">Campos ausentes permanecem sem barras; não equivalem a zero. Cada dimensão corresponde ao total informado pela plataforma. Não somar sexo, idade e dispositivos entre si; são recortes potencialmente sobrepostos de uma mesma entrega.</p>
 </section>;
}
