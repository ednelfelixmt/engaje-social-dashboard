'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {browserClient} from '@/lib/supabase/browser';
import {Button} from '@/components/ui/button';

type IntegrationControlsProps = {
  organizationId: string;
  provider?: string;
  integrationId?: string;
  enabled?: boolean;
  reconnect?: boolean;
};

export function IntegrationControls({organizationId, provider, integrationId, enabled = true, reconnect = false}: IntegrationControlsProps) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  const reconnectLabel = provider === 'facebook_organic'
    ? 'Reconectar Facebook'
    : provider === 'instagram_organic'
      ? 'Reconectar Instagram'
      : 'Reconectar conta';
  const buttonLabel = reconnect
    ? reconnectLabel
    : integrationId
      ? enabled ? 'Sincronizar agora' : 'Ativar e sincronizar'
      : 'Conectar conta';

  return (
    <div className="w-full md:w-[190px]">
      <Button
        className="w-full whitespace-nowrap"
        variant="outline"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setMessage('');
          try {
            const {data, error} = await browserClient().functions.invoke('engaje-integrations', {
              body: {action: reconnect || !integrationId ? 'connect' : 'sync', organizationId, provider, integrationId},
            });
            if (error) {
              const context = (error as {context?: Response}).context;
              const body = context ? await context.json().catch(() => null) : null;
              throw new Error(body?.message || body?.error || error.message);
            }
            if (data.url) {
              const url = new URL(data.url);
              if (!['www.facebook.com', 'accounts.google.com', 'business-api.tiktok.com', 'www.tiktok.com'].includes(url.hostname)) throw new Error('Destino inválido');
              window.location.assign(url.href);
            } else {
              setMessage(data.message || 'Solicitação concluída.');
              router.refresh();
            }
          } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Não foi possível concluir a solicitação.');
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? 'Processando…' : buttonLabel}
      </Button>
      {message && <p role="status" className="mt-3 break-words text-xs leading-5 text-amber-300">{message}</p>}
    </div>
  );
}
