import { maskVin } from "@/lib/vehicle-identity";

export type PublicVehicleHistoryInput = {
  make: string;
  model: string;
  serviceRecords: readonly {
    id: string;
    lineDescriptions: readonly string[];
    mileage: number;
    nextServiceDate: Date | null;
    nextServiceMileage: number | null;
    serviceDate: Date;
  }[];
  vinNormalized: string | null;
  year: number | null;
};

export type PublicVehicleHistory = {
  make: string;
  maskedVin: string | null;
  model: string;
  records: readonly {
    id: string;
    lineDescriptions: readonly string[];
    mileage: number;
    nextServiceDate: Date | null;
    nextServiceMileage: number | null;
    serviceDate: Date;
  }[];
  year: number | null;
};

export function toPublicVehicleHistory(input: PublicVehicleHistoryInput): PublicVehicleHistory {
  return {
    make: input.make,
    maskedVin: input.vinNormalized ? maskVin(input.vinNormalized) : null,
    model: input.model,
    records: input.serviceRecords.map((record) => ({
      id: record.id,
      lineDescriptions: record.lineDescriptions,
      mileage: record.mileage,
      nextServiceDate: record.nextServiceDate,
      nextServiceMileage: record.nextServiceMileage,
      serviceDate: record.serviceDate,
    })),
    year: input.year,
  };
}
