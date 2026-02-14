import { describe, expect, it } from "vitest";
import { matchCbamRule } from "../src/rules";
import type { CBAMRule } from "../src/types";

const rules: CBAMRule[] = [
  {
    id: "1",
    cnCodePattern: "72",
    matchType: "prefix",
    active: true,
    effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
    effectiveTo: null,
    category: "iron_steel"
  },
  {
    id: "2",
    cnCodePattern: "7208",
    matchType: "prefix",
    active: true,
    effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
    effectiveTo: null,
    category: "iron_steel_specific"
  },
  {
    id: "3",
    cnCodePattern: "72081000",
    matchType: "exact",
    active: true,
    effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
    effectiveTo: null,
    category: "exact"
  }
];

describe("matchCbamRule", () => {
  it("prefers longest match and exact match", () => {
    const matched = matchCbamRule("72081000", new Date("2026-05-01T00:00:00.000Z"), rules);
    expect(matched?.id).toBe("3");
  });

  it("respects effective date windows", () => {
    const matched = matchCbamRule("72081000", new Date("2025-12-31T00:00:00.000Z"), rules);
    expect(matched).toBeNull();
  });
});
