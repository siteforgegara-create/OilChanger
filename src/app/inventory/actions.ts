"use server";

import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth-session";
import { inventoryProductSchema } from "@/lib/inventory-product-schema";
import { parseMoneyToMinor } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export type InventoryActionState = {
  errorKey?: string;
};

const DEFAULT_INVENTORY_STATE: InventoryActionState = {};
const DELETE_CONFIRMATION = "DELETE";

export async function addInventoryProductAction(
  _state: InventoryActionState = DEFAULT_INVENTORY_STATE,
  formData: FormData,
) {
  const session = await getAuthSession();

  if (!session) {
    return { errorKey: "inventory.error.auth" };
  }

  const parsed = inventoryProductSchema.safeParse({
    shopId: formData.get("shopId"),
    locale: formData.get("locale"),
    category: formData.get("category"),
    name: formData.get("name"),
    brand: formData.get("brand"),
    viscosity: formData.get("viscosity"),
    specification: formData.get("specification"),
    baseUnit: formData.get("baseUnit"),
    quantity: formData.get("quantity"),
    minQuantity: formData.get("minQuantity"),
    purchasePrice: formData.get("purchasePrice"),
    salePrice: formData.get("salePrice"),
    servicePrice: formData.get("servicePrice"),
    suggestedDiscount: formData.get("suggestedDiscount"),
  });

  if (!parsed.success) {
    return { errorKey: "inventory.error.validation" };
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
    return { errorKey: "inventory.error.shop" };
  }

  const purchasePriceMinor = parseMoneyToMinor(input.purchasePrice);
  const salePriceMinor = parseMoneyToMinor(input.salePrice);
  const servicePriceMinor = parseMoneyToMinor(input.servicePrice);
  const suggestedDiscountMinor = input.suggestedDiscount ? parseMoneyToMinor(input.suggestedDiscount) : undefined;

  await prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        tenantId: session.tenantId,
        category: input.category,
        name: input.name,
        brand: input.brand,
        viscosity: input.viscosity,
        specification: input.specification,
        baseUnit: input.baseUnit,
      },
      select: {
        id: true,
      },
    });

    await tx.inventoryStock.create({
      data: {
        shopId: shop.id,
        productId: product.id,
        quantity: input.quantity,
        minQuantity: input.minQuantity,
        purchasePriceMinor,
        salePriceMinor,
        servicePriceMinor,
        suggestedDiscountMinor,
        currency: shop.currency,
      },
    });

    await tx.stockMovement.create({
      data: {
        shopId: shop.id,
        productId: product.id,
        type: "IN",
        quantity: input.quantity,
        unit: input.baseUnit,
        createdByUserId: session.userId,
        comment: "Initial stock",
      },
    });
  });

  redirect(`/inventory?locale=${input.locale}&shopId=${shop.id}`);
}

export async function deleteInventoryStockAction(formData: FormData) {
  const session = await getAuthSession();

  if (!session) {
    redirect("/login?locale=ru");
  }

  const stockIds = formData.getAll("stockId").filter((value): value is string => typeof value === "string");
  const shopId = formData.get("shopId");
  const locale = safeLocale(formData.get("locale"));
  const confirmation = formData.get("confirmation");

  if (stockIds.length === 0 || typeof shopId !== "string") {
    redirect(`/inventory?locale=${locale}&deleteError=validation`);
  }

  if (confirmation !== DELETE_CONFIRMATION) {
    redirect(`/inventory?locale=${locale}&shopId=${shopId}&deleteError=confirmation`);
  }

  const stocks = await prisma.inventoryStock.findMany({
    where: {
      id: {
        in: stockIds,
      },
      shopId,
      shop: {
        tenantId: session.tenantId,
        countryCode: session.countryCode,
        isActive: true,
      },
      product: {
        tenantId: session.tenantId,
      },
    },
    select: {
      id: true,
      shopId: true,
      productId: true,
      quantity: true,
      minQuantity: true,
      purchasePriceMinor: true,
      salePriceMinor: true,
      servicePriceMinor: true,
      suggestedDiscountMinor: true,
      currency: true,
      product: {
        select: {
          name: true,
          brand: true,
          viscosity: true,
          category: true,
          baseUnit: true,
        },
      },
    },
  });

  if (stocks.length !== stockIds.length) {
    redirect(`/inventory?locale=${locale}&shopId=${shopId}&deleteError=notFound`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.inventoryStock.deleteMany({
      where: {
        id: {
          in: stocks.map((stock) => stock.id),
        },
      },
    });

    const productIds = [...new Set(stocks.map((stock) => stock.productId))];

    for (const productId of productIds) {
      const remainingStocks = await tx.inventoryStock.count({
        where: {
          productId,
          shop: {
            tenantId: session.tenantId,
            countryCode: session.countryCode,
          },
        },
      });

      if (remainingStocks === 0) {
        await tx.product.update({
          where: {
            id: productId,
          },
          data: {
            isActive: false,
          },
        });
      }
    }

    await tx.auditLog.createMany({
      data: stocks.map((stock) => ({
        tenantId: session.tenantId,
        shopId: stock.shopId,
        userId: session.userId,
        action: "inventory.stock.delete",
        entity: "InventoryStock",
        entityId: stock.id,
        beforeJson: {
          stockId: stock.id,
          productId: stock.productId,
          productName: stock.product.name,
          productBrand: stock.product.brand,
          productViscosity: stock.product.viscosity,
          productCategory: stock.product.category,
          productBaseUnit: stock.product.baseUnit,
          quantity: stock.quantity.toString(),
          minQuantity: stock.minQuantity.toString(),
          purchasePriceMinor: stock.purchasePriceMinor,
          salePriceMinor: stock.salePriceMinor,
          servicePriceMinor: stock.servicePriceMinor,
          suggestedDiscountMinor: stock.suggestedDiscountMinor,
          currency: stock.currency,
        },
      })),
    });
  });

  redirect(`/inventory?locale=${locale}&shopId=${shopId}`);
}

function safeLocale(value: FormDataEntryValue | null): "az" | "ru" | "en" {
  return value === "az" || value === "ru" || value === "en" ? value : "az";
}
