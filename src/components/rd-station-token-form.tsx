'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {Plug} from 'lucide-react';
import {browserClient} from '@/lib/supabase/browser';
import {Button} from '@/components/ui/button';

/** Conecta o RD Station CRM pelo token de API da conta do cliente (Configurações da conta → Token da instância). */
export function RdStationTokenForm({organizationId}: {organizationId: string}) {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setMessage('');
    try {
      const {data, error} = await browserClient().functions.invoke('engaje-integrations', {body: {action: 'connect_token', organizationId, provider: 'rd_station', token: token.trim(), accountName: name.trim() || undefined}});
      if (error) { const context = (error as {context?: Response}).context; const payload = context ? await context.json().catch(() => null) : null; throw new Error(payload?.message || error.message); }
      setMessage(data?.message || 'RD Station CRM conectado.'); setToken(''); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível conectar o RD Station CRM.'); }
    finally { setBusy(false); }
  }
  return <form className="grid gap-2" onSubmit={submit}>
    <label className="text-xs font-medium" htmlFor="rd-crm-name">Nome da conta (opcional)<input id="rd-crm-name" className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="Ex.: CRM comercial"/></label>
    <label className="text-xs font-medium" htmlFor="rd-crm-token">Token de API do RD Station CRM<input id="rd-crm-token" className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" required minLength={16} maxLength={200} placeholder="Cole o token da instância"/></label>
    <Button type="submit" disabled={busy || token.trim().length < 16}><Plug size={16}/> {busy ? 'Conectando…' : 'Conectar RD Station CRM'}</Button>
    {message ? <p className="text-xs" role="status">{message}</p> : null}
    <p className="muted text-[11px]">O token fica guardado no cofre do Supabase e nunca volta para o navegador.</p>
  </form>;
}
