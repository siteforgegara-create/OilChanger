import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { FluidType, Prisma, ProductCategory } from "@prisma/client";
import { ArrowLeft, BookOpen, CarFront, Check, Clock3, Gauge, PackageCheck, Play, QrCode, UserRound } from "lucide-react";
import {
  completeOrderAction,
  linkVehicleCatalogAction,
  startOrderAction,
  updateOrderDiscountAction,
  updateOrderProductsAction,
  updateOrderServicesAction,
  updateOrderStaffAction,
} from "@/app/dashboard/actions";
import {
  OrderProductsTable,
  type OrderProductsTableItem,
  type OrderProductsTableLabels,
} from "@/components/orders/order-products-table";
import { createTranslator, loadMessages, toSupportedLocale } from "@/i18n/messages";
import { getAuthSession } from "@/lib/auth-session";
import { formatMoneyMinor, type CurrencyCode } from "@/lib/money";
import { serviceItems, serviceLabel, serviceTranslationKey } from "@/lib/order-services";
import { prisma } from "@/lib/prisma";
import { canAccessAppRoute } from "@/lib/role-access";
import { formatQuantityFromDecimal } from "@/lib/stock-quantity";

export const dynamic = "force-dynamic";

type OrderRouteProps = {
  params: Promise<{
    orderId: string;
  }>;
  searchParams: Promise<{
    locale?: string;
  }>;
};

export default async function OrderRoute({ params, searchParams }: OrderRouteProps) {
  const session = await getAuthSession();

  if (!session) {
    redirect("/login?locale=ru");
  }

  if (!canAccessAppRoute(session.role, "dashboard")) {
    redirect("/admin?locale=az");
  }

  const [{ orderId }, query] = await Promise.all([params, searchParams]);
  const locale = toSupportedLocale(query.locale);
  const messages = await loadMessages(locale);
  const t = createTranslator(messages);
  const order = await loadOrder(orderId, session.tenantId, session.countryCode, session.role, session.shopId);

  if (!order?.vehicleIdentity) {
    notFound();
  }

  const vehicle = order.vehicleIdentity;
  const productLinesByProductId = new Map(
    order.lines.filter((line) => line.type === "PRODUCT" && line.productId).map((line) => [line.productId, line]),
  );
  const assignedStaffIds = new Set(order.staff.map((staff) => staff.userId));
  const orderProductItems = order.stocks.map((stock): OrderProductsTableItem => {
    const selectedLine = productLinesByProductId.get(stock.productId);

    return {
      categoryLabel: t(`inventory.category.${stock.product.category}`),
      isLow: stock.quantity.lessThanOrEqualTo(stock.minQuantity),
      isNegative: stock.quantity.lessThan(0),
      productBrand: stock.product.brand,
      productId: stock.productId,
      productName: stock.product.name,
      productViscosity: stock.product.viscosity,
      quantityDefault: selectedLine ? formatQuantityFromDecimal(selectedLine.quantity) : "",
      servicePriceLabel: formatMoneyMinor(stock.servicePriceMinor, order.currency as CurrencyCode, locale),
      servicePriceMinor: stock.servicePriceMinor,
      stockLabel: `${formatQuantityFromDecimal(stock.quantity)} ${t(`inventory.unit.${stock.product.baseUnit}`)}`,
    };
  });
  const recommendations = order.catalogRecommendations.map((recommendation) => ({
    ...recommendation,
    matchingStocks: order.stocks.filter(
      (stock) =>
        stock.product.category === productCategoryForFluid(recommendation.fluidType) &&
        normalizeComparable(stock.product.viscosity) === normalizeComparable(recommendation.viscosity),
    ),
  }));

  return (
    <main className="min-h-screen bg-bg px-5 py-6 text-text sm:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href={`/dashboard?locale=${locale}&shopId=${order.shopId}`}
          className="inline-flex items-center gap-2 text-sm font-bold text-muted transition hover:text-text"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t("order.back")}
        </Link>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border border-border bg-surface p-6 shadow-sm sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{t("order.label")}</p>
                <h1 className="mt-3 text-3xl font-semibold tracking-normal sm:text-5xl">
                  {vehicle.make} {vehicle.model}
                </h1>
                <p className="mt-3 text-sm font-bold text-muted">{t(`dashboard.status.${order.status}`)}</p>
              </div>
              {order.status === "QUEUED" || order.status === "SCHEDULED" ? (
                <form action={startOrderAction}>
                  <input type="hidden" name="orderId" value={order.id} />
                  <input type="hidden" name="locale" value={locale} />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-bold text-white shadow-sm shadow-accent/20 transition hover:opacity-90"
                  >
                    <Play className="h-4 w-4" aria-hidden="true" />
                    {t("order.start")}
                  </button>
                </form>
              ) : null}
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <InfoCard icon={<CarFront className="h-5 w-5" aria-hidden="true" />} label={t("order.vehicle.plate")}>
                {vehicle.plateNumber ?? t("dashboard.queue.noPlate")}
              </InfoCard>
              <InfoCard icon={<CarFront className="h-5 w-5" aria-hidden="true" />} label={t("order.vehicle.vin")}>
                {vehicle.vinNormalized ?? t("dashboard.queue.noVin")}
              </InfoCard>
              <InfoCard icon={<Clock3 className="h-5 w-5" aria-hidden="true" />} label={t("order.vehicle.year")}>
                {vehicle.year ?? t("order.empty")}
              </InfoCard>
              <InfoCard icon={<Gauge className="h-5 w-5" aria-hidden="true" />} label={t("order.vehicle.mileage")}>
                {order.mileage ? `${order.mileage} km` : t("dashboard.queue.noMileage")}
              </InfoCard>
            </div>

            <div className="mt-6 rounded-3xl border border-border bg-bg p-5">
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{t("order.catalog.label")}</p>
                  <p className="mt-2 text-base font-bold">
                    {vehicle.catalog ? catalogOptionLabel(vehicle.catalog) : t("order.catalog.notLinked")}
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-muted">{t("order.catalog.hint")}</p>
                </div>
                <Link
                  href={`/library?locale=${locale}&shopId=${order.shopId}&q=${encodeURIComponent(`${vehicle.make} ${vehicle.model}`)}`}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-bold transition hover:border-text"
                >
                  <BookOpen className="h-4 w-4" aria-hidden="true" />
                  {t("order.catalog.openLibrary")}
                </Link>
              </div>

              {order.catalogCandidates.length > 0 ? (
                <form action={linkVehicleCatalogAction} className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                  <input type="hidden" name="orderId" value={order.id} />
                  <input type="hidden" name="locale" value={locale} />
                  <select
                    name="catalogId"
                    defaultValue={vehicle.catalogId ?? order.catalogCandidates[0].id}
                    className="h-11 rounded-2xl border border-border bg-surface px-3 text-sm font-semibold text-text outline-none transition focus:border-accent"
                  >
                    {order.catalogCandidates.map((catalog) => (
                      <option key={catalog.id} value={catalog.id}>
                        {catalogOptionLabel(catalog)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-text px-5 py-3 text-sm font-bold text-surface transition hover:opacity-90"
                  >
                    <Check className="h-4 w-4" aria-hidden="true" />
                    {t("order.catalog.link")}
                  </button>
                </form>
              ) : (
                <p className="mt-4 rounded-2xl border border-dashed border-border bg-surface p-3 text-sm font-semibold text-muted">
                  {t("order.catalog.noCandidates")}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-border bg-surface p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-accent/10 text-accent">
                  <UserRound className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{t("order.customer.title")}</p>
                  <p className="mt-1 text-xl font-semibold">{order.customer?.name ?? t("dashboard.queue.noCustomer")}</p>
                </div>
              </div>
              <p className="mt-5 text-sm font-semibold leading-6 text-muted">
                {session.role === "SHOP_OWNER" ? (order.customer?.phone ?? t("order.customer.noPhone")) : t("order.customer.phoneHidden")}
              </p>
            </div>

            <div className="rounded-[2rem] border border-border bg-surface p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{t("order.staff.label")}</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-normal">{t("order.staff.title")}</h2>
              <form action={updateOrderStaffAction} className="mt-6 space-y-3">
                <input type="hidden" name="orderId" value={order.id} />
                <input type="hidden" name="locale" value={locale} />
                {order.staffMembers.length > 0 ? (
                  order.staffMembers.map((member) => (
                    <label
                      key={member.userId}
                      className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-border bg-bg p-4 transition hover:border-text"
                    >
                      <span className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          name="staffId"
                          value={member.userId}
                          defaultChecked={assignedStaffIds.has(member.userId)}
                          className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                        />
                        <span>
                          <span className="block text-sm font-bold">{member.name}</span>
                          <span className="block text-xs font-semibold text-muted">{t(`order.staff.role.${member.role}`)}</span>
                        </span>
                      </span>
                    </label>
                  ))
                ) : (
                  <p className="rounded-3xl border border-dashed border-border bg-bg p-5 text-sm font-semibold text-muted">
                    {t("order.staff.empty")}
                  </p>
                )}
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-bold text-white shadow-sm shadow-accent/20 transition hover:opacity-90"
                >
                  <Check className="h-4 w-4" aria-hidden="true" />
                  {t("order.staff.save")}
                </button>
              </form>
            </div>

            <div className="rounded-[2rem] border border-border bg-surface p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{t("order.services.label")}</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-normal">{t("order.services.title")}</h2>
              <form action={updateOrderServicesAction} className="mt-6 space-y-3">
                <input type="hidden" name="orderId" value={order.id} />
                <input type="hidden" name="locale" value={locale} />
                {serviceItems.map((service) => {
                  const checked = order.lines.some(
                    (line) => line.type === "LABOR" && line.description === serviceLabel(service.key),
                  );

                  return (
                    <label
                      key={service.key}
                      className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-border bg-bg p-4 transition hover:border-text"
                    >
                      <span className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          name="serviceKey"
                          value={service.key}
                          defaultChecked={checked}
                          className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                        />
                        <span className="text-sm font-bold">{t(`order.services.${service.key}`)}</span>
                      </span>
                      <span className="text-sm font-bold text-muted">
                        {formatMoneyMinor(service.priceMinor, order.currency as CurrencyCode, locale)}
                      </span>
                    </label>
                  );
                })}
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-bold text-white shadow-sm shadow-accent/20 transition hover:opacity-90"
                >
                  <Check className="h-4 w-4" aria-hidden="true" />
                  {t("order.services.save")}
                </button>
              </form>
            </div>

            <div className="rounded-[2rem] border border-border bg-surface p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-accent/10 text-accent">
                  <BookOpen className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{t("order.recommendations.label")}</p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-normal">{t("order.recommendations.title")}</h2>
                </div>
              </div>

              {recommendations.length > 0 ? (
                <div className="mt-5 space-y-3">
                  {recommendations.map((recommendation) => (
                    <div key={recommendation.id} className="rounded-3xl border border-border bg-bg p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold">
                            {t(`library.fluid.${recommendation.fluidType}`)} / {recommendation.viscosity}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-muted">
                            {recommendation.specification ?? t("order.empty")} / {recommendation.volumeLiters}L
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-surface px-3 py-1 text-xs font-bold text-muted">
                            {t(`library.source.${recommendation.source}`)}
                          </span>
                          <span className="rounded-full bg-surface px-3 py-1 text-xs font-bold text-muted">
                            {t(`library.priority.${recommendation.priority}`)}
                          </span>
                        </div>
                      </div>

                      <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                        {formatRecommendationInterval(recommendation.intervalKm, recommendation.intervalMonths, t)}
                      </p>

                      {recommendation.matchingStocks.length > 0 ? (
                        <div className="mt-4 space-y-2">
                          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
                            {t("order.recommendations.inStock")}
                          </p>
                          {recommendation.matchingStocks.map((stock) => (
                            <div
                              key={`${recommendation.id}-${stock.productId}`}
                              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-3 text-sm font-bold"
                            >
                              <span>
                                {stock.product.brand ? `${stock.product.brand} ` : ""}
                                {stock.product.name}
                              </span>
                              <span className="text-muted">
                                {formatQuantityFromDecimal(stock.quantity)} {t(`inventory.unit.${stock.product.baseUnit}`)} /{" "}
                                {formatMoneyMinor(stock.servicePriceMinor, order.currency as CurrencyCode, locale)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-4 rounded-2xl border border-dashed border-border bg-surface p-3 text-sm font-semibold text-muted">
                          {t("order.recommendations.noStockMatch")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-5 rounded-3xl border border-dashed border-border bg-bg p-5 text-sm font-semibold text-muted">
                  {t("order.recommendations.empty")}
                </p>
              )}
            </div>

            <div className="rounded-[2rem] border border-border bg-surface p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-accent/10 text-accent">
                  <PackageCheck className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{t("order.products.label")}</p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-normal">{t("order.products.title")}</h2>
                </div>
              </div>
              <OrderProductsTable
                action={updateOrderProductsAction}
                currency={order.currency}
                items={orderProductItems}
                labels={orderProductLabels(t)}
                locale={locale}
                orderId={order.id}
              />
            </div>

            <div className="rounded-[2rem] border border-border bg-surface p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{t("order.discount.label")}</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-normal">{t("order.discount.title")}</h2>
              {order.status === "COMPLETED" ? (
                <div className="mt-5 space-y-3 text-sm font-bold">
                  <p className="rounded-2xl border border-border bg-bg p-4">
                    {t("order.discount.current")}:{" "}
                    {formatMoneyMinor(order.discountMinor, order.currency as CurrencyCode, locale)}
                  </p>
                  {order.discounts[0]?.reason ? (
                    <p className="rounded-2xl border border-border bg-bg p-4">
                      {t("order.discount.reason")}: {order.discounts[0].reason}
                    </p>
                  ) : null}
                </div>
              ) : (
                <form action={updateOrderDiscountAction} className="mt-5 grid gap-4">
                  <input type="hidden" name="orderId" value={order.id} />
                  <input type="hidden" name="locale" value={locale} />
                  <label className="grid gap-2">
                    <span className="text-sm font-bold">{t("order.discount.amount")}</span>
                    <input
                      name="discountAmount"
                      inputMode="decimal"
                      defaultValue={(order.discountMinor / 100).toFixed(2)}
                      className="h-12 rounded-2xl border border-border bg-bg px-4 text-sm font-semibold text-text outline-none transition focus:border-accent"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-bold">{t("order.discount.reason")}</span>
                    <input
                      name="discountReason"
                      defaultValue={order.discounts[0]?.reason ?? ""}
                      placeholder={t("order.discount.reasonPlaceholder")}
                      className="h-12 rounded-2xl border border-border bg-bg px-4 text-sm font-semibold text-text outline-none transition focus:border-accent"
                    />
                  </label>
                  <button
                    type="submit"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-bold text-white shadow-sm shadow-accent/20 transition hover:opacity-90"
                  >
                    <Check className="h-4 w-4" aria-hidden="true" />
                    {t("order.discount.save")}
                  </button>
                </form>
              )}
            </div>

            <div className="rounded-[2rem] border border-border bg-surface p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{t("order.complete.label")}</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-normal">{t("order.complete.title")}</h2>
              {order.status === "COMPLETED" ? (
                <div className="mt-5 space-y-3 text-sm font-bold">
                  <p className="rounded-2xl border border-success/20 bg-success/10 p-4 text-success">
                    {t("order.complete.done")}
                  </p>
                  <p className="rounded-2xl border border-border bg-bg p-4">
                    {t("order.complete.paid")}: {formatMoneyMinor(order.paidMinor, order.currency as CurrencyCode, locale)}
                  </p>
                  <p className="rounded-2xl border border-border bg-bg p-4">
                    {t("order.complete.debt")}: {formatMoneyMinor(order.debtMinor, order.currency as CurrencyCode, locale)}
                  </p>
                  {vehicle.qr ? (
                    <Link
                      href={`/v/${vehicle.qr.slug}`}
                      className="flex items-center gap-3 rounded-2xl border border-border bg-bg p-4 transition hover:border-text"
                    >
                      <QrCode className="h-5 w-5 text-accent" aria-hidden="true" />
                      <span>{t("order.complete.qrReady")}</span>
                    </Link>
                  ) : null}
                </div>
              ) : (
                <form action={completeOrderAction} className="mt-5 grid gap-4">
                  <input type="hidden" name="orderId" value={order.id} />
                  <input type="hidden" name="locale" value={locale} />
                  <label className="grid gap-2">
                    <span className="text-sm font-bold">{t("order.complete.paidAmount")}</span>
                    <input
                      name="paidAmount"
                      inputMode="decimal"
                      defaultValue={(order.totalMinor / 100).toFixed(2)}
                      className="h-12 rounded-2xl border border-border bg-bg px-4 text-sm font-semibold text-text outline-none transition focus:border-accent"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-bold">{t("order.complete.method")}</span>
                    <select
                      name="paymentMethod"
                      defaultValue="CASH"
                      className="h-12 rounded-2xl border border-border bg-bg px-4 text-sm font-semibold text-text outline-none transition focus:border-accent"
                    >
                      <option value="CASH">{t("order.payment.cash")}</option>
                      <option value="CARD">{t("order.payment.card")}</option>
                      <option value="TRANSFER">{t("order.payment.transfer")}</option>
                      <option value="OTHER">{t("order.payment.other")}</option>
                    </select>
                  </label>
                  <p className="text-sm font-semibold leading-6 text-muted">{t("order.complete.hint")}</p>
                  <button
                    type="submit"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-text px-5 py-3 text-sm font-bold text-surface transition hover:opacity-90"
                  >
                    <Check className="h-4 w-4" aria-hidden="true" />
                    {t("order.complete.submit")}
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[2rem] border border-border bg-surface p-6 shadow-sm sm:p-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{t("order.total.label")}</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-normal">{t("order.total.title")}</h2>
            </div>
            <p className="text-4xl font-semibold">
              {formatMoneyMinor(order.totalMinor, order.currency as CurrencyCode, locale)}
            </p>
          </div>
          <div className="mt-6 grid gap-3 text-sm font-bold sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-bg p-4">
              <span className="block text-xs uppercase tracking-[0.16em] text-muted">{t("order.total.subtotal")}</span>
              <span className="mt-2 block">{formatMoneyMinor(order.subtotalMinor, order.currency as CurrencyCode, locale)}</span>
            </div>
            <div className="rounded-2xl border border-border bg-bg p-4">
              <span className="block text-xs uppercase tracking-[0.16em] text-muted">{t("order.total.discount")}</span>
              <span className="mt-2 block">{formatMoneyMinor(order.discountMinor, order.currency as CurrencyCode, locale)}</span>
            </div>
            <div className="rounded-2xl border border-border bg-bg p-4">
              <span className="block text-xs uppercase tracking-[0.16em] text-muted">{t("order.total.payable")}</span>
              <span className="mt-2 block">{formatMoneyMinor(order.totalMinor, order.currency as CurrencyCode, locale)}</span>
            </div>
          </div>
          {order.lines.length > 0 ? (
            <div className="mt-6 divide-y divide-border rounded-3xl border border-border bg-bg">
              {order.lines.map((line) => (
                <div key={line.id} className="flex items-center justify-between gap-4 p-4 text-sm font-bold">
                  <span>{translatedOrderLineDescription(line, t)}</span>
                  <span>{formatMoneyMinor(line.totalMinor, order.currency as CurrencyCode, locale)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-3xl border border-dashed border-border bg-bg p-5 text-sm font-semibold text-muted">
              {t("order.total.empty")}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

type InfoCardProps = {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
};

function InfoCard({ icon, label, children }: InfoCardProps) {
  return (
    <div className="rounded-3xl border border-border bg-bg p-5">
      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-text/10 text-text">{icon}</div>
      <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 text-lg font-semibold">{children}</p>
    </div>
  );
}

async function loadOrder(orderId: string, tenantId: string, countryCode: string, role: string, shopId: string) {
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      tenantId,
      countryCode,
      ...(role === "SHOP_OWNER" ? {} : { shopId }),
    },
    select: {
      id: true,
      shopId: true,
      status: true,
      mileage: true,
      paidMinor: true,
      debtMinor: true,
      paymentStatus: true,
      subtotalMinor: true,
      discountMinor: true,
      totalMinor: true,
      currency: true,
      discounts: {
        select: {
          reason: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
      serviceRecord: {
        select: {
          id: true,
        },
      },
      vehicleIdentity: {
        select: {
          id: true,
          catalogId: true,
          make: true,
          model: true,
          year: true,
          plateNumber: true,
          vinNormalized: true,
          catalog: {
            select: {
              id: true,
              make: true,
              model: true,
              generation: true,
              yearFrom: true,
              yearTo: true,
              engineCode: true,
            },
          },
          qr: {
            select: {
              slug: true,
            },
          },
        },
      },
      lines: {
        select: {
          id: true,
          type: true,
          productId: true,
          description: true,
          quantity: true,
          totalMinor: true,
        },
        orderBy: {
          type: "asc",
        },
      },
      customer: {
        select: {
          name: true,
          phone: role === "SHOP_OWNER",
        },
      },
      staff: {
        select: {
          userId: true,
          user: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          user: {
            name: "asc",
          },
        },
      },
    },
  });

  if (!order?.vehicleIdentity) {
    return null;
  }

  const stocks = await prisma.inventoryStock.findMany({
    where: {
      shopId: order.shopId,
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
      productId: true,
      quantity: true,
      minQuantity: true,
      servicePriceMinor: true,
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
  const staffMembers = await prisma.membership.findMany({
    where: {
      shopId: order.shopId,
      isActive: true,
      shop: {
        tenantId,
        countryCode,
      },
      role: {
        in: ["SHOP_OWNER", "BRANCH_ADMIN", "MECHANIC"],
      },
    },
    select: {
      userId: true,
      role: true,
      user: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      user: {
        name: "asc",
      },
    },
  });
  const catalogRecommendations = await loadCatalogRecommendations(countryCode, order.vehicleIdentity);
  const catalogCandidates = await loadCatalogCandidates(countryCode, order.vehicleIdentity);

  return {
    ...order,
    catalogCandidates,
    catalogRecommendations,
    stocks,
    staffMembers: staffMembers.map((member) => ({
      userId: member.userId,
      role: member.role,
      name: member.user.name,
    })),
  };
}

type VehicleForCatalogLookup = {
  catalogId: string | null;
  make: string;
  model: string;
  year: number | null;
};

type CatalogOption = {
  id: string;
  make: string;
  model: string;
  generation: string | null;
  yearFrom: number | null;
  yearTo: number | null;
  engineCode: string | null;
};

async function loadCatalogCandidates(countryCode: string, vehicle: VehicleForCatalogLookup): Promise<CatalogOption[]> {
  return prisma.vehicleCatalog.findMany({
    where: {
      countryCode,
      OR: [
        ...(vehicle.catalogId ? [{ id: vehicle.catalogId }] : []),
        {
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
        },
      ],
    },
    select: {
      id: true,
      make: true,
      model: true,
      generation: true,
      yearFrom: true,
      yearTo: true,
      engineCode: true,
    },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: 20,
  });
}

async function loadCatalogRecommendations(countryCode: string, vehicle: VehicleForCatalogLookup) {
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

  const catalog = await prisma.vehicleCatalog.findFirst({
    where,
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
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
  });

  return (
    catalog?.recommendations.map((recommendation) => ({
      ...recommendation,
      volumeLiters: recommendation.volumeLiters.toString(),
    })) ?? []
  );
}

function catalogOptionLabel(catalog: CatalogOption): string {
  return [
    `${catalog.make} ${catalog.model}`,
    catalog.generation,
    formatYearRange(catalog.yearFrom, catalog.yearTo),
    catalog.engineCode,
  ]
    .filter(Boolean)
    .join(" / ");
}

function formatYearRange(yearFrom: number | null, yearTo: number | null): string | null {
  if (yearFrom && yearTo) {
    return `${yearFrom}-${yearTo}`;
  }

  if (yearFrom) {
    return `${yearFrom}+`;
  }

  return null;
}

function productCategoryForFluid(fluidType: FluidType): ProductCategory {
  if (fluidType === "TRANSMISSION_OIL") {
    return "TRANSMISSION_OIL";
  }

  if (fluidType === "POWER_STEERING") {
    return "POWER_STEERING_FLUID";
  }

  return "ENGINE_OIL";
}

function normalizeComparable(value: string | null): string {
  return value?.trim().toUpperCase().replaceAll(" ", "") ?? "";
}

function formatRecommendationInterval(
  intervalKm: number | null,
  intervalMonths: number | null,
  t: (key: string) => string,
): string {
  const parts = [];

  if (intervalKm) {
    parts.push(t("library.interval.km").replace("{value}", String(intervalKm)));
  }

  if (intervalMonths) {
    parts.push(t("library.interval.months").replace("{value}", String(intervalMonths)));
  }

  return parts.join(" / ") || t("library.interval.empty");
}

type OrderLineView = {
  type: string;
  description: string;
};

function translatedOrderLineDescription(line: OrderLineView, t: (key: string) => string): string {
  if (line.type === "LABOR") {
    return t(serviceTranslationKey(line.description));
  }

  return line.description;
}

function orderProductLabels(t: (key: string) => string): OrderProductsTableLabels {
  return {
    allCategories: t("inventory.filter.allCategories"),
    category: t("inventory.list.category"),
    empty: t("order.products.empty"),
    filterProduct: t("inventory.filter.product"),
    filterQuantity: t("inventory.filter.quantity"),
    filterViscosity: t("inventory.filter.viscosity"),
    hint: t("order.products.hint"),
    low: t("inventory.list.low"),
    negative: t("inventory.list.negative"),
    noResults: t("inventory.list.noResults"),
    previewTotal: t("order.products.previewTotal"),
    product: t("inventory.list.product"),
    quantity: t("order.products.quantity"),
    save: t("order.products.save"),
    servicePrice: t("inventory.list.service"),
    stock: t("order.products.stock"),
    viscosity: t("inventory.list.viscosity"),
  };
}

