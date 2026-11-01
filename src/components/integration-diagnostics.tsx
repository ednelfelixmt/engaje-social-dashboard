'use client';

import {useState} from 'react';
import {Activity, Database, CircleDashed, Loader2, TriangleAlert} from 'lucide-react';
import {browserClient} from '@/lib/supabase/browser';
import {Button} from '@/components/ui/button';
import {Card} from '@/components/ui/card';

import {diagnosticCopy,parseDiagnosticItems,type DiagnosticItem} from '@/lib/integrations/diagnostics';

function StatusIcon({status}: Pick<DiagnosticItem, 'status'>) {
  if (status === 'receiving') return <Database className="text-sky-400" size={20} />;
  if (status === 'ready') return <Activity className="text-primary" size={20} />;
  if (status === 'credentials_ready') return <CircleDashed className="text-amber-300" size={20} />;
  return <TriangleAlert className="text-red-300" size={20} />;
}

export function IntegrationDiagnostics({organizationId}: {organizationId: string}) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{organizationId:string;items:DiagnosticItem[]} | null>(null);
  const items=result?.organizationId===organizationId?result.items:null;
  const [error, setError] = useState('');

  async function diagnose() {
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const {data, error: invokeError} = await browserClient().functions.invoke('engaje-integrations', {body: {action: 'diagnose', organizationId}});
      if (invokeError) {
        throw new Error('Diagnostic unavailable');
      }
      setResult({organizationId,items:parseDiagnosticItems(data)});
    } catch {
      setResult(null);
      setError('Não foi possível concluir o diagnóstico. Verifique o acesso e tente novamente.');
    } finally {
      setBusy(false);
    }
  }

  return <Card className="space-y-5 border-primary/20 bg-primary/[0.025]">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-lg font-semibold">Diagnóstico operacional</h2><p className="muted mt-1 text-sm">Verifica o ambiente, contas e dados deste cliente sem revelar chaves ou tokens.</p></div><Button type="button" onClick={diagnose} disabled={busy}>{busy ? <Loader2 className="animate-spin" size={16} /> : <Activity size={16} />}{busy ? 'Verificando…' : 'Verificar agora'}</Button></div>
    {error ? <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</p> : null}
    {items ? <div className="grid gap-3 xl:grid-cols-2">{items.map((item) => <div key={item.key} className="rounded-xl border border-white/10 bg-black/15 p-4"><div className="flex items-start gap-3"><StatusIcon status={item.status} /><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{item.label}</h3><span className="connector-badge connector-badge-foundation">{diagnosticCopy[item.status].label}</span></div><p className="muted mt-2 text-xs">{item.account_count} conta(s) cadastrada(s) · {item.row_count.toLocaleString('pt-BR')} registro(s) no banco</p><p className="muted mt-2 text-xs">{diagnosticCopy[item.status].detail}</p><p className="mt-3 text-sm">Próximo passo: {item.next}</p></div></div></div>)}</div> : <p className="muted text-sm">Execute a verificação antes de conectar contas. Configuração presente e histórico armazenado não comprovam autorização válida nem sincronização atual.</p>}
  </Card>;
}
