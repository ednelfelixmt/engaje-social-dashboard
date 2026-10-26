/** Optional OpenAI Ads browser instrumentation. Only call after measurement consent. */
export type OpenAIAdsEvent =
  | 'page_viewed'
  | 'contents_viewed'
  | 'items_added'
  | 'checkout_started'
  | 'order_created'
  | 'lead_created'
  | 'registration_completed'
  | 'appointment_scheduled'
  | 'subscription_created'
  | 'trial_started';

type Oaiq = (...args: unknown[]) => void;
declare global {
  interface Window { oaiq?: Oaiq; __openAIAdsPixelId?: string; }
}

const PIXEL_SCRIPT = 'https://bzrcdn.openai.com/sdk/oaiq.min.js';

/**
 * Initialize only on an approved, customer-facing browser flow with consent.
 * No tracking happens merely by importing this module.
 * Never call on internal dashboards, login, password recovery or admin screens.
 */
export function initializeOpenAIAdsPixel(consentGranted: boolean): boolean {
  if (typeof window === 'undefined' || !consentGranted) return false;
  const pixelId = process.env.NEXT_PUBLIC_OPENAI_ADS_PIXEL_ID?.trim();
  if (!pixelId) return false;
  try {
    if (window.__openAIAdsPixelId) return window.__openAIAdsPixelId === pixelId;
    const existing = window.oaiq;
    if (!existing) {
      const queue: unknown[][] = [];
      const stub: Oaiq = (...args) => { queue.push(args); };
      Object.assign(stub, { q: queue });
      window.oaiq = stub;
      const script = document.createElement('script');
      script.async = true;
      script.src = PIXEL_SCRIPT;
      document.head.appendChild(script);
    }
    window.oaiq?.('init', { pixelId });
    window.__openAIAdsPixelId = pixelId;
    return true;
  } catch {
    return false; // Analytics must never block the business flow.
  }
}

/** Emit only after a confirmed conversion and permission to measure. */
export function measureOpenAIAdsConversion(
  event: OpenAIAdsEvent,
  consentGranted: boolean,
  options?: Record<string, string | number | boolean>,
): void {
  if (!consentGranted || typeof window === 'undefined' || !window.__openAIAdsPixelId) return;
  try { window.oaiq?.('measure', event, options ?? {}); } catch { /* optional telemetry */ }
}
