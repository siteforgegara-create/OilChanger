import { describe, expect, it } from "vitest";
import { maskVin, normalizePlate, normalizeVin } from "@/lib/vehicle-identity";

describe("vehicle identity helpers", () => {
  it("normalizes VIN without blocking Q", () => {
    expect(normalizeVin(" jhm-q123-az ")).toBe("JHMQ123AZ");
  });

  it("normalizes license plates for search", () => {
    expect(normalizePlate("10-AA-777")).toBe("10AA777");
  });

  it("masks VIN for QR and shared history pages", () => {
    expect(maskVin("JHMQ123456789AZ01")).toBe("JHM***********Z01");
  });
});
