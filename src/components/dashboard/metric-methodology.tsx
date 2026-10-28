import {Card} from '@/components/ui/card';
import {methodologyScopeLabels,methodologyStatusLabels,type selectMetricMethodology} from '@/lib/metrics/methodology';
export function MetricMethodology({selection}:{selection:ReturnType<typeof selectMetricMethodology>}){
 return <section aria-label="Definições e contratos de métricas" className="space-y-4">
  <p role="status" className="text-sm text-zinc-400">{selection.rows.length} de {selection.total} definições do catálogo. A contagem descreve definições, não dados recebidos.</p>
  {!selection.rows.length?<Card>Nenhuma definição corresponde aos filtros. Isso não descreve a atividade do cliente.</Card>:selection.rows.map(entry=><Card key={entry.key}>
   <h2 className="text-xl font-semibold">{entry.label}</h2><p className="mt-2 text-sm text-zinc-400">{entry.description}</p>
   <p className="mt-2 text-xs text-zinc-500">Categoria: {entry.groupLabel}. Plataformas citadas: {entry.platforms.join(' · ')}. A lista não comprova integração ativa.</p>
   <div className="mt-4 space-y-4">{entry.contexts.map(item=><section key={item.scope} className="rounded-xl border border-white/10 p-4" aria-label={entry.label+' · '+methodologyScopeLabels[item.scope]}>
    <h3 className="font-semibold">{methodologyScopeLabels[item.scope]} · {methodologyStatusLabels[item.status]}</h3>
    <dl className="mt-3 space-y-2 text-sm"><div><dt className="text-zinc-400">Unidade</dt><dd>{item.unit}</dd></div><div><dt className="text-zinc-400">Grão / contexto</dt><dd>{item.grain}</dd></div><div><dt className="text-zinc-400">Fórmula neste contrato</dt><dd>{item.formula??'Sem fórmula operacional documentada para este contexto.'}</dd></div><div><dt className="text-zinc-400">Agregação</dt><dd>{item.aggregation}</dd></div></dl>
    <h4 className="mt-3 text-sm font-semibold">Condições</h4><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-400">{item.requirements.map(text=><li key={text}>{text}</li>)}</ul>
    <h4 className="mt-3 text-sm font-semibold">Limitações</h4><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-400">{item.limitations.map(text=><li key={text}>{text}</li>)}</ul>
   </section>)}</div>
  </Card>)}
 </section>;
}
