import { calculateAiBudgetStatus } from "@/lib/ai-usage";
import type { PlanCode } from "@/lib/subscription-plans";
import { getSubscriptionPlanLimits } from "@/lib/subscription-plans";

export type TenantAiUsageInput = {
  tenantId: string;
  plan: PlanCode;
  subscriptionLimitMinorUsd: number | null;
  usedMinorUsd: number;
};

export type TenantAiUsageSummary = {
  isOverLimit: boolean;
  limitMinorUsd: number;
  remainingMinorUsd: number;
  tenantId: string;
  usedMinorUsd: number;
};

export function buildTenantAiUsageSummary(input: TenantAiUsageInput): TenantAiUsageSummary {
  const fallbackLimit = getSubscriptionPlanLimits(input.plan).aiMonthlyLimitMinorUsd;
  const status = calculateAiBudgetStatus({
    estimatedRequestCostMinorUsd: 1,
    limitMinorUsd: input.subscriptionLimitMinorUsd ?? fallbackLimit,
    usedMinorUsd: input.usedMinorUsd,
  });

  return {
    isOverLimit: status.usedMinorUsd > status.limitMinorUsd,
    limitMinorUsd: status.limitMinorUsd,
    remainingMinorUsd: status.remainingMinorUsd,
    tenantId: input.tenantId,
    usedMinorUsd: status.usedMinorUsd,
  };
}
