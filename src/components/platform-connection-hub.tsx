'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {ArrowRight,Database,KeyRound,Layers3,Link2,ShieldCheck,Workflow} from 'lucide-react';
import {connectionProducts,type ConnectionProductId,type ConnectionMethod} from '@/lib/integrations/connection-products';
import {Modal} from '@/components/ui/modal';
import {Button} from '@/components/ui/button';
import {IntegrationControls} from '@/components/integration-controls';
import {ExtractorSetup} from '@/components/extractor-setup';
import {FoundationConnector} from '@/components/foundation-connector';
import {oauthDestination} from '@/lib/integrations/oauth-destination';

type Workspace={id:string;name:string;slug:string};
type ProductId=ConnectionProductId|'meta_ads'|'generic_crm'|'stract'|'tiktok_ads';
const extras=[{id:'meta_ads',name:'Meta',group:'advertising',description:'Facebook, Instagram e contas de anúncios.',methods:['OAuth 2.0'],mark:'M'},
 {id:'tiktok_ads',name:'TikTok Ads',group:'advertising',description:'Campanhas e desempenho de anúncios. Adaptador de coleta pendente.',methods:['OAuth em preparação'],mark:'T'},
 {id:'generic_crm',name:'CRM personalizado',group:'crm',description:'API de entrada para receber dados do seu CRM.',methods:['API / webhook'],mark:'API'},
 {id:'stract',name:'Stract',group:'data',description:'Extrator com destino de ingestão dedicado ao cliente.',methods:['API de entrada'],mark:'S'}] as const;
const groupNames={all:'Todas',advertising:'Mídia e canais',crm:'CRM e automação',data:'Extratores de dados'};
export function PlatformConnectionHub({workspaces,initialProduct}:{workspaces:Workspace[];initialProduct?:string}){
 const allowed=[...connectionProducts.map(p=>p.id),...extras.map(p=>p.id)];
 const initial=allowed.includes(initialProduct as ConnectionProductId)?initialProduct as ProductId:null;
 const [group,setGroup]=useState<keyof typeof groupNames>('all'),[open,setOpen]=useState(Boolean(initial)),[chooser,setChooser]=useState<'all'|'crm'>('all');
 const [productId,setProductId]=useState<ProductId|null>(initial),[organizationId,setOrganizationId]=useState(workspaces.length===1?workspaces[0].id:''),[method,setMethod]=useState<ConnectionMethod>(connectionProducts.find(p=>p.id===initial)?.methods[0]??'oauth');
 const [apiToken,setApiToken]=useState(''),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[done,setDone]=useState(false);
 const router=useRouter();const workspace=workspaces.find(w=>w.id===organizationId);const product=connectionProducts.find(p=>p.id===productId);const extra=extras.find(p=>p.id===productId);
 const cards=[...connectionProducts.map(p=>({id:p.id,name:p.name,group:p.group,description:p.description,methods:p.methods.map(m=>m==='oauth'?'OAuth 2.0':'API'),mark:p.id==='google_ads'?'G':p.id==='windsor'?'W':p.id==='hubspot'?'H':'RD'})),...extras];
 function choose(id:ProductId){const p=connectionProducts.find(p=>p.id===id);setProductId(id);setMethod(p?.methods[0]??'oauth');setConfirmed(false);setApiToken('');setMessage('');setDone(false);}
 function launch(id:ProductId|null,mode:'all'|'crm'='all'){setChooser(mode);if(id)choose(id);else{setProductId(null);setMessage('');setDone(false);}setOpen(true);}
 async function authorize(){if(!workspace||!product||!confirmed||busy)return;setBusy(true);setMessage('');try{
  const response=await fetch('/api/integrations/connect',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({organizationId:workspace.id,product:product.id,method,...(method==='api'?{apiToken}:{})})});
  const result=await response.json();if(!response.ok)throw new Error(typeof result.message==='string'?result.message:'Não foi possível autorizar a plataforma.');
  if(result.url){window.location.assign(oauthDestination(result.url));return;}
  if(result.authorized!==true)throw new Error('A plataforma não confirmou a autorização.');setDone(true);setMessage('Acesso à API validado. A conta e a coleta ainda precisam ser confirmadas.');router.refresh();
 }catch(error){setMessage(error instanceof Error?error.message:'Não foi possível concluir a autorização.');}finally{setApiToken('');setBusy(false);}}
 return <section className="connection-hub" aria-label="Central de conexões">
  <header className="connection-hub-header"><div><p className="eyebrow">PLATAFORMAS E CONECTORES</p><h2>Conecte a origem certa</h2><p>Escolha a plataforma, o cliente e o método de autorização.</p></div><div><Button className="connection-secondary" variant="outline" onClick={()=>launch(null,'crm')}><Workflow size={16}/>Integrar CRM</Button><Button className="connection-primary" onClick={()=>launch(null)}><Link2 size={16}/>Nova conexão</Button></div></header>
  <div className="connection-group-tabs" role="group" aria-label="Categoria de integração">{Object.entries(groupNames).map(([key,label])=><button type="button" key={key} aria-pressed={group===key} onClick={()=>setGroup(key as keyof typeof groupNames)}>{label}</button>)}</div>
  <div className="connection-product-grid">{cards.filter(p=>group==='all'||p.group===group).map(p=><article className="connection-product-card" key={p.id} data-provider={p.id}><header><span className="connection-brand" aria-hidden="true">{p.mark}</span><span className="connection-kind">{p.group==='data'?'EXTRATOR':p.group==='crm'?'CRM / AUTOMAÇÃO':'PLATAFORMA'}</span></header><div><h3>{p.name}</h3><p>{p.description}</p></div><div className="connection-method-tags">{p.methods.map(m=><span key={m}>{m}</span>)}</div><footer><button type="button" onClick={()=>launch(p.id as ProductId)} aria-label={'Configurar '+p.name}>Configurar conexão<ArrowRight size={16}/></button></footer></article>)}</div>
  <p className="connection-source-note"><Database size={15}/>Google Ads é uma plataforma de origem. Windsor.ai e Stract são extratores; a origem dos dados permanece identificada.</p>
  {open?<Modal titleId="connection-wizard-title" onClose={()=>{if(!busy){setOpen(false);setApiToken('');}}} busy={busy}>
   <div className="connection-wizard"><p className="eyebrow">NOVA CONEXÃO</p><h2 id="connection-wizard-title">{product?.name??extra?.name??(chooser==='crm'?'Escolha o CRM':'Escolha a plataforma')}</h2>
   <ol className="connection-steps" aria-label="Etapas"><li data-active={!productId}>1 · Plataforma</li><li data-active={Boolean(productId)&&!done}>2 · Cliente e acesso</li><li data-active={done}>3 · Validação</li></ol>
   {!productId?<div className="connection-picker">{cards.filter(p=>chooser==='all'||p.group==='crm').map(p=><button key={p.id} type="button" aria-label={'Selecionar '+p.name} onClick={()=>choose(p.id as ProductId)}><span className="connection-brand" aria-hidden="true">{p.mark}</span><span><strong>{p.name}</strong><small>{p.description}</small></span><ArrowRight size={16}/></button>)}</div>:<>
    <button className="connection-back" type="button" disabled={busy} onClick={()=>{setProductId(null);setApiToken('');setMessage('');}}>← Trocar plataforma</button>
    <label>Cliente<select aria-label="Cliente da nova conexão" value={organizationId} disabled={busy||workspaces.length===1} onChange={e=>{setOrganizationId(e.target.value);setConfirmed(false);setApiToken('');setMessage('');setDone(false);}}><option value="">Selecione o cliente</option>{workspaces.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
    {!workspaces.length?<p role="status">Cadastre um cliente ativo para continuar.</p>:null}
    {product?<><div className="connection-method-choices" role="group" aria-label="Método de autorização">{product.methods.map(m=><button type="button" key={m} disabled={busy} aria-pressed={method===m} onClick={()=>{setMethod(m);setApiToken('');setMessage('');setDone(false);}}>{m==='oauth'?<ShieldCheck size={18}/>:<KeyRound size={18}/>}<span><strong>{m==='oauth'?'Autorizar com OAuth':'Usar credencial API'}</strong><small>{m==='oauth'?'Consentimento no site oficial da plataforma':product.apiLabel}</small></span></button>)}</div>
     {product.id==='google_ads'?<p className="connection-collection-note">O acesso à API Google Ads exige OAuth do Google. A chave Windsor pertence a outro serviço.</p>:null}
     {method==='oauth'?<div className="connection-access-info"><ShieldCheck size={19}/><div><strong>Autorização no site oficial</strong><p>Você será direcionado ao {product.name}. O acesso será validado antes de selecionar a conta deste cliente.</p><details><summary>Configuração do aplicativo da agência</summary><p>Cadastre o aplicativo deste produto e configure suas credenciais privadas no ambiente do servidor.</p><label>URL de retorno<input readOnly value="https://mediahub.engajeperformance.com.br/api/integrations/oauth/callback"/></label><a href={product.docs} target="_blank" rel="noreferrer">Documentação oficial ↗</a>{product.id.startsWith('rd_station')?<p>CRM e Marketing usam aplicativos e credenciais próprios para cada produto.</p>:null}</details></div></div>:<label>{product.apiLabel}<input aria-label="Credencial API" type="password" value={apiToken} disabled={busy||done} autoComplete="new-password" spellCheck={false} maxLength={8192} onChange={e=>setApiToken(e.target.value)} placeholder="Cole a credencial somente neste campo"/><small>A credencial será enviada ao servidor, validada na API oficial e guardada em armazenamento privado.</small></label>}
     <label className="connection-confirm"><input type="checkbox" checked={confirmed} disabled={busy} onChange={e=>setConfirmed(e.target.checked)}/><span>Confirmo que esta autorização é para <strong>{workspace?.name??'o cliente selecionado'}</strong>.</span></label>
     <div className="connection-wizard-actions"><Button className="connection-secondary" variant="outline" disabled={busy} onClick={()=>{setOpen(false);setApiToken('');}}>Fechar</Button><Button className="connection-primary" disabled={busy||done||!workspace||!confirmed||(method==='api'&&!apiToken.trim())} onClick={authorize}>{busy?'Validando…':done?'Acesso validado':method==='oauth'?'Continuar com OAuth':'Validar acesso API'}<ArrowRight size={16}/></Button></div>
     {product.id==='windsor'&&workspace?<details className="connection-existing-extractor"><summary>Selecionar conta usando o conector Windsor da agência</summary><p>Este fluxo existente usa a chave já configurada no extrator. A conta e a origem são confirmadas separadamente.</p><ExtractorSetup organizationId={workspace.id} provider="windsor"/></details>:null}
    </>:workspace?<div className="connection-legacy-method">{productId==='meta_ads'?<><p>OAuth oficial da Meta para selecionar somente os ativos deste cliente.</p><IntegrationControls organizationId={workspace.id} provider="meta_ads"/></>:productId==='stract'?<><p>Configure a origem e o endpoint API de destino deste cliente.</p><ExtractorSetup organizationId={workspace.id} provider="stract"/></>:<><p>{productId==='generic_crm'?'Prepare o endpoint de entrada deste CRM. O painel da conexão permite gerar a chave API e conferir as cargas recebidas.':'O adaptador TikTok ainda não está operacional; cadastrar a base não concede acesso OAuth.'}</p><FoundationConnector organizationId={workspace.id} provider={productId==='generic_crm'?'generic_crm':'tiktok_ads'} prepared={false}/></>}</div>:null}
    {message?<p className={'connection-result '+(done?'is-verified':'')} role={done?'status':'alert'}>{message}</p>:null}
    <p className="connection-collection-note"><Layers3 size={15}/>Autorizar acesso não confirma a conta nem a primeira coleta. Esses estados são verificados separadamente.</p>
   </>}
   </div>
  </Modal>:null}
 </section>;
}
