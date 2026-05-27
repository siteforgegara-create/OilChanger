"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { getAuthSession } from "@/lib/auth-session";
import { platformReviewNotificationChannels } from "@/lib/notification-delivery";
import { buildTenantPlanUpdate } from "@/lib/platform-admin-plan";
import {
  canMergeCatalogStatus,
  canReviewStatus,
  platformCatalogMergeNotificationKeys,
  platformReviewNotificationKeys,
  type PlatformReviewDecision,
} from "@/lib/platform-admin-review";
import { prisma } from "@/lib/prisma";
import { canAccessAppRoute } from "@/lib/role-access";
import { isPlanCode } from "@/lib/subscription-plans";

const platformReviewSchema = z.object({
  entityId: z.string().min(1),
  locale: z.enum(["az", "ru", "en"]).default("az"),
});

const platformCatalogMergeSchema = z.object({
  duplicateCatalogId: z.string().min(1),
  locale: z.enum(["az", "ru", "en"]).default("az"),
  primaryCatalogId: z.string().min(1),
});

const platformTenantPlanSchema = z.object({
  locale: z.enum(["az", "ru", "en"]).default("az"),
  plan: z.string().refine(isPlanCode),
  tenantId: z.string().min(1),
});

export async function approveVehicleCatalogAction(formData: FormData) {
  await reviewVehicleCatalogAction(formData, "APPROVED");
}

export async function rejectVehicleCatalogAction(formData: FormData) {
  await reviewVehicleCatalogAction(formData, "REJECTED");
}

export async function approveVehicleCatalogOverrideAction(formData: FormData) {
  await reviewVehicleCatalogOverrideAction(formData, "APPROVED");
}

export async function rejectVehicleCatalogOverrideAction(formData: FormData) {
  await reviewVehicleCatalogOverrideAction(formData, "REJECTED");
}

export async function mergeVehicleCatalogAction(formData: FormData) {
  const session = await getPlatformSession(formData.get("locale"));
  const parsed = platformCatalogMergeSchema.safeParse({
    duplicateCatalogId: formData.get("duplicateCatalogId"),
    locale: formData.get("locale"),
    primaryCatalogId: formData.get("primaryCatalogId"),
  });

  if (!parsed.success) {
    redirect(adminRedirect(safeLocale(formData.get("locale")), "admin.error.validation"));
  }

  const input = parsed.data;

  if (input.primaryCatalogId === input.duplicateCatalogId) {
    redirect(adminRedirect(input.locale, "admin.error.validation"));
  }

  const [primaryCatalog, duplicateCatalog] = await Promise.all([
    prisma.vehicleCatalog.findFirst({
      where: {
        id: input.primaryCatalogId,
        countryCode: session.countryCode,
      },
      select: {
        id: true,
        countryCode: true,
        make: true,
        model: true,
        status: true,
      },
    }),
    prisma.vehicleCatalog.findFirst({
      where: {
        id: input.duplicateCatalogId,
        countryCode: session.countryCode,
      },
      select: {
        id: true,
        countryCode: true,
        createdByUserId: true,
        make: true,
        model: true,
        status: true,
      },
    }),
  ]);

  if (!primaryCatalog || !duplicateCatalog || !canMergeCatalogStatus(duplicateCatalog.status)) {
    redirect(adminRedirect(input.locale, "admin.error.notFound"));
  }

  await prisma.$transaction(async (tx) => {
    const movedVehicleIdentities = await tx.vehicleIdentity.updateMany({
      where: {
        catalogId: duplicateCatalog.id,
        countryCode: session.countryCode,
      },
      data: {
        catalogId: primaryCatalog.id,
      },
    });

    await tx.vehicleCatalog.update({
      where: {
        id: duplicateCatalog.id,
      },
      data: {
        status: "MERGED",
      },
    });

    await createCatalogMergeNotification(tx, {
      createdByUserId: duplicateCatalog.createdByUserId,
      duplicateCatalogId: duplicateCatalog.id,
      label: `${duplicateCatalog.make} ${duplicateCatalog.model}`,
      primaryCatalogId: primaryCatalog.id,
    });

    await tx.auditLog.create({
      data: {
        userId: session.userId,
        action: "platform.catalog.merge",
        entity: "VehicleCatalog",
        entityId: duplicateCatalog.id,
        beforeJson: {
          status: duplicateCatalog.status,
        },
        afterJson: {
          countryCode: duplicateCatalog.countryCode,
          movedVehicleIdentityCount: movedVehicleIdentities.count,
          primaryCatalogId: primaryCatalog.id,
          status: "MERGED",
        },
      },
    });
  });

  redirect(adminRedirect(input.locale, "admin.saved"));
}

export async function updateTenantPlanAction(formData: FormData) {
  const session = await getPlatformSession(formData.get("locale"));
  const parsed = platformTenantPlanSchema.safeParse({
    locale: formData.get("locale"),
    plan: formData.get("plan"),
    tenantId: formData.get("tenantId"),
  });

  if (!parsed.success) {
    redirect(adminRedirect(safeLocale(formData.get("locale")), "admin.error.validation"));
  }

  const input = parsed.data;
  const planUpdate = buildTenantPlanUpdate(input.plan);
  const tenant = await prisma.tenant.findFirst({
    where: {
      id: input.tenantId,
    },
    select: {
      id: true,
      countryCode: true,
      plan: true,
      subscription: {
        select: {
          id: true,
          aiMonthlyLimitMinorUsd: true,
          maxShops: true,
          maxStaff: true,
          plan: true,
        },
      },
    },
  });

  if (!tenant) {
    redirect(adminRedirect(input.locale, "admin.error.notFound"));
  }

  await prisma.$transaction(async (tx) => {
    await tx.tenant.update({
      where: {
        id: tenant.id,
      },
      data: {
        plan: planUpdate.plan,
      },
    });

    await tx.subscription.upsert({
      where: {
        tenantId: tenant.id,
      },
      update: {
        aiMonthlyLimitMinorUsd: planUpdate.aiMonthlyLimitMinorUsd,
        maxShops: planUpdate.maxShops,
        maxStaff: planUpdate.maxStaff,
        plan: planUpdate.plan,
      },
      create: {
        aiMonthlyLimitMinorUsd: planUpdate.aiMonthlyLimitMinorUsd,
        maxShops: planUpdate.maxShops,
        maxStaff: planUpdate.maxStaff,
        plan: planUpdate.plan,
        status: "TRIALING",
        tenantId: tenant.id,
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: tenant.id,
        userId: session.userId,
        action: "platform.tenant.plan.update",
        entity: "Tenant",
        entityId: tenant.id,
        beforeJson: {
          plan: tenant.plan,
          subscription: tenant.subscription,
        },
        afterJson: {
          countryCode: tenant.countryCode,
          plan: planUpdate.plan,
          subscription: {
            aiMonthlyLimitMinorUsd: planUpdate.aiMonthlyLimitMinorUsd,
            maxShops: planUpdate.maxShops,
            maxStaff: planUpdate.maxStaff,
          },
        },
      },
    });
  });

  redirect(adminRedirect(input.locale, "admin.saved"));
}

async function reviewVehicleCatalogAction(formData: FormData, decision: PlatformReviewDecision) {
  const session = await getPlatformSession(formData.get("locale"));
  const parsed = platformReviewSchema.safeParse({
    entityId: formData.get("catalogId"),
    locale: formData.get("locale"),
  });

  if (!parsed.success) {
    redirect(adminRedirect(safeLocale(formData.get("locale")), "admin.error.validation"));
  }

  const input = parsed.data;
  const catalog = await prisma.vehicleCatalog.findFirst({
    where: {
      id: input.entityId,
      countryCode: session.countryCode,
    },
    select: {
      id: true,
      countryCode: true,
      createdByUserId: true,
      make: true,
      model: true,
      status: true,
    },
  });

  if (!catalog || !canReviewStatus(catalog.status)) {
    redirect(adminRedirect(input.locale, "admin.error.notFound"));
  }

  await prisma.$transaction(async (tx) => {
    await tx.vehicleCatalog.update({
      where: {
        id: catalog.id,
      },
      data: {
        status: decision,
        approvedByUserId: decision === "APPROVED" ? session.userId : null,
      },
    });

    await tx.vehicleCatalogRecommendation.updateMany({
      where: {
        catalogId: catalog.id,
        status: "PENDING",
      },
      data: {
        status: decision,
      },
    });

    await createPlatformReviewNotification(tx, {
      createdByUserId: catalog.createdByUserId,
      decision,
      entity: "VehicleCatalog",
      entityId: catalog.id,
      label: `${catalog.make} ${catalog.model}`,
    });

    await tx.auditLog.create({
      data: {
        userId: session.userId,
        action: decision === "APPROVED" ? "platform.catalog.approve" : "platform.catalog.reject",
        entity: "VehicleCatalog",
        entityId: catalog.id,
        beforeJson: {
          status: catalog.status,
        },
        afterJson: {
          countryCode: catalog.countryCode,
          status: decision,
        },
      },
    });
  });

  redirect(adminRedirect(input.locale, "admin.saved"));
}

async function reviewVehicleCatalogOverrideAction(formData: FormData, decision: PlatformReviewDecision) {
  const session = await getPlatformSession(formData.get("locale"));
  const parsed = platformReviewSchema.safeParse({
    entityId: formData.get("overrideId"),
    locale: formData.get("locale"),
  });

  if (!parsed.success) {
    redirect(adminRedirect(safeLocale(formData.get("locale")), "admin.error.validation"));
  }

  const input = parsed.data;
  const override = await prisma.vehicleCatalogOverride.findFirst({
    where: {
      id: input.entityId,
      catalog: {
        countryCode: session.countryCode,
      },
    },
    select: {
      id: true,
      catalogId: true,
      changedFields: true,
      createdByUserId: true,
      shopId: true,
      status: true,
      tenantId: true,
      catalog: {
        select: {
          countryCode: true,
          make: true,
          model: true,
        },
      },
    },
  });

  if (!override || override.status !== "PENDING_REVIEW") {
    redirect(adminRedirect(input.locale, "admin.error.notFound"));
  }

  await prisma.$transaction(async (tx) => {
    await tx.vehicleCatalogOverride.update({
      where: {
        id: override.id,
      },
      data: {
        reviewedAt: new Date(),
        reviewedByUserId: session.userId,
        status: decision === "APPROVED" ? "APPROVED" : "REJECTED",
      },
    });

    await createPlatformReviewNotification(tx, {
      createdByUserId: override.createdByUserId,
      decision,
      entity: "VehicleCatalogOverride",
      entityId: override.id,
      label: `${override.catalog.make} ${override.catalog.model}`,
    });

    await tx.auditLog.create({
      data: {
        tenantId: override.tenantId,
        shopId: override.shopId,
        userId: session.userId,
        action: decision === "APPROVED" ? "platform.override.approve" : "platform.override.reject",
        entity: "VehicleCatalogOverride",
        entityId: override.id,
        beforeJson: {
          status: override.status,
        },
        afterJson: {
          catalogId: override.catalogId,
          changedFields: override.changedFields,
          countryCode: override.catalog.countryCode,
          status: decision,
        },
      },
    });
  });

  redirect(adminRedirect(input.locale, "admin.saved"));
}

async function getPlatformSession(localeValue: FormDataEntryValue | null) {
  const session = await getAuthSession();

  if (!session) {
    redirect("/login?locale=ru");
  }

  if (!canAccessAppRoute(session.role, "admin")) {
    redirect(`/dashboard?locale=${safeLocale(localeValue)}`);
  }

  return session;
}

async function createPlatformReviewNotification(
  tx: Prisma.TransactionClient,
  input: {
    createdByUserId: string | null;
    decision: PlatformReviewDecision;
    entity: "VehicleCatalog" | "VehicleCatalogOverride";
    entityId: string;
    label: string;
  },
) {
  if (!input.createdByUserId) {
    return;
  }

  const userId = input.createdByUserId;
  const keys = platformReviewNotificationKeys(input.entity, input.decision);

  await Promise.all(
    platformReviewNotificationChannels().map((channel) =>
      tx.notification.create({
        data: {
          userId,
          channel,
          status: "PENDING",
          titleKey: keys.titleKey,
          bodyKey: keys.bodyKey,
          payload: {
            entity: input.entity,
            entityId: input.entityId,
            label: input.label,
          },
        },
      }),
    ),
  );
}

async function createCatalogMergeNotification(
  tx: Prisma.TransactionClient,
  input: {
    createdByUserId: string | null;
    duplicateCatalogId: string;
    label: string;
    primaryCatalogId: string;
  },
) {
  if (!input.createdByUserId) {
    return;
  }

  const userId = input.createdByUserId;
  const keys = platformCatalogMergeNotificationKeys();

  await Promise.all(
    platformReviewNotificationChannels().map((channel) =>
      tx.notification.create({
        data: {
          userId,
          channel,
          status: "PENDING",
          titleKey: keys.titleKey,
          bodyKey: keys.bodyKey,
          payload: {
            duplicateCatalogId: input.duplicateCatalogId,
            entity: "VehicleCatalog",
            label: input.label,
            primaryCatalogId: input.primaryCatalogId,
          },
        },
      }),
    ),
  );
}

function adminRedirect(locale: "az" | "ru" | "en", messageKey: string): string {
  return `/admin?locale=${locale}&message=${encodeURIComponent(messageKey)}`;
}

function safeLocale(value: FormDataEntryValue | null): "az" | "ru" | "en" {
  return value === "az" || value === "ru" || value === "en" ? value : "az";
}
