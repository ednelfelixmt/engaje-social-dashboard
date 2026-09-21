'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {Unplug} from 'lucide-react';
import {browserClient} from '@/lib/supabase/browser';
import {Button} from '@/components/ui/button';

type IntegrationControlsProps = {
  organizationId: string;
  provider?: string;
  integrationId?: string;
  enabled?: boolean;
  reconnect?: boolean;
  accountName?: string;
  allowDisconnect?: boolean;
  disconnectOnly?: boolean;
};

export function IntegrationControls({organizationId, provider, integrationId, enabled = true, reconnect = false, accountName, allowDisconnect = false, disconnectOnly = false}: IntegrationControlsProps) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  const reconnectLabel = provider === 'facebook_organic'
    ? 'Reconectar e selecionar'
    : provider === 'instagram_organic'
      ? 'Reconectar e selecionar'
      : 'Reconectar e selecionar';
  const buttonLabel = reconnect
    ? reconnectLabel
    : integrationId
      ? enabled ? 'Sincronizar agora' : 'Ativar e sincronizar'
      : 'Conectar e selecionar';

  const invoke = async (action: 'connect' | 'sync' | 'disconnect') => {
    setBusy(true);
    setMessage('');
    try {
      const {data, error} = await browserClient().functions.invoke('engaje-integrations', {
        body: {action, organizationId, provider, integrationId},
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
  };

  return (
    <div className="w-full md:w-[210px]">
      {!disconnectOnly ? <Button
        className="w-full whitespace-nowrap"
        variant="outline"
        disabled={busy}
        onClick={() => invoke(reconnect || !integrationId ? 'connect' : 'sync')}
      >
        {busy ? 'Processando…' : buttonLabel}
      </Button> : null}
      {allowDisconnect && integrationId ? <Button
        className={`${disconnectOnly ? '' : 'mt-2 '}w-full whitespace-nowrap border-red-500/30 text-red-300 hover:bg-red-500/10 hover:text-red-200`}
        variant="outline"
        disabled={busy}
        onClick={() => {
          const name = accountName || 'esta conta';
          if (window.confirm(`Desconectar ${name}? As métricas e os criativos importados por esta integração serão removidos somente deste cliente.`)) void invoke('disconnect');
        }}
      ><Unplug size={16} /> Desconectar conta</Button> : null}
      {message && <p role="status" className="mt-3 break-words text-xs leading-5 text-amber-300">{message}</p>}
    </div>
  );
}
