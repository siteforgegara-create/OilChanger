"use server";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth-session";
import { updateBranchSettingsSchema, updateTenantSettingsSchema } from "@/lib/branch-schema";
import { prisma } from "@/lib/prisma";
import { canAccessAppRoute } from "@/lib/role-access";

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const LOGO_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "logos");
const logoExtensionsByType = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/svg+xml", "svg"],
  ["image/webp", "webp"],
]);

export async function updateTenantSettingsAction(formData: FormData) {
  const session = await getAuthSession();
  const fallbackLocale = safeLocale(formData.get("locale"));

  if (!session) {
    redirect("/login?locale=ru");
  }

  if (!canAccessAppRoute(session.role, "settings") || session.role !== "SHOP_OWNER") {
    redirect(`/dashboard?locale=${fallbackLocale}`);
  }

  const parsed = updateTenantSettingsSchema.safeParse({
    locale: formData.get("locale"),
    name: formData.get("name"),
  });

  if (!parsed.success) {
    redirect(settingsRedirect(fallbackLocale, session.shopId, "settings.error.validation"));
  }

  const input = parsed.data;
  const shouldRemoveLogo = formData.get("removeLogo") === "on";
  const logoResult = await saveLogoFile(formData.get("logoFile"), session.tenantId);

  if (logoResult.errorKey) {
    redirect(settingsRedirect(input.locale, session.shopId, logoResult.errorKey));
  }

  const tenant = await prisma.tenant.findFirst({
    where: {
      id: session.tenantId,
      countryCode: session.countryCode,
      ownerUserId: session.userId,
    },
    select: {
      id: true,
      logoUrl: true,
    },
  });

  if (!tenant) {
    redirect(settingsRedirect(input.locale, session.shopId, "settings.error.tenant"));
  }

  await prisma.$transaction(async (tx) => {
    await tx.tenant.update({
      where: {
        id: tenant.id,
      },
      data: {
        ...(shouldRemoveLogo ? { logoUrl: null } : {}),
        ...(logoResult.logoUrl ? { logoUrl: logoResult.logoUrl } : {}),
        name: input.name,
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: session.tenantId,
        shopId: session.shopId,
        userId: session.userId,
        action: "settings.tenant.update",
        entity: "Tenant",
        entityId: tenant.id,
        afterJson: {
          hasLogo: Boolean(logoResult.logoUrl) || (!shouldRemoveLogo && Boolean(tenant.logoUrl)),
          name: input.name,
          removedLogo: shouldRemoveLogo,
        },
      },
    });
  });

  redirect(settingsRedirect(input.locale, session.shopId, "settings.saved"));
}

export async function updateBranchSettingsAction(formData: FormData) {
  const session = await getAuthSession();
  const fallbackLocale = safeLocale(formData.get("locale"));
  const fallbackShopValue = formData.get("shopId");
  const fallbackShopId = typeof fallbackShopValue === "string" ? fallbackShopValue : session?.shopId;

  if (!session) {
    redirect("/login?locale=ru");
  }

  if (!canAccessAppRoute(session.role, "settings")) {
    redirect(`/dashboard?locale=${fallbackLocale}`);
  }

  const parsed = updateBranchSettingsSchema.safeParse({
    address: formData.get("address"),
    lat: formData.get("lat"),
    lng: formData.get("lng"),
    locale: formData.get("locale"),
    name: formData.get("name"),
    shopId: formData.get("shopId"),
  });

  if (!parsed.success) {
    redirect(settingsRedirect(fallbackLocale, fallbackShopId, "settings.error.validation"));
  }

  const input = parsed.data;

  if (session.role !== "SHOP_OWNER" && input.shopId !== session.shopId) {
    redirect(settingsRedirect(input.locale, session.shopId, "settings.error.shop"));
  }

  const shop = await prisma.shop.findFirst({
    where: {
      id: input.shopId,
      tenantId: session.tenantId,
      countryCode: session.countryCode,
      isActive: true,
    },
    select: {
      id: true,
    },
  });

  if (!shop) {
    redirect(settingsRedirect(input.locale, session.shopId, "settings.error.shop"));
  }

  await prisma.$transaction(async (tx) => {
    await tx.shop.update({
      where: {
        id: shop.id,
      },
      data: {
        address: input.address && input.address.length > 0 ? input.address : null,
        lat: input.lat === undefined ? null : new Prisma.Decimal(input.lat),
        lng: input.lng === undefined ? null : new Prisma.Decimal(input.lng),
        name: input.name,
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: session.tenantId,
        shopId: shop.id,
        userId: session.userId,
        action: "settings.branch.update",
        entity: "Shop",
        entityId: shop.id,
        afterJson: {
          hasAddress: Boolean(input.address),
          hasCoordinates: input.lat !== undefined && input.lng !== undefined,
          name: input.name,
        },
      },
    });
  });

  redirect(settingsRedirect(input.locale, shop.id, "settings.saved"));
}

function safeLocale(value: FormDataEntryValue | null): "az" | "ru" | "en" {
  return value === "az" || value === "ru" || value === "en" ? value : "az";
}

function settingsRedirect(locale: "az" | "ru" | "en", shopId: string | undefined, messageKey: string): string {
  const params = new URLSearchParams({
    locale,
    message: messageKey,
  });

  if (shopId) {
    params.set("shopId", shopId);
  }

  return `/settings?${params.toString()}`;
}

async function saveLogoFile(value: FormDataEntryValue | null, tenantId: string): Promise<{ errorKey?: string; logoUrl?: string }> {
  if (!(value instanceof File) || value.size === 0) {
    return {};
  }

  if (value.size > MAX_LOGO_BYTES) {
    return { errorKey: "settings.error.logoSize" };
  }

  const extension = logoExtensionsByType.get(value.type);

  if (!extension) {
    return { errorKey: "settings.error.logoType" };
  }

  const tenantSegment = tenantId.replace(/[^a-zA-Z0-9_-]/g, "");
  const fileName = `${tenantSegment}-${randomUUID()}.${extension}`;
  const targetPath = path.join(LOGO_UPLOAD_DIR, fileName);
  const bytes = Buffer.from(await value.arrayBuffer());

  await mkdir(LOGO_UPLOAD_DIR, { recursive: true });
  await writeFile(targetPath, bytes);

  return { logoUrl: `/uploads/logos/${fileName}` };
}
