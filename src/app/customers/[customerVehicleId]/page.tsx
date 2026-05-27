import Link from "next/link";
import type { UserRole } from "@prisma/client";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, BellRing, CalendarClock, CarFront, Gauge, QrCode, ReceiptText, ShoppingCart, Sparkles, UserRound } from "lucide-react";
import { createCustomerReminderAction } from "@/app/customers/actions";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { createTranslator, loadMessages, toSupportedLocale } from "@/i18n/messages";
import { getAuthSession } from "@/lib/auth-session";
import { formatMoneyMinor, type CurrencyCode } from "@/lib/money";
import { serviceTranslationKey } from "@/lib/order-services";
import { prisma } from "@/lib/prisma";
import { canAccessAppRoute } from "@/lib/role-access";
import { calculateServiceForecast } from "@/lib/service-forecast";

export const dynamic = "force-dynamic";

type CustomerVehicleRouteProps = {
  params: Promise<{
    customerVehicleId: string;
  }>;
  searchParams: Promise<{
    locale?: string;
    shopId?: string;
  }>;
};

export default async function CustomerVehicleRoute({ params, searchParams }: CustomerVehicleRouteProps) {
  const session = await getAuthSession();

  if (!session) {
    redirect("/login?locale=ru");
  }

  if (!canAccessAppRoute(session.role, "customers")) {
    redirect(`/dashboard?locale=${session.countryCode === "AZ" ? "az" : "en"}`);
  }

  const [{ customerVehicleId }, query] = await Promise.all([params, searchParams]);
  const locale = toSupportedLocale(query.locale);
  const messages = await loadMessages(locale);
  const t = createTranslator(messages);
  const data = await loadCustomerVehicleDetail(
    customerVehicleId,
    session.tenantId,
    session.countryCode,
    session.role,
    session.shopId,
    session.userId,
    query.shopId,
  );

  if (!data) {
    notFound();
  }

  const canSeePhone = session.role === "SHOP_OWNER";
  const canViewFinance = canAccessAppRoute(session.role, "finance");
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const languageLabels = {
    az: t("common.language.az"),
    ru: t("common.language.ru"),
    en: t("common.language.en"),
  };
  const forecast = calculateServiceForecast(data.serviceRecords, data.engineOilRecommendation);

  return (
    <main className="min-h-screen bg-bg px-5 py-6 text-text sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href={`/customers?locale=${locale}&shopId=${data.shopId}`}
            className="inline-flex items-center gap-2 text-sm font-bold text-muted transition hover:text-text"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t("customer.back")}
          </Link>
          <LanguageSwitcher locale={locale} labels={languageLabels} basePath={`/customers/${customerVehicleId}`} />
        </header>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <section className="rounded-[2rem] border border-border bg-surface p-6 shadow-sm sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{t("customer.detail.label")}</p>
                  <h1 className="mt-3 text-3xl font-semibold tracking-normal sm:text-5xl">
                    {data.vehicle.make} {data.vehicle.model}
                  </h1>
                </div>
                {data.vehicle.qrSlug ? (
                  <Link
                    href={`/v/${data.vehicle.qrSlug}`}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-bg px-5 py-3 text-sm font-bold transition hover:border-text"
                  >
                    <QrCode className="h-4 w-4 text-accent" aria-hidden="true" />
                    {t("customer.detail.qr")}
                  </Link>
                ) : null}
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <InfoCard icon={<CarFront className="h-5 w-5" aria-hidden="true" />} label={t("order.vehicle.plate")}>
                  {data.vehicle.plateNumber ?? t("dashboard.queue.noPlate")}
                </InfoCard>
                <InfoCard icon={<CarFront className="h-5 w-5" aria-hidden="true" />} label={t("order.vehicle.vin")}>
                  {data.vehicle.vinNormalized ?? t("dashboard.queue.noVin")}
                </InfoCard>
                <InfoCard icon={<CarFront className="h-5 w-5" aria-hidden="true" />} label={t("order.vehicle.year")}>
                  {data.vehicle.year ?? t("order.empty")}
                </InfoCard>
                <InfoCard icon={<ReceiptText className="h-5 w-5" aria-hidden="true" />} label={t("customer.detail.visits")}>
                  {data.serviceRecords.length}
                </InfoCard>
                <InfoCard icon={<Sparkles className="h-5 w-5" aria-hidden="true" />} label={t("customer.detail.loyalty")}>
                  {t("customer.detail.loyaltyValue").replace("{count}", String(data.serviceRecords.length))}
                </InfoCard>
              </div>
            </section>

            <section className="rounded-[2rem] border border-border bg-surface p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{t("customer.forecast.label")}</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-normal">{t("customer.forecast.title")}</h2>
                </div>
                <CalendarClock className="h-6 w-6 text-accent" aria-hidden="true" />
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <ForecastCard
                  icon={<Gauge className="h-5 w-5" aria-hidden="true" />}
                  label={t("customer.forecast.nextMileage")}
                  value={forecast.nextMileage ? `${forecast.nextMileage} km` : t("customer.forecast.unknown")}
                />
                <ForecastCard
                  icon={<CalendarClock className="h-5 w-5" aria-hidden="true" />}
                  label={t("customer.forecast.nextDate")}
                  value={forecast.nextDate ? dateFormatter.format(forecast.nextDate) : t("customer.forecast.unknown")}
                />
                <ForecastCard
                  icon={<Gauge className="h-5 w-5" aria-hidden="true" />}
                  label={t("customer.forecast.average")}
                  value={
                    forecast.averageKmPerDay
                      ? t("customer.forecast.averageValue").replace("{value}", String(forecast.averageKmPerDay))
                      : t("customer.forecast.unknown")
                  }
                />
              </div>
              <p className="mt-4 text-sm font-semibold leading-6 text-muted">
                {data.engineOilRecommendation
                  ? t("customer.forecast.basedOnRecommendation")
                      .replace("{viscosity}", data.engineOilRecommendation.viscosity)
                      .replace("{volume}", data.engineOilRecommendation.volumeLiters)
                  : t("customer.forecast.noRecommendation")}
              </p>
            </section>

            <section className="rounded-[2rem] border border-border bg-surface p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{t("customer.history.label")}</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-normal">{t("customer.history.title")}</h2>

              {data.serviceRecords.length > 0 ? (
                <div className="mt-6 overflow-hidden rounded-3xl border border-border bg-bg">
                  {data.serviceRecords.map((record) => (
                    <div key={record.id} className="border-b border-border p-4 last:border-b-0">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold">{dateFormatter.format(record.serviceDate)}</p>
                          <p className="mt-1 text-xs font-semibold text-muted">
                            {record.mileage} km
                          </p>
                        </div>
                        {canViewFinance ? (
                          <p className="text-sm font-semibold">
                            {formatMoneyMinor(record.order.totalMinor, record.order.currency as CurrencyCode, locale)}
                          </p>
                        ) : null}
                      </div>
                      {record.order.lines.length > 0 ? (
                        <div className="mt-4 grid gap-2">
                          {record.order.lines.map((line) => (
                            <p key={line.id} className="rounded-2xl border border-border bg-surface px-3 py-2 text-sm font-semibold">
                              {line.type === "LABOR" ? t(serviceTranslationKey(line.description)) : line.description}
                            </p>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-6 rounded-3xl border border-dashed border-border bg-bg p-6 text-sm font-semibold text-muted">
                  {t("customer.history.empty")}
                </p>
              )}
            </section>

            <section className="rounded-[2rem] border border-border bg-surface p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{t("customer.purchases.label")}</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-normal">{t("customer.purchases.title")}</h2>
                </div>
                <ShoppingCart className="h-6 w-6 text-accent" aria-hidden="true" />
              </div>

              {data.retailPurchases.length > 0 ? (
                <div className="mt-6 overflow-hidden rounded-3xl border border-border bg-bg">
                  {data.retailPurchases.map((purchase) => (
                    <div key={purchase.id} className="border-b border-border p-4 last:border-b-0">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold">{dateFormatter.format(purchase.date)}</p>
                          <p className="mt-1 text-xs font-semibold text-muted">
                            {purchase.paymentMethod ? t(paymentMethodKey(purchase.paymentMethod)) : t("order.payment.other")}
                          </p>
                        </div>
                        {canViewFinance ? (
                          <p className="text-sm font-semibold">
                            {formatMoneyMinor(purchase.totalMinor, purchase.currency as CurrencyCode, locale)}
                          </p>
                        ) : null}
                      </div>
                      {purchase.lines.length > 0 ? (
                        <div className="mt-4 grid gap-2">
                          {purchase.lines.map((line) => (
                            <p key={line.id} className="rounded-2xl border border-border bg-surface px-3 py-2 text-sm font-semibold">
                              {line.description} / {line.quantity.toString()} {t(`inventory.unit.${line.unit}`)}
                            </p>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-6 rounded-3xl border border-dashed border-border bg-bg p-6 text-sm font-semibold text-muted">
                  {t("customer.purchases.empty")}
                </p>
              )}
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-[2rem] border border-border bg-surface p-6 shadow-sm">
              <div className="flex gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-text/10 text-text">
                  <UserRound className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{t("order.customer.title")}</p>
                  <p className="mt-1 text-xl font-semibold">{data.customer.name}</p>
                  <p className="mt-2 text-sm font-semibold text-muted">
                    {canSeePhone ? (data.customer.phone ?? t("order.customer.noPhone")) : t("order.customer.phoneHidden")}
                  </p>
                </div>
              </div>
            </section>

            {canViewFinance ? (
              <section className="rounded-[2rem] border border-border bg-surface p-6 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{t("customer.debt.label")}</p>
                <p className="mt-3 text-3xl font-semibold">
                  {formatMoneyMinor(data.openDebtMinor, data.currency as CurrencyCode, locale)}
                </p>
              </section>
            ) : null}

            {session.role === "SHOP_OWNER" ? (
              <section className="rounded-[2rem] border border-border bg-surface p-6 shadow-sm">
                <div className="flex gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent/10 text-accent">
                    <BellRing className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{t("customer.reminder.label")}</p>
                    <h2 className="mt-1 text-xl font-semibold">{t("customer.reminder.title")}</h2>
                    <p className="mt-2 text-sm font-semibold leading-6 text-muted">
                      {t("customer.reminder.pending").replace("{count}", String(data.pendingReminderCount))}
                    </p>
                  </div>
                </div>
                <form action={createCustomerReminderAction} className="mt-5">
                  <input type="hidden" name="customerVehicleId" value={customerVehicleId} />
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="shopId" value={data.shopId} />
                  <button
                    type="submit"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-bold text-white shadow-sm shadow-accent/20 transition hover:opacity-90"
                  >
                    <BellRing className="h-4 w-4" aria-hidden="true" />
                    {t("customer.reminder.submit")}
                  </button>
                </form>
              </section>
            ) : null}

            <section className="rounded-[2rem] border border-border bg-surface p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{t("customer.recommendations.label")}</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-normal">{t("customer.recommendations.title")}</h2>
              {data.recommendations.length > 0 ? (
                <div className="mt-5 space-y-3">
                  {data.recommendations.map((recommendation) => (
                    <div key={recommendation.id} className="rounded-2xl border border-border bg-bg p-4">
                      <p className="text-sm font-bold">
                        {t(`library.fluid.${recommendation.fluidType}`)} / {recommendation.viscosity}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-muted">
                        {recommendation.specification ?? t("order.empty")} / {recommendation.volumeLiters}L
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-5 rounded-3xl border border-dashed border-border bg-bg p-5 text-sm font-semibold text-muted">
                  {t("customer.recommendations.empty")}
                </p>
              )}
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}

type InfoCardProps = {
  children: React.ReactNode;
  icon: React.ReactNode;
  label: string;
};

function InfoCard({ children, icon, label }: InfoCardProps) {
  return (
    <div className="rounded-3xl border border-border bg-bg p-5">
      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-text/10 text-text">{icon}</div>
      <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 text-lg font-semibold">{children}</p>
    </div>
  );
}

type ForecastCardProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
};

function ForecastCard({ icon, label, value }: ForecastCardProps) {
  return (
    <div className="rounded-3xl border border-border bg-bg p-5">
      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-accent/10 text-accent">{icon}</div>
      <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}

async function loadCustomerVehicleDetail(
  customerVehicleId: string,
  tenantId: string,
  countryCode: string,
  role: UserRole,
  sessionShopId: string,
  userId: string,
  requestedShopId: string | undefined,
) {
  const requestedShopFilter = role === "SHOP_OWNER" && requestedShopId ? { shopId: requestedShopId } : {};
  const customerVehicle = await prisma.customerVehicle.findFirst({
    where: {
      id: customerVehicleId,
      isActive: true,
      ...(role === "SHOP_OWNER" ? requestedShopFilter : { shopId: sessionShopId }),
      shop: {
        tenantId,
        countryCode,
        isActive: true,
      },
      customer: {
        tenantId,
        countryCode,
      },
      vehicleIdentity: {
        countryCode,
      },
    },
    select: {
      customerId: true,
      shopId: true,
      vehicleIdentityId: true,
      customer: {
        select: {
          name: true,
          phone: true,
        },
      },
      shop: {
        select: {
          currency: true,
        },
      },
      vehicleIdentity: {
        select: {
          make: true,
          model: true,
          plateNumber: true,
          vinNormalized: true,
          year: true,
          catalog: {
            select: {
              recommendations: {
                where: {
                  status: {
                    in: ["PENDING", "APPROVED"],
                  },
                },
                select: {
                  id: true,
                  fluidType: true,
                  viscosity: true,
                  specification: true,
                  volumeLiters: true,
                  intervalKm: true,
                  intervalMonths: true,
                  priority: true,
                  source: true,
                },
                orderBy: [{ fluidType: "asc" }, { priority: "asc" }, { createdAt: "desc" }],
              },
            },
          },
          qr: {
            select: {
              isActive: true,
              slug: true,
            },
          },
        },
      },
    },
  });

  if (!customerVehicle) {
    return null;
  }

  const [serviceRecords, retailPurchases, openDebt, pendingReminderCount] = await Promise.all([
    prisma.serviceRecord.findMany({
      where: {
        countryCode,
        shopId: customerVehicle.shopId,
        vehicleIdentityId: customerVehicle.vehicleIdentityId,
        shop: {
          tenantId,
          countryCode,
        },
        order: {
          tenantId,
          countryCode,
          shopId: customerVehicle.shopId,
        },
      },
      select: {
        id: true,
        mileage: true,
        serviceDate: true,
        nextServiceMileage: true,
        nextServiceDate: true,
        order: {
          select: {
            currency: true,
            totalMinor: true,
            lines: {
              select: {
                id: true,
                description: true,
                type: true,
              },
              orderBy: {
                type: "asc",
              },
            },
          },
        },
      },
      orderBy: {
        serviceDate: "desc",
      },
      take: 20,
    }),
    prisma.order.findMany({
      where: {
        tenantId,
        countryCode,
        shopId: customerVehicle.shopId,
        customerId: customerVehicle.customerId,
        type: "RETAIL",
        status: "COMPLETED",
      },
      select: {
        id: true,
        completedAt: true,
        createdAt: true,
        currency: true,
        paymentMethod: true,
        totalMinor: true,
        lines: {
          select: {
            id: true,
            description: true,
            quantity: true,
            unit: true,
          },
          orderBy: {
            id: "asc",
          },
        },
      },
      orderBy: {
        completedAt: "desc",
      },
      take: 20,
    }),
    prisma.customerDebt.aggregate({
      where: {
        customerId: customerVehicle.customerId,
        shopId: customerVehicle.shopId,
        amountMinor: {
          gt: 0,
        },
        customer: {
          tenantId,
          countryCode,
        },
      },
      _sum: {
        amountMinor: true,
      },
    }),
    prisma.notification.count({
      where: {
        userId,
        status: "PENDING",
        titleKey: "notification.customerReminder.title",
        payload: {
          path: ["customerVehicleId"],
          equals: customerVehicleId,
        },
      },
    }),
  ]);

  const engineOilRecommendation =
    customerVehicle.vehicleIdentity.catalog?.recommendations.find((recommendation) => recommendation.fluidType === "ENGINE_OIL") ??
    null;

  return {
    currency: customerVehicle.shop.currency,
    customer: customerVehicle.customer,
    engineOilRecommendation: engineOilRecommendation
      ? {
          ...engineOilRecommendation,
          volumeLiters: engineOilRecommendation.volumeLiters.toString(),
        }
      : null,
    openDebtMinor: openDebt._sum.amountMinor ?? 0,
    pendingReminderCount,
    recommendations:
      customerVehicle.vehicleIdentity.catalog?.recommendations.map((recommendation) => ({
        ...recommendation,
        volumeLiters: recommendation.volumeLiters.toString(),
      })) ?? [],
    retailPurchases: retailPurchases.map((purchase) => ({
      ...purchase,
      date: purchase.completedAt ?? purchase.createdAt,
    })),
    serviceRecords,
    shopId: customerVehicle.shopId,
    vehicle: {
      ...customerVehicle.vehicleIdentity,
      catalog: undefined,
      qrSlug: customerVehicle.vehicleIdentity.qr?.isActive ? customerVehicle.vehicleIdentity.qr.slug : null,
    },
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
