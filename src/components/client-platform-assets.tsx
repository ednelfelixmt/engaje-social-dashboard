'use client';

import {useState} from 'react';
import {Boxes, Link2Off, RefreshCw} from 'lucide-react';
import {useRouter} from 'next/navigation';
import {browserClient} from '@/lib/supabase/browser';
import {Button} from '@/components/ui/button';
import {Card} from '@/components/ui/card';

type AssignedAsset = {assignmentId: string; assetId: string; connectionId: string; name: string; externalId: string; assetType: string; syncEnabled: boolean};
const labels: Record<string,string> = {ad_account:'Conta de anúncio',facebook_page:'Página do Facebook',instagram_account:'Instagram profissional',pixel:'Pixel',dataset:'Dataset',lead_form:'Formulário de lead',catalog:'Catálogo',custom_conversion:'Conversão personalizada'};

export function ClientPlatformAssets({organizationId, assets, clientName}: {organizationId: string; assets: AssignedAsset[]; clientName: string}) {
  const router=useRouter();
  const [busy,setBusy]=useState<string>();
  const [message,setMessage]=useState('');
  async function renew(asset:AssignedAsset) {
    setBusy(asset.assignmentId);setMessage('');
    try {
      const {data,error}=await browserClient().functions.invoke('engaje-integrations',{body:{
        action:'assign_assets',organizationId,connectionId:asset.connectionId,assetIds:[asset.assetId]
      }});
      if(error){const context=(error as {context?:Response}).context;const payload=context?await context.json().catch(()=>null):null;throw new Error(payload?.message||error.message);}
      setMessage(data?.message||'Autorização reaplicada e sincronização solicitada. Confira o diagnóstico e os novos registros.');
      router.refresh();
    }catch(error){setMessage(error instanceof Error?error.message:'Não foi possível renovar a autorização. Reconecte a Meta com uma conta administradora.');}
    finally{setBusy(undefined);}
  }
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
    <div className="flex items-center gap-3"><Boxes className="text-primary" /><div><h3 className="font-semibold">Ativos de {clientName}</h3><p className="muted text-xs">{assets.length} ativo(s) vinculados a este cliente. Outros clientes não aparecem nesta lista.</p></div></div>
    <div className="grid gap-2 md:grid-cols-2">{assets.map((asset)=><div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/15 p-3" key={asset.assignmentId}>
      <div className="min-w-0"><strong className="block truncate text-sm">{asset.name}</strong><p className="muted mt-1 truncate text-xs">{labels[asset.assetType]??asset.assetType} · {asset.externalId}</p><span className={`mt-2 inline-block text-[11px] ${asset.syncEnabled?'text-emerald-300':'text-zinc-500'}`}>{asset.syncEnabled?'Sincronização habilitada · confirme a última coleta no diagnóstico':'Ativo vinculado sem sincronização'}</span></div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {asset.syncEnabled && ['ad_account','facebook_page','instagram_account'].includes(asset.assetType) ? <Button variant="outline" className="min-h-9 px-3 py-2 text-xs" disabled={Boolean(busy)} onClick={()=>renew(asset)} title="Revalidar o ativo usando a autenticação mais recente da Meta, e iniciar coleta de dados"><RefreshCw size={14}/>{busy===asset.assignmentId?'Revalidando…':'Revalidar'}</Button> : null}
        <Button variant="outline" className="min-h-9 px-3 py-2 text-xs" disabled={Boolean(busy)} onClick={()=>remove(asset.assignmentId)} title="Remover vínculo e preservar histórico"><Link2Off size={14}/>Remover</Button>
      </div>
    </div>)}</div>
    {message?<p role="status" className="text-sm text-amber-300">{message}</p>:null}
  </Card>;
}
