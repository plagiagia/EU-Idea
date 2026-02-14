# Architecture Overview

## Stack

- App/API: Next.js App Router (`apps/web`)
- Domain logic: TypeScript package (`packages/domain`)
- Data/Auth/Storage: Supabase Postgres + Supabase Auth + Supabase Storage
- Billing: Stripe Checkout + Webhooks
- Jobs: Cron endpoints (`/api/cron/*`)

## Core Runtime Flow

1. Upload customs CSV (`/api/imports/upload`)
2. Attach field mapping (`/api/imports/{id}/map`)
3. Process deterministically (`/api/imports/{id}/process`)
4. Persist import lines, threshold snapshots, alerts
5. Operate auth-app workflow + documents + ZIP pack
6. Persist immutable hashes and audit events at each critical step

## Security Baseline

- Service-side Supabase client for protected API operations
- Role checks (`org_admin`, `broker_user`, `client_viewer`)
- Org-scoped access validation for importers/auth apps
- RLS policies defined in `infra/migrations/001_initial.sql`
- Storage buckets expected as private
