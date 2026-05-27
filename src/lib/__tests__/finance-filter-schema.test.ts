import { describe, expect, it } from "vitest";
import { financeFilterSchema } from "@/lib/finance-filter-schema";

describe("financeFilterSchema", () => {
  it("accepts a valid period and branch", () => {
    const result = financeFilterSchema.safeParse({
      dateFrom: "2026-05-01",
      dateTo: "2026-05-25",
      locale: "ru",
      shopId: "cmshop12345678901234567890",
    });

    expect(result.success).toBe(true);
  });

  it("accepts all shops", () => {
    const result = financeFilterSchema.safeParse({
      locale: "az",
      shopId: "all",
    });

    expect(result.success).toBe(true);
  });

  it("rejects an inverted date range", () => {
    const result = financeFilterSchema.safeParse({
      dateFrom: "2026-05-25",
      dateTo: "2026-05-01",
      locale: "en",
    });

    expect(result.success).toBe(false);
  });
});
