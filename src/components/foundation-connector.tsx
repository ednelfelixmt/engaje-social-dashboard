'use client';

import {FormEvent, useState} from 'react';
import {useRouter} from 'next/navigation';
import {Blocks, Loader2} from 'lucide-react';
import {browserClient} from '@/lib/supabase/browser';
import {Button} from '@/components/ui/button';
import type {Platform} from '@/types/domain';

export function FoundationConnector({organizationId, provider, prepared}: {organizationId: string; provider: Platform; prepared: boolean}) {
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
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

  async function registerAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const values = new FormData(event.currentTarget);
    try {
      const {data, error} = await browserClient().functions.invoke('engaje-integrations', {
        body: {action: 'register_candidate_account', organizationId, provider, accountName: values.get('accountName'), externalAccountId: values.get('externalAccountId')},
      });
      if (error) {
        const context = (error as {context?: Response}).context;
        const body = context ? await context.json().catch(() => null) : null;
        throw new Error(body?.message || body?.error || error.message);
      }
      setMessage(data.message || 'Conta adicionada à seleção.');
      setOpen(false);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível cadastrar a conta.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {!prepared ? <Button type="button" variant="outline" disabled={busy} onClick={prepare}>
        {busy ? <Loader2 className="animate-spin" size={16} /> : <Blocks size={16} />}
        {busy ? 'Preparando…' : 'Preparar integração'}
      </Button> : !open ? <Button type="button" variant="outline" onClick={() => setOpen(true)}>Cadastrar e selecionar contas</Button> : <form className="space-y-3 rounded-xl border border-white/10 bg-black/10 p-4" onSubmit={registerAccount}>
        <label>Nome da conta<input name="accountName" required maxLength={160} placeholder="Nome exibido na plataforma" /></label>
        <label>ID da conta<input name="externalAccountId" required maxLength={180} placeholder="ID externo da conta" /></label>
        <p className="muted text-xs">A conta ficará pendente até a seleção e a homologação das credenciais oficiais.</p>
        <div className="flex flex-wrap gap-2"><Button type="submit" disabled={busy}>{busy ? <Loader2 className="animate-spin" size={16} /> : <Blocks size={16} />}{busy ? 'Adicionando…' : 'Adicionar à seleção'}</Button><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button></div>
      </form>}
      {message ? <p role="status" className="mt-3 text-sm text-amber-300">{message}</p> : null}
    </div>
  );
}
