import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, PackageSearch, ReceiptText, ShoppingCart } from "lucide-react";
import { createRetailSaleAction } from "@/app/sales/actions";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import type { SupportedLocale } from "@/i18n/catalog";
import { createTranslator, loadMessages, toSupportedLocale } from "@/i18n/messages";
import { getAuthSession } from "@/lib/auth-session";
import { formatMoneyMinor, type CurrencyCode } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { canAccessAppRoute } from "@/lib/role-access";

export const dynamic = "force-dynamic";

type SalesRouteProps = {
  searchParams: Promise<{
    locale?: string;
    message?: string;
    shopId?: string;
  }>;
};

export default async function SalesRoute({ searchParams }: SalesRouteProps) {
  const session = await getAuthSession();

  if (!session) {
    redirect("/login?locale=ru");
  }

  if (!canAccessAppRoute(session.role, "sales")) {
    redirect(`/dashboard?locale=${session.countryCode === "AZ" ? "az" : "en"}`);
  }

  const params = await searchParams;
  const locale = toSupportedLocale(params.locale);
  const messages = await loadMessages(locale);
  const t = createTranslator(messages);
  const data = await loadSalesData(session.tenantId, session.countryCode, session.role, session.shopId, params.shopId, locale);
  const noticeKey = safeSalesMessageKey(params.message) ? params.message : null;
  const languageLabels = {
    az: t("common.language.az"),
    ru: t("common.language.ru"),
    en: t("common.language.en"),
  };

  return (
    <main className="min-h-screen bg-bg px-5 py-6 text-text sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href={`/dashboard?locale=${locale}&shopId=${data.selectedShopId}`}
            className="inline-flex items-center gap-2 text-sm font-bold text-muted transition hover:text-text"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t("sales.back")}
          </Link>
          <LanguageSwitcher locale={locale} labels={languageLabels} basePath="/sales" />
        </header>

        <section className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="space-y-4">
            <section className="rounded-3xl border border-border bg-surface p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{t("dashboard.branch.title")}</p>
              <div className="mt-4 space-y-2">
                {data.shops.map((shop) => (
                  <Link
                    key={shop.id}
                    href={`/sales?locale=${locale}&shopId=${shop.id}`}
                    className={[
                      "block rounded-2xl border px-4 py-3 text-sm font-bold transition",
                      shop.id === data.selectedShopId
                        ? "border-text bg-text text-surface"
                        : "border-border bg-bg text-text hover:border-text",
                    ].join(" ")}
                  >
                    {shop.name}
                  </Link>
                ))}
              </div>
            </section>
          </aside>

          <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
            <section className="rounded-[2rem] border border-border bg-surface p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-accent/10 text-accent">
                  <ShoppingCart className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{t("sales.label")}</p>
                  <h1 className="mt-1 text-2xl font-semibold tracking-normal">{t("sales.title")}</h1>
                </div>
              </div>
              <p className="mt-4 text-sm font-semibold leading-6 text-muted">{t("sales.subtitle")}</p>

              {noticeKey ? (
                <p className="mt-5 rounded-2xl border border-success/20 bg-success/10 p-4 text-sm font-bold text-success">
                  {t(noticeKey)}
                </p>
              ) : null}

              <form action={createRetailSaleAction} className="mt-6 grid gap-4">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="shopId" value={data.selectedShopId} />
                <Field label={t("sales.form.customer")}>
                  <select
                    name="customerId"
                    className="h-11 w-full rounded-2xl border border-border bg-bg px-3 text-sm font-semibold text-text outline-none transition focus:border-text"
                  >
                    <option value="">{t("sales.form.customerOptional")}</option>
                    {data.customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t("sales.form.product")}>
                  <select
                    name="stockId"
                    className="h-11 w-full rounded-2xl border border-border bg-bg px-3 text-sm font-semibold text-text outline-none transition focus:border-text"
                    required
                  >
                    <option value="">{t("sales.form.chooseProduct")}</option>
                    {data.stocks.map((stock) => (
                      <option key={stock.id} value={stock.id}>
                        {stock.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t("sales.form.quantity")}>
                  <input
                    name="quantity"
                    inputMode="decimal"
                    placeholder="1"
                    className="h-11 w-full rounded-2xl border border-border bg-bg px-3 text-sm font-semibold text-text outline-none transition focus:border-text"
                    required
                  />
                </Field>
                <Field label={t("sales.form.paymentMethod")}>
                  <select
                    name="paymentMethod"
                    defaultValue="CASH"
                    className="h-11 w-full rounded-2xl border border-border bg-bg px-3 text-sm font-semibold text-text outline-none transition focus:border-text"
                  >
                    <option value="CASH">{t("order.payment.cash")}</option>
                    <option value="CARD">{t("order.payment.card")}</option>
                    <option value="TRANSFER">{t("order.payment.transfer")}</option>
                    <option value="OTHER">{t("order.payment.other")}</option>
                  </select>
                </Field>
                <button
                  type="submit"
                  className="rounded-2xl bg-text px-5 py-3 text-sm font-bold text-surface transition hover:opacity-90"
                >
                  {t("sales.form.submit")}
                </button>
              </form>
            </section>

            <section className="rounded-[2rem] border border-border bg-surface p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{t("sales.stock.label")}</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-normal">{t("sales.stock.title")}</h2>
                </div>
                <PackageSearch className="h-6 w-6 text-accent" aria-hidden="true" />
              </div>

              {data.stocks.length > 0 ? (
                <div className="mt-5 overflow-hidden rounded-3xl border border-border bg-bg">
                  {data.stocks.map((stock) => (
                    <div key={stock.id} className="grid gap-3 border-b border-border p-4 last:border-b-0 sm:grid-cols-[1fr_auto]">
                      <div>
                        <p className="text-sm font-bold">{stock.name}</p>
                        <p className="mt-1 text-xs font-semibold text-muted">{stock.meta}</p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-sm font-bold">{stock.salePriceLabel}</p>
                        <p className={["mt-1 text-xs font-semibold", stock.isNegative ? "text-danger" : "text-muted"].join(" ")}>
                          {stock.quantityLabel}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-5 rounded-3xl border border-dashed border-border bg-bg p-6 text-sm font-semibold text-muted">
                  {t("sales.stock.empty")}
                </p>
              )}
            </section>

            <section className="rounded-[2rem] border border-border bg-surface p-6 shadow-sm xl:col-span-2">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-accent/10 text-accent">
                  <ReceiptText className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{t("sales.history.label")}</p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-normal">{t("sales.history.title")}</h2>
                </div>
              </div>

              {data.recentSales.length > 0 ? (
                <div className="mt-5 overflow-hidden rounded-3xl border border-border bg-bg">
                  {data.recentSales.map((sale) => (
                    <div key={sale.id} className="grid gap-3 border-b border-border p-4 last:border-b-0 sm:grid-cols-[1fr_auto_auto]">
                      <div>
                        <p className="text-sm font-bold">{sale.description ?? t("sales.history.retailFallback")}</p>
                        <p className="mt-1 text-xs font-semibold text-muted">
                          {sale.customerName ?? t("sales.history.noCustomer")}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-muted">
                        {sale.paymentMethod ? t(paymentMethodKey(sale.paymentMethod)) : t("order.payment.other")}
                      </p>
                      <p className="text-sm font-bold">{sale.totalLabel}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-5 rounded-3xl border border-dashed border-border bg-bg p-6 text-sm font-semibold text-muted">
                  {t("sales.history.empty")}
                </p>
              )}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

type FieldProps = {
  children: React.ReactNode;
  label: string;
};

function Field({ children, label }: FieldProps) {
  return (
    <label className="space-y-1 text-xs font-bold uppercase tracking-[0.1em] text-muted">
      <span>{label}</span>
      {children}
    </label>
  );
}

function safeSalesMessageKey(value: string | undefined): value is string {
  return typeof value === "string" && (value === "sales.saved" || value.startsWith("sales.error."));
}

async function loadSalesData(
  tenantId: string,
  countryCode: string,
  role: string,
  sessionShopId: string,
  requestedShopId: string | undefined,
  locale: SupportedLocale,
) {
  const tenant = await prisma.tenant.findFirst({
    where: {
      id: tenantId,
      countryCode,
    },
    select: {
      shops: {
        where: {
          isActive: true,
          ...(role === "SHOP_OWNER" ? {} : { id: sessionShopId }),
        },
        select: {
          id: true,
          name: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!tenant || tenant.shops.length === 0) {
    redirect("/login?locale=ru");
  }

  const selectedShop = tenant.shops.find((shop) => shop.id === requestedShopId) ?? tenant.shops[0];
  const [customers, stocks, recentSales] = await Promise.all([
    prisma.customer.findMany({
      where: {
        tenantId,
        countryCode,
        shopId: selectedShop.id,
      },
      select: {
        id: true,
        name: true,
        phone: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    }),
    prisma.inventoryStock.findMany({
      where: {
        shopId: selectedShop.id,
        shop: {
          tenantId,
          countryCode,
        },
        product: {
          tenantId,
          isActive: true,
        },
      },
      select: {
        id: true,
        currency: true,
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
      },
      orderBy: {
        product: {
          name: "asc",
        },
      },
    }),
    prisma.order.findMany({
      where: {
        tenantId,
        countryCode,
        shopId: selectedShop.id,
        type: "RETAIL",
        status: "COMPLETED",
      },
      select: {
        id: true,
        currency: true,
        paymentMethod: true,
        totalMinor: true,
        customer: {
          select: {
            name: true,
          },
        },
        lines: {
          select: {
            description: true,
          },
          take: 1,
        },
      },
      orderBy: {
        completedAt: "desc",
      },
      take: 10,
    }),
  ]);

  return {
    customers: customers.map((customer) => ({
      id: customer.id,
      label: customer.phone ? `${customer.name} - ${customer.phone}` : customer.name,
    })),
    recentSales: recentSales.map((sale) => ({
      customerName: sale.customer?.name ?? null,
      description: sale.lines[0]?.description ?? null,
      id: sale.id,
      paymentMethod: sale.paymentMethod ?? "",
      totalLabel: formatMoneyMinor(sale.totalMinor, sale.currency as CurrencyCode, locale),
    })),
    selectedShopId: selectedShop.id,
    shops: tenant.shops,
    stocks: stocks.map((stock) => {
      const productName = [stock.product.brand, stock.product.name, stock.product.viscosity].filter(Boolean).join(" ");
      const unitLabel = stock.product.baseUnit;
      const quantity = stock.quantity.toString();
      const salePriceLabel = formatMoneyMinor(stock.salePriceMinor, stock.currency as CurrencyCode, locale);

      return {
        id: stock.id,
        isNegative: Number(stock.quantity) < 0,
        label: `${productName} - ${salePriceLabel} - ${quantity} ${unitLabel}`,
        meta: `${stock.product.baseUnit} / ${quantity}`,
        name: productName,
        quantityLabel: `${quantity} ${unitLabel}`,
        salePriceLabel,
      };
    }),
  };
}

function paymentMethodKey(method: string): string {
  if (method === "CASH") {
    return "order.payment.cash";
  }

  if (method === "CARD") {
    return "order.payment.card";
  }

  if (method === "TRANSFER") {
    return "order.payment.transfer";
  }

  return "order.payment.other";
}
