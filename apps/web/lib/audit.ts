import { getSupabaseAdmin } from "./supabase";

interface AuditEventInput {
  orgId: string;
  userId?: string | null;
  importerId?: string | null;
  action: string;
  meta?: Record<string, unknown>;
}

export async function recordAuditEvent(input: AuditEventInput): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase.from("audit_events").insert({
    org_id: input.orgId,
    user_id: input.userId ?? null,
    importer_id: input.importerId ?? null,
    action: input.action,
    meta: input.meta ?? {},
    at: new Date().toISOString()
  });
}
