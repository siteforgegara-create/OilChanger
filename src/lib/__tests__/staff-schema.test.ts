import { describe, expect, it } from "vitest";
import { createStaffSchema } from "@/lib/staff-schema";

describe("createStaffSchema", () => {
  it("accepts a mechanic with matching passwords", () => {
    const result = createStaffSchema.safeParse({
      shopId: "shop_1",
      locale: "ru",
      name: "Mechanic One",
      email: "mechanic@example.com",
      password: "password123",
      confirmPassword: "password123",
      role: "MECHANIC",
    });

    expect(result.success).toBe(true);
  });

  it("rejects shop owner role", () => {
    const result = createStaffSchema.safeParse({
      shopId: "shop_1",
      locale: "ru",
      name: "Owner Two",
      email: "owner2@example.com",
      password: "password123",
      confirmPassword: "password123",
      role: "SHOP_OWNER",
    });

    expect(result.success).toBe(false);
  });

  it("rejects password mismatch", () => {
    const result = createStaffSchema.safeParse({
      shopId: "shop_1",
      locale: "ru",
      name: "Admin One",
      email: "admin@example.com",
      password: "password123",
      confirmPassword: "different123",
      role: "BRANCH_ADMIN",
    });

    expect(result.success).toBe(false);
  });
});
