/** Esqueleto de carregamento no formato do dashboard: faixa de filtros, KPIs, gráfico principal e ranking. */
export function DashboardSkeleton(){
  return <div role="status" aria-busy="true" aria-live="polite" aria-label="Carregando dashboard" className="mx-auto max-w-[1780px] space-y-5">
    <div className="ds-skeleton" style={{height:56}}/>
    <div className="ds-skeleton-grid ds-skeleton-kpis">{[0,1,2,3,4,5].map(item=><div key={item} className="ds-skeleton" style={{height:112}}/>)}</div>
    <div className="ds-skeleton-grid ds-skeleton-main">
      <div className="ds-skeleton" style={{height:340}}/>
      <div className="ds-skeleton" style={{height:340}}/>
    </div>
    <span className="sr-only">Carregando…</span>
  </div>;
}
