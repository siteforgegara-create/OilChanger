import type { UserRole } from "@prisma/client";

export type AppRouteKey =
  | "admin"
  | "branches"
  | "customers"
  | "dashboard"
  | "finance"
  | "inventory"
  | "library"
  | "notifications"
  | "sales"
  | "settings"
  | "staff";

const routeAccess: Record<AppRouteKey, readonly UserRole[]> = {
  admin: ["PLATFORM_OWNER"],
  branches: ["SHOP_OWNER"],
  customers: ["SHOP_OWNER", "BRANCH_ADMIN", "MECHANIC"],
  dashboard: ["SHOP_OWNER", "BRANCH_ADMIN", "MECHANIC"],
  finance: ["SHOP_OWNER", "BRANCH_ADMIN"],
  inventory: ["SHOP_OWNER", "BRANCH_ADMIN", "MECHANIC"],
  library: ["SHOP_OWNER", "BRANCH_ADMIN", "MECHANIC"],
  notifications: ["SHOP_OWNER"],
  sales: ["SHOP_OWNER", "BRANCH_ADMIN", "MECHANIC"],
  settings: ["SHOP_OWNER", "BRANCH_ADMIN"],
  staff: ["SHOP_OWNER"],
};

export function canAccessAppRoute(role: UserRole, route: AppRouteKey): boolean {
  return routeAccess[route].includes(role);
}

export function routesForRole(role: UserRole): AppRouteKey[] {
  return (Object.keys(routeAccess) as AppRouteKey[]).filter((route) => canAccessAppRoute(role, route));
}
