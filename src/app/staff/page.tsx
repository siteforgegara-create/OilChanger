import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck, UserMinus, UsersRound } from "lucide-react";
import { createStaffAction, deactivateStaffAction } from "@/app/staff/actions";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { createTranslator, loadMessages, toSupportedLocale } from "@/i18n/messages";
import { getAuthSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { canAccessAppRoute } from "@/lib/role-access";
import { getSubscriptionPlanLimits } from "@/lib/subscription-plans";

export const dynamic = "force-dynamic";

type StaffRouteProps = {
  searchParams: Promise<{
    error?: string;
    locale?: string;
    shopId?: string;
  }>;
};

export default async function StaffRoute({ searchParams }: StaffRouteProps) {
  const session = await getAuthSession();

  if (!session) {
    redirect("/login?locale=ru");
  }

  if (!canAccessAppRoute(session.role, "staff")) {
    redirect(`/dashboard?locale=${session.countryCode === "AZ" ? "az" : "en"}`);
  }

  const params = await searchParams;
  const locale = toSupportedLocale(params.locale);
  const messages = await loadMessages(locale);
  const t = createTranslator(messages);
  const staffData = await loadStaffData(session.tenantId, session.countryCode, params.shopId);
  const errorMessage = safeStaffErrorKey(params.error) ? t(params.error) : null;
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
            href={`/dashboard?locale=${locale}&shopId=${staffData.selectedShopId}`}
            className="inline-flex items-center gap-2 text-sm font-bold text-muted transition hover:text-text"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t("staff.back")}
          </Link>
          <LanguageSwitcher locale={locale} labels={languageLabels} basePath="/staff" />
        </header>

        <section className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="space-y-4">
            <div className="rounded-3xl border border-border bg-surface p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{t("dashboard.branch.title")}</p>
              <div className="mt-4 space-y-2">
                {staffData.shops.map((shop) => (
                  <Link
                    key={shop.id}
                    href={`/staff?locale=${locale}&shopId=${shop.id}`}
                    className={[
                      "block rounded-2xl border px-4 py-3 text-sm font-bold transition",
                      shop.id === staffData.selectedShopId
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
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{t("staff.limit.label")}</p>
              <p className="mt-3 text-3xl font-semibold">
                {staffData.activeStaffCount}/{staffData.maxStaff}
              </p>
            </div>
          </aside>

          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <section className="rounded-[2rem] border border-border bg-surface p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-accent/10 text-accent">
                  <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{t("staff.form.label")}</p>
                  <h1 className="mt-1 text-2xl font-semibold tracking-normal">{t("staff.form.title")}</h1>
                </div>
              </div>

              <form action={createStaffAction} className="mt-6 grid gap-4">
                {errorMessage ? (
                  <p className="rounded-2xl border border-danger/20 bg-danger/10 p-4 text-sm font-bold text-danger">
                    {errorMessage}
                  </p>
                ) : null}
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="shopId" value={staffData.selectedShopId} />
                <Field label={t("staff.form.name")}>
                  <input
                    name="name"
                    className="h-11 w-full rounded-2xl border border-border bg-bg px-3 text-sm font-semibold text-text outline-none transition focus:border-text"
                    required
                  />
                </Field>
                <Field label={t("staff.form.email")}>
                  <input
                    name="email"
                    type="email"
                    className="h-11 w-full rounded-2xl border border-border bg-bg px-3 text-sm font-semibold text-text outline-none transition focus:border-text"
                    required
                  />
                </Field>
                <Field label={t("staff.form.role")}>
                  <select
                    name="role"
                    defaultValue="MECHANIC"
                    className="h-11 w-full rounded-2xl border border-border bg-bg px-3 text-sm font-semibold text-text outline-none transition focus:border-text"
                  >
                    <option value="MECHANIC">{t("order.staff.role.MECHANIC")}</option>
                    <option value="BRANCH_ADMIN">{t("order.staff.role.BRANCH_ADMIN")}</option>
                  </select>
                </Field>
                <Field label={t("staff.form.password")}>
                  <input
                    name="password"
                    type="password"
                    className="h-11 w-full rounded-2xl border border-border bg-bg px-3 text-sm font-semibold text-text outline-none transition focus:border-text"
                    required
                  />
                </Field>
                <Field label={t("staff.form.confirmPassword")}>
                  <input
                    name="confirmPassword"
                    type="password"
                    className="h-11 w-full rounded-2xl border border-border bg-bg px-3 text-sm font-semibold text-text outline-none transition focus:border-text"
                    required
                  />
                </Field>
                <button
                  type="submit"
                  className="rounded-2xl bg-text px-5 py-3 text-sm font-bold text-surface transition hover:opacity-90"
                >
                  {t("staff.form.submit")}
                </button>
              </form>
            </section>

            <section className="rounded-[2rem] border border-border bg-surface p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-accent/10 text-accent">
                  <UsersRound className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{t("staff.list.label")}</p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-normal">{t("staff.list.title")}</h2>
                </div>
              </div>

              {staffData.members.length > 0 ? (
                <div className="mt-6 overflow-hidden rounded-3xl border border-border bg-bg">
                  {staffData.members.map((member) => (
                    <div
                      key={member.userId}
                      className="grid gap-3 border-b border-border p-4 last:border-b-0 sm:grid-cols-[1fr_auto_auto]"
                    >
                      <div>
                        <p className="text-sm font-bold">{member.name}</p>
                        <p className="mt-1 text-xs font-semibold text-muted">{member.email}</p>
                      </div>
                      <p className="self-center text-sm font-semibold text-muted">{t(`order.staff.role.${member.role}`)}</p>
                      {member.userId !== session.userId ? (
                        <form action={deactivateStaffAction} className="self-center">
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="shopId" value={staffData.selectedShopId} />
                          <input type="hidden" name="userId" value={member.userId} />
                          <button
                            type="submit"
                            className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted transition hover:border-danger hover:text-danger"
                            aria-label={t("staff.list.deactivate")}
                          >
                            <UserMinus className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </form>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-6 rounded-3xl border border-dashed border-border bg-bg p-6 text-sm font-semibold text-muted">
                  {t("staff.list.empty")}
                </p>
              )}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function safeStaffErrorKey(value: string | undefined): value is string {
  return typeof value === "string" && value.startsWith("staff.error.");
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

async function loadStaffData(tenantId: string, countryCode: string, requestedShopId: string | undefined) {
  const tenant = await prisma.tenant.findFirst({
    where: {
      id: tenantId,
      countryCode,
    },
    select: {
      plan: true,
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
      subscription: {
        select: {
          maxStaff: true,
        },
      },
    },
  });

  if (!tenant || tenant.shops.length === 0) {
    redirect("/login?locale=ru");
  }

  const selectedShop = tenant.shops.find((shop) => shop.id === requestedShopId) ?? tenant.shops[0];
  const [members, activeStaffUsers] = await Promise.all([
    prisma.membership.findMany({
      where: {
        shopId: selectedShop.id,
        isActive: true,
        shop: {
          tenantId,
          countryCode,
        },
      },
      select: {
        userId: true,
        role: true,
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
      orderBy: {
        user: {
          name: "asc",
        },
      },
    }),
    prisma.membership.findMany({
      where: {
        isActive: true,
        shop: {
          tenantId,
          countryCode,
        },
      },
      distinct: ["userId"],
      select: {
        userId: true,
      },
    }),
  ]);

  return {
    activeStaffCount: activeStaffUsers.length,
    maxStaff: tenant.subscription?.maxStaff ?? getSubscriptionPlanLimits(tenant.plan).maxStaff,
    members: members.map((member) => ({
      userId: member.userId,
      role: member.role,
      email: member.user.email,
      name: member.user.name,
    })),
    selectedShopId: selectedShop.id,
    shops: tenant.shops,
  };
}
