import { describe, expect, it } from "vitest";
import { queueEntrySchema } from "@/lib/queue-entry-schema";

const baseInput = {
  shopId: "cm00000000000000000000000",
  locale: "ru",
  make: "Toyota",
  model: "Prius",
  mileage: 120000,
};

describe("queueEntrySchema", () => {
  it("accepts vehicle data with a plate", () => {
    expect(
      queueEntrySchema.safeParse({
        ...baseInput,
        plateNumber: "10-AA-123",
      }).success,
    ).toBe(true);
  });

  it("accepts vehicle data with a VIN", () => {
    expect(
      queueEntrySchema.safeParse({
        ...baseInput,
        vin: "JTDKB20U777777777",
      }).success,
    ).toBe(true);
  });

  it("rejects entries without plate and VIN", () => {
    expect(queueEntrySchema.safeParse(baseInput).success).toBe(false);
  });
});
