import Link from "next/link";
import type { Prisma, UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { ArrowLeft, CarFront, Search, UserRound } from "lucide-react";
import { addExistingCustomerVehicleToQueueAction } from "@/app/customers/actions";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { createTranslator, loadMessages, toSupportedLocale } from "@/i18n/messages";
import { getAuthSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { canAccessAppRoute } from "@/lib/role-access";

export const dynamic = "force-dynamic";

type CustomersRouteProps = {
  searchParams: Promise<{
    error?: string;
    locale?: string;
    q?: string;
    shopId?: string;
  }>;
};

export default async function CustomersRoute({ searchParams }: CustomersRouteProps) {
  const session = await getAuthSession();

  if (!session) {
    redirect("/login?locale=ru");
  }

  if (!canAccessAppRoute(session.role, "customers")) {
    redirect(`/dashboard?locale=${session.countryCode === "AZ" ? "az" : "en"}`);
  }

  const params = await searchParams;
  const locale = toSupportedLocale(params.locale);
  const messages = await loadMessages(locale);
  const t = createTranslator(messages);
  const data = await loadCustomersData(
    session.tenantId,
    session.countryCode,
    session.role,
    session.shopId,
    params.shopId,
    params.q,
  );
  const errorMessage = safeCustomerErrorKey(params.error) ? t(params.error) : null;
  const languageLabels = {
    az: t("common.language.az"),
    ru: t("common.language.ru"),
    en: t("common.language.en"),
  };
  const canSeePhone = session.role === "SHOP_OWNER";

  return (
    <main className="min-h-screen bg-bg px-5 py-6 text-text sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href={`/dashboard?locale=${locale}&shopId=${data.selectedShopId}`}
            className="inline-flex items-center gap-2 text-sm font-bold text-muted transition hover:text-text"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t("customer.back")}
          </Link>
          <LanguageSwitcher locale={locale} labels={languageLabels} basePath="/customers" />
        </header>

        <section className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="space-y-4">
            <div className="rounded-3xl border border-border bg-surface p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{t("dashboard.branch.title")}</p>
              <div className="mt-4 space-y-2">
                {data.shops.map((shop) => (
                  <Link
                    key={shop.id}
                    href={`/customers?locale=${locale}&shopId=${shop.id}&q=${encodeURIComponent(data.query)}`}
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
            </div>
          </aside>

          <div className="space-y-6">
            <section className="rounded-[2rem] border border-border bg-surface p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-accent/10 text-accent">
                  <Search className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{t("customer.search.label")}</p>
                  <h1 className="mt-1 text-2xl font-semibold tracking-normal">{t("customer.search.title")}</h1>
                </div>
              </div>

              <form action="/customers" className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="shopId" value={data.selectedShopId} />
                <input
                  name="q"
                  defaultValue={data.query}
                  placeholder={t("customer.search.placeholder")}
                  className="h-12 rounded-2xl border border-border bg-bg px-4 text-sm font-semibold text-text outline-none transition focus:border-text"
                />
                <button
                  type="submit"
                  className="rounded-2xl bg-text px-5 py-3 text-sm font-bold text-surface transition hover:opacity-90"
                >
                  {t("customer.search.submit")}
                </button>
              </form>

              {errorMessage ? (
                <p className="mt-4 rounded-2xl border border-danger/20 bg-danger/10 p-4 text-sm font-bold text-danger">
                  {errorMessage}
                </p>
              ) : null}
            </section>

            <section className="rounded-[2rem] border border-border bg-surface p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{t("customer.list.label")}</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-normal">{t("customer.list.title")}</h2>

              {data.items.length > 0 ? (
                <div className="mt-6 grid gap-4">
                  {data.items.map((item) => (
                    <article key={item.id} className="rounded-3xl border border-border bg-bg p-5">
                      <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="flex gap-3">
                            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-accent/10 text-accent">
                              <CarFront className="h-5 w-5" aria-hidden="true" />
                            </div>
                            <div>
                              <p className="text-sm font-bold">
                                {item.vehicle.make} {item.vehicle.model}
                              </p>
                              <p className="mt-1 text-xs font-semibold text-muted">
                                {item.vehicle.plateNumber ?? t("dashboard.queue.noPlate")} -{" "}
                                {item.vehicle.vinNormalized ?? t("dashboard.queue.noVin")}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-text/10 text-text">
                              <UserRound className="h-5 w-5" aria-hidden="true" />
                            </div>
                            <div>
                              <p className="text-sm font-bold">{item.customer.name}</p>
                              <p className="mt-1 text-xs font-semibold text-muted">
                                {canSeePhone ? (item.customer.phone ?? t("order.customer.noPhone")) : t("order.customer.phoneHidden")}
                              </p>
                            </div>
                          </div>
                        </div>

                        <form action={addExistingCustomerVehicleToQueueAction} className="grid gap-3 sm:grid-cols-[1fr_auto] lg:min-w-80">
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="shopId" value={data.selectedShopId} />
                          <input type="hidden" name="customerVehicleId" value={item.id} />
                          <input
                            name="mileage"
                            inputMode="numeric"
                            placeholder={t("customer.queue.mileagePlaceholder")}
                            className="h-11 rounded-2xl border border-border bg-surface px-3 text-sm font-semibold text-text outline-none transition focus:border-text"
                          />
                          <button
                            type="submit"
                            className="rounded-2xl bg-accent px-5 py-3 text-sm font-bold text-white transition hover:opacity-90"
                          >
                            {t("customer.queue.submit")}
                          </button>
                        </form>
                        <Link
                          href={`/customers/${item.id}?locale=${locale}&shopId=${data.selectedShopId}`}
                          className="inline-flex items-center justify-center rounded-2xl border border-border bg-surface px-5 py-3 text-sm font-bold transition hover:border-text lg:col-start-2"
                        >
                          {t("customer.list.open")}
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="mt-6 rounded-3xl border border-dashed border-border bg-bg p-6 text-sm font-semibold text-muted">
                  {t("customer.list.empty")}
                </p>
              )}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function safeCustomerErrorKey(value: string | undefined): value is string {
  return typeof value === "string" && value.startsWith("customer.error.");
}

async function loadCustomersData(
  tenantId: string,
  countryCode: string,
  role: UserRole,
  sessionShopId: string,
  requestedShopId: string | undefined,
  rawQuery: string | undefined,
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
  const query = rawQuery?.trim() ?? "";
  const searchWhere = query.length > 0 ? customerVehicleSearchWhere(query) : {};
  const customerVehicles = await prisma.customerVehicle.findMany({
    where: {
      shopId: selectedShop.id,
      isActive: true,
      shop: {
        tenantId,
        countryCode,
        isActive: true,
      },
      customer: {
        tenantId,
        countryCode,
        shopId: selectedShop.id,
      },
      vehicleIdentity: {
        countryCode,
      },
      ...searchWhere,
    },
    select: {
      id: true,
      customer: {
        select: {
          name: true,
          phone: true,
        },
      },
      vehicleIdentity: {
        select: {
          make: true,
          model: true,
          plateNumber: true,
          vinNormalized: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: 40,
  });

  return {
    items: customerVehicles.map((item) => ({
      id: item.id,
      customer: item.customer,
      vehicle: item.vehicleIdentity,
    })),
    query,
    selectedShopId: selectedShop.id,
    shops: tenant.shops,
  };
}

function customerVehicleSearchWhere(query: string): Prisma.CustomerVehicleWhereInput {
  return {
    OR: [
      {
        customer: {
          name: {
            contains: query,
            mode: "insensitive",
          },
        },
      },
      {
        customer: {
          phone: {
            contains: query,
            mode: "insensitive",
          },
        },
      },
      {
        vehicleIdentity: {
          make: {
            contains: query,
            mode: "insensitive",
          },
        },
      },
      {
        vehicleIdentity: {
          model: {
            contains: query,
            mode: "insensitive",
          },
        },
      },
      {
        vehicleIdentity: {
          plateNumber: {
            contains: query,
            mode: "insensitive",
          },
        },
      },
      {
        vehicleIdentity: {
          vinNormalized: {
            contains: query.toUpperCase(),
            mode: "insensitive",
          },
        },
      },
    ],
  };
}
