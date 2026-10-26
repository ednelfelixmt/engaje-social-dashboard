# Phase 02 — protected GitHub Actions executor

Workflow: `.github/workflows/phase02-protected-isolation.yml`. This is an **on-demand read-only A/B verification runner**, not a full security homologation.

## Before running

1. A repository administrator must create the GitHub Actions environment `phase02-homologation` and configure required reviewers and deployment-branch restrictions. Do not run until protection is enabled. Never put secrets in workflow inputs, issue comments, commits or logs.
2. Configure **environment secrets** `MEDIAHUB_PUBLISHABLE_KEY`, `MEDIAHUB_A_EMAIL`, `MEDIAHUB_A_PASSWORD`, `MEDIAHUB_A_USER_ID`, `MEDIAHUB_B_EMAIL`, `MEDIAHUB_B_PASSWORD`, `MEDIAHUB_B_USER_ID`. Configure **environment variables** `MEDIAHUB_A_BRANDING_FILE`, `MEDIAHUB_B_BRANDING_FILE` (private object paths, UUID-prefixed). These are not secret credentials but must refer only to synthetic objects.
3. Confirm fixture accounts are exclusively synthetic and correspond to the fixed organization slugs. Upload the two synthetic private files using the authorized Storage API in a protected context; never insert directly into `storage.objects`.
4. After this PR passes Quality Gate and Vercel, merge it and manually dispatch the workflow from the default branch. GitHub may not expose a workflow for dispatch until its file exists on the default branch.

## What it verifies

Existing `scripts/verify-production-isolation.ts`: authenticated login, exact user IDs, viewer memberships, own organization reads, foreign table/asset denial, private signed URL allow/deny in both directions. No writes or service-role credentials are used by the runner. It signs out both sessions.

## Remaining release blockers

This workflow **does not** test negative DML/RPC/Storage writes, revoked sessions, OAuth callback handling, Edge Functions, or authenticated UI. SEC-010/011, SEC-014 and UX-002 remain open until independent evidence is captured. Never mark the phase homologated based on this job alone.

If a required environment secret or file is absent, the job fails closed before attempting authentication. Review the job status and sanitize logs before storing evidence. Never upload tokens, passwords or user data as artifacts.
