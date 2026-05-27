import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Package } from "lucide-react";
import { addInventoryProductAction, deleteInventoryStockAction } from "@/app/inventory/actions";
import { InventoryProductForm, type InventoryProductFormLabels } from "@/components/inventory/inventory-product-form";
import {
  InventoryStockTable,
  type InventoryStockTableItem,
  type InventoryStockTableLabels,
} from "@/components/inventory/inventory-stock-table";
import { createTranslator, loadMessages, toSupportedLocale } from "@/i18n/messages";
import { getAuthSession } from "@/lib/auth-session";
import { formatMoneyMinor, type CurrencyCode } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { canAccessAppRoute } from "@/lib/role-access";

export const dynamic = "force-dynamic";

type InventoryRouteProps = {
  searchParams: Promise<{
    locale?: string;
    shopId?: string;
    deleteError?: string;
  }>;
};

export default async function InventoryRoute({ searchParams }: InventoryRouteProps) {
  const session = await getAuthSession();

  if (!session) {
    redirect("/login?locale=ru");
  }

  if (!canAccessAppRoute(session.role, "inventory")) {
    redirect(`/dashboard?locale=${session.countryCode === "AZ" ? "az" : "en"}`);
  }

  const params = await searchParams;
  const locale = toSupportedLocale(params.locale);
  const messages = await loadMessages(locale);
  const t = createTranslator(messages);
  const inventory = await loadInventoryData(session.tenantId, session.countryCode, params.shopId);
  const formLabels = inventoryFormLabels(t);
  const tableLabels = inventoryTableLabels(t);
  const tableItems = inventory.stocks.map((stock): InventoryStockTableItem => ({
    id: stock.id,
    productName: stock.product.name,
    productBrand: stock.product.brand,
    productViscosity: stock.product.viscosity,
    categoryLabel: formLabels.categories[stock.product.category],
    quantityLabel: `${stock.quantity} ${formLabels.units[stock.product.baseUnit]}`,
    purchasePriceLabel: formatMoneyMinor(stock.purchasePriceMinor, stock.currency as CurrencyCode, locale),
    salePriceLabel: formatMoneyMinor(stock.salePriceMinor, stock.currency as CurrencyCode, locale),
    servicePriceLabel: formatMoneyMinor(stock.servicePriceMinor, stock.currency as CurrencyCode, locale),
    isLow: Number(stock.quantity) <= Number(stock.minQuantity),
    isNegative: Number(stock.quantity) < 0,
  }));

  return (
    <main className="min-h-screen bg-bg px-5 py-6 text-text sm:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href={`/dashboard?locale=${locale}&shopId=${inventory.selectedShopId}`}
          className="inline-flex items-center gap-2 text-sm font-bold text-muted transition hover:text-text"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t("inventory.back")}
        </Link>

        <section className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="min-w-0">
          <InventoryProductForm
            labels={formLabels}
            locale={locale}
            shopId={inventory.selectedShopId}
            action={addInventoryProductAction}
          />
          </div>

          <div className="min-w-0 rounded-[2rem] border border-border bg-surface p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{t("inventory.list.label")}</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-normal">{t("inventory.list.title")}</h1>
              </div>
              <Package className="h-6 w-6 text-accent" aria-hidden="true" />
            </div>

            <InventoryStockTable
              action={deleteInventoryStockAction}
              deleteError={params.deleteError}
              deleteErrorMessage={params.deleteError ? t(`inventory.delete.error.${params.deleteError}`) : undefined}
              items={tableItems}
              labels={tableLabels}
              locale={locale}
              shopId={inventory.selectedShopId}
            />
          </div>
        </section>
      </div>
    </main>
  );
}

async function loadInventoryData(tenantId: string, countryCode: string, requestedShopId: string | undefined) {
  const tenant = await prisma.tenant.findFirst({
    where: {
      id: tenantId,
      countryCode,
    },
    select: {
      shops: {
        where: { isActive: true },
        select: { id: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!tenant || tenant.shops.length === 0) {
    redirect("/login?locale=ru");
  }

  const selectedShop = tenant.shops.find((shop) => shop.id === requestedShopId) ?? tenant.shops[0];
  const stocks = await prisma.inventoryStock.findMany({
    where: {
      shopId: selectedShop.id,
      shop: {
        tenantId,
        countryCode,
      },
    },
    select: {
      id: true,
      quantity: true,
      minQuantity: true,
      purchasePriceMinor: true,
      salePriceMinor: true,
      servicePriceMinor: true,
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
    orderBy: {
      product: {
        name: "asc",
      },
    },
  });

  return {
    selectedShopId: selectedShop.id,
    stocks: stocks.map((stock) => ({
      ...stock,
      quantity: stock.quantity.toString(),
      minQuantity: stock.minQuantity.toString(),
    })),
  };
}

function inventoryFormLabels(t: (key: string) => string): InventoryProductFormLabels {
  return {
    title: t("inventory.form.title"),
    subtitle: t("inventory.form.subtitle"),
    category: t("inventory.form.category"),
    name: t("inventory.form.name"),
    namePlaceholder: t("inventory.form.namePlaceholder"),
    brand: t("inventory.form.brand"),
    viscosity: t("inventory.form.viscosity"),
    specification: t("inventory.form.specification"),
    unit: t("inventory.form.unit"),
    quantity: t("inventory.form.quantity"),
    minQuantity: t("inventory.form.minQuantity"),
    purchasePrice: t("inventory.form.purchasePrice"),
    salePrice: t("inventory.form.salePrice"),
    servicePrice: t("inventory.form.servicePrice"),
    suggestedDiscount: t("inventory.form.suggestedDiscount"),
    submit: t("inventory.form.submit"),
    categories: {
      ENGINE_OIL: t("inventory.category.ENGINE_OIL"),
      TRANSMISSION_OIL: t("inventory.category.TRANSMISSION_OIL"),
      POWER_STEERING_FLUID: t("inventory.category.POWER_STEERING_FLUID"),
      OIL_FILTER: t("inventory.category.OIL_FILTER"),
      AIR_FILTER: t("inventory.category.AIR_FILTER"),
      CABIN_FILTER: t("inventory.category.CABIN_FILTER"),
      FUEL_FILTER: t("inventory.category.FUEL_FILTER"),
      OTHER: t("inventory.category.OTHER"),
    },
    units: {
      LITER: t("inventory.unit.LITER"),
      PIECE: t("inventory.unit.PIECE"),
      PACKAGE: t("inventory.unit.PACKAGE"),
    },
    errorMessages: {
      "inventory.error.auth": t("inventory.error.auth"),
      "inventory.error.validation": t("inventory.error.validation"),
      "inventory.error.shop": t("inventory.error.shop"),
    },
  };
}

function inventoryTableLabels(t: (key: string) => string): InventoryStockTableLabels {
  return {
    empty: t("inventory.list.empty"),
    noResults: t("inventory.list.noResults"),
    low: t("inventory.list.low"),
    negative: t("inventory.list.negative"),
    normal: t("inventory.list.normal"),
    product: t("inventory.list.product"),
    category: t("inventory.list.category"),
    viscosity: t("inventory.list.viscosity"),
    quantity: t("inventory.list.quantity"),
    purchase: t("inventory.list.purchase"),
    sale: t("inventory.list.sale"),
    service: t("inventory.list.service"),
    status: t("inventory.list.status"),
    action: t("inventory.list.action"),
    filterProduct: t("inventory.filter.product"),
    filterCategory: t("inventory.filter.category"),
    filterViscosity: t("inventory.filter.viscosity"),
    filterQuantity: t("inventory.filter.quantity"),
    allCategories: t("inventory.filter.allCategories"),
    deleteConfirmLabel: t("inventory.delete.confirmLabel"),
    deleteHint: t("inventory.delete.hint"),
    deleteOpen: t("inventory.delete.open"),
    deleteCancel: t("inventory.delete.cancel"),
    deleteSelected: t("inventory.delete.selected"),
  };
}
