import { buildSubmissionPack } from "@cbam/domain";
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
    const authAppAccess = await assertAuthAppAccess(actor, authAppId);
    const supabase = getSupabaseAdmin();

    const { data: authApp, error: authAppError } = await supabase
      .from("auth_apps")
      .select("id, importer_id, status, notes, submitted_at")
      .eq("id", authAppId)
      .eq("org_id", actor.orgId)
      .single();
    if (authAppError || !authApp) {
      throw new HttpError(404, "Authorisation application not found.");
    }

    const { data: docs, error: docsError } = await supabase
      .from("documents")
      .select("id, doc_type, storage_key, sha256")
      .eq("auth_app_id", authAppId)
      .order("created_at", { ascending: true });
    if (docsError) {
      throw new HttpError(500, "Failed to load auth-app documents.", docsError);
    }

    const docPayload = [];
    for (const doc of docs ?? []) {
      const { data: file, error: downloadError } = await supabase.storage
        .from(env.SUPABASE_STORAGE_BUCKET_DOCS)
        .download(doc.storage_key);
      if (downloadError || !file) {
        throw new HttpError(500, "Failed to download document for submission pack.", {
          documentId: doc.id,
          error: downloadError
        });
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      docPayload.push({
        filename: doc.storage_key.split("/").at(-1) ?? `${doc.id}.bin`,
        contentType: "application/octet-stream",
        content: buffer,
        sha256: doc.sha256
      });
    }

    const pack = await buildSubmissionPack({
      importerId: authApp.importer_id,
      authApplicationId: authApp.id,
      generatedAt: new Date(),
      summary: {
        status: authApp.status,
        notes: authApp.notes ?? "",
        submittedAt: authApp.submitted_at ?? ""
      },
      documents: docPayload
    });

    const packKey = `${actor.orgId}/${authApp.importer_id}/${authApp.id}/submission-pack-${Date.now()}.zip`;
    const { error: uploadError } = await supabase.storage
      .from(env.SUPABASE_STORAGE_BUCKET_PACKS)
      .upload(packKey, pack.zipBuffer, {
        contentType: "application/zip",
        upsert: true
      });
    if (uploadError) {
      throw new HttpError(500, "Failed to upload submission pack.", uploadError);
    }

    await supabase
      .from("auth_apps")
      .update({
        pack_storage_key: packKey,
        updated_by: actor.id,
        updated_at: new Date().toISOString()
      })
      .eq("id", authApp.id);

    const { data: signedData } = await supabase.storage
      .from(env.SUPABASE_STORAGE_BUCKET_PACKS)
      .createSignedUrl(packKey, 60 * 15);

    await recordAuditEvent({
      orgId: actor.orgId,
      userId: actor.id,
      importerId: authAppAccess.importer_id,
      action: "auth_app.pack_generated",
      meta: {
        authAppId,
        packageSha256: pack.packageSha256,
        manifestSha256: pack.manifestSha256
      }
    });

    return jsonOk({
      authAppId,
      storageKey: packKey,
      packageSha256: pack.packageSha256,
      manifestSha256: pack.manifestSha256,
      signedUrl: signedData?.signedUrl ?? null
    });
  } catch (error) {
    return jsonError(error);
  }
}
