import { buildDeadlineReminders } from "@/lib/deadlines";
import { env } from "@/lib/env";
import { HttpError, jsonError, jsonOk } from "@/lib/http";
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
    const now = new Date();
    const year = now.getUTCFullYear();

    const { data: importers, error } = await supabase.from("importers").select("id, org_id");
    if (error) throw error;

    let inserted = 0;
    for (const importer of importers ?? []) {
      const reminders = buildDeadlineReminders(now, year, 30);
      if (reminders.length === 0) continue;

      const payload = reminders.map((item) => ({
        org_id: importer.org_id,
        importer_id: importer.id,
        type: "deadline",
        status: null,
        message: `${item.message} ${item.daysRemaining} day(s) remaining.`,
        payload: item,
        dedupe_key: `deadline:${importer.id}:${item.code}:${item.daysRemaining}`
      }));

      const { error: upsertError } = await supabase
        .from("alerts")
        .upsert(payload, { onConflict: "dedupe_key", ignoreDuplicates: true });
      if (!upsertError) {
        inserted += payload.length;
      }
    }

    return jsonOk({
      importersScanned: importers?.length ?? 0,
      remindersAttempted: inserted
    });
  } catch (error) {
    return jsonError(error);
  }
}
