import { computeThresholdSnapshot, type CanonicalImportLine } from "@cbam/domain";
import { assertImporterAccess, requireActor } from "@/lib/auth";
import { HttpError, jsonError, jsonOk, parseInteger } from "@/lib/http";
import { getSupabaseAdmin } from "@/lib/supabase";

function toCanonicalRows(rows: any[]): CanonicalImportLine[] {
  return rows.map((row, index) => ({
    importerEori: row.importer_eori,
    cnCode: row.cn_code,
    netMassKg: Number(row.net_mass_kg),
    originCountry: row.origin_country,
    declarationDate: new Date(`${row.declaration_date}T00:00:00.000Z`),
    procedureCode: row.procedure_code,
    cbamScope: Boolean(row.cbam_scope),
    sourceRowNumber: row.source_row_number ?? index + 1
  }));
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireActor(request, ["org_admin", "broker_user", "client_viewer"]);
    const params = await context.params;
    const importerId = params.id;
    await assertImporterAccess(actor, importerId);

    const year = parseInteger(new URL(request.url).searchParams.get("year"), new Date().getUTCFullYear(), {
      min: 2024,
      max: 2100
    });

    const supabase = getSupabaseAdmin();
    const { data: snapshot } = await supabase
      .from("threshold_snapshots")
      .select("year, cbam_mass_kg, threshold_kg, status, last_computed_at")
      .eq("importer_id", importerId)
      .eq("year", year)
      .maybeSingle();

    if (snapshot) {
      return jsonOk(snapshot);
    }

    const { data: lines, error: linesError } = await supabase
      .from("import_lines")
      .select(
        "importer_eori, cn_code, net_mass_kg, origin_country, declaration_date, procedure_code, cbam_scope, source_row_number"
      )
      .eq("importer_id", importerId)
      .gte("declaration_date", `${year}-01-01`)
      .lt("declaration_date", `${year + 1}-01-01`);

    if (linesError) {
      throw new HttpError(500, "Failed to calculate threshold from import lines.", linesError);
    }

    const computed = computeThresholdSnapshot(toCanonicalRows(lines ?? []), year);
    return jsonOk({
      year: computed.year,
      cbam_mass_kg: computed.cbamMassKg,
      threshold_kg: computed.thresholdKg,
      status: computed.status,
      last_computed_at: null
    });
  } catch (error) {
    return jsonError(error);
  }
}
