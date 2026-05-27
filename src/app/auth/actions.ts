"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { loginSchema } from "@/lib/login-schema";
import { prisma } from "@/lib/prisma";
import { registerShopSchema } from "@/lib/registration-schema";
import { clearAuthSession, setAuthSession } from "@/lib/auth-session";
import { getSubscriptionPlanLimits } from "@/lib/subscription-plans";

export type AuthActionState = {
  errorKey?: string;
};

const DEFAULT_AUTH_STATE: AuthActionState = {};

export async function registerShopAction(_state: AuthActionState = DEFAULT_AUTH_STATE, formData: FormData) {
  const redirectLocale = safeRedirectLocale(formData.get("locale"));
  const parsed = registerShopSchema.safeParse({
    shopName: formData.get("shopName"),
    ownerName: formData.get("ownerName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    countryCode: formData.get("countryCode"),
  });

  if (!parsed.success) {
    return { errorKey: "auth.error.validation" };
  }

  const input = parsed.data;
  const normalizedEmail = input.email.toLowerCase();
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });

  if (existingUser) {
    return { errorKey: "auth.error.emailExists" };
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const startPlanLimits = getSubscriptionPlanLimits("START");

  const created = await prisma
    .$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          name: input.ownerName,
          passwordHash,
          role: "SHOP_OWNER",
          locale: redirectLocale,
        },
      });

      const tenant = await tx.tenant.create({
        data: {
          ownerUserId: user.id,
          countryCode: input.countryCode,
          name: input.shopName,
          logoUrl: input.logoUrl,
          plan: "START",
        },
      });

      const shop = await tx.shop.create({
        data: {
          tenantId: tenant.id,
          countryCode: input.countryCode,
          name: input.shopName,
          timezone: "Asia/Baku",
          currency: "AZN",
          locale: redirectLocale,
        },
      });

      await tx.membership.create({
        data: {
          userId: user.id,
          shopId: shop.id,
          role: "SHOP_OWNER",
        },
      });

      await tx.subscription.create({
        data: {
          tenantId: tenant.id,
          plan: "START",
          status: "TRIALING",
          maxShops: startPlanLimits.maxShops,
          maxStaff: startPlanLimits.maxStaff,
          aiMonthlyLimitMinorUsd: startPlanLimits.aiMonthlyLimitMinorUsd,
        },
      });

      return { user, tenant, shop };
    })
    .catch((error: unknown) => ({ errorKey: authActionErrorKey(error) }));

  if ("errorKey" in created) {
    return created;
  }

  await setAuthSession({
    userId: created.user.id,
    role: created.user.role,
    tenantId: created.tenant.id,
    shopId: created.shop.id,
    countryCode: created.tenant.countryCode,
  });

  redirect(`/dashboard?locale=${redirectLocale}`);
}

export async function loginAction(_state: AuthActionState = DEFAULT_AUTH_STATE, formData: FormData) {
  const redirectLocale = safeRedirectLocale(formData.get("locale"));
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    remember: formData.get("remember") === "on",
  });

  if (!parsed.success) {
    return { errorKey: "auth.error.validation" };
  }

  const input = parsed.data;
  const user = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
    select: {
      id: true,
      passwordHash: true,
      role: true,
      ownedTenants: {
        select: {
          id: true,
          countryCode: true,
          shops: {
            where: { isActive: true },
            select: { id: true },
            take: 1,
          },
        },
        take: 1,
      },
      memberships: {
        where: { isActive: true },
        select: {
          shopId: true,
          shop: {
            select: {
              tenantId: true,
              countryCode: true,
            },
          },
        },
        take: 1,
      },
    },
  });

  if (!user?.passwordHash) {
    return { errorKey: "auth.error.invalidCredentials" };
  }

  const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);

  if (!passwordMatches) {
    return { errorKey: "auth.error.invalidCredentials" };
  }

  if (user.role === "PLATFORM_OWNER") {
    await setAuthSession({
      userId: user.id,
      role: user.role,
      tenantId: "platform",
      shopId: "platform",
      countryCode: "AZ",
    });

    redirect(`/admin?locale=${redirectLocale}`);
  }

  const ownerTenant = user.ownedTenants[0];
  const ownerShop = ownerTenant?.shops[0];
  const membership = user.memberships[0];
  const sessionScope = ownerTenant && ownerShop
    ? {
        tenantId: ownerTenant.id,
        shopId: ownerShop.id,
        countryCode: ownerTenant.countryCode,
      }
    : membership
      ? {
          tenantId: membership.shop.tenantId,
          shopId: membership.shopId,
          countryCode: membership.shop.countryCode,
        }
      : null;

  if (!sessionScope) {
    return { errorKey: "auth.error.noAccess" };
  }

  await setAuthSession({
    userId: user.id,
    role: user.role,
    tenantId: sessionScope.tenantId,
    shopId: sessionScope.shopId,
    countryCode: sessionScope.countryCode,
  });

  redirect(`/dashboard?locale=${redirectLocale}`);
}

export async function logoutAction() {
  await clearAuthSession();
  redirect("/login?locale=ru");
}

function authActionErrorKey(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return "auth.error.emailExists";
  }

  return "auth.error.unexpected";
}

function safeRedirectLocale(value: FormDataEntryValue | null): "az" | "ru" | "en" {
  return value === "ru" || value === "en" || value === "az" ? value : "az";
}
