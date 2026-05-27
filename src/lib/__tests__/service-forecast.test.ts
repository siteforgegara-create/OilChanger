import { describe, expect, it } from "vitest";
import { calculateServiceForecast } from "@/lib/service-forecast";

describe("service forecast", () => {
  it("uses stored next service values when present", () => {
    const nextDate = new Date("2026-08-01T00:00:00.000Z");
    const forecast = calculateServiceForecast(
      [
        {
          mileage: 100_000,
          serviceDate: new Date("2026-05-01T00:00:00.000Z"),
          nextServiceMileage: 108_000,
          nextServiceDate: nextDate,
        },
      ],
      { intervalKm: 10_000, intervalMonths: 6 },
    );

    expect(forecast.nextMileage).toBe(108_000);
    expect(forecast.nextDate).toEqual(nextDate);
  });

  it("estimates next mileage and date from usage pace", () => {
    const forecast = calculateServiceForecast(
      [
        {
          mileage: 110_000,
          serviceDate: new Date("2026-05-01T00:00:00.000Z"),
          nextServiceMileage: null,
          nextServiceDate: null,
        },
        {
          mileage: 100_000,
          serviceDate: new Date("2026-03-01T00:00:00.000Z"),
          nextServiceMileage: null,
          nextServiceDate: null,
        },
      ],
      { intervalKm: 10_000, intervalMonths: 6 },
    );

    expect(forecast.nextMileage).toBe(120_000);
    expect(forecast.averageKmPerDay).toBeGreaterThan(160);
    expect(forecast.nextDate?.getTime()).toBeGreaterThan(new Date("2026-06-01T00:00:00.000Z").getTime());
  });

  it("falls back to month interval when there is no usage pace", () => {
    const forecast = calculateServiceForecast(
      [
        {
          mileage: 80_000,
          serviceDate: new Date("2026-05-01T00:00:00.000Z"),
          nextServiceMileage: null,
          nextServiceDate: null,
        },
      ],
      { intervalKm: null, intervalMonths: 6 },
    );

    expect(forecast.nextMileage).toBeNull();
    expect(forecast.nextDate?.toISOString().startsWith("2026-11-01")).toBe(true);
  });
});
