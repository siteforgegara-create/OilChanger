import Link from "next/link";
import type { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { ArrowRight, BellRing, BookOpen, Building2, CalendarClock, CarFront, CheckCircle2, ClipboardList, LogOut, Package, Search, Settings, ShoppingCart, UsersRound, WalletCards, Wrench } from "lucide-react";
import { logoutAction } from "@/app/auth/actions";
import { addExpenseAction, addQueueEntryAction, payCustomerDebtAction } from "@/app/dashboard/actions";
import { AddQueueForm, type AddQueueFormLabels } from "@/components/dashboard/add-queue-form";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import type { SupportedLocale } from "@/i18n/catalog";
import { createTranslator, loadMessages, toSupportedLocale } from "@/i18n/messages";
import { getAuthSession } from "@/lib/auth-session";
import { formatMoneyMinor, type CurrencyCode } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { canAccessAppRoute } from "@/lib/role-access";
import { calculateServiceForecast } from "@/lib/service-forecast";
import { getSubscriptionPlanLimits } from "@/lib/subscription-plans";

export const dynamic = "force-dynamic";

type DashboardRouteProps = {
  searchParams: Promise<{
    locale?: string;
    shopId?: string;
  }>;
};

type ServiceStatus = "QUEUED" | "IN_PROGRESS" | "SCHEDULED" | "COMPLETED";

const statusCards: Array<{
  status: ServiceStatus;
  icon: typeof ClipboardList;
  colorClass: string;
}> = [
  { status: "QUEUED", icon: ClipboardList, colorClass: "bg-warning/10 text-warning" },
  { status: "IN_PROGRESS", icon: Wrench, colorClass: "bg-accent/10 text-accent" },
  { status: "SCHEDULED", icon: CalendarClock, colorClass: "bg-text/10 text-text" },
  { status: "COMPLETED", icon: CheckCircle2, colorClass: "bg-success/10 text-success" },
];

export default async function DashboardRoute({ searchParams }: DashboardRouteProps) {
  const session = await getAuthSession();

  if (!session) {
    redirect("/login?locale=ru");
  }

  if (!canAccessAppRoute(session.role, "dashboard")) {
    redirect("/admin?locale=az");
  }

  const params = await searchParams;
  const locale = toSupportedLocale(params.locale);
  const messages = await loadMessages(locale);
  const t = createTranslator(messages);
  const dashboard = await loadDashboardData(session.tenantId, session.countryCode, session.role, session.shopId, params.shopId);
  const canViewFinance = canAccessAppRoute(session.role, "finance");
  const canViewBranches = canAccessAppRoute(session.role, "branches");
  const canViewStaff = canAccessAppRoute(session.role, "staff");
  const canViewNotifications = canAccessAppRoute(session.role, "notifications");
  const canViewSettings = canAccessAppRoute(session.role, "settings");
  const languageLabels = {
    az: t("common.language.az"),
    ru: t("common.language.ru"),
    en: t("common.language.en"),
  };
  const queueFormLabels: AddQueueFormLabels = {
    title: t("dashboard.addQueue.title"),
    subtitle: t("dashboard.addQueue.subtitle"),
    plate: t("dashboard.addQueue.plate"),
    platePlaceholder: t("dashboard.addQueue.platePlaceholder"),
    vin: t("dashboard.addQueue.vin"),
    vinPlaceholder: t("dashboard.addQueue.vinPlaceholder"),
    make: t("dashboard.addQueue.make"),
    makePlaceholder: t("dashboard.addQueue.makePlaceholder"),
    model: t("dashboard.addQueue.model"),
    modelPlaceholder: t("dashboard.addQueue.modelPlaceholder"),
    year: t("dashboard.addQueue.year"),
    mileage: t("dashboard.addQueue.mileage"),
    customerName: t("dashboard.addQueue.customerName"),
    customerNamePlaceholder: t("dashboard.addQueue.customerNamePlaceholder"),
    customerPhone: t("dashboard.addQueue.customerPhone"),
    customerPhonePlaceholder: t("dashboard.addQueue.customerPhonePlaceholder"),
    submit: t("dashboard.addQueue.submit"),
    errorMessages: queueErrorMessages(t),
  };

  return (
    <main className="min-h-screen bg-bg text-text">
      <header className="border-b border-border bg-surface/80 px-5 py-4 backdrop-blur sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href={`/?locale=${locale}`} className="flex items-center gap-3" aria-label={t("common.brandName")}>
            <BrandMark logoUrl={dashboard.logoUrl} />
            <span className="hidden text-base font-bold sm:inline">{dashboard.tenantName}</span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href={`/inventory?locale=${locale}&shopId=${dashboard.selectedShopId}`}
              className="hidden items-center gap-2 rounded-full border border-border bg-bg px-4 py-2 text-sm font-bold text-text transition hover:border-text sm:inline-flex"
              aria-label={t("inventory.nav")}
            >
              <Package className="h-4 w-4" aria-hidden="true" />
              <span>{t("inventory.nav")}</span>
            </Link>
            <Link
              href={`/customers?locale=${locale}&shopId=${dashboard.selectedShopId}`}
              className="hidden items-center gap-2 rounded-full border border-border bg-bg px-4 py-2 text-sm font-bold text-text transition hover:border-text sm:inline-flex"
              aria-label={t("customer.nav")}
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              <span>{t("customer.nav")}</span>
            </Link>
            <Link
              href={`/library?locale=${locale}&shopId=${dashboard.selectedShopId}`}
              className="hidden items-center gap-2 rounded-full border border-border bg-bg px-4 py-2 text-sm font-bold text-text transition hover:border-text sm:inline-flex"
              aria-label={t("library.nav")}
            >
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              <span>{t("library.nav")}</span>
            </Link>
            <Link
              href={`/sales?locale=${locale}&shopId=${dashboard.selectedShopId}`}
              className="hidden items-center gap-2 rounded-full border border-border bg-bg px-4 py-2 text-sm font-bold text-text transition hover:border-text sm:inline-flex"
              aria-label={t("sales.nav")}
            >
              <ShoppingCart className="h-4 w-4" aria-hidden="true" />
              <span>{t("sales.nav")}</span>
            </Link>
            {canViewFinance ? (
              <Link
                href={`/finance?locale=${locale}&shopId=${dashboard.selectedShopId}`}
                className="hidden items-center gap-2 rounded-full border border-border bg-bg px-4 py-2 text-sm font-bold text-text transition hover:border-text sm:inline-flex"
                aria-label={t("finance.nav")}
              >
                <WalletCards className="h-4 w-4" aria-hidden="true" />
                <span>{t("finance.nav")}</span>
              </Link>
            ) : null}
            {canViewBranches ? (
              <Link
                href={`/branches?locale=${locale}&shopId=${dashboard.selectedShopId}`}
                className="hidden items-center gap-2 rounded-full border border-border bg-bg px-4 py-2 text-sm font-bold text-text transition hover:border-text sm:inline-flex"
                aria-label={t("branch.nav")}
              >
                <Building2 className="h-4 w-4" aria-hidden="true" />
                <span>{t("branch.nav")}</span>
              </Link>
            ) : null}
            {canViewStaff ? (
              <Link
                href={`/staff?locale=${locale}&shopId=${dashboard.selectedShopId}`}
                className="hidden items-center gap-2 rounded-full border border-border bg-bg px-4 py-2 text-sm font-bold text-text transition hover:border-text sm:inline-flex"
                aria-label={t("staff.nav")}
              >
                <UsersRound className="h-4 w-4" aria-hidden="true" />
                <span>{t("staff.nav")}</span>
              </Link>
            ) : null}
            {canViewNotifications ? (
              <Link
                href={`/notifications?locale=${locale}&shopId=${dashboard.selectedShopId}`}
                className="hidden items-center gap-2 rounded-full border border-border bg-bg px-4 py-2 text-sm font-bold text-text transition hover:border-text sm:inline-flex"
                aria-label={t("notifications.nav")}
              >
                <BellRing className="h-4 w-4" aria-hidden="true" />
                <span>{t("notifications.nav")}</span>
              </Link>
            ) : null}
            {canViewSettings ? (
              <Link
                href={`/settings?locale=${locale}&shopId=${dashboard.selectedShopId}`}
                className="hidden items-center gap-2 rounded-full border border-border bg-bg px-4 py-2 text-sm font-bold text-text transition hover:border-text sm:inline-flex"
                aria-label={t("settings.nav")}
              >
                <Settings className="h-4 w-4" aria-hidden="true" />
                <span>{t("settings.nav")}</span>
              </Link>
            ) : null}
            <Link
              href={`/inventory?locale=${locale}&shopId=${dashboard.selectedShopId}`}
              className="grid h-9 w-9 place-items-center rounded-full border border-border bg-bg text-muted transition hover:text-text sm:hidden"
              aria-label={t("inventory.nav")}
            >
              <Package className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href={`/customers?locale=${locale}&shopId=${dashboard.selectedShopId}`}
              className="grid h-9 w-9 place-items-center rounded-full border border-border bg-bg text-muted transition hover:text-text sm:hidden"
              aria-label={t("customer.nav")}
            >
              <Search className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href={`/library?locale=${locale}&shopId=${dashboard.selectedShopId}`}
              className="grid h-9 w-9 place-items-center rounded-full border border-border bg-bg text-muted transition hover:text-text sm:hidden"
              aria-label={t("library.nav")}
            >
              <BookOpen className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href={`/sales?locale=${locale}&shopId=${dashboard.selectedShopId}`}
              className="grid h-9 w-9 place-items-center rounded-full border border-border bg-bg text-muted transition hover:text-text sm:hidden"
              aria-label={t("sales.nav")}
            >
              <ShoppingCart className="h-4 w-4" aria-hidden="true" />
            </Link>
            {canViewFinance ? (
              <Link
                href={`/finance?locale=${locale}&shopId=${dashboard.selectedShopId}`}
                className="grid h-9 w-9 place-items-center rounded-full border border-border bg-bg text-muted transition hover:text-text sm:hidden"
                aria-label={t("finance.nav")}
              >
                <WalletCards className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : null}
            {canViewBranches ? (
              <Link
                href={`/branches?locale=${locale}&shopId=${dashboard.selectedShopId}`}
                className="grid h-9 w-9 place-items-center rounded-full border border-border bg-bg text-muted transition hover:text-text sm:hidden"
                aria-label={t("branch.nav")}
              >
                <Building2 className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : null}
            {canViewStaff ? (
              <Link
                href={`/staff?locale=${locale}&shopId=${dashboard.selectedShopId}`}
                className="grid h-9 w-9 place-items-center rounded-full border border-border bg-bg text-muted transition hover:text-text sm:hidden"
                aria-label={t("staff.nav")}
              >
                <UsersRound className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : null}
            {canViewNotifications ? (
              <Link
                href={`/notifications?locale=${locale}&shopId=${dashboard.selectedShopId}`}
                className="grid h-9 w-9 place-items-center rounded-full border border-border bg-bg text-muted transition hover:text-text sm:hidden"
                aria-label={t("notifications.nav")}
              >
                <BellRing className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : null}
            {canViewSettings ? (
              <Link
                href={`/settings?locale=${locale}&shopId=${dashboard.selectedShopId}`}
                className="grid h-9 w-9 place-items-center rounded-full border border-border bg-bg text-muted transition hover:text-text sm:hidden"
                aria-label={t("settings.nav")}
              >
                <Settings className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : null}
            <LanguageSwitcher locale={locale} labels={languageLabels} basePath="/dashboard" />
            <form action={logoutAction}>
              <button
                type="submit"
                className="grid h-9 w-9 place-items-center rounded-full border border-border bg-bg text-muted transition hover:text-text"
                aria-label={t("dashboard.header.logout")}
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
            </form>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-6 sm:px-8 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-4">
          <div className="rounded-3xl border border-border bg-surface p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{t("dashboard.branch.title")}</p>
            <div className="mt-4 space-y-2">
              {dashboard.shops.map((shop) => (
                <Link
                  key={shop.id}
                  href={`/dashboard?locale=${locale}&shopId=${shop.id}`}
                  className={[
                    "block rounded-2xl border px-4 py-3 text-sm font-bold transition",
                    shop.id === dashboard.selectedShopId
                      ? "border-text bg-text text-surface"
                      : "border-border bg-bg text-text hover:border-text",
                  ].join(" ")}
                >
                  {shop.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-surface p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{t("dashboard.plan.title")}</p>
            <p className="mt-3 text-2xl font-semibold">{dashboard.plan}</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              {t("dashboard.plan.limit")
                .replace("{shops}", String(dashboard.maxShops))
                .replace("{staff}", String(dashboard.maxStaff))}
            </p>
          </div>

          <Link
            href={`/inventory?locale=${locale}&shopId=${dashboard.selectedShopId}`}
            className="flex items-center justify-between gap-4 rounded-3xl border border-border bg-surface p-5 text-sm font-bold shadow-sm transition hover:border-text"
          >
            <span className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-accent/10 text-accent">
                <Package className="h-5 w-5" aria-hidden="true" />
              </span>
              {t("inventory.nav")}
            </span>
            <ArrowRight className="h-4 w-4 text-muted" aria-hidden="true" />
          </Link>

          <Link
            href={`/customers?locale=${locale}&shopId=${dashboard.selectedShopId}`}
            className="flex items-center justify-between gap-4 rounded-3xl border border-border bg-surface p-5 text-sm font-bold shadow-sm transition hover:border-text"
          >
            <span className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-accent/10 text-accent">
                <Search className="h-5 w-5" aria-hidden="true" />
              </span>
              {t("customer.nav")}
            </span>
            <ArrowRight className="h-4 w-4 text-muted" aria-hidden="true" />
          </Link>

          <Link
            href={`/library?locale=${locale}&shopId=${dashboard.selectedShopId}`}
            className="flex items-center justify-between gap-4 rounded-3xl border border-border bg-surface p-5 text-sm font-bold shadow-sm transition hover:border-text"
          >
            <span className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-accent/10 text-accent">
                <BookOpen className="h-5 w-5" aria-hidden="true" />
              </span>
              {t("library.nav")}
            </span>
            <ArrowRight className="h-4 w-4 text-muted" aria-hidden="true" />
          </Link>

          <Link
            href={`/sales?locale=${locale}&shopId=${dashboard.selectedShopId}`}
            className="flex items-center justify-between gap-4 rounded-3xl border border-border bg-surface p-5 text-sm font-bold shadow-sm transition hover:border-text"
          >
            <span className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-accent/10 text-accent">
                <ShoppingCart className="h-5 w-5" aria-hidden="true" />
              </span>
              {t("sales.nav")}
            </span>
            <ArrowRight className="h-4 w-4 text-muted" aria-hidden="true" />
          </Link>

          {canViewFinance ? (
            <Link
              href={`/finance?locale=${locale}&shopId=${dashboard.selectedShopId}`}
              className="flex items-center justify-between gap-4 rounded-3xl border border-border bg-surface p-5 text-sm font-bold shadow-sm transition hover:border-text"
            >
              <span className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-accent/10 text-accent">
                  <WalletCards className="h-5 w-5" aria-hidden="true" />
                </span>
                {t("finance.nav")}
              </span>
              <ArrowRight className="h-4 w-4 text-muted" aria-hidden="true" />
            </Link>
          ) : null}

          {canViewBranches ? (
            <Link
              href={`/branches?locale=${locale}&shopId=${dashboard.selectedShopId}`}
              className="flex items-center justify-between gap-4 rounded-3xl border border-border bg-surface p-5 text-sm font-bold shadow-sm transition hover:border-text"
            >
              <span className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-accent/10 text-accent">
                  <Building2 className="h-5 w-5" aria-hidden="true" />
                </span>
                {t("branch.nav")}
              </span>
              <ArrowRight className="h-4 w-4 text-muted" aria-hidden="true" />
            </Link>
          ) : null}

          {canViewStaff ? (
            <Link
              href={`/staff?locale=${locale}&shopId=${dashboard.selectedShopId}`}
              className="flex items-center justify-between gap-4 rounded-3xl border border-border bg-surface p-5 text-sm font-bold shadow-sm transition hover:border-text"
            >
              <span className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-accent/10 text-accent">
                  <UsersRound className="h-5 w-5" aria-hidden="true" />
                </span>
                {t("staff.nav")}
              </span>
              <ArrowRight className="h-4 w-4 text-muted" aria-hidden="true" />
            </Link>
          ) : null}

          {canViewNotifications ? (
            <Link
              href={`/notifications?locale=${locale}&shopId=${dashboard.selectedShopId}`}
              className="flex items-center justify-between gap-4 rounded-3xl border border-border bg-surface p-5 text-sm font-bold shadow-sm transition hover:border-text"
            >
              <span className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-accent/10 text-accent">
                  <BellRing className="h-5 w-5" aria-hidden="true" />
                </span>
                {t("notifications.nav")}
              </span>
              <ArrowRight className="h-4 w-4 text-muted" aria-hidden="true" />
            </Link>
          ) : null}

          {canViewSettings ? (
            <Link
              href={`/settings?locale=${locale}&shopId=${dashboard.selectedShopId}`}
              className="flex items-center justify-between gap-4 rounded-3xl border border-border bg-surface p-5 text-sm font-bold shadow-sm transition hover:border-text"
            >
              <span className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-accent/10 text-accent">
                  <Settings className="h-5 w-5" aria-hidden="true" />
                </span>
                {t("settings.nav")}
              </span>
              <ArrowRight className="h-4 w-4 text-muted" aria-hidden="true" />
            </Link>
          ) : null}
        </aside>

        <div className="space-y-6">
          <section className="rounded-[2rem] border border-border bg-surface p-6 shadow-sm sm:p-8">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{t("dashboard.today.label")}</p>
                <h1 className="mt-3 text-3xl font-semibold tracking-normal sm:text-5xl">{t("dashboard.today.title")}</h1>
                <p className="mt-4 max-w-2xl text-base leading-8 text-muted">{t("dashboard.today.subtitle")}</p>
              </div>
              <div className="rounded-3xl border border-border bg-bg px-5 py-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{t("dashboard.today.total")}</p>
                <p className="mt-2 text-3xl font-semibold">{dashboard.totalToday}</p>
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {statusCards.map((card) => {
                const Icon = card.icon;

                return (
                  <div key={card.status} className="rounded-3xl border border-border bg-bg p-5">
                    <div className={`grid h-11 w-11 place-items-center rounded-2xl ${card.colorClass}`}>
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <p className="mt-5 text-sm font-bold text-muted">{t(`dashboard.status.${card.status}`)}</p>
                    <p className="mt-2 text-4xl font-semibold">{dashboard.statusCounts[card.status]}</p>
                  </div>
                );
              })}
            </div>

            {canViewFinance ? (
              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <FinanceCard
                  label={t("dashboard.finance.total")}
                  value={formatMoneyMinor(dashboard.finance.totalMinor, dashboard.currency as CurrencyCode, locale)}
                />
                <FinanceCard
                  label={t("dashboard.finance.paid")}
                  value={formatMoneyMinor(dashboard.finance.paidMinor, dashboard.currency as CurrencyCode, locale)}
                />
                <FinanceCard
                  label={t("dashboard.finance.debtPaid")}
                  value={formatMoneyMinor(dashboard.finance.debtPaymentsMinor, dashboard.currency as CurrencyCode, locale)}
                />
                <FinanceCard
                  label={t("dashboard.finance.debt")}
                  value={formatMoneyMinor(dashboard.finance.debtMinor, dashboard.currency as CurrencyCode, locale)}
                />
                <FinanceCard
                  label={t("dashboard.finance.expenses")}
                  value={formatMoneyMinor(dashboard.finance.expenseMinor, dashboard.currency as CurrencyCode, locale)}
                />
              </div>
            ) : null}
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[2rem] border border-border bg-surface p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{t("dashboard.queue.label")}</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-normal">{t("dashboard.queue.title")}</h2>
                </div>
                <CarFront className="h-6 w-6 text-accent" aria-hidden="true" />
              </div>

              {dashboard.queue.length > 0 ? (
                <div className="mt-6 space-y-3">
                  {dashboard.queue.map((item) => (
                    <Link
                      key={item.id}
                      href={`/dashboard/orders/${item.id}?locale=${locale}`}
                      className="block rounded-3xl border border-border bg-bg p-4 transition hover:border-text"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-bold">
                            {item.vehicle.make} {item.vehicle.model}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-muted">
                            {item.vehicle.plateNumber ?? t("dashboard.queue.noPlate")} -{" "}
                            {item.vehicle.vinNormalized ?? t("dashboard.queue.noVin")}
                          </p>
                        </div>
                        <span className="rounded-full bg-warning/10 px-3 py-1 text-xs font-bold text-warning">
                          {t("dashboard.status.QUEUED")}
                        </span>
                      </div>
                      <div className="mt-4 grid gap-2 text-sm font-semibold text-muted sm:grid-cols-2">
                        <span>{item.customerName ?? t("dashboard.queue.noCustomer")}</span>
                        <span>{item.mileage ? `${item.mileage} km` : t("dashboard.queue.noMileage")}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-3xl border border-dashed border-border bg-bg p-8 text-center">
                  <p className="text-base font-bold">{t("dashboard.queue.emptyTitle")}</p>
                  <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">{t("dashboard.queue.emptyText")}</p>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <AddQueueForm
                labels={queueFormLabels}
                locale={locale}
                shopId={dashboard.selectedShopId}
                action={addQueueEntryAction}
              />

              <OpenDebtsCard
                locale={locale}
                debts={dashboard.openDebts}
                shopId={dashboard.selectedShopId}
                labels={{
                  label: t("dashboard.debts.label"),
                  title: t("dashboard.debts.title"),
                  empty: t("dashboard.debts.empty"),
                  customerFallback: t("dashboard.debts.customerFallback"),
                  amount: t("dashboard.debts.amount"),
                  paidAmount: t("dashboard.debts.paidAmount"),
                  method: t("dashboard.debts.method"),
                  submit: t("dashboard.debts.submit"),
                  cash: t("order.payment.cash"),
                  card: t("order.payment.card"),
                  transfer: t("order.payment.transfer"),
                  other: t("order.payment.other"),
                }}
              />

              <DueSoonCard
                items={dashboard.dueSoon}
                labels={{
                  label: t("dashboard.dueSoon.label"),
                  title: t("dashboard.dueSoon.title"),
                  empty: t("dashboard.dueSoon.empty"),
                  nextMileage: t("dashboard.dueSoon.nextMileage"),
                  nextDate: t("dashboard.dueSoon.nextDate"),
                  overdue: t("dashboard.dueSoon.overdue"),
                  soon: t("dashboard.dueSoon.soon"),
                  open: t("customer.list.open"),
                  unknown: t("customer.forecast.unknown"),
                }}
                locale={locale}
              />

              {canViewFinance ? (
                <ExpensesCard
                  locale={locale}
                  shopId={dashboard.selectedShopId}
                  expenses={dashboard.expenses}
                  labels={{
                    label: t("dashboard.expenses.label"),
                    title: t("dashboard.expenses.title"),
                    category: t("dashboard.expenses.category"),
                    categoryPlaceholder: t("dashboard.expenses.categoryPlaceholder"),
                    amount: t("dashboard.expenses.amount"),
                    comment: t("dashboard.expenses.comment"),
                    commentPlaceholder: t("dashboard.expenses.commentPlaceholder"),
                    submit: t("dashboard.expenses.submit"),
                    recent: t("dashboard.expenses.recent"),
                    empty: t("dashboard.expenses.empty"),
                  }}
                />
              ) : null}
            </div>
          </section>

          <StaffStatsCard
            canViewFinance={canViewFinance}
            currency={dashboard.currency}
            labels={{
              label: t("dashboard.staff.label"),
              title: t("dashboard.staff.title"),
              empty: t("dashboard.staff.empty"),
              orders: t("dashboard.staff.orders"),
              total: t("dashboard.staff.total"),
            }}
            locale={locale}
            stats={dashboard.staffStats}
          />
        </div>
      </section>
    </main>
  );
}

type OpenDebt = {
  id: string;
  amountMinor: number;
  currency: string;
  customerName: string | null;
  createdAt: Date;
};

type OpenDebtsCardProps = {
  locale: SupportedLocale;
  shopId: string;
  debts: readonly OpenDebt[];
  labels: {
    label: string;
    title: string;
    empty: string;
    customerFallback: string;
    amount: string;
    paidAmount: string;
    method: string;
    submit: string;
    cash: string;
    card: string;
    transfer: string;
    other: string;
  };
};

function OpenDebtsCard({ locale, shopId, debts, labels }: OpenDebtsCardProps) {
  return (
    <section className="rounded-[2rem] border border-border bg-surface p-6 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{labels.label}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-normal">{labels.title}</h2>

      {debts.length > 0 ? (
        <div className="mt-5 space-y-4">
          {debts.map((debt) => (
            <form key={debt.id} action={payCustomerDebtAction} className="rounded-3xl border border-border bg-bg p-4">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="shopId" value={shopId} />
              <input type="hidden" name="debtId" value={debt.id} />

              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold">{debt.customerName ?? labels.customerFallback}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                    {labels.amount}
                  </p>
                </div>
                <p className="text-lg font-semibold">
                  {formatMoneyMinor(debt.amountMinor, debt.currency as CurrencyCode, locale)}
                </p>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <label className="space-y-1 text-xs font-bold uppercase tracking-[0.1em] text-muted">
                  <span>{labels.paidAmount}</span>
                  <input
                    name="amount"
                    defaultValue={(debt.amountMinor / 100).toFixed(2)}
                    inputMode="decimal"
                    className="h-11 w-full rounded-2xl border border-border bg-surface px-3 text-sm font-semibold text-text outline-none transition focus:border-text"
                  />
                </label>
                <label className="space-y-1 text-xs font-bold uppercase tracking-[0.1em] text-muted">
                  <span>{labels.method}</span>
                  <select
                    name="paymentMethod"
                    defaultValue="CASH"
                    className="h-11 w-full rounded-2xl border border-border bg-surface px-3 text-sm font-semibold text-text outline-none transition focus:border-text"
                  >
                    <option value="CASH">{labels.cash}</option>
                    <option value="CARD">{labels.card}</option>
                    <option value="TRANSFER">{labels.transfer}</option>
                    <option value="OTHER">{labels.other}</option>
                  </select>
                </label>
                <button
                  type="submit"
                  className="self-end rounded-2xl bg-text px-5 py-3 text-sm font-bold text-surface transition hover:opacity-90"
                >
                  {labels.submit}
                </button>
              </div>
            </form>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-3xl border border-dashed border-border bg-bg p-6 text-sm font-semibold text-muted">
          {labels.empty}
        </div>
      )}
    </section>
  );
}

type FinanceCardProps = {
  label: string;
  value: string;
};

type DueSoonItem = {
  id: string;
  vehicleName: string;
  plateNumber: string | null;
  customerName: string;
  nextMileage: number | null;
  nextDate: Date | null;
  isOverdue: boolean;
};

type DueSoonCardProps = {
  items: readonly DueSoonItem[];
  labels: {
    label: string;
    title: string;
    empty: string;
    nextMileage: string;
    nextDate: string;
    overdue: string;
    soon: string;
    open: string;
    unknown: string;
  };
  locale: SupportedLocale;
};

function DueSoonCard({ items, labels, locale }: DueSoonCardProps) {
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <section className="rounded-[2rem] border border-border bg-surface p-6 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{labels.label}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-normal">{labels.title}</h2>

      {items.length > 0 ? (
        <div className="mt-5 space-y-3">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/customers/${item.id}?locale=${locale}`}
              className="block rounded-3xl border border-border bg-bg p-4 transition hover:border-text"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold">{item.vehicleName}</p>
                  <p className="mt-1 text-xs font-semibold text-muted">
                    {item.plateNumber ?? labels.unknown} - {item.customerName}
                  </p>
                </div>
                <span
                  className={[
                    "rounded-full px-3 py-1 text-xs font-bold",
                    item.isOverdue ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning",
                  ].join(" ")}
                >
                  {item.isOverdue ? labels.overdue : labels.soon}
                </span>
              </div>
              <div className="mt-4 grid gap-2 text-sm font-semibold text-muted sm:grid-cols-2">
                <span>
                  {labels.nextMileage}: {item.nextMileage ? `${item.nextMileage} km` : labels.unknown}
                </span>
                <span>
                  {labels.nextDate}: {item.nextDate ? dateFormatter.format(item.nextDate) : labels.unknown}
                </span>
              </div>
              <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-muted">{labels.open}</p>
            </Link>
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-3xl border border-dashed border-border bg-bg p-6 text-sm font-semibold text-muted">
          {labels.empty}
        </p>
      )}
    </section>
  );
}

function FinanceCard({ label, value }: FinanceCardProps) {
  return (
    <div className="rounded-3xl border border-border bg-bg p-5">
      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-success/10 text-success">
        <WalletCards className="h-5 w-5" aria-hidden="true" />
      </div>
      <p className="mt-4 text-xs font-bold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function BrandMark({ logoUrl }: { logoUrl: string | null }) {
  if (logoUrl) {
    return (
      <span
        aria-hidden="true"
        className="h-9 w-9 rounded-lg border border-border bg-surface bg-cover bg-center"
        style={{ backgroundImage: `url(${logoUrl})` }}
      />
    );
  }

  return (
    <span className="grid h-9 w-9 place-items-center rounded-lg bg-text text-sm font-black text-surface">
      OC
    </span>
  );
}

type StaffStat = {
  userId: string;
  name: string;
  orderCount: number;
  totalMinor: number;
};

type StaffStatsCardProps = {
  canViewFinance: boolean;
  currency: string;
  labels: {
    label: string;
    title: string;
    empty: string;
    orders: string;
    total: string;
  };
  locale: SupportedLocale;
  stats: readonly StaffStat[];
};

function StaffStatsCard({ canViewFinance, currency, labels, locale, stats }: StaffStatsCardProps) {
  return (
    <section className="rounded-[2rem] border border-border bg-surface p-6 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{labels.label}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-normal">{labels.title}</h2>

      {stats.length > 0 ? (
        <div className="mt-5 overflow-hidden rounded-3xl border border-border bg-bg">
          {stats.map((stat) => (
            <div key={stat.userId} className="grid gap-3 border-b border-border p-4 last:border-b-0 sm:grid-cols-[1fr_auto_auto]">
              <p className="text-sm font-bold">{stat.name}</p>
              <p className="text-sm font-semibold text-muted">
                {labels.orders}: {stat.orderCount}
              </p>
              {canViewFinance ? (
                <p className="text-sm font-semibold">
                  {labels.total}: {formatMoneyMinor(stat.totalMinor, currency as CurrencyCode, locale)}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-3xl border border-dashed border-border bg-bg p-5 text-sm font-semibold text-muted">
          {labels.empty}
        </p>
      )}
    </section>
  );
}

type ExpenseEntry = {
  id: string;
  categoryName: string;
  amountMinor: number;
  currency: string;
  comment: string | null;
  date: Date;
};

type ExpensesCardProps = {
  locale: SupportedLocale;
  shopId: string;
  expenses: readonly ExpenseEntry[];
  labels: {
    label: string;
    title: string;
    category: string;
    categoryPlaceholder: string;
    amount: string;
    comment: string;
    commentPlaceholder: string;
    submit: string;
    recent: string;
    empty: string;
  };
};

function ExpensesCard({ locale, shopId, expenses, labels }: ExpensesCardProps) {
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
  });

  return (
    <section className="rounded-[2rem] border border-border bg-surface p-6 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{labels.label}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-normal">{labels.title}</h2>

      <form action={addExpenseAction} className="mt-5 grid gap-3">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="shopId" value={shopId} />
        <label className="space-y-1 text-xs font-bold uppercase tracking-[0.1em] text-muted">
          <span>{labels.category}</span>
          <input
            name="category"
            placeholder={labels.categoryPlaceholder}
            className="h-11 w-full rounded-2xl border border-border bg-bg px-3 text-sm font-semibold text-text outline-none transition focus:border-text"
            required
          />
        </label>
        <label className="space-y-1 text-xs font-bold uppercase tracking-[0.1em] text-muted">
          <span>{labels.amount}</span>
          <input
            name="amount"
            inputMode="decimal"
            placeholder="0.00"
            className="h-11 w-full rounded-2xl border border-border bg-bg px-3 text-sm font-semibold text-text outline-none transition focus:border-text"
            required
          />
        </label>
        <label className="space-y-1 text-xs font-bold uppercase tracking-[0.1em] text-muted">
          <span>{labels.comment}</span>
          <input
            name="comment"
            placeholder={labels.commentPlaceholder}
            className="h-11 w-full rounded-2xl border border-border bg-bg px-3 text-sm font-semibold text-text outline-none transition focus:border-text"
          />
        </label>
        <button
          type="submit"
          className="rounded-2xl bg-text px-5 py-3 text-sm font-bold text-surface transition hover:opacity-90"
        >
          {labels.submit}
        </button>
      </form>

      <div className="mt-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{labels.recent}</p>
        {expenses.length > 0 ? (
          <div className="mt-3 divide-y divide-border overflow-hidden rounded-3xl border border-border bg-bg">
            {expenses.map((expense) => (
              <div key={expense.id} className="grid gap-2 p-4 text-sm sm:grid-cols-[1fr_auto]">
                <div>
                  <p className="font-bold">{expense.categoryName}</p>
                  <p className="mt-1 text-xs font-semibold text-muted">
                    {dateFormatter.format(expense.date)}
                    {expense.comment ? ` - ${expense.comment}` : ""}
                  </p>
                </div>
                <p className="font-semibold">
                  {formatMoneyMinor(expense.amountMinor, expense.currency as CurrencyCode, locale)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 rounded-3xl border border-dashed border-border bg-bg p-6 text-sm font-semibold text-muted">
            {labels.empty}
          </div>
        )}
      </div>
    </section>
  );
}

async function loadDashboardData(
  tenantId: string,
  countryCode: string,
  role: UserRole,
  sessionShopId: string,
  requestedShopId: string | undefined,
) {
  const tenant = await prisma.tenant.findFirst({
    where: {
      id: tenantId,
      countryCode,
    },
    select: {
      name: true,
      logoUrl: true,
      plan: true,
      shops: {
        where: {
          isActive: true,
          ...(role === "SHOP_OWNER" ? {} : { id: sessionShopId }),
        },
        select: {
          id: true,
          name: true,
          currency: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
      subscription: {
        select: {
          maxShops: true,
          maxStaff: true,
        },
      },
    },
  });

  if (!tenant || tenant.shops.length === 0) {
    redirect("/login?locale=ru");
  }

  const selectedShop = tenant.shops.find((shop) => shop.id === requestedShopId) ?? tenant.shops[0];
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  const baseWhere = {
    tenantId,
    countryCode,
    shopId: selectedShop.id,
    createdAt: {
      gte: startOfDay,
      lte: endOfDay,
    },
  };
  const [queued, inProgress, scheduled, completed] = await Promise.all([
    prisma.order.count({ where: { ...baseWhere, status: "QUEUED" } }),
    prisma.order.count({ where: { ...baseWhere, status: "IN_PROGRESS" } }),
    prisma.order.count({ where: { ...baseWhere, status: "SCHEDULED" } }),
    prisma.order.count({ where: { ...baseWhere, status: "COMPLETED" } }),
  ]);
  const completedFinance = await prisma.order.aggregate({
    where: {
      tenantId,
      countryCode,
      shopId: selectedShop.id,
      status: "COMPLETED",
      completedAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    _sum: {
      totalMinor: true,
      paidMinor: true,
      debtMinor: true,
    },
  });
  const debtPaymentsFinance = await prisma.customerDebtPayment.aggregate({
    where: {
      paidAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
      debt: {
        shopId: selectedShop.id,
        customer: {
          tenantId,
          countryCode,
          shopId: selectedShop.id,
        },
      },
    },
    _sum: {
      amountMinor: true,
    },
  });
  const todayExpenseFinance = await prisma.expense.aggregate({
    where: {
      tenantId,
      shopId: selectedShop.id,
      shop: {
        countryCode,
      },
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    _sum: {
      amountMinor: true,
    },
  });
  const staffWork = await prisma.orderStaff.findMany({
    where: {
      order: {
        tenantId,
        countryCode,
        shopId: selectedShop.id,
        status: "COMPLETED",
        completedAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      user: {
        memberships: {
          some: {
            shopId: selectedShop.id,
            isActive: true,
          },
        },
      },
    },
    select: {
      userId: true,
      user: {
        select: {
          name: true,
        },
      },
      order: {
        select: {
          totalMinor: true,
        },
      },
    },
    orderBy: {
      user: {
        name: "asc",
      },
    },
  });
  const staffStatsByUserId = new Map<string, StaffStat>();

  for (const row of staffWork) {
    const current = staffStatsByUserId.get(row.userId) ?? {
      userId: row.userId,
      name: row.user.name,
      orderCount: 0,
      totalMinor: 0,
    };

    current.orderCount += 1;
    current.totalMinor += row.order.totalMinor;
    staffStatsByUserId.set(row.userId, current);
  }
  const openDebts = await prisma.customerDebt.findMany({
    where: {
      shopId: selectedShop.id,
      amountMinor: {
        gt: 0,
      },
      customer: {
        tenantId,
        countryCode,
        shopId: selectedShop.id,
      },
    },
    select: {
      id: true,
      amountMinor: true,
      currency: true,
      createdAt: true,
      customer: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 8,
  });
  const expenses = await prisma.expense.findMany({
    where: {
      tenantId,
      shopId: selectedShop.id,
      shop: {
        countryCode,
      },
    },
    select: {
      id: true,
      amountMinor: true,
      currency: true,
      comment: true,
      date: true,
      category: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      date: "desc",
    },
    take: 6,
  });
  const queue = await prisma.order.findMany({
    where: {
      ...baseWhere,
      status: "QUEUED",
    },
    select: {
      id: true,
      mileage: true,
      customer: {
        select: {
          name: true,
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
      createdAt: "asc",
    },
    take: 20,
  });
  const dueSoon = await loadDueSoonVehicles(tenantId, countryCode, selectedShop.id);

  const planLimits = getSubscriptionPlanLimits(tenant.plan);

  return {
    tenantName: tenant.name,
    plan: tenant.plan,
    shops: tenant.shops,
    selectedShopId: selectedShop.id,
    currency: selectedShop.currency,
    logoUrl: tenant.logoUrl,
    maxShops: tenant.subscription?.maxShops ?? planLimits.maxShops,
    maxStaff: tenant.subscription?.maxStaff ?? planLimits.maxStaff,
    finance: {
      totalMinor: completedFinance._sum.totalMinor ?? 0,
      paidMinor: (completedFinance._sum.paidMinor ?? 0) + (debtPaymentsFinance._sum.amountMinor ?? 0),
      debtPaymentsMinor: debtPaymentsFinance._sum.amountMinor ?? 0,
      debtMinor: completedFinance._sum.debtMinor ?? 0,
      expenseMinor: todayExpenseFinance._sum.amountMinor ?? 0,
    },
    openDebts: openDebts.map((debt) => ({
      id: debt.id,
      amountMinor: debt.amountMinor,
      currency: debt.currency,
      createdAt: debt.createdAt,
      customerName: debt.customer.name,
    })),
    expenses: expenses.map((expense) => ({
      id: expense.id,
      amountMinor: expense.amountMinor,
      currency: expense.currency,
      comment: expense.comment,
      date: expense.date,
      categoryName: expense.category.name,
    })),
    dueSoon,
    staffStats: [...staffStatsByUserId.values()].sort((left, right) => right.orderCount - left.orderCount),
    totalToday: queued + inProgress + scheduled + completed,
    statusCounts: {
      QUEUED: queued,
      IN_PROGRESS: inProgress,
      SCHEDULED: scheduled,
      COMPLETED: completed,
    } satisfies Record<ServiceStatus, number>,
    queue: queue
      .filter((item) => item.vehicleIdentity)
      .map((item) => ({
        id: item.id,
        mileage: item.mileage,
        customerName: item.customer?.name,
        vehicle: {
          make: item.vehicleIdentity?.make ?? "",
          model: item.vehicleIdentity?.model ?? "",
          plateNumber: item.vehicleIdentity?.plateNumber,
          vinNormalized: item.vehicleIdentity?.vinNormalized,
        },
      })),
  };
}

async function loadDueSoonVehicles(tenantId: string, countryCode: string, shopId: string): Promise<DueSoonItem[]> {
  const now = new Date();
  const soonDate = new Date(now);
  soonDate.setDate(soonDate.getDate() + 30);
  const customerVehicles = await prisma.customerVehicle.findMany({
    where: {
      shopId,
      isActive: true,
      shop: {
        tenantId,
        countryCode,
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
      id: true,
      customer: {
        select: {
          name: true,
        },
      },
      vehicleIdentity: {
        select: {
          make: true,
          model: true,
          plateNumber: true,
          catalog: {
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
                },
                orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
                take: 1,
              },
            },
          },
          serviceRecords: {
            where: {
              countryCode,
              shopId,
              shop: {
                tenantId,
                countryCode,
              },
            },
            select: {
              mileage: true,
              serviceDate: true,
              nextServiceMileage: true,
              nextServiceDate: true,
            },
            orderBy: {
              serviceDate: "desc",
            },
            take: 2,
          },
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: 100,
  });

  return customerVehicles
    .map((entry) => {
      const recommendation = entry.vehicleIdentity.catalog?.recommendations[0] ?? null;
      const forecast = calculateServiceForecast(entry.vehicleIdentity.serviceRecords, recommendation);
      const latestMileage = entry.vehicleIdentity.serviceRecords[0]?.mileage ?? null;
      const isMileageSoon =
        latestMileage !== null && forecast.nextMileage !== null ? forecast.nextMileage - latestMileage <= 500 : false;
      const isDateSoon = forecast.nextDate ? forecast.nextDate.getTime() <= soonDate.getTime() : false;
      const isOverdue =
        (latestMileage !== null && forecast.nextMileage !== null && latestMileage >= forecast.nextMileage) ||
        (forecast.nextDate ? forecast.nextDate.getTime() <= now.getTime() : false);

      if (!isMileageSoon && !isDateSoon && !isOverdue) {
        return null;
      }

      return {
        id: entry.id,
        vehicleName: `${entry.vehicleIdentity.make} ${entry.vehicleIdentity.model}`,
        plateNumber: entry.vehicleIdentity.plateNumber,
        customerName: entry.customer.name,
        nextMileage: forecast.nextMileage,
        nextDate: forecast.nextDate,
        isOverdue,
      };
    })
    .filter((entry): entry is DueSoonItem => entry !== null)
    .sort((left, right) => {
      if (left.isOverdue !== right.isOverdue) {
        return left.isOverdue ? -1 : 1;
      }

      return (left.nextDate?.getTime() ?? Number.MAX_SAFE_INTEGER) - (right.nextDate?.getTime() ?? Number.MAX_SAFE_INTEGER);
    })
    .slice(0, 8);
}

function queueErrorMessages(t: (key: string) => string): Record<string, string> {
  return {
    "dashboard.queue.error.auth": t("dashboard.queue.error.auth"),
    "dashboard.queue.error.validation": t("dashboard.queue.error.validation"),
    "dashboard.queue.error.shop": t("dashboard.queue.error.shop"),
    "dashboard.queue.error.duplicate": t("dashboard.queue.error.duplicate"),
    "dashboard.queue.error.unexpected": t("dashboard.queue.error.unexpected"),
  };
}
