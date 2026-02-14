import {
  buildThresholdAlerts,
  computeThresholdSnapshot,
  matchCbamRule,
  parseAndNormalizeCsv,
  type CBAMRule,
  type CanonicalImportLine,
  type SourceMapping
} from "@cbam/domain";
import { env } from "./env";
import { HttpError } from "./http";
import { recordAuditEvent } from "./audit";
import { getSupabaseAdmin } from "./supabase";

interface ProcessCustomsFileInput {
  customsFileId: string;
  actor?: {
    id?: string | null;
    orgId: string;
  };
}

export interface ProcessCustomsFileResult {
  customsFileId: string;
  importerId: string;
  processedRows: number;
  errorCount: number;
  status: "processed" | "failed";
}

const REQUIRED_MAPPING_KEYS: Array<keyof SourceMapping> = [
  "importer_eori",
  "cn_code",
  "net_mass_kg",
  "origin_country",
  "declaration_date",
  "procedure_code"
];

function assertValidMapping(raw: unknown): SourceMapping {
  if (!raw || typeof raw !== "object") {
    throw new HttpError(400, "source mapping is missing.");
  }
  const mapping = raw as SourceMapping;
  for (const key of REQUIRED_MAPPING_KEYS) {
    if (!mapping[key] || !String(mapping[key]).trim()) {
      throw new HttpError(400, `mapping.${key} is required.`);
    }
  }
  return mapping;
}

function mapRules(rows: any[]): CBAMRule[] {
  return rows.map((row) => ({
    id: row.id,
    cnCodePattern: row.cn_code_pattern,
    matchType: row.match_type,
    active: row.active,
    effectiveFrom: new Date(`${row.effective_from}T00:00:00.000Z`),
    effectiveTo: row.effective_to ? new Date(`${row.effective_to}T00:00:00.000Z`) : null,
    category: row.category,
    changeReason: row.change_reason ?? undefined
  }));
}

function toCanonicalForSnapshot(rows: any[]): CanonicalImportLine[] {
  return rows.map((row, idx) => ({
    importerEori: row.importer_eori ?? "UNKNOWN",
    cnCode: row.cn_code,
    netMassKg: Number(row.net_mass_kg),
    originCountry: row.origin_country,
    declarationDate: new Date(`${row.declaration_date}T00:00:00.000Z`),
    procedureCode: row.procedure_code,
    cbamScope: Boolean(row.cbam_scope),
    sourceRowNumber: row.source_row_number ?? idx + 1
  }));
}

async function upsertThresholdAndAlerts(importerId: string, orgId: string, years: number[]): Promise<void> {
  const supabase = getSupabaseAdmin();

  for (const year of years) {
    const { data: previousSnapshot } = await supabase
      .from("threshold_snapshots")
      .select("cbam_mass_kg")
      .eq("importer_id", importerId)
      .eq("year", year)
      .maybeSingle();

    const { data: yearRows, error: yearRowsError } = await supabase
      .from("import_lines")
      .select(
        "importer_eori, cn_code, net_mass_kg, origin_country, declaration_date, procedure_code, cbam_scope, source_row_number"
      )
      .eq("importer_id", importerId)
      .gte("declaration_date", `${year}-01-01`)
      .lt("declaration_date", `${year + 1}-01-01`);

    if (yearRowsError) {
      throw new HttpError(500, "Failed to read import lines for threshold computation.", yearRowsError);
    }

    const snapshot = computeThresholdSnapshot(toCanonicalForSnapshot(yearRows ?? []), year);
    await supabase.from("threshold_snapshots").upsert(
      {
        org_id: orgId,
        importer_id: importerId,
        year: snapshot.year,
        cbam_mass_kg: snapshot.cbamMassKg,
        threshold_kg: snapshot.thresholdKg,
        status: snapshot.status,
        last_computed_at: new Date().toISOString()
      },
      { onConflict: "importer_id,year" }
    );

    const prevKg = Number(previousSnapshot?.cbam_mass_kg ?? 0);
    const alerts = buildThresholdAlerts(prevKg, snapshot.cbamMassKg);
    if (alerts.length > 0) {
      await supabase.from("alerts").upsert(
        alerts.map((alert) => ({
          org_id: orgId,
          importer_id: importerId,
          type: "threshold",
          status: alert.status,
          message: `Importer crossed ${Math.round(alert.thresholdRatio * 100)}% threshold (${alert.currentKg.toFixed(
            3
          )} kg).`,
          payload: {
            year,
            previousKg: alert.previousKg,
            currentKg: alert.currentKg
          },
          dedupe_key: `threshold:${importerId}:${year}:${alert.status}:${alert.currentKg.toFixed(3)}`
        })),
        { onConflict: "dedupe_key", ignoreDuplicates: true }
      );
    }
  }
}

export async function processCustomsFile(
  input: ProcessCustomsFileInput
): Promise<ProcessCustomsFileResult> {
  const supabase = getSupabaseAdmin();

  const { data: customsFile, error: fileError } = await supabase
    .from("customs_files")
    .select("id, org_id, importer_id, storage_key")
    .eq("id", input.customsFileId)
    .single();

  if (fileError || !customsFile) {
    throw new HttpError(404, "Customs file not found.");
  }
  if (input.actor && input.actor.orgId !== customsFile.org_id) {
    throw new HttpError(403, "Cannot process file from another organization.");
  }

  const { data: mappingRow, error: mappingError } = await supabase
    .from("source_mappings")
    .select("mapping_json")
    .eq("customs_file_id", customsFile.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (mappingError || !mappingRow) {
    throw new HttpError(400, "No mapping assigned to customs file.");
  }

  const mapping = assertValidMapping(mappingRow.mapping_json);
  const { data: sourceFile, error: sourceError } = await supabase.storage
    .from(env.SUPABASE_STORAGE_BUCKET_CUSTOMS)
    .download(customsFile.storage_key);

  if (sourceError || !sourceFile) {
    throw new HttpError(500, "Failed to download customs file from storage.", sourceError);
  }

  const text = await sourceFile.text();
  const parsed = parseAndNormalizeCsv(text, mapping);
  if (parsed.errors.length > 0) {
    await supabase
      .from("customs_files")
      .update({
        status: "failed",
        validation_errors: parsed.errors,
        processed_at: new Date().toISOString()
      })
      .eq("id", customsFile.id);

    await recordAuditEvent({
      orgId: customsFile.org_id,
      userId: input.actor?.id ?? null,
      importerId: customsFile.importer_id,
      action: "customs_file.process_failed",
      meta: { customsFileId: customsFile.id, errorCount: parsed.errors.length }
    });

    return {
      customsFileId: customsFile.id,
      importerId: customsFile.importer_id,
      processedRows: 0,
      errorCount: parsed.errors.length,
      status: "failed"
    };
  }

  const { data: rulesRaw, error: rulesError } = await supabase
    .from("cbam_cn_rules")
    .select("id, cn_code_pattern, match_type, active, effective_from, effective_to, category, change_reason")
    .eq("active", true);

  if (rulesError) {
    throw new HttpError(500, "Failed to load CBAM rule set.", rulesError);
  }

  const rules = mapRules(rulesRaw ?? []);
  const processedRows = parsed.rows.map((row) => {
    const rule = matchCbamRule(row.cnCode, row.declarationDate, rules);
    return {
      org_id: customsFile.org_id,
      importer_id: customsFile.importer_id,
      customs_file_id: customsFile.id,
      importer_eori: row.importerEori,
      declaration_date: row.declarationDate.toISOString().slice(0, 10),
      cn_code: row.cnCode,
      origin_country: row.originCountry,
      net_mass_kg: row.netMassKg,
      procedure_code: row.procedureCode,
      cbam_scope: Boolean(rule),
      cbam_rule_id: rule?.id ?? null,
      source_row_number: row.sourceRowNumber
    };
  });

  await supabase.from("import_lines").delete().eq("customs_file_id", customsFile.id);

  const chunkSize = 1000;
  for (let i = 0; i < processedRows.length; i += chunkSize) {
    const chunk = processedRows.slice(i, i + chunkSize);
    const { error } = await supabase.from("import_lines").insert(chunk);
    if (error) {
      throw new HttpError(500, "Failed to write import lines.", error);
    }
  }

  const years = [...new Set(parsed.rows.map((row) => row.declarationDate.getUTCFullYear()))];
  await upsertThresholdAndAlerts(customsFile.importer_id, customsFile.org_id, years);

  await supabase
    .from("customs_files")
    .update({
      status: "processed",
      validation_errors: [],
      processed_at: new Date().toISOString()
    })
    .eq("id", customsFile.id);

  await recordAuditEvent({
    orgId: customsFile.org_id,
    userId: input.actor?.id ?? null,
    importerId: customsFile.importer_id,
    action: "customs_file.processed",
    meta: {
      customsFileId: customsFile.id,
      processedRows: processedRows.length,
      years
    }
  });

  return {
    customsFileId: customsFile.id,
    importerId: customsFile.importer_id,
    processedRows: processedRows.length,
    errorCount: 0,
    status: "processed"
  };
}
