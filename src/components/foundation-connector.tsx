'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {Blocks, Loader2} from 'lucide-react';
import {browserClient} from '@/lib/supabase/browser';
import {Button} from '@/components/ui/button';
import type {Platform} from '@/types/domain';

export function FoundationConnector({organizationId, provider, prepared}: {organizationId: string; provider: Platform; prepared: boolean}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  async function prepare() {
    setBusy(true);
    setMessage('');
    try {
      const {data, error} = await browserClient().functions.invoke('engaje-integrations', {
        body: {action: 'prepare_connector', organizationId, provider},
      });
      if (error) {
        const context = (error as {context?: Response}).context;
        const body = context ? await context.json().catch(() => null) : null;
        throw new Error(body?.message || body?.error || error.message);
      }
      setMessage(data.message || 'Base do conector preparada.');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível preparar o conector.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Button type="button" variant="outline" disabled={busy || prepared} onClick={prepare}>
        {busy ? <Loader2 className="animate-spin" size={16} /> : <Blocks size={16} />}
        {busy ? 'Preparando…' : prepared ? 'Base já preparada' : 'Preparar integração'}
      </Button>
      {message ? <p role="status" className="mt-3 text-sm text-amber-300">{message}</p> : null}
    </div>
  );
}
