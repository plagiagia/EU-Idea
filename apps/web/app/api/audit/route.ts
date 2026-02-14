import { requireActor } from "@/lib/auth";
import { jsonError, jsonOk, parseInteger } from "@/lib/http";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    const actor = await requireActor(request, ["org_admin", "broker_user", "client_viewer"]);
    const url = new URL(request.url);
    const importerId = url.searchParams.get("importer_id");
    const limit = parseInteger(url.searchParams.get("limit"), 100, { min: 1, max: 500 });

    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("audit_events")
      .select("id, importer_id, user_id, action, meta, at")
      .eq("org_id", actor.orgId)
      .order("at", { ascending: false })
      .limit(limit);
    if (importerId) {
      query = query.eq("importer_id", importerId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return jsonOk(data ?? []);
  } catch (error) {
    return jsonError(error);
  }
}
