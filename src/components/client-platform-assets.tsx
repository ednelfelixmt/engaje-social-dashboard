'use client';

import {useState} from 'react';
import {Boxes, Link2Off} from 'lucide-react';
import {useRouter} from 'next/navigation';
import {browserClient} from '@/lib/supabase/browser';
import {Button} from '@/components/ui/button';
import {Card} from '@/components/ui/card';

type AssignedAsset = {assignmentId: string; name: string; externalId: string; assetType: string; syncEnabled: boolean};
const labels: Record<string,string> = {ad_account:'Conta de anúncio',facebook_page:'Página do Facebook',instagram_account:'Instagram profissional',pixel:'Pixel',dataset:'Dataset',lead_form:'Formulário de lead',catalog:'Catálogo',custom_conversion:'Conversão personalizada'};

export function ClientPlatformAssets({organizationId, assets}: {organizationId: string; assets: AssignedAsset[]}) {
  const router=useRouter();
  const [busy,setBusy]=useState<string>();
  const [message,setMessage]=useState('');
  async function remove(assignmentId:string) {
    setBusy(assignmentId); setMessage('');
    try {
      const {data,error}=await browserClient().functions.invoke('engaje-integrations',{body:{action:'unassign_asset',organizationId,assignmentId}});
      if(error){const context=(error as {context?:Response}).context;const payload=context?await context.json().catch(()=>null):null;throw new Error(payload?.message||error.message);}
      setMessage(data.message); router.refresh();
    } catch(error) {setMessage(error instanceof Error?error.message:'Não foi possível remover o ativo.');}
    finally {setBusy(undefined);}
  }
  return <Card className="space-y-4">
    <div className="flex items-center gap-3"><Boxes className="text-primary" /><div><h3 className="font-semibold">Ativos atribuídos</h3><p className="muted text-xs">{assets.length} ativo(s) exclusivos deste cliente</p></div></div>
    <div className="grid gap-2 md:grid-cols-2">{assets.map((asset)=><div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/15 p-3" key={asset.assignmentId}>
      <div className="min-w-0"><strong className="block truncate text-sm">{asset.name}</strong><p className="muted mt-1 truncate text-xs">{labels[asset.assetType]??asset.assetType} · {asset.externalId}</p><span className={`mt-2 inline-block text-[11px] ${asset.syncEnabled?'text-emerald-300':'text-zinc-500'}`}>{asset.syncEnabled?'Sincronização ativa':'Catálogo vinculado'}</span></div>
      <Button variant="outline" className="min-h-9 px-3 py-2 text-xs" disabled={busy===asset.assignmentId} onClick={()=>remove(asset.assignmentId)} title="Remover vínculo e preservar histórico"><Link2Off size={14} />{busy===asset.assignmentId?'Removendo…':'Remover'}</Button>
    </div>)}</div>
    {message?<p role="status" className="text-sm text-amber-300">{message}</p>:null}
  </Card>;
}
