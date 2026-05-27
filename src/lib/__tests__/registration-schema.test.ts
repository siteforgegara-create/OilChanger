import { describe, expect, it } from "vitest";
import { registerShopSchema } from "@/lib/registration-schema";

describe("registerShopSchema", () => {
  it("accepts the required Azerbaijan shop registration fields", () => {
    expect(
      registerShopSchema.safeParse({
        shopName: "Baku Oil Service",
        ownerName: "Ali Mammadov",
        email: "owner@example.com",
        password: "strong-pass",
        confirmPassword: "strong-pass",
        countryCode: "AZ",
      }).success,
    ).toBe(true);
  });

  it("rejects unsupported countries for MVP registration", () => {
    expect(
      registerShopSchema.safeParse({
        shopName: "Other Oil Service",
        ownerName: "Owner",
        email: "owner@example.com",
        password: "strong-pass",
        confirmPassword: "strong-pass",
        countryCode: "TR",
      }).success,
    ).toBe(false);
  });

  it("rejects mismatched password confirmation", () => {
    expect(
      registerShopSchema.safeParse({
        shopName: "Baku Oil Service",
        ownerName: "Ali Mammadov",
        email: "owner@example.com",
        password: "strong-pass",
        confirmPassword: "another-pass",
        countryCode: "AZ",
      }).success,
    ).toBe(false);
  });
});
