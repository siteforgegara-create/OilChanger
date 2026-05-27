"use server";

import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth-session";
import { userVisibleNotificationChannel } from "@/lib/notification-delivery";
import { updateNotificationStatusSchema } from "@/lib/notification-schema";
import { prisma } from "@/lib/prisma";
import { canAccessAppRoute } from "@/lib/role-access";

export async function updateNotificationStatusAction(formData: FormData) {
  const session = await getAuthSession();
  const fallbackLocale = safeLocale(formData.get("locale"));
  const fallbackShopValue = formData.get("shopId");
  const fallbackShopId = typeof fallbackShopValue === "string" ? fallbackShopValue : session?.shopId;

  if (!session) {
    redirect("/login?locale=ru");
  }

  if (!canAccessAppRoute(session.role, "notifications")) {
    redirect(`/dashboard?locale=${fallbackLocale}`);
  }

  const parsed = updateNotificationStatusSchema.safeParse({
    locale: formData.get("locale"),
    notificationId: formData.get("notificationId"),
    shopId: formData.get("shopId"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    redirect(notificationsRedirect(fallbackLocale, fallbackShopId));
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
    },
  });

  if (!shop) {
    redirect(notificationsRedirect(input.locale, session.shopId));
  }

  const notification = await prisma.notification.findFirst({
    where: {
      channel: userVisibleNotificationChannel(),
      id: input.notificationId,
      userId: session.userId,
      OR: [
        {
          titleKey: "notification.customerReminder.title",
          payload: {
            path: ["shopId"],
            equals: shop.id,
          },
        },
        {
          titleKey: {
            startsWith: "notification.platformReview.",
          },
        },
      ],
    },
    select: {
      id: true,
    },
  });

  if (!notification) {
    redirect(notificationsRedirect(input.locale, shop.id));
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.notification.update({
      where: {
        id: notification.id,
      },
      data:
        input.status === "SENT"
          ? {
              status: input.status,
              sentAt: now,
            }
          : {
              status: input.status,
              readAt: now,
            },
    });

    await tx.auditLog.create({
      data: {
        tenantId: session.tenantId,
        shopId: shop.id,
        userId: session.userId,
        action: "notification.status.update",
        entity: "Notification",
        entityId: notification.id,
        afterJson: {
          status: input.status,
        },
      },
    });
  });

  redirect(notificationsRedirect(input.locale, shop.id));
}

function safeLocale(value: FormDataEntryValue | null): "az" | "ru" | "en" {
  return value === "az" || value === "ru" || value === "en" ? value : "az";
}

function notificationsRedirect(locale: "az" | "ru" | "en", shopId: string | undefined): string {
  const params = new URLSearchParams({ locale });

  if (shopId) {
    params.set("shopId", shopId);
  }

  return `/notifications?${params.toString()}`;
}
