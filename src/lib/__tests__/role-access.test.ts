import { describe, expect, it } from "vitest";
import type { UserRole } from "@prisma/client";
import { canAccessAppRoute, routesForRole, type AppRouteKey } from "@/lib/role-access";

const expectedRoutesByRole = {
  PLATFORM_OWNER: ["admin"],
  SHOP_OWNER: ["branches", "customers", "dashboard", "finance", "inventory", "library", "notifications", "sales", "settings", "staff"],
  BRANCH_ADMIN: ["customers", "dashboard", "finance", "inventory", "library", "sales", "settings"],
  MECHANIC: ["customers", "dashboard", "inventory", "library", "sales"],
} as const satisfies Record<UserRole, readonly AppRouteKey[]>;

describe("role access smoke matrix", () => {
  it.each(Object.entries(expectedRoutesByRole) as Array<[UserRole, readonly AppRouteKey[]]>)(
    "returns the expected routes for %s",
    (role, expectedRoutes) => {
      expect(routesForRole(role)).toEqual(expectedRoutes);
    },
  );

  it("keeps sensitive management routes owner-only", () => {
    expect(canAccessAppRoute("SHOP_OWNER", "staff")).toBe(true);
    expect(canAccessAppRoute("BRANCH_ADMIN", "staff")).toBe(false);
    expect(canAccessAppRoute("MECHANIC", "staff")).toBe(false);
    expect(canAccessAppRoute("BRANCH_ADMIN", "notifications")).toBe(false);
    expect(canAccessAppRoute("MECHANIC", "finance")).toBe(false);
  });

  it("keeps platform administration separate from tenant operations", () => {
    expect(canAccessAppRoute("PLATFORM_OWNER", "admin")).toBe(true);
    expect(canAccessAppRoute("PLATFORM_OWNER", "dashboard")).toBe(false);
    expect(canAccessAppRoute("SHOP_OWNER", "admin")).toBe(false);
  });
});
