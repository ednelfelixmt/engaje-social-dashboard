import type {LucideIcon} from 'lucide-react';
import {Activity, BarChart3, Blocks, Bot, CheckCircle2, Database, Facebook, Radio, Search, Settings2} from 'lucide-react';
import {requireAdmin} from '@/lib/auth/session';
import {Card} from '@/components/ui/card';
import {AdminIntegrationStartButton} from '@/components/admin-integration-start-button';

type PlatformCard = {
  key: string;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string;
  stage: 'available' | 'preparing';
  method: 'OAuth' | 'Extrator' | 'API';
  capabilities: string[];
};

const platforms: PlatformCard[] = [
  {key:'meta',name:'Meta',description:'Ecossistema oficial para mídia paga e presença orgânica.',icon:Facebook,color:'text-blue-400',stage:'available',method:'OAuth',capabilities:['Meta Ads','Facebook','Instagram','Pixels e formulários']},
  {key:'google',name:'Google',description:'Aquisição, presença local e conteúdo em vídeo.',icon:Search,color:'text-red-300',stage:'available',method:'Extrator',capabilities:['Google Ads','Google Business','YouTube']},
  {key:'tiktok',name:'TikTok',description:'Campanhas, criativos, vídeos e desempenho orgânico.',icon:Activity,color:'text-cyan-300',stage:'preparing',method:'OAuth',capabilities:['TikTok Ads','TikTok orgânico']},
  {key:'hubspot',name:'HubSpot',description:'Negócios, receita real, leads e etapas comerciais.',icon:Blocks,color:'text-orange-300',stage:'preparing',method:'OAuth',capabilities:['Negócios','Receita','Funil de vendas']},
  {key:'rd-station',name:'RD Station',description:'Conversões, oportunidades e vendas conciliadas.',icon:Radio,color:'text-teal-300',stage:'preparing',method:'OAuth',capabilities:['Leads','Oportunidades','Vendas']},
  {key:'crm',name:'CRM personalizado',description:'Integração flexível para sistemas comerciais próprios.',icon:Bot,color:'text-violet-300',stage:'preparing',method:'API',capabilities:['Webhooks','Receita real','Funil personalizado']},
];

const dataServices: PlatformCard[] = [
  {key:'windsor',name:'Windsor.ai',description:'Camada operacional para importar os serviços Google.',icon:Database,color:'text-indigo-300',stage:'available',method:'Extrator',capabilities:['Google Ads','Google Business','YouTube']},
  {key:'stract',name:'Stract',description:'Extrator alternativo para múltiplas fontes de marketing.',icon:BarChart3,color:'text-amber-300',stage:'preparing',method:'Extrator',capabilities:['Múltiplas plataformas','Cargas programadas']},
];

function IntegrationCard({platform,workspaces}: {platform: PlatformCard;workspaces:{id:string;name:string;slug:string}[]}) {
  const Icon=platform.icon;
  return <Card className="group relative overflow-hidden border-white/10 p-0 transition hover:-translate-y-1 hover:border-primary/30">
    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 transition group-hover:opacity-100" />
    <div className="space-y-5 p-6">
      <div className="flex items-start justify-between gap-4"><span className="grid size-12 place-items-center rounded-2xl border border-white/10 bg-white/[.04]"><Icon className={platform.color} size={23} /></span><span className={`connector-badge ${platform.stage==='available'?'text-emerald-300':'text-amber-300'}`}>{platform.stage==='available'?'Disponível':'Em preparação'}</span></div>
      <div><h2 className="text-xl font-semibold">{platform.name}</h2><p className="muted mt-2 min-h-10 text-sm">{platform.description}</p></div>
      <div className="flex flex-wrap gap-2">{platform.capabilities.map((capability)=><span className="connector-capability" key={capability}>{capability}</span>)}</div>
      <div className="flex items-center justify-between border-t border-white/10 pt-4 text-xs"><span className="muted">Método de conexão</span><strong className="flex items-center gap-2"><Settings2 size={14} className="text-primary" />{platform.method}</strong></div>
      <AdminIntegrationStartButton platformKey={platform.key} available={platform.stage==='available'} workspaces={workspaces} />
    </div>
  </Card>;
}

export default async function Page() {
  const {db}=await requireAdmin();
  const {data:workspaces,error}=await db.from('organizations').select('id,name,slug').eq('is_agency',false).eq('status','active').order('name');
  if(error)throw error;
  const available=[...platforms,...dataServices].filter((item)=>item.stage==='available').length;
  return <div className="space-y-8">
    <header><p className="eyebrow mb-2">Catálogo de integrações</p><h1 className="text-3xl font-semibold">Plataformas disponíveis</h1><p className="muted mt-2 max-w-3xl">Esta área apresenta somente as plataformas que podem ser integradas ao sistema. Contas, clientes, páginas e ativos são administrados exclusivamente dentro de cada workspace.</p></header>
    <div className="grid gap-3 sm:grid-cols-3"><Card className="flex items-center gap-4 p-4"><Blocks className="text-primary" /><div><strong className="text-xl">{platforms.length}</strong><p className="muted text-xs">plataformas</p></div></Card><Card className="flex items-center gap-4 p-4"><CheckCircle2 className="text-emerald-400" /><div><strong className="text-xl">{available}</strong><p className="muted text-xs">disponíveis agora</p></div></Card><Card className="flex items-center gap-4 p-4"><Database className="text-indigo-300" /><div><strong className="text-xl">{dataServices.length}</strong><p className="muted text-xs">serviços de dados</p></div></Card></div>
    <section className="space-y-4"><div><h2 className="text-xl font-semibold">Canais e plataformas</h2><p className="muted mt-1 text-sm">Integrações oficiais organizadas pelo ecossistema de origem.</p></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{platforms.map((platform)=><IntegrationCard platform={platform} workspaces={workspaces??[]} key={platform.key} />)}</div></section>
    <section className="space-y-4"><div><h2 className="text-xl font-semibold">Serviços de dados</h2><p className="muted mt-1 text-sm">Extratores utilizados para transportar dados das plataformas até o dashboard.</p></div><div className="grid gap-4 md:grid-cols-2">{dataServices.map((platform)=><IntegrationCard platform={platform} workspaces={workspaces??[]} key={platform.key} />)}</div></section>
  </div>;
}
