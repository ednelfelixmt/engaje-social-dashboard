'use client';

import {useState} from 'react';
import {Activity, CheckCircle2, CircleDashed, Loader2, TriangleAlert} from 'lucide-react';
import {browserClient} from '@/lib/supabase/browser';
import {Button} from '@/components/ui/button';
import {Card} from '@/components/ui/card';

type DiagnosticItem = {
  key: string;
  label: string;
  configured: boolean;
  account_count: number;
  row_count: number;
  status: 'receiving' | 'ready' | 'credentials_ready' | 'blocked';
  next: string;
};

const labels = {receiving: 'Recebendo dados', ready: 'Pronto para sincronizar', credentials_ready: 'Credenciais prontas', blocked: 'Configuração necessária'} as const;

function StatusIcon({status}: Pick<DiagnosticItem, 'status'>) {
  if (status === 'receiving') return <CheckCircle2 className="text-emerald-400" size={20} />;
  if (status === 'ready') return <Activity className="text-primary" size={20} />;
  if (status === 'credentials_ready') return <CircleDashed className="text-amber-300" size={20} />;
  return <TriangleAlert className="text-red-300" size={20} />;
}

export function IntegrationDiagnostics({organizationId}: {organizationId: string}) {
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<DiagnosticItem[] | null>(null);
  const [error, setError] = useState('');

  async function diagnose() {
    setBusy(true);
    setError('');
    try {
      const {data, error: invokeError} = await browserClient().functions.invoke('engaje-integrations', {body: {action: 'diagnose', organizationId}});
      if (invokeError) {
        const context = (invokeError as {context?: Response}).context;
        const body = context ? await context.json().catch(() => null) : null;
        throw new Error(body?.message || invokeError.message);
      }
      setItems(data.items);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível verificar o ambiente.');
    } finally {
      setBusy(false);
    }
  }

  return <Card className="space-y-5 border-primary/20 bg-primary/[0.025]">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-lg font-semibold">Diagnóstico operacional</h2><p className="muted mt-1 text-sm">Verifica o ambiente, contas e dados deste cliente sem revelar chaves ou tokens.</p></div><Button type="button" onClick={diagnose} disabled={busy}>{busy ? <Loader2 className="animate-spin" size={16} /> : <Activity size={16} />}{busy ? 'Verificando…' : 'Verificar agora'}</Button></div>
    {error ? <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</p> : null}
    {items ? <div className="grid gap-3 xl:grid-cols-2">{items.map((item) => <div key={item.key} className="rounded-xl border border-white/10 bg-black/15 p-4"><div className="flex items-start gap-3"><StatusIcon status={item.status} /><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{item.label}</h3><span className={`connector-badge ${item.status === 'receiving' ? 'connector-badge-live' : 'connector-badge-foundation'}`}>{labels[item.status]}</span></div><p className="muted mt-2 text-xs">{item.account_count} conta(s) · {item.row_count.toLocaleString('pt-BR')} registro(s)</p><p className="mt-3 text-sm">Próximo passo: {item.next}</p></div></div></div>)}</div> : <p className="muted text-sm">Execute a verificação antes de conectar contas. O diagnóstico diferencia “credencial configurada” de “dados realmente recebidos”.</p>}
  </Card>;
}
