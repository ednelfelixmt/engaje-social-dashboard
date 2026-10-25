import Link from 'next/link';
import {Share2,Users,ShieldCheck} from 'lucide-react';
import {agencyTenant,dashboardConfig} from '@/lib/auth/session';
import {Card} from '@/components/ui/card';
import {ClientShareLinks} from '@/components/sharing/client-share-links';
export default async function Page({params}:{params:Promise<{organizationSlug:string}>}){
 const {organizationSlug}=await params;const {org,superAdmin}=await agencyTenant(organizationSlug);
 const config=await dashboardConfig(organizationSlug);
 return <div className="mx-auto max-w-5xl space-y-6"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="eyebrow">Compartilhamento seguro</p><h1 className="mt-2 text-3xl font-semibold text-white">Acesso aos dashboards</h1><p className="muted mt-3 text-sm">Compartilhe uma visão específica de <strong className="text-white">{org.name}</strong> sem expor outros clientes.</p></div><Share2 className="text-primary" size={26}/></div>
 <Card><div className="mb-5 flex items-center gap-2"><ShieldCheck size={18} className="text-primary"/><h2 className="font-semibold">Links do cliente</h2></div><ClientShareLinks slug={org.slug} enabled={config.enabled_pages}/></Card>
 <Card><div className="flex items-center gap-3"><Users className="text-primary"/><div><h2 className="font-semibold">Quem pode visualizar?</h2><p className="mt-1 text-sm text-zinc-400">Clientes têm acesso somente de leitura aos dashboards e relatórios. Atribuições de acesso são realizadas exclusivamente pela agência.</p></div></div>{superAdmin?<Link href="/admin/users" className="mt-5 inline-flex rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-black">Gerenciar usuários e permissões</Link>:<p className="mt-4 text-xs text-zinc-500">Para conceder ou revogar um acesso, solicite a alteração ao administrador da agência.</p>}</Card>
 </div>;
}
