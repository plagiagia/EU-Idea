import Stripe from "stripe";
import { env, requireEnv } from "./env";
import type { PlanId } from "./quotas";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (stripeClient) {
    return stripeClient;
  }
  stripeClient = new Stripe(requireEnv("STRIPE_SECRET_KEY"));
  return stripeClient;
}

export function getPriceIdForPlan(plan: PlanId): string {
  if (plan === "starter") return requireEnv("STRIPE_PRICE_STARTER");
  if (plan === "broker") return requireEnv("STRIPE_PRICE_BROKER");
  return requireEnv("STRIPE_PRICE_SCALE");
}

export function getPlanFromPriceId(priceId: string | null | undefined): PlanId | null {
  if (!priceId) return null;
  if (env.STRIPE_PRICE_STARTER && priceId === env.STRIPE_PRICE_STARTER) return "starter";
  if (env.STRIPE_PRICE_BROKER && priceId === env.STRIPE_PRICE_BROKER) return "broker";
  if (env.STRIPE_PRICE_SCALE && priceId === env.STRIPE_PRICE_SCALE) return "scale";
  return null;
}
