export type DashboardPlatform = 'meta_ads' | 'google_ads' | 'tiktok_ads';

export type PlatformDashboard = {
  platform: DashboardPlatform;
  route: string;
  label: string;
  group: 'paid';
};

export const platformDashboards: PlatformDashboard[] = [
  {platform: 'meta_ads', route: 'meta_ads', label: 'Meta Ads', group: 'paid'},
  {platform: 'google_ads', route: 'google_ads', label: 'Google Ads', group: 'paid'},
  {platform: 'tiktok_ads', route: 'tiktok_ads', label: 'TikTok Ads', group: 'paid'},
];

export const platformDashboardByRoute = new Map(platformDashboards.map((item) => [item.route, item]));
export const platformDashboardByProvider = new Map(platformDashboards.map((item) => [item.platform, item]));
