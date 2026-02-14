import { assertImporterAccess, requireActor } from "@/lib/auth";
import { recordAuditEvent } from "@/lib/audit";
import { HttpError, jsonError, jsonOk, readJsonBody } from "@/lib/http";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { AuthAppBody } from "@/types/contracts";

const validStatuses = new Set(["draft", "submitted", "decision"]);

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireActor(request, ["org_admin", "broker_user"]);
    const params = await context.params;
    const importerId = params.id;
    await assertImporterAccess(actor, importerId);

    const body = await readJsonBody<AuthAppBody>(request);
    if (!body.status || !validStatuses.has(body.status)) {
      throw new HttpError(400, "status must be one of: draft | submitted | decision.");
    }

    const supabase = getSupabaseAdmin();
    const submittedAt = body.submittedAt ? new Date(body.submittedAt).toISOString() : null;

    let query = supabase
      .from("auth_apps")
      .insert({
        org_id: actor.orgId,
        importer_id: importerId,
        status: body.status,
        notes: body.notes ?? null,
        submitted_at: submittedAt,
        created_by: actor.id,
        updated_by: actor.id
      })
      .select("id, importer_id, status, notes, submitted_at, updated_at")
      .single();

    if (body.authAppId) {
      query = supabase
        .from("auth_apps")
        .update({
          status: body.status,
          notes: body.notes ?? null,
          submitted_at: submittedAt,
          updated_by: actor.id,
          updated_at: new Date().toISOString()
        })
        .eq("id", body.authAppId)
        .eq("org_id", actor.orgId)
        .eq("importer_id", importerId)
        .select("id, importer_id, status, notes, submitted_at, updated_at")
        .single();
    }

    const { data, error } = await query;
    if (error || !data) {
      throw new HttpError(500, "Failed to store authorisation application.", error);
    }

    await recordAuditEvent({
      orgId: actor.orgId,
      userId: actor.id,
      importerId,
      action: body.authAppId ? "auth_app.updated" : "auth_app.created",
      meta: { authAppId: data.id, status: data.status }
    });

    return jsonOk(data, { status: body.authAppId ? 200 : 201 });
  } catch (error) {
    return jsonError(error);
  }
}
