export type PlanId = "starter" | "broker" | "scale";

export interface PlanQuota {
  importerQuota: number;
  lineQuota: number;
}

export const planQuotas: Record<PlanId, PlanQuota> = {
  starter: { importerQuota: 1, lineQuota: 2_000 },
  broker: { importerQuota: 15, lineQuota: 40_000 },
  scale: { importerQuota: 50, lineQuota: 200_000 }
};
