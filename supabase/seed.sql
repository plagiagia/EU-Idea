insert into public.cbam_cn_rules (
  cn_code_pattern,
  match_type,
  category,
  active,
  effective_from,
  effective_to,
  change_reason,
  version_label
)
values
  ('2523', 'prefix', 'cement', true, '2026-01-01', null, 'Initial CBAM definitive regime mapping', 'v1'),
  ('72', 'prefix', 'iron_steel', true, '2026-01-01', null, 'Initial CBAM definitive regime mapping', 'v1'),
  ('73', 'prefix', 'iron_steel', true, '2026-01-01', null, 'Initial CBAM definitive regime mapping', 'v1'),
  ('76', 'prefix', 'aluminium', true, '2026-01-01', null, 'Initial CBAM definitive regime mapping', 'v1'),
  ('3102', 'prefix', 'fertilisers', true, '2026-01-01', null, 'Initial CBAM definitive regime mapping', 'v1'),
  ('27160000', 'exact', 'electricity', true, '2026-01-01', null, 'Initial CBAM definitive regime mapping', 'v1'),
  ('28041000', 'exact', 'hydrogen', true, '2026-01-01', null, 'Initial CBAM definitive regime mapping', 'v1')
on conflict do nothing;
