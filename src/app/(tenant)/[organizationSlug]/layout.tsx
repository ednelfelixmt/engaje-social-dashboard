import type {CSSProperties} from 'react';
import {tenant} from '@/lib/auth/session';
import {Navigation} from '@/components/navigation';
import {platformDashboards, type DashboardPlatform} from '@/lib/metrics/platforms';
import type {Platform} from '@/types/domain';

export default async function Layout({children, params}: {children: React.ReactNode; params: {organizationSlug: string}}) {
  const {db, org} = await tenant(params.organizationSlug);
  const platformChecks = platformDashboards.map(async (item) => {
    const table = item.group === 'paid' ? 'metrics_ads' : 'metrics_organic';
    const {count, error} = await db.from(table).select('id', {head: true, count: 'exact'}).eq('organization_id', org.id).eq('platform', item.platform as never);
    if (error) throw error;
    if (count) return item.platform;
    if (item.group === 'organic') {
      const {count: creativeCount, error: creativeError} = await db.from('creatives').select('id', {head: true, count: 'exact'}).eq('organization_id', org.id).eq('platform', item.platform as never);
      if (creativeError) throw creativeError;
      if (creativeCount) return item.platform;
    }
    return null;
  });
  const [{data: branding}, {data: config}, available] = await Promise.all([
    db.from('branding').select('*').eq('organization_id', org.id).single(),
    db.from('dashboard_configs').select('*').eq('organization_id', org.id).single(),
    Promise.all(platformChecks),
  ]);
  const availablePlatforms: Platform[] = available.filter((platform): platform is DashboardPlatform => platform !== null);
  const image = branding?.dashboard_background_path
    ? (await db.storage.from('branding').createSignedUrl(branding.dashboard_background_path, 3600)).data?.signedUrl
    : null;

  return <div style={{'--primary': branding?.primary_color, '--background': branding?.background_color} as CSSProperties}>
    <Navigation slug={org.slug} enabled={config?.enabled_pages} availablePlatforms={availablePlatforms} />
    <main className="min-h-screen p-6 lg:ml-60 lg:p-9" style={{background: image ? `linear-gradient(#0f0f13ed,#0f0f13ed),url("${image}") center/cover` : undefined}}>{children}</main>
  </div>;
}
