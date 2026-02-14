import { requiredCanonicalFields, type SourceMapping } from "@cbam/domain";
import { requireActor } from "@/lib/auth";
import { recordAuditEvent } from "@/lib/audit";
import { HttpError, jsonError, jsonOk, readJsonBody } from "@/lib/http";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { MapImportBody } from "@/types/contracts";

function validateMapping(mapping: SourceMapping): void {
  for (const key of requiredCanonicalFields) {
    const value = mapping[key];
    if (!value || !String(value).trim()) {
      throw new HttpError(400, `mapping.${key} is required.`);
    }
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireActor(request, ["org_admin", "broker_user"]);
    const params = await context.params;
    const customsFileId = params.id;
    const body = await readJsonBody<MapImportBody>(request);
    if (!body.mapping) throw new HttpError(400, "mapping is required.");
    validateMapping(body.mapping);

    const supabase = getSupabaseAdmin();
    const { data: customsFile, error: fileError } = await supabase
      .from("customs_files")
      .select("id, importer_id, org_id")
      .eq("id", customsFileId)
      .eq("org_id", actor.orgId)
      .single();
    if (fileError || !customsFile) {
      throw new HttpError(404, "Customs file not found.");
    }

    const { data: mappingRow, error: mappingError } = await supabase
      .from("source_mappings")
      .upsert(
        {
          org_id: actor.orgId,
          importer_id: customsFile.importer_id,
          customs_file_id: customsFile.id,
          name: body.name ?? "default",
          mapping_json: body.mapping,
          created_by: actor.id,
          updated_by: actor.id,
          updated_at: new Date().toISOString()
        },
        { onConflict: "customs_file_id" }
      )
      .select("id, importer_id, customs_file_id, name, mapping_json")
      .single();
    if (mappingError || !mappingRow) {
      throw new HttpError(500, "Failed to store mapping.", mappingError);
    }

    await supabase.from("customs_files").update({ status: "mapped" }).eq("id", customsFile.id);

    await recordAuditEvent({
      orgId: actor.orgId,
      userId: actor.id,
      importerId: customsFile.importer_id,
      action: "customs_file.mapped",
      meta: { customsFileId, mappingId: mappingRow.id }
    });

    return jsonOk(mappingRow);
  } catch (error) {
    return jsonError(error);
  }
}
