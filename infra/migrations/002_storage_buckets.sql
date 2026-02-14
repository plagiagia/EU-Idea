insert into storage.buckets (id, name, public)
values
  ('customs-files', 'customs-files', false),
  ('auth-docs', 'auth-docs', false),
  ('submission-packs', 'submission-packs', false)
on conflict (id) do nothing;
