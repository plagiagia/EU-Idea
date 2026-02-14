import { assertImporterAccess, requireActor } from "@/lib/auth";
import { jsonError, jsonOk, parseInteger } from "@/lib/http";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireActor(request, ["org_admin", "broker_user", "client_viewer"]);
    const params = await context.params;
    const importerId = params.id;
    await assertImporterAccess(actor, importerId);

    const limit = parseInteger(new URL(request.url).searchParams.get("limit"), 100, { min: 1, max: 500 });
    const supabase = getSupabaseAdmin();
    const { data: alerts, error } = await supabase
      .from("alerts")
      .select("id, type, status, message, payload, created_at, resolved_at")
      .eq("importer_id", importerId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;

    return jsonOk(alerts ?? []);
  } catch (error) {
    return jsonError(error);
  }
}
