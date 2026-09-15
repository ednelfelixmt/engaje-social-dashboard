import {Card} from '@/components/ui/card';
import {number} from '@/lib/utils';
import {sum} from '@/lib/metrics/query';

type MetricRow = Record<string, unknown>;

function value(rows: MetricRow[], key: string) {
  return sum(rows, key);
}

function interactions(rows: MetricRow[]) {
  const values = ['likes', 'comments', 'shares', 'saves'].map((key) => value(rows, key)).filter((item): item is number => item !== null);
  return values.length ? values.reduce((total, item) => total + item, 0) : null;
}

function Delta({current, previous}: {current: number | null; previous?: number | null}) {
  if (previous === undefined) return <p className="mt-3 text-xs text-zinc-600">No período selecionado</p>;
  if (current === null || previous === null || previous === 0) return <p className="mt-3 text-xs text-zinc-500">Sem base de comparação</p>;
  const delta = (current - previous) / Math.abs(previous) * 100;
  return <p className={`mt-3 text-xs ${delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{delta > 0 ? '+' : ''}{number(delta, 1)}% vs. período comparado</p>;
}

export function OrganicKpis({current, previous}: {current: MetricRow[]; previous?: MetricRow[]}) {
  const currentInteractions = interactions(current);
  const previousInteractions = previous ? interactions(previous) : undefined;
  const currentReach = value(current, 'reach');
  const previousReach = previous ? value(previous, 'reach') : undefined;
  const metrics = [
    {label: 'Impressões', current: value(current, 'impressions'), previous: previous ? value(previous, 'impressions') : undefined, suffix: ''},
    {label: 'Alcance dos posts', current: currentReach, previous: previousReach, suffix: ''},
    {label: 'Interações', current: currentInteractions, previous: previousInteractions, suffix: ''},
    {label: 'Cliques', current: value(current, 'clicks'), previous: previous ? value(previous, 'clicks') : undefined, suffix: ''},
    {label: 'Visualizações de vídeo', current: value(current, 'video_views'), previous: previous ? value(previous, 'video_views') : undefined, suffix: ''},
    {label: 'Taxa de interação', current: currentInteractions !== null && currentReach ? currentInteractions / currentReach * 100 : null, previous: previousInteractions !== undefined && previousInteractions !== null && previousReach ? previousInteractions / previousReach * 100 : previous === undefined ? undefined : null, suffix: '%'},
  ];
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">{metrics.map((metric) => <Card key={metric.label} className="!p-5"><p className="muted text-xs">{metric.label}</p><strong className="mt-4 block text-2xl tracking-tight">{number(metric.current, metric.suffix ? 2 : 0)}{metric.current === null ? '' : metric.suffix}</strong><Delta current={metric.current} previous={metric.previous} /></Card>)}</div>;
}
