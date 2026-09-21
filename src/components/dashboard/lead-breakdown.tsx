import {MessageCircle, UserPlus, Users} from 'lucide-react';
import {Card} from '@/components/ui/card';
import {money, number} from '@/lib/utils';

type LeadBreakdownProps = {
  totalLeads: number | null;
  registrationLeads: number | null;
  messageLeads: number | null;
  totalCost: number | null;
  registrationCost: number | null;
  messageCost: number | null;
  currency: string;
};

const items = [
  {key: 'total', label: 'Todos os leads', costLabel: 'Custo por lead', icon: Users, tone: 'text-primary', border: 'hover:border-primary/30'},
  {key: 'registration', label: 'Cadastros', costLabel: 'Custo por cadastro', icon: UserPlus, tone: 'text-blue-400', border: 'hover:border-blue-400/30'},
  {key: 'message', label: 'Mensagens', costLabel: 'Custo por mensagem', icon: MessageCircle, tone: 'text-emerald-400', border: 'hover:border-emerald-400/30'},
] as const;

export function LeadBreakdown(props: LeadBreakdownProps) {
  const values = {
    total: {count: props.totalLeads, cost: props.totalCost},
    registration: {count: props.registrationLeads, cost: props.registrationCost},
    message: {count: props.messageLeads, cost: props.messageCost},
  };

  return <section>
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
      <div><p className="eyebrow">Geração de demanda</p><h2 className="mt-1 text-base font-semibold">Leads por tipo e custo</h2></div>
      <p className="text-xs text-zinc-500">Total = cadastros + conversas iniciadas</p>
    </div>
    <div className="grid gap-4 md:grid-cols-3">
      {items.map(({key, label, costLabel, icon: Icon, tone, border}) => {
        const item = values[key];
        return <Card className={`group relative overflow-hidden !p-5 transition ${border}`} key={key}>
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">{label}</p><strong className="mt-3 block text-3xl tabular-nums text-white">{number(item.count)}</strong></div>
            <span className={`rounded-xl border border-white/10 bg-white/[0.04] p-2.5 ${tone}`}><Icon size={19} /></span>
          </div>
          <div className="mt-5 flex items-end justify-between gap-3 border-t border-white/10 pt-4">
            <span className="text-xs text-zinc-500">{costLabel}</span>
            <strong className="text-base tabular-nums text-zinc-100">{money(item.cost, props.currency)}</strong>
          </div>
        </Card>;
      })}
    </div>
  </section>;
}
