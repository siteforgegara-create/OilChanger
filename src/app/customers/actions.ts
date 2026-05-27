"use server";

import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth-session";
import { addExistingCustomerVehicleToQueueSchema, createCustomerReminderSchema } from "@/lib/customer-queue-schema";
import { prisma } from "@/lib/prisma";

export async function addExistingCustomerVehicleToQueueAction(formData: FormData) {
  const session = await getAuthSession();
  const fallbackLocale = safeLocale(formData.get("locale"));
  const fallbackShopValue = formData.get("shopId");
  const fallbackShopId = typeof fallbackShopValue === "string" ? fallbackShopValue : session?.shopId;

  if (!session) {
    redirect("/login?locale=ru");
  }

  const parsed = addExistingCustomerVehicleToQueueSchema.safeParse({
    customerVehicleId: formData.get("customerVehicleId"),
    locale: formData.get("locale"),
    mileage: formData.get("mileage"),
    shopId: formData.get("shopId"),
  });

  if (!parsed.success) {
    redirect(customerRedirect(fallbackLocale, fallbackShopId, "customer.error.validation"));
  }

  const input = parsed.data;

  if (session.role !== "SHOP_OWNER" && input.shopId !== session.shopId) {
    redirect(customerRedirect(input.locale, session.shopId, "customer.error.shop"));
  }

  const customerVehicle = await prisma.customerVehicle.findFirst({
    where: {
      id: input.customerVehicleId,
      shopId: input.shopId,
      isActive: true,
      shop: {
        tenantId: session.tenantId,
        countryCode: session.countryCode,
        isActive: true,
      },
      customer: {
        tenantId: session.tenantId,
        countryCode: session.countryCode,
        shopId: input.shopId,
      },
      vehicleIdentity: {
        countryCode: session.countryCode,
      },
    },
    select: {
      customerId: true,
      vehicleIdentityId: true,
      shop: {
        select: {
          currency: true,
        },
      },
    },
  });

  if (!customerVehicle) {
    redirect(customerRedirect(input.locale, input.shopId, "customer.error.notFound"));
  }

  const activeOrder = await prisma.order.findFirst({
    where: {
      tenantId: session.tenantId,
      countryCode: session.countryCode,
      shopId: input.shopId,
      vehicleIdentityId: customerVehicle.vehicleIdentityId,
      status: {
        in: ["QUEUED", "IN_PROGRESS", "SCHEDULED"],
      },
    },
    select: {
      id: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (activeOrder) {
    redirect(`/dashboard/orders/${activeOrder.id}?locale=${input.locale}`);
  }

  const order = await prisma.$transaction(async (tx) => {
    const createdOrder = await tx.order.create({
      data: {
        tenantId: session.tenantId,
        shopId: input.shopId,
        countryCode: session.countryCode,
        type: "SERVICE",
        status: "QUEUED",
        vehicleIdentityId: customerVehicle.vehicleIdentityId,
        customerId: customerVehicle.customerId,
        mileage: input.mileage,
        currency: customerVehicle.shop.currency,
        createdByUserId: session.userId,
      },
      select: {
        id: true,
      },
    });

    if (input.mileage !== undefined) {
      await tx.mileageRecord.create({
        data: {
          vehicleIdentityId: customerVehicle.vehicleIdentityId,
          orderId: createdOrder.id,
          mileage: input.mileage,
          source: "QUEUE_ENTRY",
        },
      });
    }

    return createdOrder;
  });

  redirect(`/dashboard/orders/${order.id}?locale=${input.locale}`);
}

export async function createCustomerReminderAction(formData: FormData) {
  const session = await getAuthSession();
  const fallbackLocale = safeLocale(formData.get("locale"));
  const fallbackShopValue = formData.get("shopId");
  const fallbackShopId = typeof fallbackShopValue === "string" ? fallbackShopValue : session?.shopId;

  if (!session) {
    redirect("/login?locale=ru");
  }

  const parsed = createCustomerReminderSchema.safeParse({
    customerVehicleId: formData.get("customerVehicleId"),
    locale: formData.get("locale"),
    shopId: formData.get("shopId"),
  });

  if (!parsed.success) {
    redirect(customerRedirect(fallbackLocale, fallbackShopId, "customer.error.validation"));
  }

  const input = parsed.data;

  if (session.role !== "SHOP_OWNER") {
    redirect(customerRedirect(input.locale, session.shopId, "customer.error.shop"));
  }

  const customerVehicle = await prisma.customerVehicle.findFirst({
    where: {
      id: input.customerVehicleId,
      shopId: input.shopId,
      isActive: true,
      shop: {
        tenantId: session.tenantId,
        countryCode: session.countryCode,
        isActive: true,
      },
      customer: {
        tenantId: session.tenantId,
        countryCode: session.countryCode,
        shopId: input.shopId,
      },
      vehicleIdentity: {
        countryCode: session.countryCode,
      },
    },
    select: {
      id: true,
      customerId: true,
      customer: {
        select: {
          phone: true,
        },
      },
      vehicleIdentity: {
        select: {
          id: true,
          make: true,
          model: true,
        },
      },
    },
  });

  if (!customerVehicle) {
    redirect(customerRedirect(input.locale, input.shopId, "customer.error.notFound"));
  }

  await prisma.$transaction(async (tx) => {
    await tx.notification.create({
      data: {
        userId: session.userId,
        channel: "IN_APP",
        titleKey: "notification.customerReminder.title",
        bodyKey: "notification.customerReminder.body",
        payload: {
          type: "CUSTOMER_SERVICE_REMINDER",
          customerId: customerVehicle.customerId,
          customerVehicleId: customerVehicle.id,
          vehicleIdentityId: customerVehicle.vehicleIdentity.id,
          vehicleLabel: `${customerVehicle.vehicleIdentity.make} ${customerVehicle.vehicleIdentity.model}`,
          shopId: input.shopId,
        },
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: session.tenantId,
        shopId: input.shopId,
        userId: session.userId,
        action: "customer.reminder.create",
        entity: "CustomerVehicle",
        entityId: customerVehicle.id,
        afterJson: {
          customerId: customerVehicle.customerId,
          vehicleIdentityId: customerVehicle.vehicleIdentity.id,
        },
      },
    });
  });

  redirect(`/customers/${customerVehicle.id}?locale=${input.locale}&shopId=${input.shopId}`);
}

function safeLocale(value: FormDataEntryValue | null): "az" | "ru" | "en" {
  return value === "az" || value === "ru" || value === "en" ? value : "az";
}

function customerRedirect(locale: "az" | "ru" | "en", shopId: string | undefined, errorKey: string): string {
  const params = new URLSearchParams({
    locale,
    error: errorKey,
  });

  if (shopId) {
    params.set("shopId", shopId);
  }

  return `/customers?${params.toString()}`;
}
