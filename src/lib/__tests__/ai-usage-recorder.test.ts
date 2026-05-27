import { describe, expect, it, vi } from "vitest";
import {
  AiUsageLimitExceededError,
  recordAiUsage,
  type AiUsageStore,
} from "@/lib/ai-usage-recorder";

function createStore(usedMinorUsd: number): AiUsageStore {
  return {
    createUsage: vi.fn(async () => ({ id: "usage_1" })),
    sumTenantUsage: vi.fn(async () => usedMinorUsd),
  };
}

describe("recordAiUsage", () => {
  it("records usage when the tenant has enough monthly budget", async () => {
    const store = createStore(200);

    await expect(
      recordAiUsage(
        {
          estimatedCostMinorUsd: 50,
          limitMinorUsd: 1000,
          month: "2026-05",
          purpose: "library_recommendation",
          shopId: "shop_1",
          tenantId: "tenant_1",
          userId: "user_1",
        },
        store,
      ),
    ).resolves.toEqual({ id: "usage_1" });

    expect(store.sumTenantUsage).toHaveBeenCalledWith({
      month: "2026-05",
      tenantId: "tenant_1",
    });
    expect(store.createUsage).toHaveBeenCalledWith({
      estimatedCostMinorUsd: 50,
      month: "2026-05",
      purpose: "library_recommendation",
      shopId: "shop_1",
      tenantId: "tenant_1",
      userId: "user_1",
    });
  });

  it("does not record usage when the monthly budget would be exceeded", async () => {
    const store = createStore(980);

    await expect(
      recordAiUsage(
        {
          estimatedCostMinorUsd: 50,
          limitMinorUsd: 1000,
          month: "2026-05",
          purpose: "library_recommendation",
          shopId: "shop_1",
          tenantId: "tenant_1",
          userId: "user_1",
        },
        store,
      ),
    ).rejects.toBeInstanceOf(AiUsageLimitExceededError);

    expect(store.createUsage).not.toHaveBeenCalled();
  });

  it("rejects non-minor-unit request costs", async () => {
    const store = createStore(0);

    await expect(
      recordAiUsage(
        {
          estimatedCostMinorUsd: 0.5,
          limitMinorUsd: 1000,
          purpose: "library_recommendation",
          shopId: "shop_1",
          tenantId: "tenant_1",
          userId: "user_1",
        },
        store,
      ),
    ).rejects.toThrow("minor-unit");
  });
});
