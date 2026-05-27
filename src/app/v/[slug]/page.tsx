import { notFound } from "next/navigation";
import { CarFront, Gauge, Wrench } from "lucide-react";
import { createTranslator, loadMessages, toSupportedLocale } from "@/i18n/messages";
import { prisma } from "@/lib/prisma";
import { toPublicVehicleHistory } from "@/lib/public-vehicle-history";

export const dynamic = "force-dynamic";

type PublicVehicleRouteProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    locale?: string;
  }>;
};

export default async function PublicVehicleRoute({ params, searchParams }: PublicVehicleRouteProps) {
  const { slug } = await params;
  const query = await searchParams;
  const locale = toSupportedLocale(query.locale);
  const messages = await loadMessages(locale);
  const t = createTranslator(messages);
  const qr = await prisma.vehicleQR.findFirst({
    where: {
      slug,
      isActive: true,
    },
    select: {
      vehicleIdentity: {
        select: {
          countryCode: true,
          make: true,
          model: true,
          year: true,
          vinNormalized: true,
          serviceRecords: {
            where: {
              publicVisible: true,
            },
            select: {
              id: true,
              mileage: true,
              nextServiceDate: true,
              nextServiceMileage: true,
              serviceDate: true,
              order: {
                select: {
                  lines: {
                    where: {
                      type: "LABOR",
                    },
                    select: {
                      description: true,
                    },
                  },
                },
              },
            },
            orderBy: {
              serviceDate: "desc",
            },
            take: 10,
          },
        },
      },
    },
  });

  if (!qr) {
    notFound();
  }

  await prisma.vehicleQR.update({
    where: {
      slug,
    },
    data: {
      scanCount: {
        increment: 1,
      },
    },
  });

  const vehicle = toPublicVehicleHistory({
    make: qr.vehicleIdentity.make,
    model: qr.vehicleIdentity.model,
    serviceRecords: qr.vehicleIdentity.serviceRecords.map((record) => ({
      id: record.id,
      lineDescriptions: record.order.lines.map((line) => line.description),
      mileage: record.mileage,
      nextServiceDate: record.nextServiceDate,
      nextServiceMileage: record.nextServiceMileage,
      serviceDate: record.serviceDate,
    })),
    vinNormalized: qr.vehicleIdentity.vinNormalized,
    year: qr.vehicleIdentity.year,
  });
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <main className="min-h-screen bg-bg px-5 py-8 text-text">
      <section className="mx-auto max-w-4xl rounded-[2rem] border border-border bg-surface p-6 shadow-sm sm:p-8">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-accent/10 text-accent">
          <CarFront className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="mt-6 text-3xl font-semibold sm:text-5xl">
          {vehicle.make} {vehicle.model}
        </h1>
        <p className="mt-3 text-sm font-bold text-muted">
          {vehicle.year ?? ""} {vehicle.maskedVin ? `VIN ${vehicle.maskedVin}` : ""}
        </p>
        <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-muted">{t("publicVehicle.privacy")}</p>

        <div className="mt-8 space-y-4">
          {vehicle.records.length > 0 ? vehicle.records.map((record) => (
            <div key={record.id} className="rounded-3xl border border-border bg-bg p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-bold">{dateFormatter.format(record.serviceDate)}</p>
                <span className="inline-flex items-center gap-2 rounded-full bg-text px-3 py-1 text-xs font-bold text-surface">
                  <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
                  {record.mileage} km
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {record.lineDescriptions.map((description) => (
                  <span key={description} className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-bold">
                    <Wrench className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                    {description}
                  </span>
                ))}
              </div>
              {record.nextServiceMileage || record.nextServiceDate ? (
                <p className="mt-4 rounded-2xl border border-border bg-surface p-3 text-xs font-bold text-muted">
                  {t("publicVehicle.nextService")}: {[record.nextServiceMileage ? `${record.nextServiceMileage} km` : null, record.nextServiceDate ? dateFormatter.format(record.nextServiceDate) : null]
                    .filter(Boolean)
                    .join(" / ")}
                </p>
              ) : null}
            </div>
          )) : (
            <p className="rounded-3xl border border-dashed border-border bg-bg p-6 text-sm font-semibold text-muted">
              {t("publicVehicle.empty")}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
