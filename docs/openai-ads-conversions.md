# OpenAI Ads Conversions — integration status

## Repository audit (2026-10-25)

- Stack: Next.js 16 App Router, React 18, TypeScript, Supabase.
- Existing OpenAI Ads instrumentation: none found in the inspected application paths.
- Confirmed flow: `createOrganization` in `src/app/(agency)/admin/actions.ts` creates an **internal customer organization**, not an ad-acquired customer lead. It is intentionally **not** instrumented.
- Existing authentication: password-based login and password recovery; neither is a qualifying registration conversion.
- Dashboard lead metrics aggregate advertising data from other platforms; their display is **not** an original lead conversion.

## Implemented

**Mode: Pixel-ready, disabled by default.** `src/lib/ads/openai-pixel.ts` exports an opt-in browser initializer and supported event helper. It is deliberately **not mounted** into the root layout: the current application has no verified public prospect landing page or confirmed conversion success path. Importing the helper does not track anyone. No Pixel ID or API key has been provided.

This is a reusable, inactive foundation, **not production conversion tracking**.

To activate on a genuine public acquisition flow:
1. Create/obtain the OpenAI Ads Pixel ID in the advertiser account.
2. Configure `NEXT_PUBLIC_OPENAI_ADS_PIXEL_ID` in the deployment environment (public ID, not a secret).
3. Establish the site's consent/opt-out policy and use its actual consent boolean to call `initializeOpenAIAdsPixel(consentGranted)` once from a client component on that public surface.
4. At the **confirmed successful** lead submission, signup or purchase boundary, call `measureOpenAIAdsConversion('lead_created', consentGranted)` (or a different documented event corresponding to the actual result). Do not emit merely from a click or an attempted request.
5. Validate network requests, Ads diagnostics, attribution and duplicate counts using a permitted test session. Ensure the ad landing URL is on the same supported website.

## Supported event inventory

- Added at runtime: **none** (no verified eligible conversion).
- Available in the typed helper but not emitted: `page_viewed`, `contents_viewed`, `items_added`, `checkout_started`, `order_created`, `lead_created`, `registration_completed`, `appointment_scheduled`, `subscription_created`, `trial_started`.
- `page_viewed` skipped: current routes are authenticated internal dashboards and support forms.
- `lead_created`, `registration_completed`, `order_created`, `subscription_created`, `trial_started`, `appointment_scheduled`: no verified corresponding public success boundary.
- `contents_viewed`, `items_added`, `checkout_started`: no confirmed storefront/cart/checkout surface.

## CAPI and deduplication

CAPI was **not enabled**: no verified external conversion boundary or secret provisioned. Do not add a key to the repository or use `NEXT_PUBLIC_` for server secrets. A future Pixel+CAPI integration must share Pixel ID, event name and event_id; preserve raw `__oppref`; send sanitized HTTP(S) origin+pathname `source_url`; and deliver from a non-blocking server-only pathway. Server-side matching and consent must be reviewed before implementation.

## Tests and release review

- Repository implementation is in an isolated feature branch for review, not deployed.
- Static/manual review only; automated Next.js build, lint, test and browser network verification have **not** been executed.
- Confirm the actual public landing page, consent policy, real success handler, Pixel ID and attribution requirements before activation.
- Before deploying, review privacy, security, consent, data handling and the precise business definition of a conversion.

Official sources: https://developers.openai.com/ads/measurement-pixel , https://developers.openai.com/ads/conversions-api , https://developers.openai.com/ads/supported-events
