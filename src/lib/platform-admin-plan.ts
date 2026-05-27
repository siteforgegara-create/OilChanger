import type { PlanCode } from "@/lib/subscription-plans";
import { getSubscriptionPlanLimits } from "@/lib/subscription-plans";

export type TenantPlanUpdate = {
  aiMonthlyLimitMinorUsd: number;
  maxShops: number;
  maxStaff: number;
  plan: PlanCode;
};

export function buildTenantPlanUpdate(plan: PlanCode): TenantPlanUpdate {
  const limits = getSubscriptionPlanLimits(plan);

  return {
    aiMonthlyLimitMinorUsd: limits.aiMonthlyLimitMinorUsd,
    maxShops: limits.maxShops,
    maxStaff: limits.maxStaff,
    plan,
  };
}
