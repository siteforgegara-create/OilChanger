import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, AlertTriangle, ArrowLeft, Building2, CheckCircle2, Cpu, History, ShieldCheck, XCircle } from "lucide-react";
import {
  approveVehicleCatalogAction,
  approveVehicleCatalogOverrideAction,
  mergeVehicleCatalogAction,
  rejectVehicleCatalogAction,
  rejectVehicleCatalogOverrideAction,
  updateTenantPlanAction,
} from "@/app/admin/actions";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { createTranslator, loadMessages, toSupportedLocale } from "@/i18n/messages";
import { currentAiUsageMonth } from "@/lib/ai-usage";
import { getAuthSession } from "@/lib/auth-session";
import { formatMoneyMinor } from "@/lib/money";
import { buildTenantAiUsageSummary } from "@/lib/platform-admin-ai";
import { findDuplicateCatalogGroups, findDuplicatePlateGroups, maskVehicleIdentity } from "@/lib/platform-admin-insights";
import { prisma } from "@/lib/prisma";
import { canAccessAppRoute } from "@/lib/role-access";

export const dynamic = "force-dynamic";

type AdminRouteProps = {
  searchParams: Promise<{
    locale?: string;
    message?: string;
  }>;
};

export default async function AdminRoute({ searchParams }: AdminRouteProps) {
  const session = await getAuthSession();

  if (!session) {
    redirect("/login?locale=ru");
  }

  if (!canAccessAppRoute(session.role, "admin")) {
    redirect(`/dashboard?locale=${session.countryCode === "AZ" ? "az" : "en"}`);
  }

  const params = await searchParams;
  const locale = toSupportedLocale(params.locale);
  const messages = await loadMessages(locale);
  const t = createTranslator(messages);
  const data = await loadAdminData(session.countryCode);
  const noticeKey = safeAdminMessageKey(params.message) ? params.message : null;
  const languageLabels = {
    az: t("common.language.az"),
    ru: t("common.language.ru"),
    en: t("common.language.en"),
  };

  return (
    <main className="min-h-screen bg-bg px-5 py-6 text-text sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Link href={`/?locale=${locale}`} className="inline-flex items-center gap-2 text-sm font-bold text-muted transition hover:text-text">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t("admin.back")}
          </Link>
          <LanguageSwitcher locale={locale} labels={languageLabels} basePath="/admin" />
        </header>

        <section className="mt-6 rounded-[2rem] border border-border bg-surface p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{t("admin.label")}</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-normal sm:text-5xl">{t("admin.title")}</h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-muted">{t("admin.subtitle")}</p>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-accent/10 text-accent">
              <ShieldCheck className="h-6 w-6" aria-hidden="true" />
            </div>
          </div>

          {noticeKey ? (
            <p className="mt-6 rounded-2xl border border-success/20 bg-success/10 p-4 text-sm font-bold text-success">
              {t(noticeKey)}
            </p>
          ) : null}

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Metric icon={Building2} label={t("admin.metric.tenants")} value={String(data.metrics.tenantCount)} />
            <Metric icon={Building2} label={t("admin.metric.shops")} value={String(data.metrics.shopCount)} />
            <Metric icon={ShieldCheck} label={t("admin.metric.pendingCatalogs")} value={String(data.metrics.pendingCatalogCount)} />
            <Metric icon={AlertTriangle} label={t("admin.metric.suspicious")} value={String(data.metrics.suspiciousCount)} />
            <Metric icon={Cpu} label={t("admin.metric.aiUsage")} value={formatMoneyMinor(data.metrics.aiUsageMinorUsd, "USD", locale)} />
          </div>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[2rem] border border-border bg-surface p-6 shadow-sm sm:p-8">
            <SectionHeader icon={ShieldCheck} label={t("admin.catalog.label")} title={t("admin.catalog.title")} />
            {data.catalogs.length > 0 ? (
              <div className="mt-6 overflow-hidden rounded-3xl border border-border bg-bg">
                {data.catalogs.map((catalog) => (
                  <div key={catalog.id} className="grid gap-4 border-b border-border p-4 last:border-b-0 lg:grid-cols-[1fr_auto]">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge>{catalog.countryCode}</Badge>
                        <Badge>{t(`library.status.${catalog.status}`)}</Badge>
                      </div>
                      <h2 className="mt-3 text-xl font-semibold">
                        {catalog.make} {catalog.model}
                      </h2>
                      <p className="mt-2 text-sm font-semibold leading-6 text-muted">
                        {[catalog.generation, formatYearRange(catalog.yearFrom, catalog.yearTo), catalog.engineCode]
                          .filter(Boolean)
                          .join(" / ") || t("library.emptyValue")}
                      </p>
                      <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                        {t("admin.submittedBy")}: {catalog.createdByUserId ?? t("admin.unknownUser")}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-start gap-2 lg:justify-end">
                      <ReviewForm
                        action={approveVehicleCatalogAction}
                        entityField="catalogId"
                        entityId={catalog.id}
                        icon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
                        label={t("admin.action.approve")}
                        locale={locale}
                        tone="approve"
                      />
                      <ReviewForm
                        action={rejectVehicleCatalogAction}
                        entityField="catalogId"
                        entityId={catalog.id}
                        icon={<XCircle className="h-4 w-4" aria-hidden="true" />}
                        label={t("admin.action.reject")}
                        locale={locale}
                        tone="reject"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState>{t("admin.catalog.empty")}</EmptyState>
            )}
          </section>

          <section className="rounded-[2rem] border border-border bg-surface p-6 shadow-sm sm:p-8">
            <SectionHeader icon={Activity} label={t("admin.override.label")} title={t("admin.override.title")} />
            {data.overrides.length > 0 ? (
              <div className="mt-6 space-y-4">
                {data.overrides.map((override) => (
                  <div key={override.id} className="rounded-3xl border border-border bg-bg p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>{override.catalog.countryCode}</Badge>
                      <Badge>{t(`admin.override.status.${override.status}`)}</Badge>
                    </div>
                    <h2 className="mt-3 text-lg font-semibold">
                      {override.catalog.make} {override.catalog.model}
                    </h2>
                    <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                      {t("admin.submittedBy")}: {override.createdByUserId}
                    </p>
                    <pre className="mt-4 max-h-44 overflow-auto rounded-2xl border border-border bg-surface p-3 font-technical text-xs leading-5 text-muted">
                      {JSON.stringify(override.changedFields, null, 2)}
                    </pre>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <ReviewForm
                        action={approveVehicleCatalogOverrideAction}
                        entityField="overrideId"
                        entityId={override.id}
                        icon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
                        label={t("admin.action.approve")}
                        locale={locale}
                        tone="approve"
                      />
                      <ReviewForm
                        action={rejectVehicleCatalogOverrideAction}
                        entityField="overrideId"
                        entityId={override.id}
                        icon={<XCircle className="h-4 w-4" aria-hidden="true" />}
                        label={t("admin.action.reject")}
                        locale={locale}
                        tone="reject"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState>{t("admin.override.empty")}</EmptyState>
            )}
          </section>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-[2rem] border border-border bg-surface p-6 shadow-sm sm:p-8">
            <SectionHeader icon={AlertTriangle} label={t("admin.suspicious.label")} title={t("admin.suspicious.title")} />
            <div className="mt-6 grid gap-4">
              <SuspiciousBlock title={t("admin.suspicious.catalogDuplicates")} emptyText={t("admin.suspicious.catalogEmpty")}>
                {data.suspicious.catalogDuplicates.map((group) => (
                  <div key={group.key} className="rounded-3xl border border-border bg-bg p-4">
                    <p className="font-technical text-xs font-bold uppercase tracking-[0.12em] text-muted">
                      {t("admin.suspicious.records").replace("{count}", String(group.records.length))}
                    </p>
                    <div className="mt-3 grid gap-2">
                      {group.records.map((record) => (
                        <div key={record.id} className="grid gap-2 rounded-2xl border border-border bg-surface p-3 md:grid-cols-[1fr_auto] md:items-center">
                          <p className="text-sm font-semibold leading-6 text-muted">
                            <span className="font-bold text-text">
                              {record.make} {record.model}
                            </span>{" "}
                            / {[record.generation, formatYearRange(record.yearFrom, record.yearTo), record.engineCode].filter(Boolean).join(" / ") || t("library.emptyValue")}
                          </p>
                          {record.id !== group.records[0]?.id ? (
                            <MergeCatalogForm
                              duplicateCatalogId={record.id}
                              label={t("admin.action.mergeIntoPrimary")}
                              locale={locale}
                              primaryCatalogId={group.records[0]?.id ?? ""}
                            />
                          ) : (
                            <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-bold text-success">
                              {t("admin.suspicious.primary")}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </SuspiciousBlock>

              <SuspiciousBlock title={t("admin.suspicious.plateDuplicates")} emptyText={t("admin.suspicious.plateEmpty")}>
                {data.suspicious.plateDuplicates.map((group) => (
                  <div key={group.key} className="rounded-3xl border border-border bg-bg p-4">
                    <p className="font-technical text-sm font-bold">{maskVehicleIdentity(group.key)}</p>
                    <div className="mt-3 grid gap-2">
                      {group.records.map((record) => (
                        <p key={record.id} className="text-sm font-semibold leading-6 text-muted">
                          <span className="font-bold text-text">
                            {record.make} {record.model}
                          </span>{" "}
                          / {record.year ?? t("library.emptyValue")} / {record.id}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </SuspiciousBlock>
            </div>
          </section>

          <section className="rounded-[2rem] border border-border bg-surface p-6 shadow-sm sm:p-8">
            <SectionHeader icon={History} label={t("admin.audit.label")} title={t("admin.audit.title")} />
            {data.auditLogs.length > 0 ? (
              <div className="mt-6 overflow-hidden rounded-3xl border border-border bg-bg">
                {data.auditLogs.map((log) => (
                  <div key={log.id} className="grid gap-3 border-b border-border p-4 last:border-b-0 lg:grid-cols-[1fr_auto] lg:items-center">
                    <div>
                      <p className="text-sm font-bold">{log.action}</p>
                      <p className="mt-1 text-sm font-semibold text-muted">
                        {log.entity} / {log.entityId}
                      </p>
                      <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                        {log.user.email} / {log.tenantId ?? t("admin.audit.platformScope")}
                      </p>
                    </div>
                    <p className="font-technical text-xs font-semibold text-muted">{formatAdminDate(log.createdAt, locale)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState>{t("admin.audit.empty")}</EmptyState>
            )}
          </section>
        </section>

        <section className="mt-6 rounded-[2rem] border border-border bg-surface p-6 shadow-sm sm:p-8">
          <SectionHeader icon={Building2} label={t("admin.tenants.label")} title={t("admin.tenants.title")} />
          <div className="mt-6 overflow-hidden rounded-3xl border border-border bg-bg">
            {data.tenants.map((tenant) => (
              <div key={tenant.id} className="grid gap-3 border-b border-border p-4 last:border-b-0 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <p className="text-base font-bold">{tenant.name}</p>
                  <p className="mt-1 text-sm font-semibold text-muted">
                    {tenant.countryCode} / {t(`settings.planName.${tenant.plan}`)} / {tenant.owner.email}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-muted">
                    {t("admin.tenants.aiUsage")}:{" "}
                    <span className={tenant.aiUsage.isOverLimit ? "font-bold text-danger" : "font-bold text-text"}>
                      {formatMoneyMinor(tenant.aiUsage.usedMinorUsd, "USD", locale)}
                    </span>{" "}
                    / {formatMoneyMinor(tenant.aiUsage.limitMinorUsd, "USD", locale)}
                    {tenant.aiUsage.isOverLimit ? (
                      <span className="ml-2 rounded-full bg-danger/10 px-2 py-1 text-xs font-bold text-danger">
                        {t("admin.tenants.aiOverLimit")}
                      </span>
                    ) : null}
                  </p>
                </div>
                <p className="text-sm font-bold text-muted">
                  {t("admin.tenants.shops")}: {tenant._count.shops}
                </p>
                <TenantPlanForm
                  currentPlan={tenant.plan}
                  label={t("admin.action.updatePlan")}
                  locale={locale}
                  tenantId={tenant.id}
                />
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

async function loadAdminData(countryCode: string) {
  const currentMonth = currentAiUsageMonth();
  const [
    tenantCount,
    shopCount,
    pendingCatalogCount,
    aiUsage,
    catalogs,
    overrides,
    tenants,
    auditLogs,
    catalogDuplicateCandidates,
    plateDuplicateCandidates,
    tenantAiUsages,
  ] = await Promise.all([
    prisma.tenant.count(),
    prisma.shop.count(),
    prisma.vehicleCatalog.count({
      where: {
        countryCode,
        status: "PENDING",
      },
    }),
    prisma.aiUsage.aggregate({
      where: {
        month: currentMonth,
      },
      _sum: {
        estimatedCostMinorUsd: true,
      },
    }),
    prisma.vehicleCatalog.findMany({
      where: {
        countryCode,
        status: "PENDING",
      },
      select: {
        id: true,
        countryCode: true,
        createdByUserId: true,
        engineCode: true,
        generation: true,
        make: true,
        model: true,
        status: true,
        yearFrom: true,
        yearTo: true,
      },
      orderBy: {
        createdAt: "asc",
      },
      take: 20,
    }),
    prisma.vehicleCatalogOverride.findMany({
      where: {
        status: "PENDING_REVIEW",
        catalog: {
          countryCode,
        },
      },
      select: {
        id: true,
        changedFields: true,
        status: true,
        createdByUserId: true,
        catalog: {
          select: {
            countryCode: true,
            make: true,
            model: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      take: 20,
    }),
    prisma.tenant.findMany({
      select: {
        id: true,
        countryCode: true,
        name: true,
        owner: {
          select: {
            email: true,
          },
        },
        plan: true,
        subscription: {
          select: {
            aiMonthlyLimitMinorUsd: true,
          },
        },
        _count: {
          select: {
            shops: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    }),
    prisma.auditLog.findMany({
      select: {
        id: true,
        action: true,
        createdAt: true,
        entity: true,
        entityId: true,
        tenantId: true,
        user: {
          select: {
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    }),
    prisma.vehicleCatalog.findMany({
      where: {
        countryCode,
      },
      select: {
        id: true,
        engineCode: true,
        generation: true,
        make: true,
        model: true,
        yearFrom: true,
        yearTo: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 200,
    }),
    prisma.vehicleIdentity.findMany({
      where: {
        countryCode,
        plateNormalized: {
          not: null,
        },
      },
      select: {
        id: true,
        make: true,
        model: true,
        plateNormalized: true,
        vinNormalized: true,
        year: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 200,
    }),
    prisma.aiUsage.groupBy({
      by: ["tenantId"],
      where: {
        month: currentMonth,
      },
      _sum: {
        estimatedCostMinorUsd: true,
      },
    }),
  ]);
  const catalogDuplicates = findDuplicateCatalogGroups(catalogDuplicateCandidates).slice(0, 5);
  const plateDuplicates = findDuplicatePlateGroups(plateDuplicateCandidates).slice(0, 5);
  const aiUsageByTenantId = new Map(
    tenantAiUsages.map((usage) => [usage.tenantId, usage._sum.estimatedCostMinorUsd ?? 0]),
  );
  const tenantsWithAiUsage = tenants.map((tenant) => ({
    ...tenant,
    aiUsage: buildTenantAiUsageSummary({
      plan: tenant.plan,
      subscriptionLimitMinorUsd: tenant.subscription?.aiMonthlyLimitMinorUsd ?? null,
      tenantId: tenant.id,
      usedMinorUsd: aiUsageByTenantId.get(tenant.id) ?? 0,
    }),
  }));

  return {
    auditLogs,
    catalogs,
    metrics: {
      aiUsageMinorUsd: aiUsage._sum.estimatedCostMinorUsd ?? 0,
      pendingCatalogCount,
      shopCount,
      suspiciousCount: catalogDuplicates.length + plateDuplicates.length,
      tenantCount,
    },
    overrides,
    suspicious: {
      catalogDuplicates,
      plateDuplicates,
    },
    tenants: tenantsWithAiUsage,
  };
}

function Metric({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-border bg-bg p-5">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-bold text-muted">{label}</p>
        <Icon className="h-5 w-5 text-accent" aria-hidden="true" />
      </div>
      <p className="mt-4 font-technical text-3xl font-semibold">{value}</p>
    </div>
  );
}

function SectionHeader({ icon: Icon, label, title }: { icon: typeof Building2; label: string; title: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{label}</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-normal">{title}</h2>
      </div>
      <Icon className="h-6 w-6 text-accent" aria-hidden="true" />
    </div>
  );
}

function ReviewForm({
  action,
  entityField,
  entityId,
  icon,
  label,
  locale,
  tone,
}: {
  action: (formData: FormData) => Promise<void>;
  entityField: string;
  entityId: string;
  icon: React.ReactNode;
  label: string;
  locale: string;
  tone: "approve" | "reject";
}) {
  return (
    <form action={action}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name={entityField} value={entityId} />
      <button
        type="submit"
        className={[
          "inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-bold transition hover:opacity-90",
          tone === "approve" ? "bg-success text-white" : "bg-danger text-white",
        ].join(" ")}
      >
        {icon}
        {label}
      </button>
    </form>
  );
}

function MergeCatalogForm({
  duplicateCatalogId,
  label,
  locale,
  primaryCatalogId,
}: {
  duplicateCatalogId: string;
  label: string;
  locale: string;
  primaryCatalogId: string;
}) {
  return (
    <form action={mergeVehicleCatalogAction}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="duplicateCatalogId" value={duplicateCatalogId} />
      <input type="hidden" name="primaryCatalogId" value={primaryCatalogId} />
      <button
        type="submit"
        className="inline-flex h-9 items-center gap-2 rounded-full border border-border bg-bg px-3 text-xs font-bold text-text transition hover:border-text"
      >
        <CheckCircle2 className="h-4 w-4 text-accent" aria-hidden="true" />
        {label}
      </button>
    </form>
  );
}

function TenantPlanForm({
  currentPlan,
  label,
  locale,
  tenantId,
}: {
  currentPlan: "START" | "PRO" | "PREMIUM";
  label: string;
  locale: string;
  tenantId: string;
}) {
  return (
    <form action={updateTenantPlanAction} className="flex flex-wrap items-center gap-2 md:justify-end">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="tenantId" value={tenantId} />
      <select
        name="plan"
        defaultValue={currentPlan}
        className="h-10 rounded-full border border-border bg-surface px-3 text-sm font-bold text-text outline-none transition focus:border-accent"
      >
        <option value="START">Start</option>
        <option value="PRO">Pro</option>
        <option value="PREMIUM">Premium</option>
      </select>
      <button
        type="submit"
        className="inline-flex h-10 items-center gap-2 rounded-full bg-text px-4 text-sm font-bold text-surface transition hover:opacity-90"
      >
        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        {label}
      </button>
    </form>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-surface px-3 py-1 text-xs font-bold text-muted">{children}</span>;
}

function SuspiciousBlock({ children, emptyText, title }: { children: React.ReactNode; emptyText: string; title: string }) {
  const hasItems = Array.isArray(children) ? children.length > 0 : Boolean(children);

  return (
    <section>
      <h3 className="text-base font-semibold">{title}</h3>
      <div className="mt-3 grid gap-3">{hasItems ? children : <EmptyState>{emptyText}</EmptyState>}</div>
    </section>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="mt-6 rounded-3xl border border-dashed border-border bg-bg p-6 text-sm font-semibold text-muted">{children}</p>;
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

function safeAdminMessageKey(message: string | undefined): message is "admin.saved" | "admin.error.validation" | "admin.error.notFound" {
  return message === "admin.saved" || message === "admin.error.validation" || message === "admin.error.notFound";
}

function formatAdminDate(value: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}
