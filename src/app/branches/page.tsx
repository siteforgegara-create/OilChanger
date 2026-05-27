import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Building2, MapPin, Trash2 } from "lucide-react";
import { createBranchAction, deactivateBranchAction } from "@/app/branches/actions";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { createTranslator, loadMessages, toSupportedLocale } from "@/i18n/messages";
import { getAuthSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { canAccessAppRoute } from "@/lib/role-access";
import { getSubscriptionPlanLimits } from "@/lib/subscription-plans";

export const dynamic = "force-dynamic";

type BranchesRouteProps = {
  searchParams: Promise<{
    error?: string;
    locale?: string;
    shopId?: string;
  }>;
};

export default async function BranchesRoute({ searchParams }: BranchesRouteProps) {
  const session = await getAuthSession();

  if (!session) {
    redirect("/login?locale=ru");
  }

  if (!canAccessAppRoute(session.role, "branches")) {
    redirect(`/dashboard?locale=${session.countryCode === "AZ" ? "az" : "en"}`);
  }

  const params = await searchParams;
  const locale = toSupportedLocale(params.locale);
  const messages = await loadMessages(locale);
  const t = createTranslator(messages);
  const data = await loadBranchesData(session.tenantId, session.countryCode, params.shopId);
  const errorMessage = safeBranchErrorKey(params.error) ? t(params.error) : null;
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
            {t("branch.back")}
          </Link>
          <LanguageSwitcher locale={locale} labels={languageLabels} basePath="/branches" />
        </header>

        <section className="mt-6 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <section className="rounded-[2rem] border border-border bg-surface p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-accent/10 text-accent">
                <Building2 className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{t("branch.form.label")}</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-normal">{t("branch.form.title")}</h1>
              </div>
            </div>

            <div className="mt-5 rounded-3xl border border-border bg-bg p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{t("branch.limit.label")}</p>
              <p className="mt-3 text-3xl font-semibold">
                {data.activeShopCount}/{data.maxShops}
              </p>
            </div>

            <form action={createBranchAction} className="mt-6 grid gap-4">
              {errorMessage ? (
                <p className="rounded-2xl border border-danger/20 bg-danger/10 p-4 text-sm font-bold text-danger">
                  {errorMessage}
                </p>
              ) : null}
              <input type="hidden" name="locale" value={locale} />
              <Field label={t("branch.form.name")}>
                <input
                  name="name"
                  className="h-11 w-full rounded-2xl border border-border bg-bg px-3 text-sm font-semibold text-text outline-none transition focus:border-text"
                  required
                />
              </Field>
              <Field label={t("branch.form.address")}>
                <input
                  name="address"
                  className="h-11 w-full rounded-2xl border border-border bg-bg px-3 text-sm font-semibold text-text outline-none transition focus:border-text"
                />
              </Field>
              <button
                type="submit"
                className="rounded-2xl bg-text px-5 py-3 text-sm font-bold text-surface transition hover:opacity-90"
              >
                {t("branch.form.submit")}
              </button>
            </form>
          </section>

          <section className="rounded-[2rem] border border-border bg-surface p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{t("branch.list.label")}</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal">{t("branch.list.title")}</h2>

            <div className="mt-6 overflow-hidden rounded-3xl border border-border bg-bg">
              {data.shops.map((shop) => (
                <div key={shop.id} className="grid gap-3 border-b border-border p-4 last:border-b-0 sm:grid-cols-[1fr_auto]">
                  <div>
                    <Link
                      href={`/dashboard?locale=${locale}&shopId=${shop.id}`}
                      className="text-sm font-bold transition hover:text-accent"
                    >
                      {shop.name}
                    </Link>
                    <p className="mt-2 flex items-center gap-2 text-xs font-semibold text-muted">
                      <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                      {shop.address ?? t("branch.list.noAddress")}
                    </p>
                  </div>
                  {data.activeShopCount > 1 ? (
                    <form action={deactivateBranchAction} className="self-center">
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="shopId" value={shop.id} />
                      <button
                        type="submit"
                        className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted transition hover:border-danger hover:text-danger"
                        aria-label={t("branch.list.deactivate")}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </form>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
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

function safeBranchErrorKey(value: string | undefined): value is string {
  return typeof value === "string" && value.startsWith("branch.error.");
}

async function loadBranchesData(tenantId: string, countryCode: string, requestedShopId: string | undefined) {
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
          address: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
      subscription: {
        select: {
          maxShops: true,
        },
      },
    },
  });

  if (!tenant || tenant.shops.length === 0) {
    redirect("/login?locale=ru");
  }

  const selectedShop = tenant.shops.find((shop) => shop.id === requestedShopId) ?? tenant.shops[0];

  return {
    activeShopCount: tenant.shops.length,
    maxShops: tenant.subscription?.maxShops ?? getSubscriptionPlanLimits(tenant.plan).maxShops,
    selectedShopId: selectedShop.id,
    shops: tenant.shops,
  };
}
