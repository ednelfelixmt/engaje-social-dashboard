'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {CheckSquare2} from 'lucide-react';
import {browserClient} from '@/lib/supabase/browser';
import {Button} from '@/components/ui/button';

type Candidate = {id: string; accountName: string; externalAccountId: string};

export function MetaAccountSelector({organizationId, provider, candidates}: {
  organizationId: string;
  provider: string;
  candidates: Candidate[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  return <div className="rounded-2xl border border-primary/30 bg-primary/[0.045] p-5">
    <div className="flex items-start gap-3"><CheckSquare2 className="mt-0.5 shrink-0 text-primary" size={20} /><div><h3 className="font-semibold">Selecione as contas deste cliente</h3><p className="muted mt-1 text-sm">Nada será vinculado automaticamente. Marque somente as contas que pertencem a este workspace.</p></div></div>
    <div className="mt-5 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
      {candidates.map((candidate) => <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-black/20 p-3 hover:border-primary/40" key={candidate.id}>
        <input className="mt-1 size-4 accent-yellow-400" type="checkbox" checked={selected.has(candidate.id)} onChange={(event) => setSelected((current) => {const next = new Set(current); if (event.target.checked) next.add(candidate.id); else next.delete(candidate.id); return next;})} />
        <span className="min-w-0"><strong className="block truncate text-sm">{candidate.accountName}</strong><small className="mt-1 block truncate text-zinc-500">{candidate.externalAccountId}</small></span>
      </label>)}
    </div>
    <div className="mt-5 flex flex-wrap items-center gap-4"><Button disabled={busy || !selected.size} onClick={async () => {
      setBusy(true); setMessage('');
      try {
        const {data, error} = await browserClient().functions.invoke('engaje-integrations', {body: {action: 'assign_accounts', organizationId, provider, integrationIds: [...selected]}});
        if (error) {const context=(error as {context?:Response}).context; const body=context?await context.json().catch(()=>null):null; throw new Error(body?.message||error.message);}
        setMessage(data.message || 'Contas vinculadas.');
        router.replace(window.location.pathname);
        router.refresh();
      } catch (error) {setMessage(error instanceof Error ? error.message : 'Não foi possível vincular as contas.');}
      finally {setBusy(false);}
    }}>{busy ? 'Vinculando…' : selected.size ? `Vincular ${selected.size} conta${selected.size === 1 ? '' : 's'}` : 'Selecione as contas'}</Button>{message ? <p role="status" className="text-sm text-amber-300">{message}</p> : null}</div>
  </div>;
}
