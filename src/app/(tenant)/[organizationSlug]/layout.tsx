import Link from 'next/link';
import type {CSSProperties} from 'react';
import {dashboardConfig, tenant} from '@/lib/auth/session';
import {Navigation} from '@/components/navigation';
import {ReportStudioFrame} from '@/components/dashboard/report-studio-frame';

export default async function Layout({children, params: params_}: {children: React.ReactNode; params: Promise<{organizationSlug: string}>}) {
  const params = await params_;
  const {db, org, superAdmin} = await tenant(params.organizationSlug);
  const [{data: branding}, {data: config}] = await Promise.all([
    db.from('branding').select('*').eq('organization_id', org.id).single(),
    dashboardConfig(params.organizationSlug).then((data)=>({data})),
  ]);
  const canShare=superAdmin;
  const image = branding?.dashboard_background_path
    ? (await db.storage.from('branding').createSignedUrl(branding.dashboard_background_path, 3600)).data?.signedUrl
    : null;

  return <div style={{'--primary': branding?.primary_color, '--background': branding?.background_color} as CSSProperties}>
    <ReportStudioFrame>{superAdmin?<Navigation slug={org.slug} enabled={config?.enabled_pages} canShare={canShare}/>:<header className="client-dashboard-header tv-hide" data-client-dashboard-header><div><span>Engaje · Marketing intelligence</span><strong>{org.name}</strong></div><div className="client-dashboard-actions"><Link href={`/${org.slug}/reports`}>Relatórios</Link><form action="/auth/signout" method="post"><button type="submit">Sair</button></form></div></header>}
    <main data-client-dashboard={!superAdmin?'':undefined} className={`dashboard-shell min-h-screen px-4 py-6 sm:px-6 ${superAdmin?'lg:ml-[272px] ':''}lg:px-8 lg:py-9 2xl:px-12`} style={{background: image ? `linear-gradient(#080b12ed,#080b12ed),url("${image}") center/cover fixed` : undefined}}>{children}</main></ReportStudioFrame>
  </div>;
}
