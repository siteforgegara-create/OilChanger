import { describe, expect, it } from "vitest";
import { buildTenantAiUsageSummary } from "@/lib/platform-admin-ai";

describe("platform admin AI usage summary", () => {
  it("uses the tenant subscription limit when present", () => {
    expect(
      buildTenantAiUsageSummary({
        tenantId: "tenant_1",
        plan: "PRO",
        subscriptionLimitMinorUsd: 1500,
        usedMinorUsd: 400,
      }),
    ).toEqual({
      isOverLimit: false,
      limitMinorUsd: 1500,
      remainingMinorUsd: 1100,
      tenantId: "tenant_1",
      usedMinorUsd: 400,
    });
  });

  it("falls back to plan limits when subscription is missing", () => {
    expect(
      buildTenantAiUsageSummary({
        tenantId: "tenant_2",
        plan: "START",
        subscriptionLimitMinorUsd: null,
        usedMinorUsd: 250,
      }).limitMinorUsd,
    ).toBe(1000);
  });

  it("marks tenants over the monthly AI limit", () => {
    expect(
      buildTenantAiUsageSummary({
        tenantId: "tenant_3",
        plan: "START",
        subscriptionLimitMinorUsd: 1000,
        usedMinorUsd: 1200,
      }).isOverLimit,
    ).toBe(true);
  });
});
