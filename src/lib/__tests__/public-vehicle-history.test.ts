import { describe, expect, it } from "vitest";
import { toPublicVehicleHistory } from "@/lib/public-vehicle-history";

describe("toPublicVehicleHistory", () => {
  it("returns only public vehicle and service fields", () => {
    const history = toPublicVehicleHistory({
      make: "Toyota",
      model: "Camry",
      serviceRecords: [
        {
          id: "record_1",
          lineDescriptions: ["Engine oil"],
          mileage: 120000,
          nextServiceDate: new Date("2026-11-01T00:00:00.000Z"),
          nextServiceMileage: 128000,
          serviceDate: new Date("2026-05-01T00:00:00.000Z"),
        },
      ],
      vinNormalized: "JHMQ123456789AZ01",
      year: 2018,
    });

    expect(history).toEqual({
      make: "Toyota",
      maskedVin: "JHM***********Z01",
      model: "Camry",
      records: [
        {
          id: "record_1",
          lineDescriptions: ["Engine oil"],
          mileage: 120000,
          nextServiceDate: new Date("2026-11-01T00:00:00.000Z"),
          nextServiceMileage: 128000,
          serviceDate: new Date("2026-05-01T00:00:00.000Z"),
        },
      ],
      year: 2018,
    });
  });

  it("does not expose full VIN-like values", () => {
    const history = toPublicVehicleHistory({
      make: "Honda",
      model: "Accord",
      serviceRecords: [],
      vinNormalized: "1HGCM82633A004352",
      year: null,
    });

    expect(JSON.stringify(history)).not.toContain("1HGCM82633A004352");
    expect(history.maskedVin).toBe("1HG***********352");
  });
});
