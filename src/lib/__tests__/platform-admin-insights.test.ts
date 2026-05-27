import { describe, expect, it } from "vitest";
import { findDuplicateCatalogGroups, findDuplicatePlateGroups, maskVehicleIdentity } from "@/lib/platform-admin-insights";

describe("platform admin insights", () => {
  it("groups duplicate catalog records by technical vehicle identity", () => {
    const duplicates = findDuplicateCatalogGroups([
      { id: "catalog_1", make: "Toyota", model: "Camry", generation: "XV70", yearFrom: 2018, yearTo: 2024, engineCode: "A25A" },
      { id: "catalog_2", make: "toyota", model: "camry", generation: "xv70", yearFrom: 2018, yearTo: 2024, engineCode: "a25a" },
      { id: "catalog_3", make: "Toyota", model: "Corolla", generation: null, yearFrom: 2020, yearTo: null, engineCode: null },
    ]);

    expect(duplicates).toHaveLength(1);
    expect(duplicates[0]?.records.map((record) => record.id)).toEqual(["catalog_1", "catalog_2"]);
  });

  it("flags plate duplicates only when VIN is missing", () => {
    const duplicates = findDuplicatePlateGroups([
      { id: "vehicle_1", make: "Kia", model: "Rio", year: 2018, plateNormalized: "10AA100", vinNormalized: null },
      { id: "vehicle_2", make: "Kia", model: "Rio", year: 2019, plateNormalized: "10AA100", vinNormalized: null },
      { id: "vehicle_3", make: "Kia", model: "Rio", year: 2020, plateNormalized: "10AA100", vinNormalized: "VIN123" },
    ]);

    expect(duplicates).toHaveLength(1);
    expect(duplicates[0]?.records.map((record) => record.id)).toEqual(["vehicle_1", "vehicle_2"]);
  });

  it("masks vehicle identity values for admin preview lists", () => {
    expect(maskVehicleIdentity("10AA100")).toBe("10***00");
    expect(maskVehicleIdentity("ABC")).toBe("ABC");
    expect(maskVehicleIdentity(null)).toBe("");
  });
});
