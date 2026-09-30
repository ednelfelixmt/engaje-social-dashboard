import {Card} from '@/components/ui/card';
import {SortableCardGrid} from '@/components/dashboard/sortable-card-grid';
import {number} from '@/lib/utils';
import {dashboardMetricLabels, organicMetricKeys, type DashboardMetricKey} from '@/lib/metrics/catalog';

type MetricRow = Record<string, unknown>;

function value(rows: MetricRow[], key: string) {
  const available=rows.map((row)=>row[key]).filter((item):item is number=>item!=null&&Number.isFinite(Number(item))).map(Number);
  return available.length?available.reduce((total,item)=>total+item,0):null;
}

function latestValue(rows: MetricRow[], key: string) {
  const available=rows.filter((row)=>row[key]!=null&&Number.isFinite(Number(row[key]))).sort((a,b)=>String(a.metric_date??'').localeCompare(String(b.metric_date??'')));
  return available.length?Number(available.at(-1)![key]):null;
}

function followerGrowth(rows: MetricRow[]) {
  const follows=value(rows,'follows');
  const unfollows=value(rows,'unfollows');
  if(follows!==null||unfollows!==null)return (follows??0)-(unfollows??0);
  const snapshots=rows.filter((row)=>row.followers!=null&&Number.isFinite(Number(row.followers))).sort((a,b)=>String(a.metric_date??'').localeCompare(String(b.metric_date??'')));
  return snapshots.length>1?Number(snapshots.at(-1)!.followers)-Number(snapshots[0].followers):null;
}

function preferAccount(accountRows:MetricRow[],postRows:MetricRow[],key:string){
  const account=value(accountRows,key);
  return account!==null?account:value(postRows,key);
}

function interactions(rows: MetricRow[]) {
  const supplied=value(rows,'interactions');
  if(supplied!==null)return supplied;
  const values = ['likes', 'comments', 'shares', 'saves'].map((key) => value(rows, key)).filter((item): item is number => item !== null);
  return values.length ? values.reduce((total, item) => total + item, 0) : null;
}

function Delta({current, previous}: {current: number | null; previous?: number | null}) {
  if (previous === undefined) return <p className="mt-3 text-xs text-zinc-600">No período selecionado</p>;
  if (current === null || previous === null || previous === 0) return <p className="mt-3 text-xs text-zinc-500">Sem base de comparação</p>;
  const delta = (current - previous) / Math.abs(previous) * 100;
  return <p className={`mt-3 text-xs ${delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{delta > 0 ? '+' : ''}{number(delta, 1)}% vs. período comparado</p>;
}

export function OrganicKpis({current, previous, accountCurrent, accountPrevious, enabledMetrics, storageKey}: {current: MetricRow[]; previous?: MetricRow[]; accountCurrent:MetricRow[]; accountPrevious?:MetricRow[]; enabledMetrics: string[]; storageKey:string}) {
  const accountInteractions=value(accountCurrent,'interactions');
  const previousAccountInteractions=accountPrevious?value(accountPrevious,'interactions'):undefined;
  const currentInteractions = accountInteractions??interactions(current);
  const previousInteractions = previous ? (previousAccountInteractions??interactions(previous)) : undefined;
  const currentReach = preferAccount(accountCurrent,current,'reach');
  const previousReach = previous ? preferAccount(accountPrevious??[],previous,'reach') : undefined;
  const metricValues:Record<string,{current:number|null;previous?:number|null;suffix:string}>={
    impressions:{current:preferAccount(accountCurrent,current,'impressions'),previous:previous?preferAccount(accountPrevious??[],previous,'impressions'):undefined,suffix:''},
    reach:{current:currentReach,previous:previousReach,suffix:''},
    interactions:{current:currentInteractions,previous:previousInteractions,suffix:''},
    clicks:{current:value(current,'clicks'),previous:previous?value(previous,'clicks'):undefined,suffix:''},
    link_clicks:{current:value(current,'link_clicks'),previous:previous?value(previous,'link_clicks'):undefined,suffix:''},
    page_views:{current:value(current,'page_views'),previous:previous?value(previous,'page_views'):undefined,suffix:''},
    likes:{current:value(current,'likes'),previous:previous?value(previous,'likes'):undefined,suffix:''},
    comments:{current:value(current,'comments'),previous:previous?value(previous,'comments'):undefined,suffix:''},
    shares:{current:value(current,'shares'),previous:previous?value(previous,'shares'):undefined,suffix:''},
    saves:{current:value(current,'saves'),previous:previous?value(previous,'saves'):undefined,suffix:''},
    video_views:{current:value(current,'video_views'),previous:previous?value(previous,'video_views'):undefined,suffix:''},
    video_2s_views:{current:value(current,'video_2s_views'),previous:previous?value(previous,'video_2s_views'):undefined,suffix:''},
    video_3s_views:{current:value(current,'video_3s_views'),previous:previous?value(previous,'video_3s_views'):undefined,suffix:''},
    video_6s_views:{current:value(current,'video_6s_views'),previous:previous?value(previous,'video_6s_views'):undefined,suffix:''},
    video_25:{current:value(current,'video_25'),previous:previous?value(previous,'video_25'):undefined,suffix:''},
    video_50:{current:value(current,'video_50'),previous:previous?value(previous,'video_50'):undefined,suffix:''},
    video_75:{current:value(current,'video_75'),previous:previous?value(previous,'video_75'):undefined,suffix:''},
    video_95:{current:value(current,'video_95'),previous:previous?value(previous,'video_95'):undefined,suffix:''},
    video_100:{current:value(current,'video_100'),previous:previous?value(previous,'video_100'):undefined,suffix:''},
    followers:{current:latestValue(accountCurrent,'followers'),previous:accountPrevious?latestValue(accountPrevious,'followers'):undefined,suffix:''},
    follower_growth:{current:followerGrowth(accountCurrent),previous:accountPrevious?followerGrowth(accountPrevious):undefined,suffix:''},
    profile_views:{current:value(accountCurrent,'profile_views'),previous:accountPrevious?value(accountPrevious,'profile_views'):undefined,suffix:''},
    profile_visits:{current:value(accountCurrent,'profile_visits'),previous:accountPrevious?value(accountPrevious,'profile_visits'):undefined,suffix:''},
    website_clicks:{current:value(accountCurrent,'website_clicks'),previous:accountPrevious?value(accountPrevious,'website_clicks'):undefined,suffix:''},
    engagement_rate:{current:currentInteractions!==null&&currentReach?currentInteractions/currentReach*100:null,previous:previousInteractions!==undefined&&previousInteractions!==null&&previousReach?previousInteractions/previousReach*100:previous===undefined?undefined:null,suffix:'%'},
  };
  const metrics=organicMetricKeys.filter((key)=>enabledMetrics.includes(key)).map((key)=>({
    key,
    label:key==='impressions'?'Visualizações / impressões':dashboardMetricLabels[key as DashboardMetricKey],
    ...(metricValues[key]??{current:null,previous:previous?null:undefined,suffix:''}),
  }));
  const accountKeys=new Set(['followers','follower_growth','profile_views','profile_visits','website_clicks']);
  const items=metrics.map((metric)=>({id:metric.key,content:<Card className="!p-5"><div className="flex items-start justify-between gap-3"><p className="muted text-xs">{metric.label}</p><span className="rounded-full border border-white/10 px-2 py-0.5 text-[9px] uppercase tracking-wider text-zinc-500">{accountKeys.has(metric.key)?'Conta':'Desempenho'}</span></div><strong className="mt-4 block text-2xl tracking-tight">{number(metric.current, metric.suffix ? 2 : 0)}{metric.current === null ? '' : metric.suffix}</strong><Delta current={metric.current} previous={metric.previous}/></Card>}));
  return <SortableCardGrid items={items} gridId="organic-kpis" storageKey={storageKey} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6"/>;
}
