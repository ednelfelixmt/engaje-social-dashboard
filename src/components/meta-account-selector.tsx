'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {CheckSquare2, ShieldCheck} from 'lucide-react';
import {browserClient} from '@/lib/supabase/browser';
import {Button} from '@/components/ui/button';

type Candidate = {id: string; accountName: string; externalAccountId: string};

const providerLabels: Record<string, string> = {
  meta_ads: 'Meta Ads',
  facebook_organic: 'Facebook orgânico',
  instagram_organic: 'Instagram orgânico',
  tiktok_ads: 'TikTok Ads',
  tiktok_organic: 'TikTok orgânico',
  windsor: 'Windsor.ai',
  stract: 'Stract',
  hubspot: 'HubSpot',
  rd_station: 'RD Station',
  generic_crm: 'CRM genérico',
};

export function MetaAccountSelector({organizationId, provider, candidates}: {
  organizationId: string;
  provider: string;
  candidates: Candidate[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();
  const providerName = providerLabels[provider] ?? provider;
  const allSelected = selected.size === candidates.length;

  return <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby={`account-selector-${provider}`}>
    <div className="w-full max-w-5xl rounded-3xl border border-primary/30 bg-[#141419] p-5 shadow-2xl md:p-7">
    <div className="flex items-start gap-3"><CheckSquare2 className="mt-0.5 shrink-0 text-primary" size={22} /><div><p className="eyebrow mb-2">Etapa obrigatória · {providerName}</p><h2 className="text-2xl font-semibold" id={`account-selector-${provider}`}>Quais contas pertencem a este cliente?</h2><p className="muted mt-2 text-sm">A autorização encontrou {candidates.length} conta(s). Marque somente as que devem alimentar este workspace. Nenhuma conta será integrada antes da sua confirmação.</p></div></div>
    <div className="mt-5 flex items-center justify-between gap-4 border-y border-white/10 py-3">
      <span className="text-sm"><strong>{selected.size}</strong> de {candidates.length} selecionada(s)</span>
      <button className="text-sm font-semibold text-primary hover:underline" type="button" disabled={busy} onClick={() => setSelected(allSelected ? new Set() : new Set(candidates.map((candidate) => candidate.id)))}>{allSelected ? 'Desmarcar todas' : 'Selecionar todas'}</button>
    </div>
    <div className="mt-5 grid max-h-[48vh] gap-2 overflow-y-auto pr-1 md:grid-cols-2 xl:grid-cols-3">
      {candidates.map((candidate) => <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-black/20 p-3 hover:border-primary/40" key={candidate.id}>
        <input className="mt-1 size-4 accent-yellow-400" type="checkbox" disabled={busy} checked={selected.has(candidate.id)} onChange={(event) => setSelected((current) => {const next = new Set(current); if (event.target.checked) next.add(candidate.id); else next.delete(candidate.id); return next;})} />
        <span className="min-w-0"><strong className="block truncate text-sm">{candidate.accountName}</strong><small className="mt-1 block truncate text-zinc-500">{candidate.externalAccountId}</small></span>
      </label>)}
    </div>
    <div className="mt-5 flex flex-col-reverse gap-4 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2 text-xs text-zinc-400"><ShieldCheck size={16} className="text-emerald-400" /> Isolamento exclusivo por cliente</div><div className="flex flex-wrap items-center gap-4"><Button className="min-w-[220px]" disabled={busy || !selected.size} onClick={async () => {
      setBusy(true); setMessage('');
      try {
        const {data, error} = await browserClient().functions.invoke('engaje-integrations', {body: {action: 'assign_accounts', organizationId, provider, integrationIds: [...selected]}});
        if (error) {const context=(error as {context?:Response}).context; const body=context?await context.json().catch(()=>null):null; throw new Error(body?.message||error.message);}
        setMessage(data.message || 'Contas vinculadas.');
        router.replace(window.location.pathname);
        router.refresh();
      } catch (error) {setMessage(error instanceof Error ? error.message : 'Não foi possível vincular as contas.');}
      finally {setBusy(false);}
    }}>{busy ? 'Vinculando…' : selected.size ? `Confirmar ${selected.size} conta${selected.size === 1 ? '' : 's'}` : 'Selecione ao menos uma conta'}</Button>{message ? <p role="status" className="text-sm text-amber-300">{message}</p> : null}</div></div>
  </div></div>;
}
