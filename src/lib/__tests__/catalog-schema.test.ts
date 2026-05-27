import { describe, expect, it } from "vitest";
import { vehicleCatalogLinkSchema, vehicleCatalogRecommendationSchema, vehicleCatalogSchema } from "@/lib/catalog-schema";

describe("vehicle catalog schemas", () => {
  it("accepts a valid catalog contribution", () => {
    const result = vehicleCatalogSchema.safeParse({
      locale: "ru",
      shopId: "cmpl1km3500043escgth4tjni",
      make: "Toyota",
      model: "Camry",
      generation: "XV70",
      yearFrom: "2018",
      yearTo: "2024",
      engineCode: "A25A",
      engineVolume: "2.5",
      fuelType: "Petrol",
      transmission: "AT",
      bodyType: "Sedan",
    });

    expect(result.success).toBe(true);
  });

  it("rejects an invalid year range", () => {
    const result = vehicleCatalogSchema.safeParse({
      locale: "ru",
      shopId: "cmpl1km3500043escgth4tjni",
      make: "Toyota",
      model: "Camry",
      yearFrom: "2024",
      yearTo: "2018",
      engineVolume: "",
    });

    expect(result.success).toBe(false);
  });

  it("accepts a valid oil recommendation", () => {
    const result = vehicleCatalogRecommendationSchema.safeParse({
      locale: "az",
      shopId: "cmpl1km3500043escgth4tjni",
      catalogId: "cmpl1km3500043escgth4tjni",
      fluidType: "ENGINE_OIL",
      viscosity: "5W-30",
      specification: "API SP",
      volumeLiters: "4.5",
      intervalKm: "8000",
      intervalMonths: "6",
      priority: "RECOMMENDED",
    });

    expect(result.success).toBe(true);
  });

  it("accepts a valid vehicle-to-catalog link payload", () => {
    const result = vehicleCatalogLinkSchema.safeParse({
      locale: "ru",
      orderId: "cmpl1km3500043escgth4tjni",
      catalogId: "cmpl1km3500043escgth4tjni",
    });

    expect(result.success).toBe(true);
  });
});
