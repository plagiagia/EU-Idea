import { env } from "@/lib/env";
import { HttpError, jsonError, jsonOk } from "@/lib/http";
import { processCustomsFile } from "@/lib/import-processing";
import { getSupabaseAdmin } from "@/lib/supabase";

function assertCronSecret(request: Request): void {
  const auth = request.headers.get("authorization");
  const expected = env.CRON_SECRET;
  if (!expected) {
    throw new HttpError(500, "CRON_SECRET is not configured.");
  }
  if (auth !== `Bearer ${expected}`) {
    throw new HttpError(401, "Invalid cron authorization.");
  }
}

export async function POST(request: Request) {
  try {
    assertCronSecret(request);
    const supabase = getSupabaseAdmin();
    const { data: files, error } = await supabase
      .from("customs_files")
      .select("id, org_id")
      .eq("status", "mapped")
      .order("created_at", { ascending: true })
      .limit(20);
    if (error) throw error;

    const results: Array<{ id: string; status: string; processedRows?: number; error?: string }> = [];
    for (const file of files ?? []) {
      try {
        const processed = await processCustomsFile({
          customsFileId: file.id,
          actor: { id: null, orgId: file.org_id }
        });
        results.push({
          id: file.id,
          status: processed.status,
          processedRows: processed.processedRows
        });
      } catch (error) {
        results.push({
          id: file.id,
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }

    return jsonOk({
      queued: files?.length ?? 0,
      results
    });
  } catch (error) {
    return jsonError(error);
  }
}
