import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { ArrowLeft, BellRing, CheckCircle2, ExternalLink, MailCheck } from "lucide-react";
import { updateNotificationStatusAction } from "@/app/notifications/actions";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { createTranslator, loadMessages, toSupportedLocale } from "@/i18n/messages";
import type { SupportedLocale } from "@/i18n/catalog";
import { getAuthSession } from "@/lib/auth-session";
import { userVisibleNotificationChannel } from "@/lib/notification-delivery";
import { prisma } from "@/lib/prisma";
import { canAccessAppRoute } from "@/lib/role-access";

export const dynamic = "force-dynamic";

type NotificationsRouteProps = {
  searchParams: Promise<{
    locale?: string;
    shopId?: string;
  }>;
};

type ReminderPayload = {
  customerVehicleId: string | null;
  label: string | null;
  shopId: string | null;
  vehicleLabel: string | null;
};

export default async function NotificationsRoute({ searchParams }: NotificationsRouteProps) {
  const session = await getAuthSession();

  if (!session) {
    redirect("/login?locale=ru");
  }

  if (!canAccessAppRoute(session.role, "notifications")) {
    redirect(`/dashboard?locale=${session.countryCode === "AZ" ? "az" : "en"}`);
  }

  const params = await searchParams;
  const locale = toSupportedLocale(params.locale);
  const messages = await loadMessages(locale);
  const t = createTranslator(messages);
  const data = await loadNotificationsData(session.tenantId, session.countryCode, session.userId, params.shopId);
  const languageLabels = {
    az: t("common.language.az"),
    ru: t("common.language.ru"),
    en: t("common.language.en"),
  };
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <main className="min-h-screen bg-bg px-5 py-6 text-text sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href={`/dashboard?locale=${locale}&shopId=${data.selectedShopId}`}
            className="inline-flex items-center gap-2 text-sm font-bold text-muted transition hover:text-text"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t("notifications.back")}
          </Link>
          <LanguageSwitcher locale={locale} labels={languageLabels} basePath="/notifications" />
        </header>

        <section className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="space-y-4">
            <section className="rounded-[2rem] border border-border bg-surface p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{t("dashboard.branch.title")}</p>
              <div className="mt-4 space-y-2">
                {data.shops.map((shop) => (
                  <Link
                    key={shop.id}
                    href={`/notifications?locale=${locale}&shopId=${shop.id}`}
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

          <section className="rounded-[2rem] border border-border bg-surface p-6 shadow-sm sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{t("notifications.label")}</p>
                <h1 className="mt-3 text-3xl font-semibold tracking-normal sm:text-5xl">{t("notifications.title")}</h1>
                <p className="mt-4 max-w-2xl text-base leading-8 text-muted">{t("notifications.subtitle")}</p>
              </div>
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-accent/10 text-accent">
                <BellRing className="h-6 w-6" aria-hidden="true" />
              </div>
            </div>

            {data.notifications.length > 0 ? (
              <div className="mt-8 overflow-hidden rounded-3xl border border-border bg-bg">
                {data.notifications.map((notification) => {
                  const payload = reminderPayload(notification.payload);
                  const vehicleLabel = payload.vehicleLabel ?? payload.label ?? t("notifications.vehicleFallback");

                  return (
                    <div key={notification.id} className="grid gap-4 border-b border-border p-4 last:border-b-0 xl:grid-cols-[1fr_auto]">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <span
                            className={[
                              "rounded-full px-3 py-1 text-xs font-bold",
                              notification.status === "PENDING"
                                ? "bg-warning/10 text-warning"
                                : notification.status === "SENT"
                                  ? "bg-success/10 text-success"
                                  : "bg-text/10 text-text",
                            ].join(" ")}
                          >
                            {t(`notifications.status.${notification.status}`)}
                          </span>
                          <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
                            {t("notifications.createdAt")}: {dateFormatter.format(notification.createdAt)}
                          </span>
                        </div>
                        <h2 className="mt-3 text-xl font-semibold">{t(notification.titleKey)}</h2>
                        <p className="mt-2 text-sm font-semibold leading-6 text-muted">{t(notification.bodyKey)}</p>
                        <p className="mt-4 text-sm font-bold">{vehicleLabel}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                        {payload.customerVehicleId ? (
                          <Link
                            href={`/customers/${payload.customerVehicleId}?locale=${locale}&shopId=${data.selectedShopId}`}
                            className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm font-bold transition hover:border-text"
                          >
                            <ExternalLink className="h-4 w-4 text-accent" aria-hidden="true" />
                            {t("notifications.openVehicle")}
                          </Link>
                        ) : null}

                        {notification.status === "PENDING" ? (
                          <StatusForm
                            icon={<MailCheck className="h-4 w-4" aria-hidden="true" />}
                            label={t("notifications.markSent")}
                            locale={locale}
                            notificationId={notification.id}
                            shopId={data.selectedShopId}
                            status="SENT"
                          />
                        ) : null}
                        {notification.status !== "READ" ? (
                          <StatusForm
                            icon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
                            label={t("notifications.markRead")}
                            locale={locale}
                            notificationId={notification.id}
                            shopId={data.selectedShopId}
                            status="READ"
                          />
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-8 rounded-3xl border border-dashed border-border bg-bg p-8 text-sm font-semibold leading-6 text-muted">
                {t("notifications.empty")}
              </p>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}

type StatusFormProps = {
  icon: React.ReactNode;
  label: string;
  locale: SupportedLocale;
  notificationId: string;
  shopId: string;
  status: "SENT" | "READ";
};

function StatusForm({ icon, label, locale, notificationId, shopId, status }: StatusFormProps) {
  return (
    <form action={updateNotificationStatusAction}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="notificationId" value={notificationId} />
      <input type="hidden" name="shopId" value={shopId} />
      <input type="hidden" name="status" value={status} />
      <button
        type="submit"
        className="inline-flex h-10 items-center gap-2 rounded-full bg-text px-4 text-sm font-bold text-surface transition hover:opacity-90"
      >
        {icon}
        {label}
      </button>
    </form>
  );
}

async function loadNotificationsData(
  tenantId: string,
  countryCode: string,
  userId: string,
  requestedShopId: string | undefined,
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
  const notifications = await prisma.notification.findMany({
    where: {
      channel: userVisibleNotificationChannel(),
      userId,
      OR: [
        {
          titleKey: "notification.customerReminder.title",
          payload: {
            path: ["shopId"],
            equals: selectedShop.id,
          },
        },
        {
          titleKey: {
            startsWith: "notification.platformReview.",
          },
        },
      ],
    },
    select: {
      id: true,
      titleKey: true,
      bodyKey: true,
      payload: true,
      status: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 40,
  });

  return {
    notifications,
    selectedShopId: selectedShop.id,
    shops: tenant.shops,
  };
}

function reminderPayload(payload: Prisma.JsonValue): ReminderPayload {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {
      customerVehicleId: null,
      label: null,
      shopId: null,
      vehicleLabel: null,
    };
  }

  return {
    customerVehicleId: stringOrNull(payload.customerVehicleId),
    label: stringOrNull(payload.label),
    shopId: stringOrNull(payload.shopId),
    vehicleLabel: stringOrNull(payload.vehicleLabel),
  };
}

function stringOrNull(value: Prisma.JsonValue | undefined): string | null {
  return typeof value === "string" ? value : null;
}
