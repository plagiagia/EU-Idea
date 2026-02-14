import { parse } from "csv-parse/sync";
import { z } from "zod";
import type {
  MassUnit,
  ParseError,
  ParseResult,
  ParsedImportLine,
  SourceMapping
} from "./types";
import { requiredCanonicalFields } from "./types";

const eoriSchema = z.string().trim().min(3).max(20);
const cnCodeSchema = z.string().trim().min(4).max(20);
const isoCountrySchema = z.string().regex(/^[A-Z]{2}$/);
const procedureSchema = z.string().trim().min(1).max(20);

function normalizeCnCode(raw: string): string {
  return raw.replace(/[^0-9A-Za-z]/g, "").toUpperCase();
}

function parseMassUnit(raw?: string): MassUnit | null {
  if (!raw) {
    return null;
  }
  const normalized = raw.trim().toLowerCase();
  if (normalized === "kg") return "kg";
  if (normalized === "g") return "g";
  if (normalized === "t" || normalized === "tonne" || normalized === "tonnes") return "t";
  return null;
}

function toKg(value: number, massUnit: MassUnit): number {
  if (massUnit === "kg") return value;
  if (massUnit === "g") return value / 1000;
  return value * 1000;
}

function ensureRequiredMappings(mapping: SourceMapping): string[] {
  const missing: string[] = [];
  for (const field of requiredCanonicalFields) {
    const mapped = mapping[field];
    if (!mapped || !mapped.trim()) {
      missing.push(field);
    }
  }
  return missing;
}

function parseDate(raw: string): Date | null {
  const trimmed = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null;
  }
  const date = new Date(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

export function parseAndNormalizeCsv(
  csvInput: string | Buffer,
  mapping: SourceMapping
): ParseResult {
  const mappingErrors = ensureRequiredMappings(mapping);
  if (mappingErrors.length > 0) {
    return {
      rows: [],
      errors: mappingErrors.map((field) => ({
        row: 0,
        field: field as ParseError["field"],
        message: "Required field mapping is missing."
      }))
    };
  }

  const records: Record<string, string>[] = parse(csvInput, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true
  });

  const rows: ParsedImportLine[] = [];
  const errors: ParseError[] = [];
  const defaultMassUnit = mapping.default_mass_unit ?? "kg";

  records.forEach((record, idx) => {
    const rowNumber = idx + 2;
    const importerRaw = String(record[mapping.importer_eori] ?? "");
    const cnRaw = String(record[mapping.cn_code] ?? "");
    const massRaw = String(record[mapping.net_mass_kg] ?? "");
    const originRaw = String(record[mapping.origin_country] ?? "");
    const dateRaw = String(record[mapping.declaration_date] ?? "");
    const procedureRaw = String(record[mapping.procedure_code] ?? "");
    const rowMassUnitRaw = mapping.mass_unit ? String(record[mapping.mass_unit] ?? "") : "";

    const importer = importerRaw.trim().toUpperCase();
    const cnCode = normalizeCnCode(cnRaw);
    const origin = originRaw.trim().toUpperCase();
    const procedureCode = procedureRaw.trim().toUpperCase();
    const parsedDate = parseDate(dateRaw);
    const rawNumber = Number.parseFloat(massRaw.replace(",", "."));
    const parsedMassUnit = parseMassUnit(rowMassUnitRaw) ?? defaultMassUnit;

    const importerResult = eoriSchema.safeParse(importer);
    if (!importerResult.success) {
      errors.push({
        row: rowNumber,
        field: "importer_eori",
        message: "Invalid importer EORI."
      });
    }

    const cnResult = cnCodeSchema.safeParse(cnCode);
    if (!cnResult.success) {
      errors.push({
        row: rowNumber,
        field: "cn_code",
        message: "Invalid CN code."
      });
    }

    if (!Number.isFinite(rawNumber) || rawNumber <= 0) {
      errors.push({
        row: rowNumber,
        field: "net_mass_kg",
        message: "net_mass_kg must be a positive number."
      });
    }

    const originResult = isoCountrySchema.safeParse(origin);
    if (!originResult.success) {
      errors.push({
        row: rowNumber,
        field: "origin_country",
        message: "origin_country must be an ISO-2 uppercase code."
      });
    }

    const procedureResult = procedureSchema.safeParse(procedureCode);
    if (!procedureResult.success) {
      errors.push({
        row: rowNumber,
        field: "procedure_code",
        message: "Invalid procedure code."
      });
    }

    if (!parsedDate) {
      errors.push({
        row: rowNumber,
        field: "declaration_date",
        message: "declaration_date must be formatted as YYYY-MM-DD."
      });
    }

    if (
      importerResult.success &&
      cnResult.success &&
      Number.isFinite(rawNumber) &&
      rawNumber > 0 &&
      originResult.success &&
      procedureResult.success &&
      parsedDate
    ) {
      rows.push({
        importerEori: importer,
        cnCode,
        netMassKg: toKg(rawNumber, parsedMassUnit),
        originCountry: origin,
        declarationDate: parsedDate,
        procedureCode,
        sourceRowNumber: rowNumber
      });
    }
  });

  return { rows, errors };
}
