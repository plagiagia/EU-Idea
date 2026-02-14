import { isCbamScope } from "./rules";
import type { CBAMRule, CanonicalImportLine, ParsedImportLine } from "./types";

export function applyCbamClassification(
  rows: ParsedImportLine[],
  rules: CBAMRule[]
): CanonicalImportLine[] {
  return rows.map((row) => ({
    ...row,
    cbamScope: isCbamScope(row.cnCode, row.declarationDate, rules)
  }));
}
