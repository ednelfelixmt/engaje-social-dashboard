'use client';
import {PieChart,Pie,Cell,Legend,ResponsiveContainer,Tooltip,BarChart,Bar,CartesianGrid,XAxis,YAxis} from 'recharts';
import {Card} from '@/components/ui/card';
import {number} from '@/lib/utils';
type Point={label:string;impressions:number|null;clicks:number|null;leads:number|null;spend:number};
const colors=['#b894ff','#5bb8ff','#facc15','#50d4a0','#ff9d72','#f38faf'];
function sum(rows:Point[]){return rows.reduce((n,r)=>n+(r.impressions??0),0);}
export function AudienceOverview({gender,age,device}:{gender:Point[];age:Point[];device:Point[]}){
 const genderRows=gender.filter(r=>r.impressions!=null&&r.impressions>0).map(r=>({name:r.label,value:r.impressions!}));
 const deviceRows=device.filter(r=>r.impressions!=null&&r.impressions>0).map(r=>({name:r.label,value:r.impressions!}));
 const ageRows=[...age].filter(r=>r.impressions!=null).sort((a,b)=>a.label.localeCompare(b.label,undefined,{numeric:true})).map(r=>({name:r.label,impressions:r.impressions??0,clicks:r.clicks??0}));
 return <section className="grid gap-3 xl:grid-cols-3" aria-label="Análise demográfica gráfica">
  <Card className="!p-4"><h2 className="text-sm font-semibold">Distribuição por sexo</h2><p className="mt-1 text-xs text-zinc-500">Participação nas impressões disponíveis</p><div className="mt-3 h-[225px]">{genderRows.length?<ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={genderRows} dataKey="value" nameKey="name" innerRadius={54} outerRadius={78} paddingAngle={3}>{genderRows.map((_,i)=><Cell key={i} fill={colors[i%colors.length]}/>)}</Pie><Tooltip formatter={v=>number(typeof v==='number'?v:null)}/><Legend wrapperStyle={{fontSize:11}}/></PieChart></ResponsiveContainer>:<p className="pt-16 text-center text-sm text-zinc-500">Sem dados de sexo.</p>}</div></Card>
  <Card className="!p-4"><h2 className="text-sm font-semibold">Faixas etárias</h2><p className="mt-1 text-xs text-zinc-500">Impressões e cliques por faixa</p><div className="mt-3 h-[225px]">{ageRows.length?<ResponsiveContainer width="100%" height="100%"><BarChart data={ageRows}><CartesianGrid stroke="#263140" vertical={false}/><XAxis dataKey="name" tick={{fontSize:9,fill:'#b3bdca'}}/><YAxis tick={{fontSize:10,fill:'#b3bdca'}}/><Tooltip contentStyle={{background:'#141a25',border:'1px solid #344255'}}/><Bar dataKey="impressions" name="Impressões" fill="#facc15" radius={[3,3,0,0]}/><Bar dataKey="clicks" name="Cliques" fill="#60a5fa" radius={[3,3,0,0]}/></BarChart></ResponsiveContainer>:<p className="pt-16 text-center text-sm text-zinc-500">Sem dados de faixa etária.</p>}</div></Card>
  <Card className="!p-4"><h2 className="text-sm font-semibold">Dispositivos</h2><p className="mt-1 text-xs text-zinc-500">Distribuição dos eventos de entrega</p><div className="mt-3 h-[225px]">{deviceRows.length?<ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={deviceRows} dataKey="value" nameKey="name" innerRadius={54} outerRadius={78} paddingAngle={3}>{deviceRows.map((_,i)=><Cell key={i} fill={colors[(i+2)%colors.length]}/>)}</Pie><Tooltip formatter={v=>number(typeof v==='number'?v:null)}/><Legend wrapperStyle={{fontSize:11}}/></PieChart></ResponsiveContainer>:<p className="pt-16 text-center text-sm text-zinc-500">Sem dados de dispositivos.</p>}</div></Card>
  <p className="text-[11px] text-zinc-500 xl:col-span-3">Cada dimensão corresponde ao total informado pela plataforma. Não somar sexo, idade e dispositivos entre si; são recortes potencialmente sobrepostos de uma mesma entrega.</p>
 </section>;
}
