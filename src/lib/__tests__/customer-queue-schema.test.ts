import { describe, expect, it } from "vitest";
import { addExistingCustomerVehicleToQueueSchema, createCustomerReminderSchema } from "@/lib/customer-queue-schema";

describe("addExistingCustomerVehicleToQueueSchema", () => {
  it("accepts an existing customer vehicle queue request", () => {
    const result = addExistingCustomerVehicleToQueueSchema.safeParse({
      customerVehicleId: "cmabc12345678901234567890",
      locale: "ru",
      mileage: "120000",
      shopId: "cmshop12345678901234567890",
    });

    expect(result.success).toBe(true);
  });

  it("allows empty mileage", () => {
    const result = addExistingCustomerVehicleToQueueSchema.safeParse({
      customerVehicleId: "cmabc12345678901234567890",
      locale: "az",
      mileage: "",
      shopId: "cmshop12345678901234567890",
    });

    expect(result.success).toBe(true);
  });

  it("rejects negative mileage", () => {
    const result = addExistingCustomerVehicleToQueueSchema.safeParse({
      customerVehicleId: "cmabc12345678901234567890",
      locale: "en",
      mileage: "-1",
      shopId: "cmshop12345678901234567890",
    });

    expect(result.success).toBe(false);
  });

  it("accepts a valid customer reminder payload", () => {
    const result = createCustomerReminderSchema.safeParse({
      customerVehicleId: "cmabc12345678901234567890",
      locale: "ru",
      shopId: "cmshop12345678901234567890",
    });

    expect(result.success).toBe(true);
  });
});
