import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Banknote, CalendarDays, ReceiptText, TrendingUp, WalletCards } from "lucide-react";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import type { SupportedLocale } from "@/i18n/catalog";
import { createTranslator, loadMessages, toSupportedLocale } from "@/i18n/messages";
import { getAuthSession } from "@/lib/auth-session";
import { financeFilterSchema } from "@/lib/finance-filter-schema";
import { formatMoneyMinor, type CurrencyCode } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { canAccessAppRoute } from "@/lib/role-access";

export const dynamic = "force-dynamic";

type FinanceRouteProps = {
  searchParams: Promise<{
    dateFrom?: string;
    dateTo?: string;
    locale?: string;
    shopId?: string;
  }>;
};

export default async function FinanceRoute({ searchParams }: FinanceRouteProps) {
  const session = await getAuthSession();

  if (!session) {
    redirect("/login?locale=ru");
  }

  if (!canAccessAppRoute(session.role, "finance")) {
    redirect(`/dashboard?locale=${session.countryCode === "AZ" ? "az" : "en"}`);
  }

  const params = await searchParams;
  const locale = toSupportedLocale(params.locale);
  const parsed = financeFilterSchema.safeParse({
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    locale,
    shopId: params.shopId,
  });
  const filters = parsed.success ? parsed.data : { locale };
  const messages = await loadMessages(locale);
  const t = createTranslator(messages);
  const data = await loadFinanceData(session.tenantId, session.countryCode, session.role, session.shopId, filters, locale);
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
            href={`/dashboard?locale=${locale}&shopId=${data.dashboardShopId}`}
            className="inline-flex items-center gap-2 text-sm font-bold text-muted transition hover:text-text"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t("finance.back")}
          </Link>
          <LanguageSwitcher locale={locale} labels={languageLabels} basePath="/finance" />
        </header>

        <section className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="space-y-4">
            <section className="rounded-3xl border border-border bg-surface p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{t("dashboard.branch.title")}</p>
              <div className="mt-4 space-y-2">
                {data.canViewAllShops ? (
                  <Link
                    href={`/finance?locale=${locale}&shopId=all&dateFrom=${data.dateFromInput}&dateTo=${data.dateToInput}`}
                    className={[
                      "block rounded-2xl border px-4 py-3 text-sm font-bold transition",
                      data.selectedShopId === "all"
                        ? "border-text bg-text text-surface"
                        : "border-border bg-bg text-text hover:border-text",
                    ].join(" ")}
                  >
                    {t("finance.allBranches")}
                  </Link>
                ) : null}
                {data.shops.map((shop) => (
                  <Link
                    key={shop.id}
                    href={`/finance?locale=${locale}&shopId=${shop.id}&dateFrom=${data.dateFromInput}&dateTo=${data.dateToInput}`}
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

            <section className="rounded-3xl border border-border bg-surface p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <CalendarDays className="h-5 w-5 text-accent" aria-hidden="true" />
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{t("finance.period.label")}</p>
              </div>
              <form action="/finance" className="mt-5 grid gap-3">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="shopId" value={data.selectedShopId} />
                <Field label={t("finance.period.from")}>
                  <input
                    type="date"
                    name="dateFrom"
                    defaultValue={data.dateFromInput}
                    className="h-11 w-full rounded-2xl border border-border bg-bg px-3 text-sm font-semibold text-text outline-none transition focus:border-text"
                  />
                </Field>
                <Field label={t("finance.period.to")}>
                  <input
                    type="date"
                    name="dateTo"
                    defaultValue={data.dateToInput}
                    className="h-11 w-full rounded-2xl border border-border bg-bg px-3 text-sm font-semibold text-text outline-none transition focus:border-text"
                  />
                </Field>
                <button
                  type="submit"
                  className="rounded-2xl bg-text px-5 py-3 text-sm font-bold text-surface transition hover:opacity-90"
                >
                  {t("finance.period.apply")}
                </button>
              </form>
            </section>
          </aside>

          <div className="space-y-6">
            <section className="rounded-[2rem] border border-border bg-surface p-6 shadow-sm sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{t("finance.label")}</p>
                  <h1 className="mt-3 text-3xl font-semibold tracking-normal sm:text-5xl">{t("finance.title")}</h1>
                  <p className="mt-4 max-w-2xl text-base leading-8 text-muted">{t("finance.subtitle")}</p>
                </div>
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-accent/10 text-accent">
                  <WalletCards className="h-6 w-6" aria-hidden="true" />
                </div>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
                <FinanceMetric icon={<TrendingUp className="h-5 w-5" aria-hidden="true" />} label={t("finance.metric.revenue")} value={data.metrics.totalLabel} />
                <FinanceMetric icon={<Banknote className="h-5 w-5" aria-hidden="true" />} label={t("finance.metric.paid")} value={data.metrics.paidLabel} />
                <FinanceMetric icon={<Banknote className="h-5 w-5" aria-hidden="true" />} label={t("finance.metric.debtPaid")} value={data.metrics.debtPaymentsLabel} />
                <FinanceMetric icon={<WalletCards className="h-5 w-5" aria-hidden="true" />} label={t("finance.metric.debt")} value={data.metrics.debtLabel} />
                <FinanceMetric icon={<ReceiptText className="h-5 w-5" aria-hidden="true" />} label={t("finance.metric.expenses")} value={data.metrics.expenseLabel} />
                <FinanceMetric icon={<TrendingUp className="h-5 w-5" aria-hidden="true" />} label={t("finance.metric.net")} value={data.metrics.netLabel} />
              </div>
            </section>

            <FinanceChart
              days={data.chartDays}
              empty={t("finance.chart.empty")}
              labels={{
                debt: t("finance.metric.debt"),
                expenses: t("finance.metric.expenses"),
                label: t("finance.chart.label"),
                paid: t("finance.metric.paid"),
                title: t("finance.chart.title"),
              }}
            />

            <section className="grid gap-6 xl:grid-cols-3">
              <FinanceList
                empty={t("finance.orders.empty")}
                items={data.orders.map((order) => ({
                  id: order.id,
                  meta: `${t(`finance.orderType.${order.type}`)} / ${order.paymentMethod ? t(paymentMethodKey(order.paymentMethod)) : t("order.payment.other")}`,
                  title: order.title,
                  value: order.totalLabel,
                }))}
                label={t("finance.orders.label")}
                title={t("finance.orders.title")}
              />
              <FinanceList
                empty={t("finance.expenses.empty")}
                items={data.expenses.map((expense) => ({
                  id: expense.id,
                  meta: expense.dateLabel,
                  title: expense.categoryName,
                  value: expense.amountLabel,
                }))}
                label={t("finance.expenses.label")}
                title={t("finance.expenses.title")}
              />
              <FinanceList
                empty={t("finance.debtPayments.empty")}
                items={data.debtPayments.map((payment) => ({
                  id: payment.id,
                  meta: `${payment.dateLabel} / ${t(payment.methodLabelKey)}`,
                  title: payment.customerName,
                  value: payment.amountLabel,
                }))}
                label={t("finance.debtPayments.label")}
                title={t("finance.debtPayments.title")}
              />
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

function FinanceMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-border bg-bg p-5">
      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-success/10 text-success">{icon}</div>
      <p className="mt-4 text-xs font-bold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

type FinanceChartDay = {
  debtMinor: number;
  expenseMinor: number;
  key: string;
  label: string;
  paidMinor: number;
};

type FinanceChartProps = {
  days: readonly FinanceChartDay[];
  empty: string;
  labels: {
    debt: string;
    expenses: string;
    label: string;
    paid: string;
    title: string;
  };
};

function FinanceChart({ days, empty, labels }: FinanceChartProps) {
  const maxMinor = Math.max(
    0,
    ...days.flatMap((day) => [day.paidMinor, day.expenseMinor, day.debtMinor]),
  );
  const hasValues = maxMinor > 0;

  return (
    <section className="rounded-[2rem] border border-border bg-surface p-6 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{labels.label}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-normal">{labels.title}</h2>

      {hasValues ? (
        <>
          <div className="mt-5 flex flex-wrap gap-3 text-xs font-bold uppercase tracking-[0.12em] text-muted">
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-success" />
              {labels.paid}
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-danger" />
              {labels.expenses}
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-warning" />
              {labels.debt}
            </span>
          </div>
          <div className="mt-6 overflow-x-auto">
            <div className="flex min-w-[720px] items-end gap-2 rounded-3xl border border-border bg-bg p-5">
              {days.map((day) => (
                <div key={day.key} className="flex min-w-8 flex-1 flex-col items-center gap-2">
                  <div className="flex h-44 w-full items-end justify-center gap-1">
                    <Bar valueMinor={day.paidMinor} maxMinor={maxMinor} className="bg-success" />
                    <Bar valueMinor={day.expenseMinor} maxMinor={maxMinor} className="bg-danger" />
                    <Bar valueMinor={day.debtMinor} maxMinor={maxMinor} className="bg-warning" />
                  </div>
                  <p className="text-[11px] font-bold text-muted">{day.label}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <p className="mt-5 rounded-3xl border border-dashed border-border bg-bg p-6 text-sm font-semibold text-muted">
          {empty}
        </p>
      )}
    </section>
  );
}

function Bar({ className, maxMinor, valueMinor }: { className: string; maxMinor: number; valueMinor: number }) {
  const heightPercent = maxMinor > 0 ? Math.max(4, Math.round((valueMinor / maxMinor) * 100)) : 0;

  return (
    <span
      aria-hidden="true"
      className={`w-2 rounded-full ${className}`}
      style={{ height: `${heightPercent}%` }}
    />
  );
}

type FinanceListItem = {
  id: string;
  meta: string;
  title: string;
  value: string;
};

function FinanceList({ empty, items, label, title }: { empty: string; items: readonly FinanceListItem[]; label: string; title: string }) {
  return (
    <section className="rounded-[2rem] border border-border bg-surface p-6 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{label}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-normal">{title}</h2>
      {items.length > 0 ? (
        <div className="mt-5 overflow-hidden rounded-3xl border border-border bg-bg">
          {items.map((item) => (
            <div key={item.id} className="grid gap-2 border-b border-border p-4 last:border-b-0 sm:grid-cols-[1fr_auto]">
              <div>
                <p className="text-sm font-bold">{item.title}</p>
                <p className="mt-1 text-xs font-semibold text-muted">{item.meta}</p>
              </div>
              <p className="text-sm font-bold">{item.value}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-3xl border border-dashed border-border bg-bg p-6 text-sm font-semibold text-muted">
          {empty}
        </p>
      )}
    </section>
  );
}

async function loadFinanceData(
  tenantId: string,
  countryCode: string,
  role: string,
  sessionShopId: string,
  filters: { dateFrom?: string; dateTo?: string; shopId?: string },
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
          currency: true,
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

  const dateRange = normalizedDateRange(filters.dateFrom, filters.dateTo);
  const canViewAllShops = role === "SHOP_OWNER";
  const selectedShopId = canViewAllShops && filters.shopId === "all"
    ? "all"
    : tenant.shops.find((shop) => shop.id === filters.shopId)?.id ?? tenant.shops[0].id;
  const selectedShopIds = selectedShopId === "all" ? tenant.shops.map((shop) => shop.id) : [selectedShopId];
  const currency = tenant.shops.find((shop) => selectedShopIds.includes(shop.id))?.currency ?? "AZN";
  const [
    completedFinance,
    debtPaymentsFinance,
    expensesFinance,
    chartOrders,
    chartDebtPayments,
    chartExpenses,
    orders,
    expenses,
    debtPayments,
  ] = await Promise.all([
    prisma.order.aggregate({
      where: {
        tenantId,
        countryCode,
        shopId: {
          in: selectedShopIds,
        },
        status: "COMPLETED",
        completedAt: dateRange,
      },
      _sum: {
        debtMinor: true,
        paidMinor: true,
        totalMinor: true,
      },
    }),
    prisma.customerDebtPayment.aggregate({
      where: {
        paidAt: dateRange,
        debt: {
          shopId: {
            in: selectedShopIds,
          },
          customer: {
            tenantId,
            countryCode,
          },
        },
      },
      _sum: {
        amountMinor: true,
      },
    }),
    prisma.expense.aggregate({
      where: {
        tenantId,
        shopId: {
          in: selectedShopIds,
        },
        shop: {
          countryCode,
        },
        date: dateRange,
      },
      _sum: {
        amountMinor: true,
      },
    }),
    prisma.order.findMany({
      where: {
        tenantId,
        countryCode,
        shopId: {
          in: selectedShopIds,
        },
        status: "COMPLETED",
        completedAt: dateRange,
      },
      select: {
        completedAt: true,
        debtMinor: true,
        paidMinor: true,
      },
    }),
    prisma.customerDebtPayment.findMany({
      where: {
        paidAt: dateRange,
        debt: {
          shopId: {
            in: selectedShopIds,
          },
          customer: {
            tenantId,
            countryCode,
          },
        },
      },
      select: {
        amountMinor: true,
        paidAt: true,
      },
    }),
    prisma.expense.findMany({
      where: {
        tenantId,
        shopId: {
          in: selectedShopIds,
        },
        shop: {
          countryCode,
        },
        date: dateRange,
      },
      select: {
        amountMinor: true,
        date: true,
      },
    }),
    prisma.order.findMany({
      where: {
        tenantId,
        countryCode,
        shopId: {
          in: selectedShopIds,
        },
        status: "COMPLETED",
        completedAt: dateRange,
      },
      select: {
        currency: true,
        id: true,
        paymentMethod: true,
        totalMinor: true,
        type: true,
        vehicleIdentity: {
          select: {
            make: true,
            model: true,
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
      take: 20,
    }),
    prisma.expense.findMany({
      where: {
        tenantId,
        shopId: {
          in: selectedShopIds,
        },
        shop: {
          countryCode,
        },
        date: dateRange,
      },
      select: {
        amountMinor: true,
        category: {
          select: {
            name: true,
          },
        },
        currency: true,
        date: true,
        id: true,
      },
      orderBy: {
        date: "desc",
      },
      take: 20,
    }),
    prisma.customerDebtPayment.findMany({
      where: {
        paidAt: dateRange,
        debt: {
          shopId: {
            in: selectedShopIds,
          },
          customer: {
            tenantId,
            countryCode,
          },
        },
      },
      select: {
        amountMinor: true,
        id: true,
        paidAt: true,
        paymentMethod: true,
        debt: {
          select: {
            currency: true,
            customer: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        paidAt: "desc",
      },
      take: 20,
    }),
  ]);
  const totalMinor = completedFinance._sum.totalMinor ?? 0;
  const orderPaidMinor = completedFinance._sum.paidMinor ?? 0;
  const debtPaymentsMinor = debtPaymentsFinance._sum.amountMinor ?? 0;
  const paidMinor = orderPaidMinor + debtPaymentsMinor;
  const debtMinor = completedFinance._sum.debtMinor ?? 0;
  const expenseMinor = expensesFinance._sum.amountMinor ?? 0;
  const netMinor = paidMinor - expenseMinor;
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return {
    canViewAllShops,
    chartDays: buildChartDays(dateRange.gte, dateRange.lte, chartOrders, chartDebtPayments, chartExpenses, locale),
    dashboardShopId: selectedShopId === "all" ? tenant.shops[0].id : selectedShopId,
    dateFromInput: formatDateInput(dateRange.gte),
    dateToInput: formatDateInput(dateRange.lte),
    debtPayments: debtPayments.map((payment) => ({
      amountLabel: formatMoneyMinor(payment.amountMinor, payment.debt.currency as CurrencyCode, locale),
      customerName: payment.debt.customer.name,
      dateLabel: dateFormatter.format(payment.paidAt),
      id: payment.id,
      methodLabelKey: paymentMethodKey(payment.paymentMethod),
    })),
    expenses: expenses.map((expense) => ({
      amountLabel: formatMoneyMinor(expense.amountMinor, expense.currency as CurrencyCode, locale),
      categoryName: expense.category.name,
      dateLabel: dateFormatter.format(expense.date),
      id: expense.id,
    })),
    metrics: {
      debtPaymentsLabel: formatMoneyMinor(debtPaymentsMinor, currency as CurrencyCode, locale),
      debtLabel: formatMoneyMinor(debtMinor, currency as CurrencyCode, locale),
      expenseLabel: formatMoneyMinor(expenseMinor, currency as CurrencyCode, locale),
      netLabel: formatSignedMoneyMinor(netMinor, currency as CurrencyCode, locale),
      paidLabel: formatMoneyMinor(paidMinor, currency as CurrencyCode, locale),
      totalLabel: formatMoneyMinor(totalMinor, currency as CurrencyCode, locale),
    },
    orders: orders.map((order) => ({
      id: order.id,
      paymentMethod: order.paymentMethod,
      title:
        order.type === "SERVICE" && order.vehicleIdentity
          ? `${order.vehicleIdentity.make} ${order.vehicleIdentity.model}`
          : order.lines[0]?.description ?? "Retail sale",
      totalLabel: formatMoneyMinor(order.totalMinor, order.currency as CurrencyCode, locale),
      type: order.type,
    })),
    selectedShopId,
    shops: tenant.shops,
  };
}

function normalizedDateRange(dateFrom: string | undefined, dateTo: string | undefined): { gte: Date; lte: Date } {
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const start = dateFrom ? dateInputToDate(dateFrom) : defaultStart;
  const end = dateTo ? dateInputToDate(dateTo) : now;

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return {
    gte: start,
    lte: end,
  };
}

type ChartOrder = {
  completedAt: Date | null;
  debtMinor: number;
  paidMinor: number;
};

type ChartDebtPayment = {
  amountMinor: number;
  paidAt: Date;
};

type ChartExpense = {
  amountMinor: number;
  date: Date;
};

function buildChartDays(
  start: Date,
  end: Date,
  orders: readonly ChartOrder[],
  debtPayments: readonly ChartDebtPayment[],
  expenses: readonly ChartExpense[],
  locale: SupportedLocale,
): FinanceChartDay[] {
  const days = new Map<string, FinanceChartDay>();
  const cursor = new Date(start);
  const labelFormatter = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
  });

  cursor.setHours(0, 0, 0, 0);

  while (cursor <= end) {
    const key = formatDateInput(cursor);
    days.set(key, {
      debtMinor: 0,
      expenseMinor: 0,
      key,
      label: labelFormatter.format(cursor),
      paidMinor: 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  for (const order of orders) {
    if (!order.completedAt) {
      continue;
    }

    const day = days.get(formatDateInput(order.completedAt));

    if (day) {
      day.debtMinor += order.debtMinor;
      day.paidMinor += order.paidMinor;
    }
  }

  for (const payment of debtPayments) {
    const day = days.get(formatDateInput(payment.paidAt));

    if (day) {
      day.paidMinor += payment.amountMinor;
    }
  }

  for (const expense of expenses) {
    const day = days.get(formatDateInput(expense.date));

    if (day) {
      day.expenseMinor += expense.amountMinor;
    }
  }

  return [...days.values()];
}

function dateInputToDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day);
}

function formatDateInput(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
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

function formatSignedMoneyMinor(valueMinor: number, currency: CurrencyCode, locale: string): string {
  if (valueMinor >= 0) {
    return formatMoneyMinor(valueMinor, currency, locale);
  }

  return `-${formatMoneyMinor(Math.abs(valueMinor), currency, locale)}`;
}
