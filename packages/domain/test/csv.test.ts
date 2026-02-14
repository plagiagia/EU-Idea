import { describe, expect, it } from "vitest";
import { parseAndNormalizeCsv } from "../src/csv";
import type { SourceMapping } from "../src/types";

const mapping: SourceMapping = {
  importer_eori: "importer",
  cn_code: "cn",
  net_mass_kg: "mass",
  origin_country: "origin",
  declaration_date: "date",
  procedure_code: "proc"
};

describe("parseAndNormalizeCsv", () => {
  it("parses valid canonical rows", () => {
    const csv = [
      "importer,cn,mass,origin,date,proc",
      "DE1234567890,7208,1200,DE,2026-01-05,40 00"
    ].join("\n");
    const result = parseAndNormalizeCsv(csv, mapping);
    expect(result.errors).toHaveLength(0);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.netMassKg).toBe(1200);
    expect(result.rows[0]?.cnCode).toBe("7208");
  });

  it("converts tonnes to kilograms when mass unit column is provided", () => {
    const csv = [
      "importer,cn,mass,origin,date,proc,unit",
      "DE1234567890,7208,1.5,DE,2026-01-05,40 00,t"
    ].join("\n");
    const result = parseAndNormalizeCsv(csv, { ...mapping, mass_unit: "unit" });
    expect(result.errors).toHaveLength(0);
    expect(result.rows[0]?.netMassKg).toBe(1500);
  });

  it("returns strict validation errors", () => {
    const csv = ["importer,cn,mass,origin,date,proc", "DE12,7208,-1,ZZZ,2026/01/05,"].join(
      "\n"
    );
    const result = parseAndNormalizeCsv(csv, mapping);
    expect(result.rows).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
