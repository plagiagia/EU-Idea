# CBAM Threshold Tracker + Authorisation Kit

Broker-first MVP for deterministic CBAM scope detection, threshold tracking, and authorisation workflows.

## Quick Start

1. Install dependencies:
   - `npm install`
2. Copy env template:
   - `cp apps/web/.env.example apps/web/.env.local`
3. Run app:
   - `npnpm run dev`
4. Run domain tests:
   - `npm run test`

## Database Setup (Supabase MCP + CLI)

1. Configure MCP:
   - `.cursor/mcp.json` is preconfigured for Supabase MCP on Windows.
2. Set required environment variables:
   - Use `.env.db.example` as reference.
   - `SUPABASE_ACCESS_TOKEN`
   - `SUPABASE_PROJECT_REF`
   - `SUPABASE_DB_PASSWORD`
3. Apply schema + seed:
   - `powershell -ExecutionPolicy Bypass -File .\scripts\setup-supabase-db.ps1`
4. Full guide:
   - `docs/supabase-mcp-db-setup.md`

## Workspace Layout

- `apps/web`: Next.js app and API routes
- `packages/domain`: deterministic logic, schemas, and tests
- `packages/config`: shared lint/ts config presets
- `infra`: SQL migrations and seeds
- `supabase`: Supabase CLI migrations/seed used for remote push
- `docs`: architecture, security, and pilot runbooks
