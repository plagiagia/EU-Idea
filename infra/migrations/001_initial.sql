create extension if not exists pgcrypto;

create table if not exists public.orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text not null default 'starter',
  stripe_customer_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid not null references public.orgs(id) on delete cascade,
  email text not null,
  role text not null check (role in ('org_admin', 'broker_user', 'client_viewer')),
  created_at timestamptz not null default now()
);

create table if not exists public.importers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  legal_name text not null,
  eori text not null,
  ms_established text,
  procedure_config jsonb not null default '{"mode":"include_all"}',
  created_at timestamptz not null default now(),
  unique (org_id, eori)
);

create table if not exists public.customs_files (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  importer_id uuid not null references public.importers(id) on delete cascade,
  source_format text not null default 'csv',
  status text not null check (status in ('uploaded', 'mapped', 'validated', 'processed', 'failed')),
  period_start date,
  period_end date,
  storage_key text not null,
  sha256 text not null,
  uploaded_by uuid references public.users(id),
  validation_errors jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create table if not exists public.source_mappings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  importer_id uuid not null references public.importers(id) on delete cascade,
  customs_file_id uuid references public.customs_files(id) on delete cascade,
  name text not null default 'default',
  mapping_json jsonb not null,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customs_file_id)
);

create table if not exists public.cbam_cn_rules (
  id uuid primary key default gen_random_uuid(),
  cn_code_pattern text not null,
  match_type text not null check (match_type in ('exact', 'prefix')),
  category text not null,
  active boolean not null default true,
  effective_from date not null,
  effective_to date,
  change_reason text,
  version_label text not null default 'v1',
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.import_lines (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  importer_id uuid not null references public.importers(id) on delete cascade,
  customs_file_id uuid not null references public.customs_files(id) on delete cascade,
  importer_eori text not null,
  declaration_date date not null,
  cn_code text not null,
  origin_country text not null,
  net_mass_kg numeric(18,3) not null,
  procedure_code text not null,
  cbam_scope boolean not null,
  cbam_rule_id uuid references public.cbam_cn_rules(id),
  source_row_number integer not null,
  created_at timestamptz not null default now()
);

create table if not exists public.threshold_snapshots (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  importer_id uuid not null references public.importers(id) on delete cascade,
  year integer not null,
  cbam_mass_kg numeric(18,3) not null,
  threshold_kg numeric(18,3) not null default 50000,
  status text not null check (status in ('safe', 'warning_80', 'warning_90', 'exceeded')),
  last_computed_at timestamptz not null default now(),
  unique (importer_id, year)
);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  importer_id uuid not null references public.importers(id) on delete cascade,
  type text not null check (type in ('threshold', 'deadline', 'data_quality')),
  status text,
  message text not null,
  payload jsonb not null default '{}'::jsonb,
  dedupe_key text unique,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.auth_apps (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  importer_id uuid not null references public.importers(id) on delete cascade,
  status text not null check (status in ('draft', 'submitted', 'decision')),
  submitted_at timestamptz,
  notes text,
  pack_storage_key text,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  importer_id uuid not null references public.importers(id) on delete cascade,
  auth_app_id uuid not null references public.auth_apps(id) on delete cascade,
  doc_type text not null,
  storage_key text not null,
  sha256 text not null,
  uploaded_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  importer_id uuid references public.importers(id) on delete set null,
  user_id uuid references public.users(id) on delete set null,
  action text not null,
  meta jsonb not null default '{}'::jsonb,
  at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null unique references public.orgs(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,
  status text not null default 'inactive',
  importer_quota integer not null default 1,
  line_quota integer not null default 2000,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_importers_org on public.importers(org_id);
create index if not exists idx_customs_files_importer on public.customs_files(importer_id);
create index if not exists idx_import_lines_importer_date on public.import_lines(importer_id, declaration_date);
create index if not exists idx_threshold_snapshots_importer_year on public.threshold_snapshots(importer_id, year);
create index if not exists idx_alerts_importer_created on public.alerts(importer_id, created_at desc);
create index if not exists idx_audit_org_at on public.audit_events(org_id, at desc);

create or replace function public.current_org_id()
returns uuid
language sql
stable
as $$
  select org_id from public.users where id = auth.uid() limit 1;
$$;

alter table public.orgs enable row level security;
alter table public.users enable row level security;
alter table public.importers enable row level security;
alter table public.customs_files enable row level security;
alter table public.source_mappings enable row level security;
alter table public.import_lines enable row level security;
alter table public.threshold_snapshots enable row level security;
alter table public.alerts enable row level security;
alter table public.auth_apps enable row level security;
alter table public.documents enable row level security;
alter table public.audit_events enable row level security;
alter table public.subscriptions enable row level security;
alter table public.cbam_cn_rules enable row level security;

drop policy if exists orgs_select on public.orgs;
create policy orgs_select on public.orgs
for select using (id = public.current_org_id());

drop policy if exists users_select on public.users;
create policy users_select on public.users
for select using (org_id = public.current_org_id());

drop policy if exists importers_org_all on public.importers;
create policy importers_org_all on public.importers
for all using (org_id = public.current_org_id())
with check (org_id = public.current_org_id());

drop policy if exists customs_files_org_all on public.customs_files;
create policy customs_files_org_all on public.customs_files
for all using (org_id = public.current_org_id())
with check (org_id = public.current_org_id());

drop policy if exists source_mappings_org_all on public.source_mappings;
create policy source_mappings_org_all on public.source_mappings
for all using (org_id = public.current_org_id())
with check (org_id = public.current_org_id());

drop policy if exists import_lines_org_all on public.import_lines;
create policy import_lines_org_all on public.import_lines
for all using (org_id = public.current_org_id())
with check (org_id = public.current_org_id());

drop policy if exists threshold_snapshots_org_all on public.threshold_snapshots;
create policy threshold_snapshots_org_all on public.threshold_snapshots
for all using (org_id = public.current_org_id())
with check (org_id = public.current_org_id());

drop policy if exists alerts_org_all on public.alerts;
create policy alerts_org_all on public.alerts
for all using (org_id = public.current_org_id())
with check (org_id = public.current_org_id());

drop policy if exists auth_apps_org_all on public.auth_apps;
create policy auth_apps_org_all on public.auth_apps
for all using (org_id = public.current_org_id())
with check (org_id = public.current_org_id());

drop policy if exists documents_org_all on public.documents;
create policy documents_org_all on public.documents
for all using (org_id = public.current_org_id())
with check (org_id = public.current_org_id());

drop policy if exists audit_events_org_all on public.audit_events;
create policy audit_events_org_all on public.audit_events
for all using (org_id = public.current_org_id())
with check (org_id = public.current_org_id());

drop policy if exists subscriptions_org_all on public.subscriptions;
create policy subscriptions_org_all on public.subscriptions
for all using (org_id = public.current_org_id())
with check (org_id = public.current_org_id());

drop policy if exists cbam_cn_rules_select on public.cbam_cn_rules;
create policy cbam_cn_rules_select on public.cbam_cn_rules
for select using (auth.uid() is not null);

