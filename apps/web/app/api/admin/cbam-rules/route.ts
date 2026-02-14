import { requireActor } from "@/lib/auth";
import { recordAuditEvent } from "@/lib/audit";
import { HttpError, jsonError, jsonOk, readJsonBody } from "@/lib/http";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { CbamRuleBody } from "@/types/contracts";

function assertDate(raw: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw new HttpError(400, "Date fields must use YYYY-MM-DD format.");
  }
  return raw;
}

export async function GET(request: Request) {
  try {
    const actor = await requireActor(request, ["org_admin", "broker_user", "client_viewer"]);
    const activeParam = new URL(request.url).searchParams.get("active");
    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("cbam_cn_rules")
      .select(
        "id, cn_code_pattern, match_type, category, active, effective_from, effective_to, change_reason, version_label, created_at"
      )
      .order("effective_from", { ascending: false });
    if (activeParam === "true") {
      query = query.eq("active", true);
    }
    const { data, error } = await query;
    if (error) throw error;

    await recordAuditEvent({
      orgId: actor.orgId,
      userId: actor.id,
      action: "cbam_rules.read",
      meta: { count: data?.length ?? 0 }
    });

    return jsonOk(data ?? []);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireActor(request, ["org_admin"]);
    const body = await readJsonBody<CbamRuleBody>(request);
    if (!body.cnCodePattern?.trim()) throw new HttpError(400, "cnCodePattern is required.");
    if (!body.category?.trim()) throw new HttpError(400, "category is required.");
    if (body.matchType !== "exact" && body.matchType !== "prefix") {
      throw new HttpError(400, "matchType must be exact or prefix.");
    }
    const effectiveFrom = assertDate(body.effectiveFrom);
    const effectiveTo = body.effectiveTo ? assertDate(body.effectiveTo) : null;

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("cbam_cn_rules")
      .insert({
        cn_code_pattern: body.cnCodePattern.trim().toUpperCase(),
        match_type: body.matchType,
        category: body.category.trim(),
        active: body.active ?? true,
        effective_from: effectiveFrom,
        effective_to: effectiveTo,
        change_reason: body.changeReason ?? null,
        version_label: body.versionLabel ?? "v1",
        created_by: actor.id
      })
      .select(
        "id, cn_code_pattern, match_type, category, active, effective_from, effective_to, change_reason, version_label"
      )
      .single();
    if (error || !data) {
      throw new HttpError(500, "Failed to create CBAM rule.", error);
    }

    await recordAuditEvent({
      orgId: actor.orgId,
      userId: actor.id,
      action: "cbam_rules.created",
      meta: { ruleId: data.id, cnCodePattern: data.cn_code_pattern }
    });

    return jsonOk(data, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
