export type PlanCode = "START" | "PRO" | "PREMIUM";

export type SubscriptionPlanLimits = {
  aiMonthlyLimitMinorUsd: number;
  maxShops: number;
  maxStaff: number;
};

export const SUBSCRIPTION_PLAN_LIMITS = {
  START: {
    aiMonthlyLimitMinorUsd: 1000,
    maxShops: 1,
    maxStaff: 2,
  },
  PRO: {
    aiMonthlyLimitMinorUsd: 1000,
    maxShops: 5,
    maxStaff: 10,
  },
  PREMIUM: {
    aiMonthlyLimitMinorUsd: 1000,
    maxShops: 5,
    maxStaff: 10,
  },
} as const satisfies Record<PlanCode, SubscriptionPlanLimits>;

export function getSubscriptionPlanLimits(plan: string): SubscriptionPlanLimits {
  return isPlanCode(plan) ? SUBSCRIPTION_PLAN_LIMITS[plan] : SUBSCRIPTION_PLAN_LIMITS.START;
}

export function isPlanCode(value: string): value is PlanCode {
  return value === "START" || value === "PRO" || value === "PREMIUM";
}
