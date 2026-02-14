# Pilot Runbook

## Pre-Launch Checklist

1. Apply SQL migration: `infra/migrations/001_initial.sql`
2. Seed initial rule set: `infra/seeds/001_cbam_rules.sql`
3. Configure buckets:
   - `customs-files`
   - `auth-docs`
   - `submission-packs`
4. Configure env vars in `apps/web/.env.local`
5. Ensure Stripe webhook endpoint points to `/api/billing/webhook`

## Broker Pilot Onboarding

1. Create org + users + importer records.
2. Upload sample customs file via `/api/imports/upload`.
3. Save mapping via `/api/imports/{id}/map`.
4. Process file via `/api/imports/{id}/process`.
5. Validate threshold via `/api/importers/{id}/threshold`.
6. Create auth-app and upload supporting docs.
7. Generate submission pack via `/api/auth-app/{id}/pack`.

## Acceptance Tracking

- Pilot passes when each broker can:
  - process at least one customs file,
  - view threshold status/alerts,
  - generate one submission pack.
- Track all critical events via `/api/audit`.
