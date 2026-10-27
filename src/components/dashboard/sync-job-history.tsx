import {Card} from '@/components/ui/card';
import type {QualityJobView} from '@/lib/metrics/data-quality';
const labels={queued:'Na fila',running:'Em execução',completed:'Conclusão registrada',failed:'Falha registrada',unknown:'Status não reconhecido'};
const number=(value:number)=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:3}).format(value);
export function SyncJobHistory({jobs}:{jobs:QualityJobView[]}){
 return <Card className="!p-4"><h2 className="font-semibold">Últimos registros de sincronização</h2>
  <p className="mt-2 text-xs text-zinc-400">Até 12 registros mais recentes por criação, com horários UTC. Agendamentos externos podem não registrar cada disparo aqui. Estado e contador registrados não comprovam qualidade, completude ou correspondência com o provedor.</p>
  {jobs.length?<ol className="mt-4 space-y-3">{jobs.map(job=><li key={job.id} className="rounded-lg border border-white/10 p-3 text-xs">
   <h3 className="font-semibold">{labels[job.status]}</h3>
   <dl className="mt-2 grid gap-2"><div><dt>Criado UTC</dt><dd>{job.createdAt??'Indisponível'}</dd></div><div><dt>Início UTC</dt><dd>{job.startedAt??'Não informado ou inválido'}</dd></div><div><dt>Conclusão UTC</dt><dd>{job.completedAt??'Não informada ou inválida'}</dd></div>
    <div><dt>Duração registrada</dt><dd>{job.durationMs===null?'Indisponível':number(job.durationMs/1000)+' s'}</dd></div>
    <div><dt>Contador final registrado</dt><dd>{job.recordedCount===null?'Indisponível':number(job.recordedCount)}</dd></div>
   </dl>{job.timelineInvalid?<p role="status" className="mt-2 text-amber-200">Cronologia não validada; duração e contador final indisponíveis.</p>:null}
  </li>)}</ol>:<p className="mt-4 text-sm text-zinc-500">Nenhum trabalho registrado. Isso não comprova ausência de sincronização.</p>}
 </Card>;
}
