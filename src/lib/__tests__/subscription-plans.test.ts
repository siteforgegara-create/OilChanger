import { describe, expect, it } from "vitest";
import { getSubscriptionPlanLimits, isPlanCode, SUBSCRIPTION_PLAN_LIMITS } from "@/lib/subscription-plans";

describe("subscription plan limits", () => {
  it("keeps Start aligned with the MVP limits", () => {
    expect(SUBSCRIPTION_PLAN_LIMITS.START).toEqual({
      aiMonthlyLimitMinorUsd: 1000,
      maxShops: 1,
      maxStaff: 2,
    });
  });

  it("keeps Pro aligned with the agreed limits", () => {
    expect(SUBSCRIPTION_PLAN_LIMITS.PRO).toEqual({
      aiMonthlyLimitMinorUsd: 1000,
      maxShops: 5,
      maxStaff: 10,
    });
  });

  it("falls back to Start for unknown plan values", () => {
    expect(getSubscriptionPlanLimits("UNKNOWN")).toEqual(SUBSCRIPTION_PLAN_LIMITS.START);
  });

  it("narrows known plan codes", () => {
    expect(isPlanCode("PREMIUM")).toBe(true);
    expect(isPlanCode("ENTERPRISE")).toBe(false);
  });
});
