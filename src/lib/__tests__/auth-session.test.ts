import { describe, expect, it } from "vitest";
import { createSessionToken, verifySessionToken, type AuthSessionPayload } from "@/lib/auth-session";

const payload: AuthSessionPayload = {
  userId: "user_1",
  role: "SHOP_OWNER",
  tenantId: "tenant_1",
  shopId: "shop_1",
  countryCode: "AZ",
  exp: 2_000,
};

describe("auth session tokens", () => {
  it("verifies a token signed with the same secret", () => {
    const token = createSessionToken(payload, "secret");

    expect(verifySessionToken(token, "secret", 1_000)).toEqual(payload);
  });

  it("rejects tampered tokens", () => {
    const token = createSessionToken(payload, "secret");
    const [, signature] = token.split(".");
    const tamperedPayload = Buffer.from(JSON.stringify({ ...payload, tenantId: "tenant_2" }), "utf8").toString(
      "base64url",
    );
    const tampered = `${tamperedPayload}.${signature}`;

    expect(verifySessionToken(tampered, "secret", 1_000)).toBeNull();
  });

  it("rejects expired tokens", () => {
    const token = createSessionToken(payload, "secret");

    expect(verifySessionToken(token, "secret", 3_000)).toBeNull();
  });
});
