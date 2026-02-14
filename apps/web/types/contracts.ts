import type { AuthAppStatus, RuleMatchType, SourceMapping } from "@cbam/domain";
import type { PlanId } from "@/lib/quotas";

export interface MapImportBody {
  mapping: SourceMapping;
  name?: string;
}

export interface AuthAppBody {
  authAppId?: string;
  status: AuthAppStatus;
  notes?: string;
  submittedAt?: string | null;
}

export interface CbamRuleBody {
  cnCodePattern: string;
  matchType: RuleMatchType;
  category: string;
  active?: boolean;
  effectiveFrom: string;
  effectiveTo?: string | null;
  changeReason?: string;
  versionLabel?: string;
}

export interface BillingCheckoutBody {
  plan: PlanId;
  successUrl?: string;
  cancelUrl?: string;
}
