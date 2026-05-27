import { describe, expect, it } from "vitest";
import { loginSchema } from "@/lib/login-schema";

describe("loginSchema", () => {
  it("accepts a valid email and password", () => {
    expect(
      loginSchema.safeParse({
        email: "owner@example.com",
        password: "strong-pass",
        remember: true,
      }).success,
    ).toBe(true);
  });

  it("rejects invalid email addresses", () => {
    expect(
      loginSchema.safeParse({
        email: "owner",
        password: "strong-pass",
      }).success,
    ).toBe(false);
  });

  it("rejects short passwords", () => {
    expect(
      loginSchema.safeParse({
        email: "owner@example.com",
        password: "short",
      }).success,
    ).toBe(false);
  });
});
