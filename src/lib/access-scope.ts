export type AuthScope = {
  tenantId: string;
  countryCode: string;
  shopIds: readonly string[];
  isTenantWide: boolean;
};

export type TenantWhere = {
  tenantId: string;
};

export type CountryTenantWhere = TenantWhere & {
  countryCode: string;
};

export type ShopScopedWhere = CountryTenantWhere & {
  shopId?: { in: readonly string[] };
};

export function tenantWhere(scope: AuthScope): TenantWhere {
  return { tenantId: scope.tenantId };
}

export function countryTenantWhere(scope: AuthScope): CountryTenantWhere {
  return {
    tenantId: scope.tenantId,
    countryCode: scope.countryCode,
  };
}

export function shopScopedWhere(scope: AuthScope): ShopScopedWhere {
  const where: ShopScopedWhere = countryTenantWhere(scope);

  if (!scope.isTenantWide) {
    return {
      ...where,
      shopId: { in: scope.shopIds },
    };
  }

  return where;
}
