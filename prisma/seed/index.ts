import { Prisma, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { countrySeeds, languageSeeds, translationSeeds } from "../../src/i18n/catalog";
import { getSubscriptionPlanLimits } from "../../src/lib/subscription-plans";

const prisma = new PrismaClient();

async function main() {
  for (const language of languageSeeds) {
    await prisma.language.upsert({
      where: { code: language.code },
      update: language,
      create: language,
    });
  }

  for (const country of countrySeeds) {
    await prisma.country.upsert({
      where: { code: country.code },
      update: country,
      create: country,
    });
  }

  for (const item of translationSeeds) {
    const translationKey = await prisma.translationKey.upsert({
      where: {
        namespace_key: {
          namespace: item.namespace,
          key: item.key,
        },
      },
      update: {
        isTechnical: item.isTechnical,
      },
      create: {
        namespace: item.namespace,
        key: item.key,
        isTechnical: item.isTechnical,
      },
    });

    for (const language of languageSeeds) {
      await prisma.translation.upsert({
        where: {
          keyId_languageCode: {
            keyId: translationKey.id,
            languageCode: language.code,
          },
        },
        update: {
          value: item.values[language.code],
        },
        create: {
          keyId: translationKey.id,
          languageCode: language.code,
          value: item.values[language.code],
        },
      });
    }
  }

  const platformPassword = process.env.PLATFORM_OWNER_PASSWORD ?? "Admin12345!";

  const platformOwner = await prisma.user.upsert({
    where: {
      email: "admin@oilchanger.local",
    },
    update: {
      name: "Platform Owner",
      role: "PLATFORM_OWNER",
    },
    create: {
      email: "admin@oilchanger.local",
      name: "Platform Owner",
      passwordHash: await bcrypt.hash(platformPassword, 12),
      role: "PLATFORM_OWNER",
      locale: "ru",
      emailVerified: true,
    },
  });

  const demoPassword = process.env.DEMO_USER_PASSWORD ?? "Demo12345!";
  const demoPasswordHash = await bcrypt.hash(demoPassword, 12);
  const demoPlan = "PRO";
  const demoPlanLimits = getSubscriptionPlanLimits(demoPlan);

  const shopOwner = await prisma.user.upsert({
    where: {
      email: "owner@demo.oilchanger.local",
    },
    update: {
      name: "Demo Shop Owner",
      passwordHash: demoPasswordHash,
      role: "SHOP_OWNER",
      locale: "ru",
      emailVerified: true,
    },
    create: {
      email: "owner@demo.oilchanger.local",
      name: "Demo Shop Owner",
      passwordHash: demoPasswordHash,
      role: "SHOP_OWNER",
      locale: "ru",
      emailVerified: true,
    },
  });

  const branchAdmin = await prisma.user.upsert({
    where: {
      email: "branch.admin@demo.oilchanger.local",
    },
    update: {
      name: "Demo Branch Admin",
      passwordHash: demoPasswordHash,
      role: "BRANCH_ADMIN",
      locale: "ru",
      emailVerified: true,
    },
    create: {
      email: "branch.admin@demo.oilchanger.local",
      name: "Demo Branch Admin",
      passwordHash: demoPasswordHash,
      role: "BRANCH_ADMIN",
      locale: "ru",
      emailVerified: true,
    },
  });

  const mechanic = await prisma.user.upsert({
    where: {
      email: "mechanic@demo.oilchanger.local",
    },
    update: {
      name: "Demo Mechanic",
      passwordHash: demoPasswordHash,
      role: "MECHANIC",
      locale: "ru",
      emailVerified: true,
    },
    create: {
      email: "mechanic@demo.oilchanger.local",
      name: "Demo Mechanic",
      passwordHash: demoPasswordHash,
      role: "MECHANIC",
      locale: "ru",
      emailVerified: true,
    },
  });

  const existingDemoTenant = await prisma.tenant.findFirst({
    where: {
      ownerUserId: shopOwner.id,
      name: "Demo Oil Service",
      countryCode: "AZ",
    },
  });

  const demoTenant = existingDemoTenant
    ? await prisma.tenant.update({
        where: { id: existingDemoTenant.id },
        data: {
          name: "Demo Oil Service",
          countryCode: "AZ",
          plan: demoPlan,
        },
      })
    : await prisma.tenant.create({
        data: {
          ownerUserId: shopOwner.id,
          countryCode: "AZ",
          name: "Demo Oil Service",
          plan: demoPlan,
        },
      });

  await prisma.subscription.upsert({
    where: {
      tenantId: demoTenant.id,
    },
    update: {
      plan: demoPlan,
      status: "ACTIVE",
      maxShops: demoPlanLimits.maxShops,
      maxStaff: demoPlanLimits.maxStaff,
      aiMonthlyLimitMinorUsd: demoPlanLimits.aiMonthlyLimitMinorUsd,
    },
    create: {
      tenantId: demoTenant.id,
      plan: demoPlan,
      status: "ACTIVE",
      maxShops: demoPlanLimits.maxShops,
      maxStaff: demoPlanLimits.maxStaff,
      aiMonthlyLimitMinorUsd: demoPlanLimits.aiMonthlyLimitMinorUsd,
    },
  });

  const existingDemoShop = await prisma.shop.findFirst({
    where: {
      tenantId: demoTenant.id,
      name: "Demo Main Branch",
    },
  });

  const demoShop = existingDemoShop
    ? await prisma.shop.update({
        where: { id: existingDemoShop.id },
        data: {
          countryCode: "AZ",
          address: "Baku, Azerbaijan",
          lat: new Prisma.Decimal("40.4093"),
          lng: new Prisma.Decimal("49.8671"),
          timezone: "Asia/Baku",
          currency: "AZN",
          locale: "ru",
          isActive: true,
        },
      })
    : await prisma.shop.create({
        data: {
          tenantId: demoTenant.id,
          countryCode: "AZ",
          name: "Demo Main Branch",
          address: "Baku, Azerbaijan",
          lat: new Prisma.Decimal("40.4093"),
          lng: new Prisma.Decimal("49.8671"),
          timezone: "Asia/Baku",
          currency: "AZN",
          locale: "ru",
        },
      });

  const existingSecondShop = await prisma.shop.findFirst({
    where: {
      tenantId: demoTenant.id,
      name: "Demo Second Branch",
    },
  });

  if (existingSecondShop) {
    await prisma.shop.update({
      where: { id: existingSecondShop.id },
      data: {
        countryCode: "AZ",
        address: "Sumqayit, Azerbaijan",
        lat: new Prisma.Decimal("40.5858"),
        lng: new Prisma.Decimal("49.6317"),
        timezone: "Asia/Baku",
        currency: "AZN",
        locale: "ru",
        isActive: true,
      },
    });
  } else {
    await prisma.shop.create({
      data: {
        tenantId: demoTenant.id,
        countryCode: "AZ",
        name: "Demo Second Branch",
        address: "Sumqayit, Azerbaijan",
        lat: new Prisma.Decimal("40.5858"),
        lng: new Prisma.Decimal("49.6317"),
        timezone: "Asia/Baku",
        currency: "AZN",
        locale: "ru",
      },
    });
  }

  await prisma.membership.upsert({
    where: {
      userId_shopId: {
        userId: shopOwner.id,
        shopId: demoShop.id,
      },
    },
    update: {
      role: "SHOP_OWNER",
      isActive: true,
    },
    create: {
      userId: shopOwner.id,
      shopId: demoShop.id,
      role: "SHOP_OWNER",
      isActive: true,
    },
  });

  await prisma.membership.upsert({
    where: {
      userId_shopId: {
        userId: branchAdmin.id,
        shopId: demoShop.id,
      },
    },
    update: {
      role: "BRANCH_ADMIN",
      isActive: true,
    },
    create: {
      userId: branchAdmin.id,
      shopId: demoShop.id,
      role: "BRANCH_ADMIN",
      isActive: true,
    },
  });

  await prisma.membership.upsert({
    where: {
      userId_shopId: {
        userId: mechanic.id,
        shopId: demoShop.id,
      },
    },
    update: {
      role: "MECHANIC",
      isActive: true,
    },
    create: {
      userId: mechanic.id,
      shopId: demoShop.id,
      role: "MECHANIC",
      isActive: true,
    },
  });

  const demoEngineOil = await ensureProduct({
    tenantId: demoTenant.id,
    category: "ENGINE_OIL",
    name: "Demo 5W-30 Engine Oil",
    brand: "DemoOil",
    viscosity: "5W-30",
    specification: "API SP",
    baseUnit: "LITER",
  });

  await prisma.inventoryStock.upsert({
    where: {
      shopId_productId: {
        shopId: demoShop.id,
        productId: demoEngineOil.id,
      },
    },
    update: {
      quantity: new Prisma.Decimal("40"),
      minQuantity: new Prisma.Decimal("5"),
      purchasePriceMinor: 1200,
      salePriceMinor: 1800,
      servicePriceMinor: 2000,
      suggestedDiscountMinor: 100,
      currency: "AZN",
    },
    create: {
      shopId: demoShop.id,
      productId: demoEngineOil.id,
      quantity: new Prisma.Decimal("40"),
      minQuantity: new Prisma.Decimal("5"),
      purchasePriceMinor: 1200,
      salePriceMinor: 1800,
      servicePriceMinor: 2000,
      suggestedDiscountMinor: 100,
      currency: "AZN",
    },
  });

  const demoOilFilter = await ensureProduct({
    tenantId: demoTenant.id,
    category: "OIL_FILTER",
    name: "Demo Oil Filter",
    brand: "DemoParts",
    viscosity: null,
    specification: "Toyota/Lexus compatible",
    baseUnit: "PIECE",
  });

  await prisma.inventoryStock.upsert({
    where: {
      shopId_productId: {
        shopId: demoShop.id,
        productId: demoOilFilter.id,
      },
    },
    update: {
      quantity: new Prisma.Decimal("20"),
      minQuantity: new Prisma.Decimal("3"),
      purchasePriceMinor: 500,
      salePriceMinor: 800,
      servicePriceMinor: 1000,
      suggestedDiscountMinor: 0,
      currency: "AZN",
    },
    create: {
      shopId: demoShop.id,
      productId: demoOilFilter.id,
      quantity: new Prisma.Decimal("20"),
      minQuantity: new Prisma.Decimal("3"),
      purchasePriceMinor: 500,
      salePriceMinor: 800,
      servicePriceMinor: 1000,
      suggestedDiscountMinor: 0,
      currency: "AZN",
    },
  });

  await ensureServiceCatalogItem({
    tenantId: demoTenant.id,
    name: "Oil change labor",
    category: "service",
    defaultPriceMinor: 1500,
    currency: "AZN",
  });

  await ensureExpenseCategory({
    tenantId: demoTenant.id,
    name: "Inventory purchase",
    type: "inventory",
  });

  await ensureExpenseCategory({
    tenantId: demoTenant.id,
    name: "Rent",
    type: "fixed",
  });

  const demoCatalog = await ensureVehicleCatalog({
    countryCode: "AZ",
    make: "Toyota",
    model: "Camry",
    generation: "XV70",
    yearFrom: 2018,
    yearTo: 2024,
    engineCode: "A25A-FKS",
    engineVolume: new Prisma.Decimal("2.5"),
    fuelType: "Gasoline",
    transmission: "Automatic",
    bodyType: "Sedan",
    status: "APPROVED",
    createdByUserId: platformOwner.id,
    approvedByUserId: platformOwner.id,
  });

  await ensureVehicleCatalogRecommendation({
    catalogId: demoCatalog.id,
    fluidType: "ENGINE_OIL",
    viscosity: "0W-20",
    specification: "API SP / ILSAC GF-6",
    volumeLiters: new Prisma.Decimal("4.5"),
    intervalKm: 8000,
    intervalMonths: 6,
    priority: "RECOMMENDED",
    source: "PLATFORM",
    status: "APPROVED",
    createdByUserId: platformOwner.id,
  });
}

async function ensureProduct(input: {
  tenantId: string;
  category: "ENGINE_OIL" | "TRANSMISSION_OIL" | "POWER_STEERING_FLUID" | "OIL_FILTER" | "AIR_FILTER" | "CABIN_FILTER" | "FUEL_FILTER" | "OTHER";
  name: string;
  brand: string | null;
  viscosity: string | null;
  specification: string | null;
  baseUnit: "LITER" | "PIECE" | "PACKAGE";
}) {
  const existing = await prisma.product.findFirst({
    where: {
      tenantId: input.tenantId,
      category: input.category,
      name: input.name,
    },
  });

  if (existing) {
    return prisma.product.update({
      where: { id: existing.id },
      data: {
        brand: input.brand,
        viscosity: input.viscosity,
        specification: input.specification,
        baseUnit: input.baseUnit,
        isActive: true,
      },
    });
  }

  return prisma.product.create({
    data: {
      tenantId: input.tenantId,
      category: input.category,
      name: input.name,
      brand: input.brand,
      viscosity: input.viscosity,
      specification: input.specification,
      baseUnit: input.baseUnit,
      isActive: true,
    },
  });
}

async function ensureServiceCatalogItem(input: {
  tenantId: string;
  name: string;
  category: string;
  defaultPriceMinor: number;
  currency: string;
}) {
  const existing = await prisma.serviceCatalogItem.findFirst({
    where: {
      tenantId: input.tenantId,
      name: input.name,
      category: input.category,
    },
  });

  if (existing) {
    return prisma.serviceCatalogItem.update({
      where: { id: existing.id },
      data: {
        defaultPriceMinor: input.defaultPriceMinor,
        currency: input.currency,
        isActive: true,
      },
    });
  }

  return prisma.serviceCatalogItem.create({
    data: {
      tenantId: input.tenantId,
      name: input.name,
      category: input.category,
      defaultPriceMinor: input.defaultPriceMinor,
      currency: input.currency,
      isActive: true,
    },
  });
}

async function ensureExpenseCategory(input: {
  tenantId: string;
  name: string;
  type: string;
}) {
  const existing = await prisma.expenseCategory.findFirst({
    where: {
      tenantId: input.tenantId,
      name: input.name,
      type: input.type,
    },
  });

  if (existing) {
    return existing;
  }

  return prisma.expenseCategory.create({
    data: input,
  });
}

async function ensureVehicleCatalog(input: {
  countryCode: string;
  make: string;
  model: string;
  generation: string;
  yearFrom: number;
  yearTo: number;
  engineCode: string;
  engineVolume: Prisma.Decimal;
  fuelType: string;
  transmission: string;
  bodyType: string;
  status: "APPROVED";
  createdByUserId: string;
  approvedByUserId: string;
}) {
  const existing = await prisma.vehicleCatalog.findFirst({
    where: {
      countryCode: input.countryCode,
      make: input.make,
      model: input.model,
      generation: input.generation,
      yearFrom: input.yearFrom,
      yearTo: input.yearTo,
      engineCode: input.engineCode,
    },
  });

  if (existing) {
    return prisma.vehicleCatalog.update({
      where: { id: existing.id },
      data: {
        engineVolume: input.engineVolume,
        fuelType: input.fuelType,
        transmission: input.transmission,
        bodyType: input.bodyType,
        status: input.status,
        createdByUserId: input.createdByUserId,
        approvedByUserId: input.approvedByUserId,
      },
    });
  }

  return prisma.vehicleCatalog.create({
    data: input,
  });
}

async function ensureVehicleCatalogRecommendation(input: {
  catalogId: string;
  fluidType: "ENGINE_OIL" | "TRANSMISSION_OIL" | "POWER_STEERING";
  viscosity: string;
  specification: string;
  volumeLiters: Prisma.Decimal;
  intervalKm: number;
  intervalMonths: number;
  priority: "RECOMMENDED" | "ALTERNATIVE";
  source: "PLATFORM" | "AI" | "SHOP";
  status: "APPROVED" | "PENDING" | "REJECTED" | "MERGED";
  createdByUserId: string;
}) {
  const existing = await prisma.vehicleCatalogRecommendation.findFirst({
    where: {
      catalogId: input.catalogId,
      fluidType: input.fluidType,
      viscosity: input.viscosity,
      specification: input.specification,
    },
  });

  if (existing) {
    return prisma.vehicleCatalogRecommendation.update({
      where: { id: existing.id },
      data: {
        volumeLiters: input.volumeLiters,
        intervalKm: input.intervalKm,
        intervalMonths: input.intervalMonths,
        priority: input.priority,
        source: input.source,
        status: input.status,
        createdByUserId: input.createdByUserId,
      },
    });
  }

  return prisma.vehicleCatalogRecommendation.create({
    data: input,
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
