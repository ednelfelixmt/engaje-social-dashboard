'use client';

import {FormEvent, useState} from 'react';
import {CheckCircle2, ExternalLink, Loader2} from 'lucide-react';
import {browserClient} from '@/lib/supabase/browser';
import {Button} from '@/components/ui/button';
import {useRouter} from 'next/navigation';

type Extractor = 'windsor' | 'stract';
type Source = 'google_ads' | 'google_business' | 'youtube' | 'meta_ads' | 'facebook_organic' | 'instagram_organic' | 'tiktok_ads' | 'tiktok_organic';

const sourceLabels: Record<Source, string> = {
  google_ads: 'Google Ads',
  google_business: 'Google Business Profile',
  youtube: 'YouTube',
  meta_ads: 'Meta Ads',
  facebook_organic: 'Facebook orgânico',
  instagram_organic: 'Instagram orgânico',
  tiktok_ads: 'TikTok Ads',
  tiktok_organic: 'TikTok orgânico',
};

const sources: Record<Extractor, Source[]> = {
  windsor: ['google_ads', 'google_business', 'youtube'],
  stract: ['google_ads', 'google_business', 'youtube', 'meta_ads', 'facebook_organic', 'instagram_organic', 'tiktok_ads', 'tiktok_organic'],
};

export function ExtractorSetup({organizationId, provider}: {organizationId: string; provider: Extractor}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const values = new FormData(event.currentTarget);

    try {
      const {data, error} = await browserClient().functions.invoke('engaje-integrations', {
        body: {
          action: 'configure_extractor',
          organizationId,
          provider,
          sourcePlatform: values.get('sourcePlatform'),
          accountName: values.get('accountName'),
          externalAccountId: values.get('externalAccountId'),
        },
      });
      if (error) {
        const context = (error as {context?: Response}).context;
        const body = context ? await context.json().catch(() => null) : null;
        throw new Error(body?.message || body?.error || error.message);
      }
      setMessage(data.message);
      setOpen(false);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível salvar a configuração.');
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return <Button variant="outline" onClick={() => setOpen(true)}>Cadastrar e selecionar contas</Button>;
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-4 rounded-xl border border-white/10 bg-black/10 p-4">
      <label>
        Fonte de dados
        <select name="sourcePlatform" required>
          {sources[provider].map((source) => <option value={source} key={source}>{sourceLabels[source]}</option>)}
        </select>
      </label>
      <label>
        Nome da conta
        <input name="accountName" placeholder="Ex.: DVL Motores — Google Ads" required maxLength={160} />
      </label>
      <label>
        ID da conta na fonte
        <input name="externalAccountId" placeholder="ID exibido no Windsor ou Stract" required maxLength={180} />
      </label>
      <p className="muted text-xs">
        {provider === 'windsor'
          ? 'A chave Windsor fica protegida nos Secrets do Supabase e nunca é enviada ao navegador.'
          : 'Após salvar, configure no painel da Stract o destino Supabase para esta organização. A conta ficará pendente até a primeira carga.'}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy} type="submit">
          {busy ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
          {busy ? 'Salvando…' : 'Adicionar à seleção'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
        {provider === 'stract' && (
          <Button asChild type="button" variant="ghost">
            <a href="https://app.stract.to" target="_blank" rel="noreferrer">Abrir Stract <ExternalLink size={14} /></a>
          </Button>
        )}
      </div>
      {message && <p role="status" className="text-sm text-amber-300">{message}</p>}
    </form>
  );
}
