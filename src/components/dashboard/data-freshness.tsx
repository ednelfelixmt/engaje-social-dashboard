'use client';

import {useEffect, useMemo, useState} from 'react';
import {RefreshCw, TriangleAlert} from 'lucide-react';
import {useRouter} from 'next/navigation';
import {browserClient} from '@/lib/supabase/browser';
import {Button} from '@/components/ui/button';

type Integration = {
  id: string;
  provider: string;
  lastSyncedAt: string | null;
  status: string;
};

const SIX_HOURS = 6 * 60 * 60 * 1000;

export function DataFreshness({organizationId, integrations, canSync, renderedAt, timezone}: {
  organizationId: string;
  integrations: Integration[];
  canSync: boolean;
  renderedAt: number;
  timezone: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const newest = useMemo(() => integrations.map((item) => item.lastSyncedAt).filter(Boolean).sort().at(-1) ?? null, [integrations]);
  const stale = !newest || renderedAt - Date.parse(newest) > SIX_HOURS;
  const newestLabel = newest ? new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'medium',
    timeZone: timezone,
  }).format(new Date(newest)) : null;

  async function synchronize(automatic = false) {
    if (!canSync || busy) return;
    const candidates = integrations.filter((item) => item.status !== 'syncing');
    if (!candidates.length) return;
    setBusy(true);
    setMessage(automatic ? 'Atualizando dados automaticamente…' : 'Atualizando dados…');
    let completed = 0;
    let failure = '';
    for (const integration of candidates) {
      const {data, error} = await browserClient().functions.invoke('engaje-integrations', {
        body: {action: 'sync', organizationId, provider: integration.provider, integrationId: integration.id},
      });
      if (error) {
        const context = (error as {context?: Response}).context;
        const body = context ? await context.json().catch(() => null) : null;
        failure = body?.message || error.message;
      } else if (data) completed++;
    }
    setBusy(false);
    setMessage(failure ? `Atualização parcial: ${failure}` : `${completed} integração(ões) atualizada(s).`);
    router.refresh();
  }

  useEffect(() => {
    if (!stale || !canSync || !integrations.length) return;
    const key = `engaje:auto-sync:${organizationId}`;
    const prior = Number(sessionStorage.getItem(key) || 0);
    if (Date.now() - prior < 30 * 60 * 1000) return;
    sessionStorage.setItem(key, String(Date.now()));
    void synchronize(true);
    // Synchronization intentionally runs once per stale organization/session window.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, stale, canSync, integrations.length]);

  return <div className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 ${stale ? 'border-amber-400/25 bg-amber-400/[0.06]' : 'border-emerald-400/20 bg-emerald-400/[0.04]'}`}>
    <div className="flex items-center gap-3">
      {stale ? <TriangleAlert className="text-amber-300" size={18} /> : <span className="size-2 rounded-full bg-emerald-400" />}
      <div>
        <p className="text-sm font-medium">{stale ? 'Base aguardando atualização' : 'Dados sincronizados'}</p>
        <p className="mt-0.5 text-xs text-zinc-500">{newestLabel ? `Última sincronização: ${newestLabel}` : 'Nenhuma sincronização concluída'}</p>
        {message ? <p role="status" className="mt-1 text-xs text-amber-200">{message}</p> : null}
      </div>
    </div>
    {canSync ? <Button type="button" variant="outline" disabled={busy} onClick={() => void synchronize(false)}><RefreshCw className={busy ? 'animate-spin' : ''} size={15} />{busy ? 'Sincronizando…' : 'Atualizar agora'}</Button> : null}
  </div>;
}
