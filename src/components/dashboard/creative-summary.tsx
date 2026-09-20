import {BadgeDollarSign, Eye, MousePointerClick, Target, Users} from 'lucide-react';
import {Card} from '@/components/ui/card';
import {money, number} from '@/lib/utils';
import {sum} from '@/lib/metrics/query';
import type {Row} from '@/types/database.types';

export function CreativeSummary({rows, currency}: {rows: Row<'metrics_ads'>[]; currency: string}) {
  const spend = sum(rows, 'spend');
  const impressions = sum(rows, 'impressions');
  const clicks = sum(rows, 'clicks');
  const leads = sum(rows, 'leads');
  const ctr = impressions && clicks != null ? clicks / impressions * 100 : null;
  const cpl = leads && spend != null ? spend / leads : null;
  const values = [
    {label: 'Investimento', value: money(spend, currency), icon: BadgeDollarSign},
    {label: 'Impressões', value: number(impressions), icon: Eye},
    {label: 'CTR', value: ctr == null ? '—' : `${number(ctr, 2)}%`, icon: MousePointerClick},
    {label: 'Leads', value: number(leads), icon: Users},
    {label: 'CPL', value: money(cpl, currency), icon: Target},
  ];

  return <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
    {values.map(({label, value, icon: Icon}) => <Card className="!p-5" key={label}><div className="flex items-start justify-between"><div><p className="text-xs uppercase tracking-[0.12em] text-zinc-500">{label}</p><strong className="mt-4 block text-2xl">{value}</strong></div><Icon className="text-primary" size={18} /></div></Card>)}
  </section>;
}
