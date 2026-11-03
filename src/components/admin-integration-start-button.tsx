'use client';

import {useState} from 'react';
import {ArrowRight, Plug} from 'lucide-react';
import {useRouter} from 'next/navigation';
import {browserClient} from '@/lib/supabase/browser';
import {Button} from '@/components/ui/button';
import {Modal} from '@/components/ui/modal';
import {oauthDestination} from '@/lib/integrations/oauth-destination';

type ClientWorkspace={id:string;name:string;slug:string};

export function AdminIntegrationStartButton({platformKey,available,workspaces}:{platformKey:string;available:boolean;workspaces:ClientWorkspace[]}) {
  const router=useRouter();
  const [open,setOpen]=useState(false);
  const [organizationId,setOrganizationId]=useState('');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const selected=workspaces.find((item)=>item.id===organizationId);

  async function start(){
    if(!selected)return;
    setBusy(true);setMessage('');
    try{
      if(platformKey==='meta'){
        const {data,error}=await browserClient().functions.invoke('engaje-integrations',{body:{action:'connect',organizationId:selected.id,provider:'meta_ads'}});
        if(error){const context=(error as {context?:Response}).context;const payload=context?await context.json().catch(()=>null):null;throw new Error(payload?.message||error.message);}
        if(!data?.url)throw new Error(data?.message||'A Meta não retornou o endereço de autorização.');
        window.location.assign(oauthDestination(data.url));
        return;
      }
      setOpen(false);
      router.push(`/${encodeURIComponent(selected.slug)}/settings/integrations#${platformKey==='google'?'windsor':platformKey==='rd-station'?'rd_station':platformKey==='crm'?'generic_crm':platformKey}`);
    }catch(error){setMessage(error instanceof Error?error.message:'Não foi possível iniciar a integração.');setBusy(false);}
  }

  return <>
    <Button className="w-full" variant={available?'default':'outline'} onClick={()=>{setMessage('');setOpen(true);}}><Plug size={16} /> {available?'Conectar plataforma':'Ver configuração e pendências'} <ArrowRight size={16} /></Button>
    {open?<Modal titleId={`start-${platformKey}`} onClose={()=>setOpen(false)} busy={busy}>
        <div><p className="eyebrow mb-2">{available?'Conectar plataforma':'Configuração do conector'}</p><h2 className="text-xl font-semibold" id={`start-${platformKey}`}>Selecione o cliente</h2><p className="muted mt-2 text-sm">A conexão e seus dados ficarão restritos ao cliente selecionado.</p></div>
        <label className="mt-5 block text-sm font-medium">Workspace<select className="mt-2 w-full rounded-xl border border-white/10 bg-[#101010] px-4 py-3 text-sm" value={organizationId} onChange={(event)=>setOrganizationId(event.target.value)}><option value="">Selecione um workspace</option>{workspaces.map((workspace)=><option value={workspace.id} key={workspace.id}>{workspace.name}</option>)}</select></label>
        {message?<p className="mt-3 text-sm text-red-300" role="alert">{message}</p>:null}
        {!workspaces.length?<p className="mt-3 text-sm text-amber-300">Cadastre um cliente antes de iniciar uma integração.</p>:null}
        {!available?<p className="muted mt-4 text-sm">Este conector ainda exige implementação ou homologação. Abrir sua configuração não ativa uma sincronização.</p>:null}
        <div className="mt-6 flex justify-end gap-3"><Button variant="outline" disabled={busy} onClick={()=>setOpen(false)}>Cancelar</Button><Button disabled={busy||!selected} onClick={start}>{busy?'Conectando…':available?'Continuar':'Abrir configuração'}</Button></div>
    </Modal>:null}
  </>;
}
