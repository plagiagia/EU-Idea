import Stripe from "stripe";
import { env } from "@/lib/env";
import { jsonError, jsonOk } from "@/lib/http";
import { planQuotas } from "@/lib/quotas";
import { getPlanFromPriceId, getStripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase";
import { recordAuditEvent } from "@/lib/audit";

async function resolveOrgIdFromCustomer(customerId: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from("orgs").select("id").eq("stripe_customer_id", customerId).maybeSingle();
  return data?.id ?? null;
}

async function upsertSubscription(orgId: string, subscription: Stripe.Subscription): Promise<void> {
  const priceId = subscription.items.data[0]?.price?.id ?? null;
  const plan = getPlanFromPriceId(priceId);
  const quotas = plan ? planQuotas[plan] : { importerQuota: 1, lineQuota: 2000 };

  const supabase = getSupabaseAdmin();
  await supabase.from("subscriptions").upsert(
    {
      org_id: orgId,
      stripe_customer_id: String(subscription.customer),
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceId,
      status: subscription.status,
      importer_quota: quotas.importerQuota,
      line_quota: quotas.lineQuota,
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString()
    },
    { onConflict: "org_id" }
  );
}

export async function POST(request: Request) {
  try {
    const signature = request.headers.get("stripe-signature");
    if (!signature || !env.STRIPE_WEBHOOK_SECRET) {
      return jsonOk({ received: true, skipped: true });
    }

    const stripe = getStripe();
    const body = await request.text();
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET);
    } catch {
      return jsonError(new Error("Invalid stripe webhook signature."));
    }

    if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      const orgId = await resolveOrgIdFromCustomer(String(subscription.customer));
      if (orgId) {
        await upsertSubscription(orgId, subscription);
        await recordAuditEvent({
          orgId,
          userId: null,
          action: "billing.subscription_updated",
          meta: {
            subscriptionId: subscription.id,
            status: subscription.status
          }
        });
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const orgId = await resolveOrgIdFromCustomer(String(subscription.customer));
      if (orgId) {
        const supabase = getSupabaseAdmin();
        await supabase
          .from("subscriptions")
          .update({
            status: "canceled",
            updated_at: new Date().toISOString()
          })
          .eq("org_id", orgId);

        await recordAuditEvent({
          orgId,
          userId: null,
          action: "billing.subscription_cancelled",
          meta: { subscriptionId: subscription.id }
        });
      }
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const orgId = session.client_reference_id ?? (await resolveOrgIdFromCustomer(String(session.customer)));
      if (orgId && session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(String(session.subscription));
        await upsertSubscription(orgId, subscription);
      }
    }

    return jsonOk({ received: true });
  } catch (error) {
    return jsonError(error);
  }
}
