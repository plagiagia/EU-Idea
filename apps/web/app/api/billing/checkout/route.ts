import { requireActor } from "@/lib/auth";
import { recordAuditEvent } from "@/lib/audit";
import { env } from "@/lib/env";
import { HttpError, jsonError, jsonOk, readJsonBody } from "@/lib/http";
import { getSupabaseAdmin } from "@/lib/supabase";
import { type PlanId, planQuotas } from "@/lib/quotas";
import { getPriceIdForPlan, getStripe } from "@/lib/stripe";
import type { BillingCheckoutBody } from "@/types/contracts";

const validPlans = new Set<PlanId>(["starter", "broker", "scale"]);

export async function POST(request: Request) {
  try {
    const actor = await requireActor(request, ["org_admin"]);
    const body = await readJsonBody<BillingCheckoutBody>(request);
    if (!body.plan || !validPlans.has(body.plan)) {
      throw new HttpError(400, "plan must be one of starter | broker | scale.");
    }

    const supabase = getSupabaseAdmin();
    const { data: org, error: orgError } = await supabase
      .from("orgs")
      .select("id, name, stripe_customer_id")
      .eq("id", actor.orgId)
      .single();
    if (orgError || !org) {
      throw new HttpError(404, "Organization not found.");
    }

    const stripe = getStripe();
    let customerId = org.stripe_customer_id as string | null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: org.name ?? undefined,
        email: actor.email,
        metadata: { orgId: actor.orgId }
      });
      customerId = customer.id;
      await supabase.from("orgs").update({ stripe_customer_id: customerId }).eq("id", actor.orgId);
    }

    const successUrl = body.successUrl ?? `${env.APP_BASE_URL}/dashboard?billing=success`;
    const cancelUrl = body.cancelUrl ?? `${env.APP_BASE_URL}/dashboard?billing=cancelled`;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: getPriceIdForPlan(body.plan), quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: actor.orgId,
      metadata: {
        orgId: actor.orgId,
        plan: body.plan,
        importerQuota: String(planQuotas[body.plan].importerQuota),
        lineQuota: String(planQuotas[body.plan].lineQuota)
      }
    });

    await recordAuditEvent({
      orgId: actor.orgId,
      userId: actor.id,
      action: "billing.checkout_created",
      meta: {
        sessionId: session.id,
        plan: body.plan
      }
    });

    return jsonOk({
      sessionId: session.id,
      url: session.url
    });
  } catch (error) {
    return jsonError(error);
  }
}
