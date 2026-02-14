import type { Role } from "@cbam/domain";
import { HttpError } from "./http";
import { getSupabaseAdmin } from "./supabase";

export interface Actor {
  id: string;
  orgId: string;
  role: Role;
  email: string;
}

function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") {
    return null;
  }
  return token;
}

async function resolveUserId(request: Request): Promise<string | null> {
  const devHeaderId = request.headers.get("x-dev-user-id");
  if (devHeaderId) {
    return devHeaderId;
  }

  const token = getBearerToken(request);
  if (!token) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return null;
  }
  return data.user.id;
}

export async function requireActor(request: Request, allowedRoles?: Role[]): Promise<Actor> {
  const userId = await resolveUserId(request);
  if (!userId) {
    throw new HttpError(401, "Unauthorized. Provide a bearer token or x-dev-user-id.");
  }

  const supabase = getSupabaseAdmin();
  const { data: user, error } = await supabase
    .from("users")
    .select("id, org_id, role, email")
    .eq("id", userId)
    .single();

  if (error || !user) {
    throw new HttpError(401, "Authenticated identity has no workspace user record.");
  }

  const actor: Actor = {
    id: user.id,
    orgId: user.org_id,
    role: user.role,
    email: user.email
  };

  if (allowedRoles && !allowedRoles.includes(actor.role)) {
    throw new HttpError(403, "Forbidden for current role.");
  }
  return actor;
}

export async function assertImporterAccess(actor: Actor, importerId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("importers")
    .select("id")
    .eq("id", importerId)
    .eq("org_id", actor.orgId)
    .single();
  if (error || !data) {
    throw new HttpError(404, "Importer not found in your organization.");
  }
}

export async function assertAuthAppAccess(
  actor: Actor,
  authAppId: string
): Promise<{ id: string; importer_id: string }> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("auth_apps")
    .select("id, importer_id, org_id")
    .eq("id", authAppId)
    .eq("org_id", actor.orgId)
    .single();
  if (error || !data) {
    throw new HttpError(404, "Authorisation app not found in your organization.");
  }
  return { id: data.id, importer_id: data.importer_id };
}
