import { requireActor } from "@/lib/auth";
import { recordAuditEvent } from "@/lib/audit";
import { HttpError, jsonError, jsonOk, readJsonBody } from "@/lib/http";
import { getSupabaseAdmin } from "@/lib/supabase";

interface UpsertUserBody {
  id: string;
  email: string;
  role: "org_admin" | "broker_user" | "client_viewer";
}

const validRoles = new Set(["org_admin", "broker_user", "client_viewer"]);

export async function GET(request: Request) {
  try {
    const actor = await requireActor(request, ["org_admin", "broker_user"]);
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("users")
      .select("id, email, role, created_at")
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
    const actor = await requireActor(request, ["org_admin"]);
    const body = await readJsonBody<UpsertUserBody>(request);
    if (!body.id?.trim()) throw new HttpError(400, "id is required.");
    if (!body.email?.trim()) throw new HttpError(400, "email is required.");
    if (!body.role || !validRoles.has(body.role)) {
      throw new HttpError(400, "role must be org_admin | broker_user | client_viewer.");
    }

    const supabase = getSupabaseAdmin();
    const { data: existingUser } = await supabase
      .from("users")
      .select("id, org_id")
      .eq("id", body.id)
      .maybeSingle();
    if (existingUser && existingUser.org_id !== actor.orgId) {
      throw new HttpError(409, "User is already assigned to a different organization.");
    }

    const { data, error } = await supabase
      .from("users")
      .upsert(
        {
          id: body.id,
          org_id: actor.orgId,
          email: body.email.trim().toLowerCase(),
          role: body.role
        },
        { onConflict: "id" }
      )
      .select("id, email, role, created_at")
      .single();
    if (error || !data) {
      throw new HttpError(500, "Failed to upsert user role.", error);
    }

    await recordAuditEvent({
      orgId: actor.orgId,
      userId: actor.id,
      action: "user.role_upserted",
      meta: {
        targetUserId: data.id,
        role: data.role
      }
    });

    return jsonOk(data);
  } catch (error) {
    return jsonError(error);
  }
}
