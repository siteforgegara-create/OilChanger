import { describe, expect, it } from "vitest";
import { calculateServiceSubtotalMinor, serviceLabel, serviceTranslationKey, type ServiceItemKey } from "@/lib/order-services";

describe("order service helpers", () => {
  it("calculates service subtotal in integer minor units", () => {
    const selected = new Set<ServiceItemKey>(["engineOilChange", "oilFilterChange"]);

    expect(calculateServiceSubtotalMinor(selected)).toBe(2000);
  });

  it("maps service keys to stable descriptions and translation keys", () => {
    expect(serviceLabel("engineOilChange")).toBe("Engine oil change labor");
    expect(serviceTranslationKey("Engine oil change labor")).toBe("order.services.engineOilChange");
  });
});
