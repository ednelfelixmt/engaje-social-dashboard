import type { Database, Row } from './database.types';

export const dashboardPages = [
  'overview', 'paid', 'meta_ads', 'google_ads', 'tiktok_ads', 'funnel',
  'organic', 'facebook_organic', 'instagram_organic', 'tiktok_organic',
  'youtube', 'google_business', 'creatives', 'external',
] as const;
export type DashboardPage = typeof dashboardPages[number];
export type Platform = Database['public']['Enums']['integration_provider'];
export type ComparisonMode = 'none' | 'previous_period' | 'previous_year';
export type DateRange = { from: string; to: string }; // Datas ISO inclusivas no timezone do tenant.
export type OrganizationContext = {
  organization: Row<'organizations'>;
  membership: Row<'organization_members'>;
  branding: Row<'branding'>;
  config: Row<'dashboard_configs'>;
};
export type IntegrationSummary = Omit<Row<'integrations'>, 'credential_secret_id'>;
export type CampaignPerformance = {
  organizationId: string;
  platform: Platform;
  accountId: string;
  campaignId: string;
  campaignName: string;
  campaignStatus: string | null;
  currency: string;
  spend: number;
  revenue: number | null;
  impressions: number | null;
  clicks: number | null;
  pageViews: number | null;
  leads: number | null;
  registrationLeads: number | null;
  messageLeads: number | null;
  checkouts: number | null;
  revenueSource: 'crm' | 'spreadsheet' | 'ads' | 'mixed' | 'unavailable';
  purchases: number | null;
  roas: number | null;
  roi: number | null;
  cpm: number | null;
  cpc: number | null;
  cpl: number | null;
  costPerRegistration: number | null;
  costPerMessage: number | null;
  ctr: number | null;
  cpa: number | null;
  conversionRate: number | null;
};
export type SyncResult = {
  integrationId: string;
  organizationId: string;
  status: 'completed' | 'partial' | 'failed';
  rowsUpserted: number;
  creativesStored: number;
  startedAt: string;
  finishedAt: string;
  errors: { code: string; message: string }[];
};

export const defaultTheme = {
  background: '#0F0F13', primary: '#FFD600', secondary: '#242430',
} as const;
