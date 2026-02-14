import { requireActor } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { processCustomsFile } from "@/lib/import-processing";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireActor(request, ["org_admin", "broker_user"]);
    const params = await context.params;
    const result = await processCustomsFile({
      customsFileId: params.id,
      actor: { id: actor.id, orgId: actor.orgId }
    });
    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}
