import { describe, expect, it } from "vitest";
import { createExpenseSchema } from "@/lib/expense-schema";

describe("createExpenseSchema", () => {
  it("accepts a valid manual expense", () => {
    const result = createExpenseSchema.safeParse({
      amount: "250.50",
      category: "Rent",
      comment: "May payment",
      locale: "ru",
      shopId: "cmshop12345678901234567890",
    });

    expect(result.success).toBe(true);
  });

  it("accepts comma money input", () => {
    const result = createExpenseSchema.safeParse({
      amount: "12,35",
      category: "Utilities",
      locale: "az",
      shopId: "cmshop12345678901234567890",
    });

    expect(result.success).toBe(true);
  });

  it("rejects zero amount", () => {
    const result = createExpenseSchema.safeParse({
      amount: "0",
      category: "Rent",
      locale: "en",
      shopId: "cmshop12345678901234567890",
    });

    expect(result.success).toBe(false);
  });

  it("rejects money with too many minor-unit digits", () => {
    const result = createExpenseSchema.safeParse({
      amount: "10.999",
      category: "Rent",
      locale: "en",
      shopId: "cmshop12345678901234567890",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a too-short category", () => {
    const result = createExpenseSchema.safeParse({
      amount: "10",
      category: "A",
      locale: "ru",
      shopId: "cmshop12345678901234567890",
    });

    expect(result.success).toBe(false);
  });
});
