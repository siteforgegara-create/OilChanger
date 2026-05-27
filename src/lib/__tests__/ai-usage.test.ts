import { describe, expect, it } from "vitest";
import { calculateAiBudgetStatus, currentAiUsageMonth } from "@/lib/ai-usage";

describe("currentAiUsageMonth", () => {
  it("formats the month in UTC", () => {
    expect(currentAiUsageMonth(new Date("2026-05-26T20:15:00.000Z"))).toBe("2026-05");
  });

  it("pads single-digit months", () => {
    expect(currentAiUsageMonth(new Date("2026-01-02T00:00:00.000Z"))).toBe("2026-01");
  });
});

describe("calculateAiBudgetStatus", () => {
  it("returns remaining budget and allows an affordable request", () => {
    expect(
      calculateAiBudgetStatus({
        estimatedRequestCostMinorUsd: 50,
        limitMinorUsd: 1000,
        usedMinorUsd: 300,
      }),
    ).toEqual({
      canSpendEstimatedRequest: true,
      limitMinorUsd: 1000,
      remainingMinorUsd: 700,
      usedMinorUsd: 300,
    });
  });

  it("does not allow a request that exceeds the remaining budget", () => {
    expect(
      calculateAiBudgetStatus({
        estimatedRequestCostMinorUsd: 100,
        limitMinorUsd: 1000,
        usedMinorUsd: 950,
      }).canSpendEstimatedRequest,
    ).toBe(false);
  });

  it("never returns negative remaining budget", () => {
    expect(
      calculateAiBudgetStatus({
        estimatedRequestCostMinorUsd: 1,
        limitMinorUsd: 1000,
        usedMinorUsd: 1200,
      }).remainingMinorUsd,
    ).toBe(0);
  });

  it("rejects non-minor-unit values", () => {
    expect(() =>
      calculateAiBudgetStatus({
        estimatedRequestCostMinorUsd: 0.5,
        limitMinorUsd: 1000,
        usedMinorUsd: 0,
      }),
    ).toThrow("minor-unit");
  });
});
