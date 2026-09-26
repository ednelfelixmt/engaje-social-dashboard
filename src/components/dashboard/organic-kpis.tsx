import {Card} from '@/components/ui/card';
import {number} from '@/lib/utils';
import {sum} from '@/lib/metrics/query';
import {dashboardMetricLabels, organicMetricKeys, type DashboardMetricKey} from '@/lib/metrics/catalog';

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

export function OrganicKpis({current, previous, enabledMetrics}: {current: MetricRow[]; previous?: MetricRow[]; enabledMetrics: string[]}) {
  const currentInteractions = interactions(current);
  const previousInteractions = previous ? interactions(previous) : undefined;
  const currentReach = value(current, 'reach');
  const previousReach = previous ? value(previous, 'reach') : undefined;
  const metricValues:Record<string,{current:number|null;previous?:number|null;suffix:string}>={
    impressions:{current:value(current,'impressions'),previous:previous?value(previous,'impressions'):undefined,suffix:''},
    reach:{current:currentReach,previous:previousReach,suffix:''},
    interactions:{current:currentInteractions,previous:previousInteractions,suffix:''},
    clicks:{current:value(current,'clicks'),previous:previous?value(previous,'clicks'):undefined,suffix:''},
    page_views:{current:value(current,'page_views'),previous:previous?value(previous,'page_views'):undefined,suffix:''},
    likes:{current:value(current,'likes'),previous:previous?value(previous,'likes'):undefined,suffix:''},
    comments:{current:value(current,'comments'),previous:previous?value(previous,'comments'):undefined,suffix:''},
    shares:{current:value(current,'shares'),previous:previous?value(previous,'shares'):undefined,suffix:''},
    saves:{current:value(current,'saves'),previous:previous?value(previous,'saves'):undefined,suffix:''},
    video_views:{current:value(current,'video_views'),previous:previous?value(previous,'video_views'):undefined,suffix:''},
    engagement_rate:{current:currentInteractions!==null&&currentReach?currentInteractions/currentReach*100:null,previous:previousInteractions!==undefined&&previousInteractions!==null&&previousReach?previousInteractions/previousReach*100:previous===undefined?undefined:null,suffix:'%'},
  };
  const metrics=organicMetricKeys.filter((key)=>enabledMetrics.includes(key)).map((key)=>({key,label:dashboardMetricLabels[key as DashboardMetricKey],...metricValues[key]})).filter((metric)=>metric.current!==undefined);
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">{metrics.map((metric) => <Card key={metric.label} className="!p-5"><p className="muted text-xs">{metric.label}</p><strong className="mt-4 block text-2xl tracking-tight">{number(metric.current, metric.suffix ? 2 : 0)}{metric.current === null ? '' : metric.suffix}</strong><Delta current={metric.current} previous={metric.previous} /></Card>)}</div>;
}
