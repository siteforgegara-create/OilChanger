"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { getAuthSession } from "@/lib/auth-session";
import { vehicleCatalogLinkSchema } from "@/lib/catalog-schema";
import { createExpenseSchema } from "@/lib/expense-schema";
import { addMinorUnits, calculateDiscountMinor, parseMoneyToMinor } from "@/lib/money";
import { isServiceItemKey, selectedServiceItems, type ServiceItemKey } from "@/lib/order-services";
import { prisma } from "@/lib/prisma";
import { createQrSlug } from "@/lib/qr";
import { queueEntrySchema } from "@/lib/queue-entry-schema";
import { canAccessAppRoute } from "@/lib/role-access";
import { calculateServiceForecast } from "@/lib/service-forecast";
import { pickServiceRecommendation, type ServiceRecommendationCandidate } from "@/lib/service-recommendation";
import { calculateQuantityLineTotalMinor, parseQuantityToThousandths } from "@/lib/stock-quantity";
import { normalizePlate, normalizeVin } from "@/lib/vehicle-identity";

export type QueueActionState = {
  errorKey?: string;
};

const DEFAULT_QUEUE_STATE: QueueActionState = {};

export async function addQueueEntryAction(_state: QueueActionState = DEFAULT_QUEUE_STATE, formData: FormData) {
  const session = await getAuthSession();

  if (!session) {
    return { errorKey: "dashboard.queue.error.auth" };
  }

  const parsed = queueEntrySchema.safeParse({
    shopId: formData.get("shopId"),
    locale: formData.get("locale"),
    plateNumber: formData.get("plateNumber"),
    vin: formData.get("vin"),
    make: formData.get("make"),
    model: formData.get("model"),
    year: formData.get("year"),
    mileage: formData.get("mileage"),
    customerName: formData.get("customerName"),
    customerPhone: formData.get("customerPhone"),
  });

  if (!parsed.success) {
    return { errorKey: "dashboard.queue.error.validation" };
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
      currency: true,
    },
  });

  if (!shop) {
    return { errorKey: "dashboard.queue.error.shop" };
  }

  const normalizedVin = input.vin ? normalizeVin(input.vin) : undefined;
  const normalizedPlate = input.plateNumber ? normalizePlate(input.plateNumber) : undefined;
  const year = input.year && Number.isFinite(input.year) ? input.year : undefined;
  const mileage = input.mileage && Number.isFinite(input.mileage) ? input.mileage : undefined;

  const result = await prisma
    .$transaction(async (tx) => {
      const existingVehicle = normalizedVin
        ? await tx.vehicleIdentity.findUnique({
            where: {
              countryCode_vinNormalized: {
                countryCode: session.countryCode,
                vinNormalized: normalizedVin,
              },
            },
            select: { id: true },
          })
        : normalizedPlate
          ? await tx.vehicleIdentity.findFirst({
              where: {
                countryCode: session.countryCode,
                plateNormalized: normalizedPlate,
              },
              select: { id: true },
              orderBy: { updatedAt: "desc" },
            })
          : null;

      const vehicle = existingVehicle
        ? await tx.vehicleIdentity.update({
            where: { id: existingVehicle.id },
            data: {
              make: input.make,
              model: input.model,
              year,
              plateNumber: input.plateNumber,
              plateNormalized: normalizedPlate,
              lastEditedByShopId: shop.id,
            },
            select: { id: true },
          })
        : await tx.vehicleIdentity.create({
            data: {
              countryCode: session.countryCode,
              vin: input.vin,
              vinNormalized: normalizedVin,
              plateNumber: input.plateNumber,
              plateNormalized: normalizedPlate,
              make: input.make,
              model: input.model,
              year,
              createdByTenantId: session.tenantId,
              createdByShopId: shop.id,
              createdByUserId: session.userId,
              lastEditedByShopId: shop.id,
            },
            select: { id: true },
          });

      let customerId: string | undefined;

      if (input.customerName || input.customerPhone) {
        const customer = await tx.customer.create({
          data: {
            tenantId: session.tenantId,
            shopId: shop.id,
            countryCode: session.countryCode,
            name: input.customerName ?? input.customerPhone ?? "Customer",
            phone: input.customerPhone,
          },
          select: { id: true },
        });

        customerId = customer.id;

        await tx.customerVehicle.create({
          data: {
            shopId: shop.id,
            customerId,
            vehicleIdentityId: vehicle.id,
          },
        });
      }

      const order = await tx.order.create({
        data: {
          tenantId: session.tenantId,
          shopId: shop.id,
          countryCode: session.countryCode,
          type: "SERVICE",
          status: "QUEUED",
          vehicleIdentityId: vehicle.id,
          customerId,
          mileage,
          currency: shop.currency,
          createdByUserId: session.userId,
        },
        select: { id: true },
      });

      if (mileage !== undefined) {
        await tx.mileageRecord.create({
          data: {
            vehicleIdentityId: vehicle.id,
            orderId: order.id,
            mileage,
            source: "QUEUE_ENTRY",
          },
        });
      }

      return { shopId: shop.id };
    })
    .catch((error: unknown) => ({ errorKey: queueActionErrorKey(error) }));

  if ("errorKey" in result) {
    return result;
  }

  redirect(`/dashboard?locale=${input.locale}&shopId=${result.shopId}`);
}

export async function startOrderAction(formData: FormData) {
  const session = await getAuthSession();

  if (!session) {
    redirect("/login?locale=ru");
  }

  const orderId = formData.get("orderId");
  const locale = safeLocale(formData.get("locale"));

  if (typeof orderId !== "string") {
    redirect(`/dashboard?locale=${locale}`);
  }

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      tenantId: session.tenantId,
      countryCode: session.countryCode,
      ...(session.role === "SHOP_OWNER" ? {} : { shopId: session.shopId }),
    },
    select: {
      id: true,
      shopId: true,
      status: true,
    },
  });

  if (!order) {
    redirect(`/dashboard?locale=${locale}`);
  }

  if (order.status === "QUEUED" || order.status === "SCHEDULED") {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "IN_PROGRESS",
        startedAt: new Date(),
      },
    });
  }

  redirect(`/dashboard/orders/${order.id}?locale=${locale}`);
}

export async function updateOrderServicesAction(formData: FormData) {
  const session = await getAuthSession();

  if (!session) {
    redirect("/login?locale=ru");
  }

  const orderId = formData.get("orderId");
  const locale = safeLocale(formData.get("locale"));

  if (typeof orderId !== "string") {
    redirect(`/dashboard?locale=${locale}`);
  }

  const selectedKeys = formData
    .getAll("serviceKey")
    .filter((value): value is ServiceItemKey => isServiceItemKey(value));
  const selectedKeySet = new Set(selectedKeys);
  const selectedItems = selectedServiceItems(selectedKeySet);
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      tenantId: session.tenantId,
      countryCode: session.countryCode,
      ...(session.role === "SHOP_OWNER" ? {} : { shopId: session.shopId }),
    },
    select: {
      id: true,
      shopId: true,
    },
  });

  if (!order) {
    redirect(`/dashboard?locale=${locale}`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.orderLine.deleteMany({
      where: {
        orderId: order.id,
        type: "LABOR",
      },
    });

    if (selectedItems.length > 0) {
      await tx.orderLine.createMany({
        data: selectedItems.map((item) => ({
          orderId: order.id,
          type: "LABOR",
          description: item.label,
          quantity: 1,
          unit: "PIECE",
          unitPriceMinor: item.priceMinor,
          totalMinor: item.priceMinor,
        })),
      });
    }

    await recalculateOrderTotals(tx, order.id);
  });

  redirect(`/dashboard/orders/${order.id}?locale=${locale}`);
}

export async function updateOrderProductsAction(formData: FormData) {
  const session = await getAuthSession();

  if (!session) {
    redirect("/login?locale=ru");
  }

  const orderId = formData.get("orderId");
  const locale = safeLocale(formData.get("locale"));

  if (typeof orderId !== "string") {
    redirect(`/dashboard?locale=${locale}`);
  }

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      tenantId: session.tenantId,
      countryCode: session.countryCode,
      ...(session.role === "SHOP_OWNER" ? {} : { shopId: session.shopId }),
    },
    select: {
      id: true,
      shopId: true,
      status: true,
    },
  });

  if (!order) {
    redirect(`/dashboard?locale=${locale}`);
  }

  if (order.status === "COMPLETED" || order.status === "CANCELLED") {
    redirect(`/dashboard/orders/${order.id}?locale=${locale}`);
  }

  const productIds = [...new Set(formData.getAll("productId").filter((value): value is string => typeof value === "string"))];
  const stocks =
    productIds.length > 0
      ? await prisma.inventoryStock.findMany({
          where: {
            shopId: order.shopId,
            productId: {
              in: productIds,
            },
            shop: {
              tenantId: session.tenantId,
              countryCode: session.countryCode,
            },
            product: {
              tenantId: session.tenantId,
              isActive: true,
            },
          },
          select: {
            productId: true,
            servicePriceMinor: true,
            product: {
              select: {
                name: true,
                brand: true,
                viscosity: true,
                baseUnit: true,
              },
            },
          },
        })
      : [];
  const stockByProductId = new Map(stocks.map((stock) => [stock.productId, stock]));

  const productLines = productIds.flatMap((productId) => {
    const stock = stockByProductId.get(productId);
    const quantityValue = formData.get(`quantity_${productId}`);

    if (!stock || typeof quantityValue !== "string" || quantityValue.trim() === "") {
      return [];
    }

    const quantityThousandths = safeQuantityThousandths(quantityValue);

    if (quantityThousandths === null) {
      return [];
    }

    if (quantityThousandths <= 0) {
      return [];
    }

    const totalMinor = calculateQuantityLineTotalMinor(stock.servicePriceMinor, quantityThousandths);
    const description = [stock.product.brand, stock.product.name, stock.product.viscosity].filter(Boolean).join(" ");

    return [
      {
        orderId: order.id,
        type: "PRODUCT" as const,
        productId,
        description,
        quantity: quantityValue.trim().replace(",", "."),
        unit: stock.product.baseUnit,
        unitPriceMinor: stock.servicePriceMinor,
        totalMinor,
      },
    ];
  });

  await prisma.$transaction(async (tx) => {
    await tx.orderLine.deleteMany({
      where: {
        orderId: order.id,
        type: "PRODUCT",
      },
    });

    if (productLines.length > 0) {
      await tx.orderLine.createMany({
        data: productLines,
      });
    }

    await recalculateOrderTotals(tx, order.id);
  });

  redirect(`/dashboard/orders/${order.id}?locale=${locale}`);
}

export async function updateOrderDiscountAction(formData: FormData) {
  const session = await getAuthSession();

  if (!session) {
    redirect("/login?locale=ru");
  }

  const orderId = formData.get("orderId");
  const locale = safeLocale(formData.get("locale"));
  const discountMinor = safeMoneyMinor(formData.get("discountAmount"));
  const reasonValue = formData.get("discountReason");
  const reason = typeof reasonValue === "string" && reasonValue.trim() ? reasonValue.trim().slice(0, 240) : null;

  if (typeof orderId !== "string") {
    redirect(`/dashboard?locale=${locale}`);
  }

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      tenantId: session.tenantId,
      countryCode: session.countryCode,
      status: {
        notIn: ["COMPLETED", "CANCELLED"],
      },
      ...(session.role === "SHOP_OWNER" ? {} : { shopId: session.shopId }),
    },
    select: {
      id: true,
      subtotalMinor: true,
    },
  });

  if (!order) {
    redirect(`/dashboard?locale=${locale}`);
  }

  const normalizedDiscountMinor = calculateDiscountMinor(order.subtotalMinor, {
    type: "FIXED",
    amountMinor: discountMinor,
  });
  const totalMinor = order.subtotalMinor - normalizedDiscountMinor;

  await prisma.$transaction(async (tx) => {
    await tx.discount.deleteMany({
      where: {
        orderId: order.id,
      },
    });

    if (normalizedDiscountMinor > 0) {
      await tx.discount.create({
        data: {
          orderId: order.id,
          type: "FIXED",
          amountMinor: normalizedDiscountMinor,
          reason,
          createdByUserId: session.userId,
        },
      });
    }

    await tx.order.update({
      where: { id: order.id },
      data: {
        discountMinor: normalizedDiscountMinor,
        totalMinor,
        debtMinor: 0,
      },
    });
  });

  redirect(`/dashboard/orders/${order.id}?locale=${locale}`);
}

export async function updateOrderStaffAction(formData: FormData) {
  const session = await getAuthSession();

  if (!session) {
    redirect("/login?locale=ru");
  }

  const orderId = formData.get("orderId");
  const locale = safeLocale(formData.get("locale"));

  if (typeof orderId !== "string") {
    redirect(`/dashboard?locale=${locale}`);
  }

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      tenantId: session.tenantId,
      countryCode: session.countryCode,
      ...(session.role === "SHOP_OWNER" ? {} : { shopId: session.shopId }),
      status: {
        not: "CANCELLED",
      },
    },
    select: {
      id: true,
      shopId: true,
    },
  });

  if (!order) {
    redirect(`/dashboard?locale=${locale}`);
  }

  const staffIds = [
    ...new Set(formData.getAll("staffId").filter((value): value is string => typeof value === "string")),
  ];
  const validMemberships =
    staffIds.length > 0
      ? await prisma.membership.findMany({
          where: {
            shopId: order.shopId,
            userId: {
              in: staffIds,
            },
            isActive: true,
            shop: {
              tenantId: session.tenantId,
              countryCode: session.countryCode,
            },
          },
          select: {
            userId: true,
          },
        })
      : [];
  const validStaffIds = validMemberships.map((membership) => membership.userId);

  await prisma.$transaction(async (tx) => {
    await tx.orderStaff.deleteMany({
      where: {
        orderId: order.id,
      },
    });

    if (validStaffIds.length > 0) {
      await tx.orderStaff.createMany({
        data: validStaffIds.map((userId) => ({
          orderId: order.id,
          userId,
          roleInOrder: "SERVICE",
        })),
        skipDuplicates: true,
      });
    }
  });

  redirect(`/dashboard/orders/${order.id}?locale=${locale}`);
}

export async function linkVehicleCatalogAction(formData: FormData) {
  const session = await getAuthSession();

  if (!session) {
    redirect("/login?locale=ru");
  }

  const parsed = vehicleCatalogLinkSchema.safeParse({
    locale: formData.get("locale"),
    orderId: formData.get("orderId"),
    catalogId: formData.get("catalogId"),
  });

  if (!parsed.success) {
    redirect("/dashboard?locale=ru");
  }

  const input = parsed.data;
  const order = await prisma.order.findFirst({
    where: {
      id: input.orderId,
      tenantId: session.tenantId,
      countryCode: session.countryCode,
      ...(session.role === "SHOP_OWNER" ? {} : { shopId: session.shopId }),
    },
    select: {
      id: true,
      shopId: true,
      vehicleIdentityId: true,
      vehicleIdentity: {
        select: {
          catalogId: true,
        },
      },
    },
  });

  if (!order?.vehicleIdentityId) {
    redirect(`/dashboard?locale=${input.locale}`);
  }

  const catalog = await prisma.vehicleCatalog.findFirst({
    where: {
      id: input.catalogId,
      countryCode: session.countryCode,
    },
    select: {
      id: true,
    },
  });

  if (!catalog) {
    redirect(`/dashboard/orders/${order.id}?locale=${input.locale}`);
  }

  const vehicleIdentityId = order.vehicleIdentityId;

  await prisma.$transaction(async (tx) => {
    await tx.vehicleIdentity.update({
      where: {
        id: vehicleIdentityId,
        countryCode: session.countryCode,
      },
      data: {
        catalogId: catalog.id,
        lastEditedByShopId: order.shopId,
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: session.tenantId,
        shopId: order.shopId,
        userId: session.userId,
        action: "vehicle.catalog.link",
        entity: "VehicleIdentity",
        entityId: vehicleIdentityId,
        beforeJson: {
          catalogId: order.vehicleIdentity?.catalogId,
        },
        afterJson: {
          catalogId: catalog.id,
        },
      },
    });
  });

  redirect(`/dashboard/orders/${order.id}?locale=${input.locale}`);
}

export async function completeOrderAction(formData: FormData) {
  const session = await getAuthSession();

  if (!session) {
    redirect("/login?locale=ru");
  }

  const orderId = formData.get("orderId");
  const locale = safeLocale(formData.get("locale"));
  const paymentMethod = safePaymentMethod(formData.get("paymentMethod"));
  const paidMinor = safePaidMinor(formData.get("paidAmount"));

  if (typeof orderId !== "string" || !paymentMethod) {
    redirect(`/dashboard?locale=${locale}`);
  }

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      tenantId: session.tenantId,
      countryCode: session.countryCode,
      ...(session.role === "SHOP_OWNER" ? {} : { shopId: session.shopId }),
    },
    select: {
      id: true,
      shopId: true,
      customerId: true,
      vehicleIdentityId: true,
      mileage: true,
      totalMinor: true,
      currency: true,
      status: true,
      vehicleIdentity: {
        select: {
          catalogId: true,
          make: true,
          model: true,
          year: true,
        },
      },
    },
  });

  if (!order?.vehicleIdentityId || order.mileage === null) {
    redirect(`/dashboard?locale=${locale}`);
  }

  if (order.status === "COMPLETED" || order.status === "CANCELLED") {
    redirect(`/dashboard/orders/${order.id}?locale=${locale}`);
  }

  const vehicleIdentityId = order.vehicleIdentityId;
  const mileage = order.mileage;
  const normalizedPaidMinor = Math.min(paidMinor, order.totalMinor);
  const debtMinor = Math.max(0, order.totalMinor - normalizedPaidMinor);
  const paymentStatus = debtMinor > 0 ? (normalizedPaidMinor > 0 ? "PARTIALLY_PAID" : "DEBT") : "PAID";

  await prisma.$transaction(async (tx) => {
    const completedAt = new Date();
    const completedOrder = await tx.order.updateMany({
      where: {
        id: order.id,
        tenantId: session.tenantId,
        countryCode: session.countryCode,
        status: {
          notIn: ["COMPLETED", "CANCELLED"],
        },
      },
      data: {
        status: "COMPLETED",
        paidMinor: normalizedPaidMinor,
        debtMinor,
        paymentStatus,
        paymentMethod,
        completedByUserId: session.userId,
        completedAt,
      },
    });

    if (completedOrder.count === 0) {
      return;
    }

    const productLines = await tx.orderLine.findMany({
      where: {
        orderId: order.id,
        type: "PRODUCT",
        productId: {
          not: null,
        },
      },
      select: {
        productId: true,
        quantity: true,
        unit: true,
      },
    });

    const existingProductOutMovement = await tx.stockMovement.findFirst({
      where: {
        orderId: order.id,
        shopId: order.shopId,
        type: "OUT",
      },
      select: {
        id: true,
      },
    });

    if (!existingProductOutMovement) {
      for (const line of productLines) {
        if (!line.productId) {
          continue;
        }

        await tx.inventoryStock.updateMany({
          where: {
            shopId: order.shopId,
            productId: line.productId,
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
              decrement: line.quantity,
            },
          },
        });

        await tx.stockMovement.create({
          data: {
            shopId: order.shopId,
            productId: line.productId,
            type: "OUT",
            quantity: line.quantity,
            unit: line.unit,
            orderId: order.id,
            createdByUserId: session.userId,
            comment: "Service order completion",
          },
        });
      }
    }

    if (normalizedPaidMinor > 0) {
      await tx.payment.create({
        data: {
          orderId: order.id,
          customerId: order.customerId,
          amountMinor: normalizedPaidMinor,
          method: paymentMethod,
          status: paymentStatus,
          createdByUserId: session.userId,
        },
      });
    }

    if (debtMinor > 0 && order.customerId) {
      await tx.customerDebt.create({
        data: {
          customerId: order.customerId,
          shopId: order.shopId,
          amountMinor: debtMinor,
          currency: order.currency,
          status: "DEBT",
          createdFromOrderId: order.id,
        },
      });
    }

    const recommendation = order.vehicleIdentity
      ? await loadServiceForecastRecommendation(tx, session.countryCode, order.vehicleIdentity)
      : null;
    const previousRecords = await tx.serviceRecord.findMany({
      where: {
        vehicleIdentityId,
        orderId: {
          not: order.id,
        },
      },
      select: {
        mileage: true,
        nextServiceDate: true,
        nextServiceMileage: true,
        serviceDate: true,
      },
      orderBy: {
        serviceDate: "desc",
      },
      take: 1,
    });
    const forecast = calculateServiceForecast(
      [
        {
          mileage,
          serviceDate: completedAt,
          nextServiceMileage: null,
          nextServiceDate: null,
        },
        ...previousRecords,
      ],
      recommendation,
    );

    await tx.serviceRecord.upsert({
      where: { orderId: order.id },
      update: {
        mileage,
        nextServiceDate: forecast.nextDate,
        nextServiceMileage: forecast.nextMileage,
        serviceDate: completedAt,
      },
      create: {
        vehicleIdentityId,
        orderId: order.id,
        shopId: order.shopId,
        countryCode: session.countryCode,
        mileage,
        nextServiceDate: forecast.nextDate,
        nextServiceMileage: forecast.nextMileage,
        serviceDate: completedAt,
      },
    });

    const existingQr = await tx.vehicleQR.findUnique({
      where: { vehicleIdentityId },
      select: { id: true },
    });

    if (!existingQr) {
      await tx.vehicleQR.create({
        data: {
          vehicleIdentityId,
          slug: createQrSlug(),
        },
      });
    }
  });

  redirect(`/dashboard/orders/${order.id}?locale=${locale}`);
}

export async function payCustomerDebtAction(formData: FormData) {
  const session = await getAuthSession();

  if (!session) {
    redirect("/login?locale=ru");
  }

  const debtId = formData.get("debtId");
  const shopId = formData.get("shopId");
  const locale = safeLocale(formData.get("locale"));
  const paymentMethod = safePaymentMethod(formData.get("paymentMethod"));
  const amountMinor = safePaidMinor(formData.get("amount"));

  if (typeof debtId !== "string" || typeof shopId !== "string" || !paymentMethod || amountMinor <= 0) {
    redirect(`/dashboard?locale=${locale}`);
  }

  if (session.role !== "SHOP_OWNER" && shopId !== session.shopId) {
    redirect(`/dashboard?locale=${locale}&shopId=${session.shopId}`);
  }

  const debt = await prisma.customerDebt.findFirst({
    where: {
      id: debtId,
      shopId,
      amountMinor: {
        gt: 0,
      },
      customer: {
        tenantId: session.tenantId,
        countryCode: session.countryCode,
        shopId,
      },
    },
    select: {
      id: true,
      amountMinor: true,
    },
  });

  if (!debt) {
    redirect(`/dashboard?locale=${locale}&shopId=${shopId}`);
  }

  const normalizedAmountMinor = Math.min(amountMinor, debt.amountMinor);
  const remainingMinor = debt.amountMinor - normalizedAmountMinor;

  await prisma.$transaction(async (tx) => {
    await tx.customerDebtPayment.create({
      data: {
        customerDebtId: debt.id,
        amountMinor: normalizedAmountMinor,
        paymentMethod,
        createdByUserId: session.userId,
      },
    });

    await tx.customerDebt.update({
      where: {
        id: debt.id,
      },
      data: {
        amountMinor: remainingMinor,
        status: remainingMinor > 0 ? "DEBT" : "PAID",
      },
    });
  });

  redirect(`/dashboard?locale=${locale}&shopId=${shopId}`);
}

export async function addExpenseAction(formData: FormData) {
  const session = await getAuthSession();

  if (!session) {
    redirect("/login?locale=ru");
  }

  const locale = safeLocale(formData.get("locale"));
  const parsed = createExpenseSchema.safeParse({
    amount: formData.get("amount"),
    category: formData.get("category"),
    comment: formData.get("comment"),
    locale: formData.get("locale"),
    shopId: formData.get("shopId"),
  });

  if (!canAccessAppRoute(session.role, "finance")) {
    redirect(`/dashboard?locale=${locale}`);
  }

  if (!parsed.success) {
    redirect(`/dashboard?locale=${locale}`);
  }

  const input = parsed.data;
  const amountMinor = parseMoneyToMinor(input.amount);

  if (session.role !== "SHOP_OWNER" && input.shopId !== session.shopId) {
    redirect(`/dashboard?locale=${locale}&shopId=${session.shopId}`);
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
      currency: true,
    },
  });

  if (!shop) {
    redirect(`/dashboard?locale=${locale}`);
  }

  await prisma.$transaction(async (tx) => {
    const existingCategory = await tx.expenseCategory.findFirst({
      where: {
        tenantId: session.tenantId,
        name: input.category,
        type: "MANUAL",
      },
      select: {
        id: true,
      },
    });
    const category =
      existingCategory ??
      (await tx.expenseCategory.create({
        data: {
          tenantId: session.tenantId,
          name: input.category,
          type: "MANUAL",
        },
        select: {
          id: true,
        },
      }));

    await tx.expense.create({
      data: {
        tenantId: session.tenantId,
        shopId: shop.id,
        categoryId: category.id,
        amountMinor,
        currency: shop.currency,
        date: new Date(),
        source: "MANUAL",
        comment: input.comment,
        createdByUserId: session.userId,
      },
    });
  });

  redirect(`/dashboard?locale=${locale}&shopId=${shop.id}`);
}

function queueActionErrorKey(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return "dashboard.queue.error.duplicate";
  }

  return "dashboard.queue.error.unexpected";
}

function safeLocale(value: FormDataEntryValue | null): "az" | "ru" | "en" {
  return value === "az" || value === "ru" || value === "en" ? value : "az";
}

function safePaymentMethod(value: FormDataEntryValue | null): "CASH" | "CARD" | "TRANSFER" | "OTHER" | null {
  return value === "CASH" || value === "CARD" || value === "TRANSFER" || value === "OTHER" ? value : null;
}

function safeMoneyMinor(value: FormDataEntryValue | null): number {
  if (typeof value !== "string" || value.trim() === "") {
    return 0;
  }

  try {
    return parseMoneyToMinor(value);
  } catch {
    return 0;
  }
}

function safePaidMinor(value: FormDataEntryValue | null): number {
  return safeMoneyMinor(value);
}

function safeQuantityThousandths(value: string): number | null {
  try {
    return parseQuantityToThousandths(value);
  } catch {
    return null;
  }
}

async function recalculateOrderTotals(tx: Prisma.TransactionClient, orderId: string) {
  const currentOrder = await tx.order.findUnique({
    where: { id: orderId },
    select: {
      discountMinor: true,
    },
  });
  const lineTotals = await tx.orderLine.findMany({
    where: {
      orderId,
    },
    select: {
      totalMinor: true,
    },
  });
  const subtotalMinor = addMinorUnits(lineTotals.map((line) => line.totalMinor));
  const discountMinor = calculateDiscountMinor(subtotalMinor, {
    type: "FIXED",
    amountMinor: currentOrder?.discountMinor ?? 0,
  });

  await tx.order.update({
    where: { id: orderId },
    data: {
      subtotalMinor,
      totalMinor: subtotalMinor - discountMinor,
      discountMinor,
      debtMinor: 0,
    },
  });

  if (discountMinor === 0) {
    await tx.discount.deleteMany({
      where: { orderId },
    });
  } else if (currentOrder && discountMinor !== currentOrder.discountMinor) {
    await tx.discount.updateMany({
      where: { orderId },
      data: {
        amountMinor: discountMinor,
      },
    });
  }
}

type VehicleForServiceRecommendation = {
  catalogId: string | null;
  make: string;
  model: string;
  year: number | null;
};

async function loadServiceForecastRecommendation(
  tx: Prisma.TransactionClient,
  countryCode: string,
  vehicle: VehicleForServiceRecommendation,
) {
  const where: Prisma.VehicleCatalogWhereInput = vehicle.catalogId
    ? {
        id: vehicle.catalogId,
        countryCode,
      }
    : {
        countryCode,
        make: {
          equals: vehicle.make,
          mode: "insensitive",
        },
        model: {
          equals: vehicle.model,
          mode: "insensitive",
        },
        ...(vehicle.year
          ? {
              AND: [
                {
                  OR: [{ yearFrom: null }, { yearFrom: { lte: vehicle.year } }],
                },
                {
                  OR: [{ yearTo: null }, { yearTo: { gte: vehicle.year } }],
                },
              ],
            }
          : {}),
      };
  const catalog = await tx.vehicleCatalog.findFirst({
    where,
    select: {
      recommendations: {
        where: {
          fluidType: "ENGINE_OIL",
          status: {
            in: ["PENDING", "APPROVED"],
          },
        },
        select: {
          intervalKm: true,
          intervalMonths: true,
          priority: true,
          source: true,
          status: true,
        },
      },
    },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
  });

  const recommendation = pickServiceRecommendation(
    (catalog?.recommendations ?? []) satisfies readonly ServiceRecommendationCandidate[],
  );

  return recommendation
    ? {
        intervalKm: recommendation.intervalKm,
        intervalMonths: recommendation.intervalMonths,
      }
    : null;
}
