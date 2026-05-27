import { describe, expect, it } from "vitest";
import { inventoryProductSchema } from "@/lib/inventory-product-schema";

const baseInput = {
  shopId: "cm00000000000000000000000",
  locale: "ru",
  category: "ENGINE_OIL",
  name: "Helix Ultra 5W-30",
  baseUnit: "LITER",
  quantity: "20.5",
  minQuantity: "5",
  purchasePrice: "12.50",
  salePrice: "18",
  servicePrice: "20",
};

describe("inventoryProductSchema", () => {
  it("accepts product stock input with minor-unit compatible prices", () => {
    expect(inventoryProductSchema.safeParse(baseInput).success).toBe(true);
  });

  it("rejects invalid money input", () => {
    expect(inventoryProductSchema.safeParse({ ...baseInput, salePrice: "18.999" }).success).toBe(false);
  });

  it("rejects invalid quantities", () => {
    expect(inventoryProductSchema.safeParse({ ...baseInput, quantity: "-1" }).success).toBe(false);
  });
});
