export type DashboardPlatform = 'meta_ads' | 'google_ads' | 'tiktok_ads' | 'facebook_organic' | 'instagram_organic' | 'tiktok_organic' | 'youtube' | 'google_business';

export type PlatformDashboard = {
  platform: DashboardPlatform;
  route: string;
  label: string;
  group: 'paid' | 'organic';
};

export const platformDashboards: PlatformDashboard[] = [
  {platform: 'meta_ads', route: 'meta_ads', label: 'Meta Ads', group: 'paid'},
  {platform: 'google_ads', route: 'google_ads', label: 'Google Ads', group: 'paid'},
  {platform: 'tiktok_ads', route: 'tiktok_ads', label: 'TikTok Ads', group: 'paid'},
  {platform: 'facebook_organic', route: 'facebook_organic', label: 'Facebook orgânico', group: 'organic'},
  {platform: 'instagram_organic', route: 'instagram_organic', label: 'Instagram orgânico', group: 'organic'},
  {platform: 'tiktok_organic', route: 'tiktok_organic', label: 'TikTok orgânico', group: 'organic'},
  {platform: 'youtube', route: 'youtube', label: 'YouTube', group: 'organic'},
  {platform: 'google_business', route: 'google_business', label: 'Google Business', group: 'organic'},
];

export const platformDashboardByRoute = new Map(platformDashboards.map((item) => [item.route, item]));
export const platformDashboardByProvider = new Map(platformDashboards.map((item) => [item.platform, item]));
