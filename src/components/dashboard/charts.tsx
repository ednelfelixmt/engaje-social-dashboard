'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {money} from '@/lib/utils';

type TimelineRow = {date: string; spend: number | null; revenue: number | null};

export function Timeline({rows, currency = 'BRL'}: {rows: TimelineRow[]; currency?: string}) {
  if (!rows.length) {
    return <div className="grid h-72 place-items-center text-sm text-zinc-500">Sem dados sincronizados neste período.</div>;
  }

  return <div className="mt-6 h-72 w-full">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={rows} margin={{top: 8, right: 6, left: -18, bottom: 0}}>
        <defs>
          <linearGradient id="revenueGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffd86b" stopOpacity={0.34} />
            <stop offset="100%" stopColor="#ffd86b" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="spendGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5ee7f7" stopOpacity={0.18} />
            <stop offset="100%" stopColor="#5ee7f7" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(255,255,255,.065)" vertical={false} />
        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 11}} tickMargin={12} tickFormatter={(value) => String(value).slice(5).split('-').reverse().join('/')} />
        <YAxis axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 11}} tickFormatter={(value) => Intl.NumberFormat('pt-BR', {notation: 'compact'}).format(Number(value))} />
        <Tooltip
          cursor={{stroke: 'rgba(255,255,255,.18)', strokeDasharray: '4 4'}}
          contentStyle={{background: 'rgba(10,15,26,.96)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 14, boxShadow: '0 18px 60px rgba(0,0,0,.42)'}}
          labelStyle={{color: '#a1a1aa', marginBottom: 8}}
          itemStyle={{fontSize: 12, fontWeight: 600}}
          formatter={(value) => money(typeof value === 'number' ? value : Number(value), currency)}
          labelFormatter={(value) => new Intl.DateTimeFormat('pt-BR', {day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC'}).format(new Date(`${value}T00:00:00Z`))}
        />
        <Area type="monotone" dataKey="revenue" name="Receita" stroke="#ffd86b" strokeWidth={2.5} fill="url(#revenueGlow)" connectNulls={false} />
        <Area type="monotone" dataKey="spend" name="Investimento" stroke="#5ee7f7" strokeWidth={2} fill="url(#spendGlow)" connectNulls={false} />
      </AreaChart>
    </ResponsiveContainer>
  </div>;
}
