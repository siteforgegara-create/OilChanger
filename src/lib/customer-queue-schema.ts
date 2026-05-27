import { z } from "zod";

const optionalMileage = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.coerce.number().int().min(0).max(2_000_000).optional(),
);

export const addExistingCustomerVehicleToQueueSchema = z.object({
  customerVehicleId: z.string().cuid(),
  locale: z.enum(["az", "ru", "en"]),
  mileage: optionalMileage,
  shopId: z.string().cuid(),
});

export const createCustomerReminderSchema = z.object({
  customerVehicleId: z.string().cuid(),
  locale: z.enum(["az", "ru", "en"]),
  shopId: z.string().cuid(),
});

export type AddExistingCustomerVehicleToQueueInput = z.infer<typeof addExistingCustomerVehicleToQueueSchema>;
export type CreateCustomerReminderInput = z.infer<typeof createCustomerReminderSchema>;
