"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { getAuthSession } from "@/lib/auth-session";
import { vehicleCatalogRecommendationSchema, vehicleCatalogSchema } from "@/lib/catalog-schema";
import { prisma } from "@/lib/prisma";

export async function addVehicleCatalogAction(formData: FormData) {
  const session = await getAuthSession();

  if (!session) {
    redirect("/login?locale=ru");
  }

  const parsed = vehicleCatalogSchema.safeParse({
    locale: formData.get("locale"),
    shopId: formData.get("shopId"),
    make: formData.get("make"),
    model: formData.get("model"),
    generation: formData.get("generation"),
    yearFrom: formData.get("yearFrom"),
    yearTo: formData.get("yearTo"),
    engineCode: formData.get("engineCode"),
    engineVolume: formData.get("engineVolume"),
    fuelType: formData.get("fuelType"),
    transmission: formData.get("transmission"),
    bodyType: formData.get("bodyType"),
  });

  if (!parsed.success) {
    redirect("/library?locale=ru&error=validation");
  }

  const input = parsed.data;
  const shop = await findSessionShop(input.shopId, session.tenantId, session.countryCode);

  if (!shop) {
    redirect(`/library?locale=${input.locale}&error=shop`);
  }

  const catalog = await prisma.vehicleCatalog.create({
    data: {
      countryCode: session.countryCode,
      make: input.make,
      model: input.model,
      generation: input.generation,
      yearFrom: input.yearFrom,
      yearTo: input.yearTo,
      engineCode: input.engineCode,
      engineVolume: input.engineVolume ? new Prisma.Decimal(input.engineVolume) : undefined,
      fuelType: input.fuelType,
      transmission: input.transmission,
      bodyType: input.bodyType,
      status: "PENDING",
      createdByUserId: session.userId,
    },
    select: {
      id: true,
    },
  });

  redirect(`/library?locale=${input.locale}&shopId=${shop.id}&catalogId=${catalog.id}`);
}

export async function addVehicleCatalogRecommendationAction(formData: FormData) {
  const session = await getAuthSession();

  if (!session) {
    redirect("/login?locale=ru");
  }

  const parsed = vehicleCatalogRecommendationSchema.safeParse({
    locale: formData.get("locale"),
    shopId: formData.get("shopId"),
    catalogId: formData.get("catalogId"),
    fluidType: formData.get("fluidType"),
    viscosity: formData.get("viscosity"),
    specification: formData.get("specification"),
    volumeLiters: formData.get("volumeLiters"),
    intervalKm: formData.get("intervalKm"),
    intervalMonths: formData.get("intervalMonths"),
    priority: formData.get("priority"),
  });

  if (!parsed.success) {
    redirect("/library?locale=ru&error=recommendationValidation");
  }

  const input = parsed.data;
  const [shop, catalog] = await Promise.all([
    findSessionShop(input.shopId, session.tenantId, session.countryCode),
    prisma.vehicleCatalog.findFirst({
      where: {
        id: input.catalogId,
        countryCode: session.countryCode,
      },
      select: {
        id: true,
      },
    }),
  ]);

  if (!shop || !catalog) {
    redirect(`/library?locale=${input.locale}&shopId=${input.shopId}&error=notFound`);
  }

  await prisma.vehicleCatalogRecommendation.create({
    data: {
      catalogId: catalog.id,
      fluidType: input.fluidType,
      viscosity: input.viscosity,
      specification: input.specification,
      volumeLiters: new Prisma.Decimal(input.volumeLiters),
      intervalKm: input.intervalKm,
      intervalMonths: input.intervalMonths,
      priority: input.priority,
      source: "SHOP",
      status: "PENDING",
      createdByUserId: session.userId,
    },
  });

  redirect(`/library?locale=${input.locale}&shopId=${shop.id}&catalogId=${catalog.id}`);
}

async function findSessionShop(shopId: string, tenantId: string, countryCode: string) {
  return prisma.shop.findFirst({
    where: {
      id: shopId,
      tenantId,
      countryCode,
      isActive: true,
    },
    select: {
      id: true,
    },
  });
}
