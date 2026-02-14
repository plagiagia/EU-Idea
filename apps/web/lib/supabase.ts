import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireEnv } from "./env";

type Database = any;

let adminClient: SupabaseClient<Database> | null = null;

export function getSupabaseAdmin(): SupabaseClient<Database> {
  if (adminClient) {
    return adminClient;
  }

  adminClient = createClient<Database>(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  );
  return adminClient;
}
