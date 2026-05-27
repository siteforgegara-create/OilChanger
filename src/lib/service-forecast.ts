export type ServiceForecastRecord = {
  mileage: number;
  serviceDate: Date;
  nextServiceMileage: number | null;
  nextServiceDate: Date | null;
};

export type ServiceForecastRecommendation = {
  intervalKm: number | null;
  intervalMonths: number | null;
};

export type ServiceForecast = {
  nextMileage: number | null;
  nextDate: Date | null;
  averageKmPerDay: number | null;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function calculateServiceForecast(
  records: readonly ServiceForecastRecord[],
  recommendation: ServiceForecastRecommendation | null,
): ServiceForecast {
  const [latest, previous] = records;

  if (!latest) {
    return {
      nextMileage: null,
      nextDate: null,
      averageKmPerDay: null,
    };
  }

  const nextMileage = latest.nextServiceMileage ?? calculateNextMileage(latest.mileage, recommendation?.intervalKm ?? null);
  const averageKmPerDay = previous ? calculateAverageKmPerDay(latest, previous) : null;
  const nextDate =
    latest.nextServiceDate ??
    calculateNextDateFromUsage(latest, nextMileage, averageKmPerDay) ??
    calculateNextDateFromMonths(latest.serviceDate, recommendation?.intervalMonths ?? null);

  return {
    nextMileage,
    nextDate,
    averageKmPerDay,
  };
}

function calculateNextMileage(currentMileage: number, intervalKm: number | null): number | null {
  if (!intervalKm) {
    return null;
  }

  return currentMileage + intervalKm;
}

function calculateAverageKmPerDay(latest: ServiceForecastRecord, previous: ServiceForecastRecord): number | null {
  const mileageDelta = latest.mileage - previous.mileage;
  const dayDelta = Math.max(1, Math.round((latest.serviceDate.getTime() - previous.serviceDate.getTime()) / MS_PER_DAY));

  if (mileageDelta <= 0) {
    return null;
  }

  return Math.round((mileageDelta / dayDelta) * 10) / 10;
}

function calculateNextDateFromUsage(
  latest: ServiceForecastRecord,
  nextMileage: number | null,
  averageKmPerDay: number | null,
): Date | null {
  if (!nextMileage || !averageKmPerDay || averageKmPerDay <= 0) {
    return null;
  }

  const remainingKm = nextMileage - latest.mileage;

  if (remainingKm <= 0) {
    return latest.serviceDate;
  }

  return new Date(latest.serviceDate.getTime() + Math.ceil(remainingKm / averageKmPerDay) * MS_PER_DAY);
}

function calculateNextDateFromMonths(serviceDate: Date, intervalMonths: number | null): Date | null {
  if (!intervalMonths) {
    return null;
  }

  const nextDate = new Date(serviceDate);
  nextDate.setMonth(nextDate.getMonth() + intervalMonths);

  return nextDate;
}
