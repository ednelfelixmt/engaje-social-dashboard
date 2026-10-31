/**
 * Chart colours as CSS variables (defined in chart-kit.css for day and night) with day fallbacks,
 * so a model keeps working even outside a ChartFrame.
 *
 * Meaning is fixed: `primary` is the selected period, `compare` the historical one,
 * `good`/`bad` only mark a favourable/unfavourable variation, never a series identity.
 */
const v = (name: string, fallback: string) => `var(--chart-${name},${fallback})`;

export const tone = {
  primary: v('primary', '#24356f'),
  secondary: v('secondary', '#0e7c86'),
  compare: v('compare', '#dfe7f7'),
  compareStroke: v('compare-stroke', '#6f8ac4'),
  good: v('good', '#0f7a55'),
  bad: v('bad', '#b4232f'),
  grid: v('grid', '#e3e8f2'),
  axis: v('axis', '#5b6b84'),
  surface: v('surface', '#ffffff'),
  text: v('text', '#1b2a41'),
} as const;

const dayPalette = ['#24356f', '#0e7c86', '#d99218', '#7c51d5', '#d6457c', '#5f8f2f', '#d9642b', '#6b7b92'];
/** Categorical series colours (8 distinguishable hues). Beyond 8 categories, group the tail as "Outros". */
export const seriesColor = (index: number) => v(`c${(index % 8) + 1}`, dayPalette[index % 8]);
export const maxCategories = 8;

const platformFallback: Record<string, string> = {meta_ads: '#2563eb', google_ads: '#d99218', tiktok_ads: '#0e7c86'};
export const platformColor = (platform: string) => v(`platform-${platform.replace(/_ads$/, '')}`, platformFallback[platform] ?? '#6b7b92');
export const platformName: Record<string, string> = {meta_ads: 'Meta Ads', google_ads: 'Google Ads', tiktok_ads: 'TikTok Ads'};

/** Sequential ramp for heatmaps: index 0 (lowest) … 4 (highest). */
export const rampColor = (step: number) => v(`ramp-${Math.max(0, Math.min(4, step))}`, ['#e8eefc', '#bccdf7', '#8aa7ee', '#5278dd', '#24356f'][Math.max(0, Math.min(4, step))]);
