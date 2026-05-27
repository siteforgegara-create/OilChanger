"use server";

import { redirect } from "next/navigation";
import { createRetailSaleSchema } from "@/lib/retail-sale-schema";
import { getAuthSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { calculateQuantityLineTotalMinor, parseQuantityToThousandths } from "@/lib/stock-quantity";

export async function createRetailSaleAction(formData: FormData) {
  const session = await getAuthSession();
  const fallbackLocale = safeLocale(formData.get("locale"));
  const fallbackShopValue = formData.get("shopId");
  const fallbackShopId = typeof fallbackShopValue === "string" ? fallbackShopValue : session?.shopId;

  if (!session) {
    redirect("/login?locale=ru");
  }

  const parsed = createRetailSaleSchema.safeParse({
    customerId: formData.get("customerId"),
    locale: formData.get("locale"),
    paymentMethod: formData.get("paymentMethod"),
    quantity: formData.get("quantity"),
    shopId: formData.get("shopId"),
    stockId: formData.get("stockId"),
  });

  if (!parsed.success) {
    redirect(salesRedirect(fallbackLocale, fallbackShopId, "sales.error.validation"));
  }

  const input = parsed.data;

  if (session.role !== "SHOP_OWNER" && input.shopId !== session.shopId) {
    redirect(salesRedirect(input.locale, session.shopId, "sales.error.shop"));
  }

  const stock = await prisma.inventoryStock.findFirst({
    where: {
      id: input.stockId,
      shopId: input.shopId,
      shop: {
        tenantId: session.tenantId,
        countryCode: session.countryCode,
        isActive: true,
      },
      product: {
        tenantId: session.tenantId,
        isActive: true,
      },
    },
    select: {
      id: true,
      currency: true,
      productId: true,
      quantity: true,
      salePriceMinor: true,
      product: {
        select: {
          baseUnit: true,
          brand: true,
          name: true,
          viscosity: true,
        },
      },
      shop: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!stock) {
    redirect(salesRedirect(input.locale, input.shopId, "sales.error.stock"));
  }

  const customer = input.customerId
    ? await prisma.customer.findFirst({
        where: {
          id: input.customerId,
          tenantId: session.tenantId,
          countryCode: session.countryCode,
          shopId: stock.shop.id,
        },
        select: {
          id: true,
        },
      })
    : null;

  if (input.customerId && !customer) {
    redirect(salesRedirect(input.locale, input.shopId, "sales.error.customer"));
  }

  const quantityThousandths = parseQuantityToThousandths(input.quantity);
  const totalMinor = calculateQuantityLineTotalMinor(stock.salePriceMinor, quantityThousandths);
  const productLabel = [stock.product.brand, stock.product.name, stock.product.viscosity].filter(Boolean).join(" ");

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        tenantId: session.tenantId,
        shopId: stock.shop.id,
        countryCode: session.countryCode,
        type: "RETAIL",
        status: "COMPLETED",
        customerId: customer?.id,
        subtotalMinor: totalMinor,
        totalMinor,
        paidMinor: totalMinor,
        currency: stock.currency,
        paymentStatus: "PAID",
        paymentMethod: input.paymentMethod,
        createdByUserId: session.userId,
        completedByUserId: session.userId,
        completedAt: new Date(),
      },
      select: {
        id: true,
      },
    });

    await tx.orderLine.create({
      data: {
        orderId: order.id,
        type: "PRODUCT",
        productId: stock.productId,
        description: productLabel,
        quantity: input.quantity,
        unit: stock.product.baseUnit,
        unitPriceMinor: stock.salePriceMinor,
        totalMinor,
      },
    });

    await tx.inventoryStock.updateMany({
      where: {
        id: stock.id,
        shopId: stock.shop.id,
        shop: {
          tenantId: session.tenantId,
          countryCode: session.countryCode,
        },
        product: {
          tenantId: session.tenantId,
        },
      },
      data: {
        quantity: {
          decrement: input.quantity,
        },
      },
    });

    await tx.stockMovement.create({
      data: {
        shopId: stock.shop.id,
        productId: stock.productId,
        type: "OUT",
        quantity: input.quantity,
        unit: stock.product.baseUnit,
        orderId: order.id,
        createdByUserId: session.userId,
        comment: "Retail sale",
      },
    });

    if (totalMinor > 0) {
      await tx.payment.create({
        data: {
          orderId: order.id,
          customerId: customer?.id,
          amountMinor: totalMinor,
          method: input.paymentMethod,
          status: "PAID",
          createdByUserId: session.userId,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        tenantId: session.tenantId,
        shopId: stock.shop.id,
        userId: session.userId,
        action: "sales.retail.create",
        entity: "Order",
        entityId: order.id,
        afterJson: {
          productId: stock.productId,
          customerId: customer?.id,
          quantity: input.quantity,
          totalMinor,
        },
      },
    });
  });

  redirect(salesRedirect(input.locale, stock.shop.id, "sales.saved"));
}

function safeLocale(value: FormDataEntryValue | null): "az" | "ru" | "en" {
  return value === "az" || value === "ru" || value === "en" ? value : "az";
}

function salesRedirect(locale: "az" | "ru" | "en", shopId: string | undefined, messageKey: string): string {
  const params = new URLSearchParams({
    locale,
    message: messageKey,
  });

  if (shopId) {
    params.set("shopId", shopId);
  }

  return `/sales?${params.toString()}`;
}
