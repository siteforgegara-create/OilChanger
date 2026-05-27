import { describe, expect, it } from "vitest";
import { createRetailSaleSchema } from "@/lib/retail-sale-schema";

describe("createRetailSaleSchema", () => {
  it("accepts a valid retail sale", () => {
    const result = createRetailSaleSchema.safeParse({
      customerId: "",
      locale: "ru",
      paymentMethod: "CASH",
      quantity: "4.5",
      shopId: "cmshop12345678901234567890",
      stockId: "cmstock1234567890123456789",
    });

    expect(result.success).toBe(true);
  });

  it("accepts a retail sale linked to a customer", () => {
    const result = createRetailSaleSchema.safeParse({
      customerId: "cmcust12345678901234567890",
      locale: "ru",
      paymentMethod: "CASH",
      quantity: "1",
      shopId: "cmshop12345678901234567890",
      stockId: "cmstock1234567890123456789",
    });

    expect(result.success).toBe(true);
  });

  it("rejects quantity with too many decimal places", () => {
    const result = createRetailSaleSchema.safeParse({
      locale: "az",
      paymentMethod: "CARD",
      quantity: "1.2345",
      shopId: "cmshop12345678901234567890",
      stockId: "cmstock1234567890123456789",
    });

    expect(result.success).toBe(false);
  });

  it("rejects zero quantity", () => {
    const result = createRetailSaleSchema.safeParse({
      locale: "en",
      paymentMethod: "CASH",
      quantity: "0",
      shopId: "cmshop12345678901234567890",
      stockId: "cmstock1234567890123456789",
    });

    expect(result.success).toBe(false);
  });

  it("rejects an invalid payment method", () => {
    const result = createRetailSaleSchema.safeParse({
      locale: "en",
      paymentMethod: "BITCOIN",
      quantity: "1",
      shopId: "cmshop12345678901234567890",
      stockId: "cmstock1234567890123456789",
    });

    expect(result.success).toBe(false);
  });
});
