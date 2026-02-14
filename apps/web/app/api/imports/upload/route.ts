import { randomUUID } from "node:crypto";
import { sha256 } from "@cbam/domain";
import { assertImporterAccess, requireActor } from "@/lib/auth";
import { env } from "@/lib/env";
import { HttpError, jsonError, jsonOk } from "@/lib/http";
import { recordAuditEvent } from "@/lib/audit";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const actor = await requireActor(request, ["org_admin", "broker_user"]);
    const formData = await request.formData();
    const importerId = String(formData.get("importer_id") ?? "");
    const sourceFormat = String(formData.get("source_format") ?? "csv");
    const periodStart = formData.get("period_start") ? String(formData.get("period_start")) : null;
    const periodEnd = formData.get("period_end") ? String(formData.get("period_end")) : null;
    const file = formData.get("file");

    if (!importerId) throw new HttpError(400, "importer_id is required.");
    if (!file || !(file instanceof File)) throw new HttpError(400, "file is required.");
    await assertImporterAccess(actor, importerId);

    const supabase = getSupabaseAdmin();
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const hash = sha256(fileBuffer);
    const storageKey = `${actor.orgId}/${importerId}/${Date.now()}-${randomUUID()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from(env.SUPABASE_STORAGE_BUCKET_CUSTOMS)
      .upload(storageKey, fileBuffer, {
        contentType: file.type || "text/csv",
        upsert: false
      });
    if (uploadError) {
      throw new HttpError(500, "Failed to upload customs file.", uploadError);
    }

    const { data: customsFile, error: insertError } = await supabase
      .from("customs_files")
      .insert({
        org_id: actor.orgId,
        importer_id: importerId,
        source_format: sourceFormat,
        status: "uploaded",
        period_start: periodStart,
        period_end: periodEnd,
        storage_key: storageKey,
        sha256: hash,
        uploaded_by: actor.id,
        validation_errors: []
      })
      .select("id, importer_id, status, sha256, created_at")
      .single();

    if (insertError || !customsFile) {
      throw new HttpError(500, "Failed to persist customs file metadata.", insertError);
    }

    await recordAuditEvent({
      orgId: actor.orgId,
      userId: actor.id,
      importerId,
      action: "customs_file.uploaded",
      meta: {
        customsFileId: customsFile.id,
        sourceFormat,
        bytes: fileBuffer.byteLength
      }
    });

    return jsonOk(customsFile, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
