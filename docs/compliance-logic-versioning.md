# Compliance Logic Versioning

## CN-Scope Rule Strategy

- Rules are stored in `cbam_cn_rules` with:
  - `cn_code_pattern`
  - `match_type` (`exact` or `prefix`)
  - `effective_from`, `effective_to`
  - `active`, `version_label`, `change_reason`
- Matching behavior:
  1. Filter active and effective rules for declaration date.
  2. Match exact/prefix.
  3. Choose longest pattern.
  4. Break ties by exact over prefix.

## Audit Requirements

- Any rule changes should create an `audit_events` entry.
- Processing stores `cbam_rule_id` on each `import_lines` record.
- Historical imports remain reproducible because rule rows are time-bounded.

## Operational Guidance

- Never mutate historic rule rows in place for semantic changes.
- Prefer inserting a new row/version with updated effective dates.
- Reprocessing should be explicit and audited.
