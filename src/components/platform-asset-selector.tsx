'use client';

import {useMemo, useState} from 'react';
import {useRouter} from 'next/navigation';
import {CheckSquare2, Search, ShieldCheck, Sparkles} from 'lucide-react';
import {browserClient} from '@/lib/supabase/browser';
import {Button} from '@/components/ui/button';

export type PlatformAssetCandidate = {
  id: string;
  name: string;
  externalId: string;
  assetType: string;
  status: string;
  recommended: boolean;
};

const labels: Record<string, string> = {
  ad_account: 'Contas de anúncio', facebook_page: 'Páginas do Facebook', instagram_account: 'Instagram profissional',
  pixel: 'Pixels', dataset: 'Datasets', lead_form: 'Formulários de lead', catalog: 'Catálogos',
  custom_conversion: 'Conversões personalizadas', app: 'Aplicativos', event_source: 'Fontes de eventos', audience: 'Públicos',
};

export function PlatformAssetSelector({organizationId, connectionId, candidates}: {organizationId: string; connectionId: string; candidates: PlatformAssetCandidate[]}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [reviewing, setReviewing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const available = candidates.filter((item) => item.status !== 'assigned');
  const types = [...new Set(candidates.map((item) => item.assetType))];
  const visible = useMemo(() => candidates.filter((item) => (filter === 'all' || item.assetType === filter) && `${item.name} ${item.externalId}`.toLowerCase().includes(query.toLowerCase())), [candidates, filter, query]);
  const groups = types.map((type) => ({type, items: visible.filter((item) => item.assetType === type)})).filter((group) => group.items.length);
  const chosen = candidates.filter((item) => selected.has(item.id));

  async function confirm() {
    setBusy(true); setMessage('');
    try {
      const {data, error} = await browserClient().functions.invoke('engaje-integrations', {body: {action: 'assign_assets', organizationId, connectionId, assetIds: [...selected]}});
      if (error) {const context=(error as {context?:Response}).context; const payload=context?await context.json().catch(()=>null):null; throw new Error(payload?.message||error.message);}
      setMessage(data.message || 'Ativos vinculados.'); router.replace(window.location.pathname); router.refresh();
    } catch (error) {setMessage(error instanceof Error ? error.message : 'Não foi possível vincular os ativos.'); setReviewing(false);}
    finally {setBusy(false);}
  }

  return <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="asset-selector-title">
    <div className="mx-auto my-4 w-full max-w-6xl rounded-3xl border border-primary/30 bg-[#111116] p-5 shadow-2xl md:p-7">
      <div className="flex items-start gap-3"><CheckSquare2 className="mt-1 shrink-0 text-primary" /><div><p className="eyebrow mb-2">Ativos descobertos</p><h2 className="text-2xl font-semibold" id="asset-selector-title">Selecione os ativos deste cliente</h2><p className="muted mt-2 text-sm">A conexão encontrou {candidates.length} ativo(s). Os já vinculados não podem ser selecionados novamente.</p></div></div>
      {!reviewing ? <>
        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
          <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3"><Search size={17} className="text-zinc-500" /><input className="w-full bg-transparent py-3 text-sm outline-none" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome ou ID" /></label>
          <select className="rounded-xl border border-white/10 bg-[#19191f] px-4 py-3 text-sm" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">Todos os tipos</option>{types.map((type) => <option value={type} key={type}>{labels[type] ?? type}</option>)}</select>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 border-y border-white/10 py-3 text-sm"><strong>{selected.size} selecionado(s)</strong><span className="muted">{available.length} disponíveis · {candidates.length - available.length} já vinculados</span><button className="ml-auto font-semibold text-primary" type="button" onClick={() => setSelected(new Set(available.map((item) => item.id)))}>Selecionar disponíveis</button><button className="font-semibold text-primary" type="button" onClick={() => setSelected(new Set(available.filter((item) => item.recommended).map((item) => item.id)))}>Recomendados</button><button className="font-semibold text-zinc-400" type="button" onClick={() => setSelected(new Set())}>Limpar</button></div>
        <div className="mt-5 max-h-[52vh] space-y-5 overflow-y-auto pr-1">{groups.map((group) => <section key={group.type}><div className="mb-2 flex items-center gap-2"><h3 className="font-semibold">{labels[group.type] ?? group.type}</h3><span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-zinc-400">{group.items.length}</span></div><div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{group.items.map((item) => {const disabled=item.status==='assigned';return <label className={`flex items-start gap-3 rounded-xl border p-3 ${disabled?'cursor-not-allowed border-white/5 bg-white/[0.02] opacity-50':'cursor-pointer border-white/10 bg-black/20 hover:border-primary/40'}`} key={item.id}><input className="mt-1 size-4 accent-yellow-400" type="checkbox" disabled={disabled||busy} checked={selected.has(item.id)} onChange={(event) => setSelected((current) => {const next=new Set(current);if(event.target.checked)next.add(item.id);else next.delete(item.id);return next;})} /><span className="min-w-0"><strong className="block truncate text-sm">{item.name}</strong><small className="mt-1 block truncate text-zinc-500">{item.externalId}</small><span className={`mt-2 inline-block text-[11px] ${disabled?'text-amber-300':item.recommended?'text-emerald-300':'text-zinc-500'}`}>{disabled?'Já vinculado':item.recommended?'Recomendado':'Opcional'}</span></span></label>;})}</div></section>)}</div>
      </> : <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-5"><div className="flex items-center gap-2"><Sparkles className="text-primary" size={19} /><h3 className="font-semibold">Confirme o vínculo</h3></div><p className="muted mt-2 text-sm">Estes {chosen.length} ativos ficarão exclusivos deste cliente. Contas de mídia e perfis orgânicos iniciarão a primeira sincronização.</p><div className="mt-4 grid gap-2 md:grid-cols-2">{chosen.map((item) => <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3" key={item.id}><strong className="text-sm">{item.name}</strong><p className="muted mt-1 text-xs">{labels[item.assetType] ?? item.assetType} · {item.externalId}</p></div>)}</div></div>}
      <div className="mt-5 flex flex-col gap-4 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2 text-xs text-zinc-400"><ShieldCheck size={16} className="text-emerald-400" /> Validação de exclusividade no servidor e no banco</div><div className="flex flex-wrap items-center gap-3">{reviewing?<Button variant="outline" disabled={busy} onClick={() => setReviewing(false)}>Voltar</Button>:null}<Button disabled={busy||!selected.size} onClick={() => reviewing?confirm():setReviewing(true)}>{busy?'Vinculando…':reviewing?`Confirmar ${selected.size} ativo(s)`:'Revisar seleção'}</Button></div></div>
      {message ? <p role="status" className="mt-3 text-sm text-amber-300">{message}</p> : null}
    </div>
  </div>;
}
