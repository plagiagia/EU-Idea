# Supabase MCP + DB Setup

This repo is configured to apply the database schema and seed through Supabase tooling with MCP-compatible setup.

## 1) Configure MCP in Cursor

Workspace MCP config is already created at:

- `.cursor/mcp.json`

It runs:

- `cmd /c npx -y @supabase/mcp-server-supabase@latest --access-token %SUPABASE_ACCESS_TOKEN%`

Set your PAT in your OS environment before launching Cursor:

```powershell
setx SUPABASE_ACCESS_TOKEN "your_personal_access_token"
```

Restart Cursor after setting it.

## 2) Set required DB env vars

You need:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF`
- `SUPABASE_DB_PASSWORD`

Example:

```powershell
setx SUPABASE_PROJECT_REF "your_project_ref"
setx SUPABASE_DB_PASSWORD "your_db_password"
```

Open a new terminal after `setx`.

## 3) Apply schema + seed

Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-supabase-db.ps1
```

Dry run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-supabase-db.ps1 -DryRun
```

## 4) SQL sources used

- Primary schema: `supabase/migrations/202602140001_initial.sql`
- Storage buckets: `supabase/migrations/202602140002_storage_buckets.sql`
- Seed (CBAM CN rules): `supabase/seed.sql`

## 5) Optional MCP verification prompts (inside Cursor)

After MCP connects, ask your assistant to:

1. List projects and confirm target `project_ref`.
2. Run a SQL check:
   - `select count(*) from public.cbam_cn_rules;`
3. Verify tables exist:
   - `select table_name from information_schema.tables where table_schema='public' order by table_name;`
