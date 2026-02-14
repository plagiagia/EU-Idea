import { requireActor } from "@/lib/auth";
import { recordAuditEvent } from "@/lib/audit";
import { HttpError, jsonError, jsonOk, readJsonBody } from "@/lib/http";
import { getSupabaseAdmin } from "@/lib/supabase";

interface CreateImporterBody {
  legalName: string;
  eori: string;
  msEstablished?: string;
}

export async function GET(request: Request) {
  try {
    const actor = await requireActor(request, ["org_admin", "broker_user", "client_viewer"]);
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("importers")
      .select("id, legal_name, eori, ms_established, created_at")
      .eq("org_id", actor.orgId)
      .order("created_at", { ascending: false });
    if (error) throw error;

    return jsonOk(data ?? []);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireActor(request, ["org_admin", "broker_user"]);
    const body = await readJsonBody<CreateImporterBody>(request);
    if (!body.legalName?.trim()) throw new HttpError(400, "legalName is required.");
    if (!body.eori?.trim()) throw new HttpError(400, "eori is required.");

    const supabase = getSupabaseAdmin();
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("importer_quota")
      .eq("org_id", actor.orgId)
      .maybeSingle();
    const importerQuota = Number(subscription?.importer_quota ?? 1);

    const { count } = await supabase
      .from("importers")
      .select("id", { count: "exact", head: true })
      .eq("org_id", actor.orgId);
    const importerCount = Number(count ?? 0);
    if (importerCount >= importerQuota) {
      throw new HttpError(
        402,
        `Importer quota reached (${importerQuota}). Upgrade plan or remove an importer.`
      );
    }

    const { data, error } = await supabase
      .from("importers")
      .insert({
        org_id: actor.orgId,
        legal_name: body.legalName.trim(),
        eori: body.eori.trim().toUpperCase(),
        ms_established: body.msEstablished?.trim() ?? null
      })
      .select("id, legal_name, eori, ms_established, created_at")
      .single();
    if (error || !data) {
      throw new HttpError(500, "Failed to create importer workspace.", error);
    }

    await recordAuditEvent({
      orgId: actor.orgId,
      userId: actor.id,
      importerId: data.id,
      action: "importer.created",
      meta: { legalName: data.legal_name, eori: data.eori }
    });

    return jsonOk(data, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
