import type { CBAMRule } from "./types";

function isRuleEffective(rule: CBAMRule, declarationDate: Date): boolean {
  const fromOk = declarationDate >= rule.effectiveFrom;
  const toOk = !rule.effectiveTo || declarationDate <= rule.effectiveTo;
  return rule.active && fromOk && toOk;
}

function doesRuleMatch(rule: CBAMRule, cnCode: string): boolean {
  const normalizedPattern = rule.cnCodePattern.replace(/\s/g, "").toUpperCase();
  const normalizedCode = cnCode.replace(/\s/g, "").toUpperCase();
  if (rule.matchType === "exact") {
    return normalizedCode === normalizedPattern;
  }
  return normalizedCode.startsWith(normalizedPattern);
}

function sortBySpecificity(left: CBAMRule, right: CBAMRule): number {
  const lenDiff = right.cnCodePattern.length - left.cnCodePattern.length;
  if (lenDiff !== 0) {
    return lenDiff;
  }
  if (left.matchType === right.matchType) {
    return 0;
  }
  return left.matchType === "exact" ? -1 : 1;
}

export function matchCbamRule(
  cnCode: string,
  declarationDate: Date,
  rules: CBAMRule[]
): CBAMRule | null {
  const candidates = rules
    .filter((rule) => isRuleEffective(rule, declarationDate))
    .filter((rule) => doesRuleMatch(rule, cnCode))
    .sort(sortBySpecificity);

  return candidates[0] ?? null;
}

export function isCbamScope(
  cnCode: string,
  declarationDate: Date,
  rules: CBAMRule[]
): boolean {
  return Boolean(matchCbamRule(cnCode, declarationDate, rules));
}
