"use server";

import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth-session";
import { createBranchSchema } from "@/lib/branch-schema";
import { prisma } from "@/lib/prisma";
import { canAccessAppRoute } from "@/lib/role-access";
import { getSubscriptionPlanLimits } from "@/lib/subscription-plans";

export async function createBranchAction(formData: FormData) {
  const session = await getAuthSession();
  const fallbackLocale = safeLocale(formData.get("locale"));

  if (!session) {
    redirect("/login?locale=ru");
  }

  if (!canAccessAppRoute(session.role, "branches")) {
    redirect(`/dashboard?locale=${fallbackLocale}`);
  }

  const parsed = createBranchSchema.safeParse({
    locale: formData.get("locale"),
    name: formData.get("name"),
    address: formData.get("address"),
  });

  if (!parsed.success) {
    redirect(branchRedirect(fallbackLocale, "branch.error.validation"));
  }

  const input = parsed.data;
  const tenant = await prisma.tenant.findFirst({
    where: {
      id: session.tenantId,
      countryCode: session.countryCode,
    },
    select: {
      id: true,
      plan: true,
      subscription: {
        select: {
          maxShops: true,
        },
      },
      shops: {
        where: {
          isActive: true,
        },
        select: {
          id: true,
        },
      },
    },
  });

  if (!tenant) {
    redirect("/login?locale=ru");
  }

  const maxShops = tenant.subscription?.maxShops ?? getSubscriptionPlanLimits(tenant.plan).maxShops;

  if (tenant.shops.length >= maxShops) {
    redirect(branchRedirect(input.locale, "branch.error.limit"));
  }

  const created = await prisma.$transaction(async (tx) => {
    const shop = await tx.shop.create({
      data: {
        tenantId: tenant.id,
        countryCode: session.countryCode,
        name: input.name,
        address: input.address && input.address.length > 0 ? input.address : undefined,
        timezone: "Asia/Baku",
        currency: "AZN",
        locale: input.locale,
      },
      select: {
        id: true,
      },
    });

    await tx.membership.create({
      data: {
        userId: session.userId,
        shopId: shop.id,
        role: "SHOP_OWNER",
      },
    });

    return shop;
  });

  redirect(`/branches?locale=${input.locale}&shopId=${created.id}`);
}

export async function deactivateBranchAction(formData: FormData) {
  const session = await getAuthSession();

  if (!session) {
    redirect("/login?locale=ru");
  }

  const locale = safeLocale(formData.get("locale"));
  const shopId = formData.get("shopId");

  if (!canAccessAppRoute(session.role, "branches") || typeof shopId !== "string") {
    redirect(`/dashboard?locale=${locale}`);
  }

  const activeShopCount = await prisma.shop.count({
    where: {
      tenantId: session.tenantId,
      countryCode: session.countryCode,
      isActive: true,
    },
  });

  if (activeShopCount <= 1) {
    redirect(branchRedirect(locale, "branch.error.lastBranch", shopId));
  }

  await prisma.shop.updateMany({
    where: {
      id: shopId,
      tenantId: session.tenantId,
      countryCode: session.countryCode,
      isActive: true,
    },
    data: {
      isActive: false,
    },
  });

  redirect(`/branches?locale=${locale}`);
}

function safeLocale(value: FormDataEntryValue | null): "az" | "ru" | "en" {
  return value === "az" || value === "ru" || value === "en" ? value : "az";
}

function branchRedirect(locale: "az" | "ru" | "en", errorKey: string, shopId?: string): string {
  const params = new URLSearchParams({
    locale,
    error: errorKey,
  });

  if (shopId) {
    params.set("shopId", shopId);
  }

  return `/branches?${params.toString()}`;
}
