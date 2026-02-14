import { randomUUID } from "node:crypto";
import { sha256 } from "@cbam/domain";
import { assertAuthAppAccess, requireActor } from "@/lib/auth";
import { recordAuditEvent } from "@/lib/audit";
import { env } from "@/lib/env";
import { HttpError, jsonError, jsonOk } from "@/lib/http";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireActor(request, ["org_admin", "broker_user"]);
    const params = await context.params;
    const authAppId = params.id;
    const authApp = await assertAuthAppAccess(actor, authAppId);

    const formData = await request.formData();
    const docType = String(formData.get("doc_type") ?? "evidence");
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      throw new HttpError(400, "file is required.");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const hash = sha256(buffer);
    const storageKey = `${actor.orgId}/${authApp.importer_id}/${authApp.id}/${Date.now()}-${randomUUID()}-${file.name}`;

    const supabase = getSupabaseAdmin();
    const { error: uploadError } = await supabase.storage
      .from(env.SUPABASE_STORAGE_BUCKET_DOCS)
      .upload(storageKey, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false
      });
    if (uploadError) {
      throw new HttpError(500, "Failed to upload document.", uploadError);
    }

    const { data: doc, error: insertError } = await supabase
      .from("documents")
      .insert({
        org_id: actor.orgId,
        importer_id: authApp.importer_id,
        auth_app_id: authApp.id,
        doc_type: docType,
        storage_key: storageKey,
        sha256: hash,
        uploaded_by: actor.id
      })
      .select("id, auth_app_id, doc_type, storage_key, sha256, created_at")
      .single();
    if (insertError || !doc) {
      throw new HttpError(500, "Failed to persist document metadata.", insertError);
    }

    await recordAuditEvent({
      orgId: actor.orgId,
      userId: actor.id,
      importerId: authApp.importer_id,
      action: "auth_app.document_uploaded",
      meta: { authAppId: authApp.id, documentId: doc.id, docType }
    });

    return jsonOk(doc, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
