import { describe, expect, it } from "vitest";
import { buildTenantPlanUpdate } from "@/lib/platform-admin-plan";

describe("platform admin plan updates", () => {
  it("builds a Pro plan update with subscription limits", () => {
    expect(buildTenantPlanUpdate("PRO")).toEqual({
      aiMonthlyLimitMinorUsd: 1000,
      maxShops: 5,
      maxStaff: 10,
      plan: "PRO",
    });
  });

  it("builds a Start plan update with MVP limits", () => {
    expect(buildTenantPlanUpdate("START")).toEqual({
      aiMonthlyLimitMinorUsd: 1000,
      maxShops: 1,
      maxStaff: 2,
      plan: "START",
    });
  });
});
