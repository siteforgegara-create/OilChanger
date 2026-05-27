import { describe, expect, it } from "vitest";
import { createBranchSchema, updateBranchSettingsSchema, updateTenantSettingsSchema } from "@/lib/branch-schema";

describe("createBranchSchema", () => {
  it("accepts a valid branch", () => {
    const result = createBranchSchema.safeParse({
      locale: "ru",
      name: "Main Service",
      address: "Baku",
    });

    expect(result.success).toBe(true);
  });

  it("accepts an empty optional address", () => {
    const result = createBranchSchema.safeParse({
      locale: "az",
      name: "Filial 2",
      address: "",
    });

    expect(result.success).toBe(true);
  });

  it("rejects a short branch name", () => {
    const result = createBranchSchema.safeParse({
      locale: "en",
      name: "A",
    });

    expect(result.success).toBe(false);
  });

  it("accepts tenant settings without a logo", () => {
    const result = updateTenantSettingsSchema.safeParse({
      locale: "ru",
      name: "Baku Oil Service",
    });

    expect(result.success).toBe(true);
  });

  it("rejects a short tenant name", () => {
    const result = updateTenantSettingsSchema.safeParse({
      locale: "ru",
      name: "A",
    });

    expect(result.success).toBe(false);
  });

  it("accepts branch settings with coordinates", () => {
    const result = updateBranchSettingsSchema.safeParse({
      locale: "az",
      shopId: "cmshop12345678901234567890",
      name: "Nizami filial",
      address: "Baku",
      lat: "40.4093",
      lng: "49.8671",
    });

    expect(result.success).toBe(true);
  });
});
