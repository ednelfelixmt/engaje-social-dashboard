'use client';

import {useState} from 'react';
import {Check, KeyRound, Loader2} from 'lucide-react';
import {browserClient} from '@/lib/supabase/browser';
import {Button} from '@/components/ui/button';

type Credentials = {endpoint: string; key: string};

export function IngestEndpoint({organizationId, integrationId, configured}: {organizationId: string; integrationId: string; configured: boolean}) {
  const [busy, setBusy] = useState(false);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [message, setMessage] = useState('');

  async function generate() {
    setBusy(true);
    setMessage('');
    try {
      const {data, error} = await browserClient().functions.invoke('engaje-integrations', {
        body: {action: 'create_ingest_key', organizationId, integrationId},
      });
      if (error) {
        const context = (error as {context?: Response}).context;
        const body = context ? await context.json().catch(() => null) : null;
        throw new Error(body?.message || body?.error || error.message);
      }
      setCredentials({endpoint: data.endpoint, key: data.key});
      setMessage('Chave criada. Copie agora: ela não será exibida novamente.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível gerar a chave.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 max-w-2xl rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs font-semibold">Ingestão segura</p><p className="muted mt-1 text-xs">Use o endpoint no extrator ou CRM, com a chave no header <code>x-engaje-key</code>.</p></div>
        <Button type="button" variant="outline" disabled={busy} onClick={generate}>
          {busy ? <Loader2 className="animate-spin" size={15} /> : configured ? <KeyRound size={15} /> : <Check size={15} />}
          {busy ? 'Gerando…' : configured ? 'Trocar chave' : 'Gerar chave'}
        </Button>
      </div>
      {credentials ? <div className="mt-3 space-y-2 text-xs"><p><span className="muted">Endpoint</span><code className="credential-value">{credentials.endpoint}</code></p><p><span className="muted">Chave</span><code className="credential-value">{credentials.key}</code></p></div> : null}
      {message ? <p role="status" className="mt-3 text-xs text-amber-300">{message}</p> : null}
    </div>
  );
}
