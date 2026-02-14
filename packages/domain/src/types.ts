export type Role = "org_admin" | "broker_user" | "client_viewer";

export type ImportProcessStatus =
  | "uploaded"
  | "mapped"
  | "validated"
  | "processed"
  | "failed";

export type ThresholdStatus = "safe" | "warning_80" | "warning_90" | "exceeded";

export type AuthAppStatus = "draft" | "submitted" | "decision";

export type RuleMatchType = "exact" | "prefix";

export type AlertType = "threshold" | "deadline" | "data_quality";

export type RequiredCanonicalField =
  | "importer_eori"
  | "cn_code"
  | "net_mass_kg"
  | "origin_country"
  | "declaration_date"
  | "procedure_code";

export const requiredCanonicalFields: RequiredCanonicalField[] = [
  "importer_eori",
  "cn_code",
  "net_mass_kg",
  "origin_country",
  "declaration_date",
  "procedure_code"
];

export type MassUnit = "kg" | "g" | "t";

export interface SourceMapping {
  importer_eori: string;
  cn_code: string;
  net_mass_kg: string;
  origin_country: string;
  declaration_date: string;
  procedure_code: string;
  mass_unit?: string;
  default_mass_unit?: MassUnit;
}

export interface CanonicalImportLine {
  importerEori: string;
  cnCode: string;
  netMassKg: number;
  originCountry: string;
  declarationDate: Date;
  procedureCode: string;
  cbamScope: boolean;
  sourceRowNumber: number;
}

export interface ParsedImportLine {
  importerEori: string;
  cnCode: string;
  netMassKg: number;
  originCountry: string;
  declarationDate: Date;
  procedureCode: string;
  sourceRowNumber: number;
}

export interface CBAMRule {
  id: string;
  cnCodePattern: string;
  matchType: RuleMatchType;
  active: boolean;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  category: string;
  changeReason?: string;
}

export interface ThresholdSnapshot {
  year: number;
  cbamMassKg: number;
  thresholdKg: number;
  status: ThresholdStatus;
}

export interface ThresholdAlert {
  status: Exclude<ThresholdStatus, "safe">;
  thresholdRatio: number;
  previousKg: number;
  currentKg: number;
}

export interface ParseError {
  row: number;
  field: RequiredCanonicalField | "mass_unit" | "row";
  message: string;
}

export interface ParseResult {
  rows: ParsedImportLine[];
  errors: ParseError[];
}

export interface SubmissionPackInput {
  importerId: string;
  authApplicationId: string;
  generatedAt: Date;
  summary: Record<string, string | number | boolean>;
  documents: Array<{
    filename: string;
    contentType: string;
    content: Buffer;
    sha256?: string;
  }>;
}

export interface SubmissionPackOutput {
  zipBuffer: Buffer;
  manifestSha256: string;
  packageSha256: string;
}
