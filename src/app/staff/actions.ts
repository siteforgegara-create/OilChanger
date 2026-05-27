"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { getAuthSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { canAccessAppRoute } from "@/lib/role-access";
import { createStaffSchema } from "@/lib/staff-schema";
import { getSubscriptionPlanLimits } from "@/lib/subscription-plans";

export async function createStaffAction(formData: FormData) {
  const session = await getAuthSession();
  const fallbackLocale = safeLocale(formData.get("locale"));
  const fallbackShopValue = formData.get("shopId");
  const fallbackShopId = typeof fallbackShopValue === "string" ? fallbackShopValue : "";

  if (!session) {
    redirect("/login?locale=ru");
  }

  if (!canAccessAppRoute(session.role, "staff")) {
    redirect(`/dashboard?locale=${fallbackLocale}`);
  }

  const parsed = createStaffSchema.safeParse({
    shopId: formData.get("shopId"),
    locale: formData.get("locale"),
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    redirect(staffRedirect(fallbackLocale, fallbackShopId, "staff.error.validation"));
  }

  const input = parsed.data;
  const shop = await prisma.shop.findFirst({
    where: {
      id: input.shopId,
      tenantId: session.tenantId,
      countryCode: session.countryCode,
      isActive: true,
    },
    select: {
      id: true,
      tenant: {
        select: {
          plan: true,
          subscription: {
            select: {
              maxStaff: true,
            },
          },
        },
      },
    },
  });

  if (!shop) {
    redirect(staffRedirect(input.locale, input.shopId, "staff.error.shop"));
  }

  const activeStaffUsers = await prisma.membership.findMany({
    where: {
      isActive: true,
      shop: {
        tenantId: session.tenantId,
        countryCode: session.countryCode,
      },
    },
    distinct: ["userId"],
    select: {
      userId: true,
    },
  });
  const maxStaff = shop.tenant.subscription?.maxStaff ?? getSubscriptionPlanLimits(shop.tenant.plan).maxStaff;

  if (activeStaffUsers.length >= maxStaff) {
    redirect(staffRedirect(input.locale, input.shopId, "staff.error.limit"));
  }

  const normalizedEmail = input.email.toLowerCase();
  const existingUser = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
    select: {
      id: true,
    },
  });

  if (existingUser) {
    redirect(staffRedirect(input.locale, input.shopId, "staff.error.emailExists"));
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const result = await prisma
    .$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          name: input.name,
          role: input.role,
          locale: input.locale,
        },
        select: {
          id: true,
        },
      });

      await tx.membership.create({
        data: {
          userId: user.id,
          shopId: shop.id,
          role: input.role,
        },
      });

      return { shopId: shop.id };
    })
    .catch((error: unknown) => ({ errorKey: staffActionErrorKey(error) }));

  if ("errorKey" in result) {
    redirect(staffRedirect(input.locale, input.shopId, result.errorKey));
  }

  redirect(`/staff?locale=${input.locale}&shopId=${result.shopId}`);
}

export async function deactivateStaffAction(formData: FormData) {
  const session = await getAuthSession();

  if (!session) {
    redirect("/login?locale=ru");
  }

  const locale = safeLocale(formData.get("locale"));
  const shopId = formData.get("shopId");
  const userId = formData.get("userId");

  if (!canAccessAppRoute(session.role, "staff") || typeof shopId !== "string" || typeof userId !== "string") {
    redirect(`/dashboard?locale=${locale}`);
  }

  if (userId === session.userId) {
    redirect(`/staff?locale=${locale}&shopId=${shopId}`);
  }

  await prisma.membership.updateMany({
    where: {
      userId,
      shopId,
      isActive: true,
      shop: {
        tenantId: session.tenantId,
        countryCode: session.countryCode,
      },
    },
    data: {
      isActive: false,
    },
  });

  redirect(`/staff?locale=${locale}&shopId=${shopId}`);
}

function staffActionErrorKey(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return "staff.error.emailExists";
  }

  return "staff.error.unexpected";
}

function safeLocale(value: FormDataEntryValue | null): "az" | "ru" | "en" {
  return value === "az" || value === "ru" || value === "en" ? value : "az";
}

function staffRedirect(locale: "az" | "ru" | "en", shopId: string, errorKey: string): string {
  const params = new URLSearchParams({
    locale,
    error: errorKey,
  });

  if (shopId) {
    params.set("shopId", shopId);
  }

  return `/staff?${params.toString()}`;
}
