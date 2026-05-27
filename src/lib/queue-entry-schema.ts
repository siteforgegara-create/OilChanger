import { z } from "zod";
import { normalizePlate, normalizeVin } from "@/lib/vehicle-identity";

const optionalCleanString = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : undefined))
  .optional();

const optionalInteger = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.coerce.number().int().optional(),
);

export const queueEntrySchema = z
  .object({
    shopId: z.string().cuid(),
    locale: z.enum(["az", "ru", "en"]),
    plateNumber: optionalCleanString,
    vin: optionalCleanString,
    make: z.string().trim().min(1).max(80),
    model: z.string().trim().min(1).max(80),
    year: optionalInteger.pipe(z.number().int().min(1950).max(2100).optional()),
    mileage: optionalInteger.pipe(z.number().int().min(0).max(2_000_000).optional()),
    customerName: optionalCleanString,
    customerPhone: optionalCleanString,
  })
  .superRefine((data, context) => {
    const normalizedPlate = data.plateNumber ? normalizePlate(data.plateNumber) : "";
    const normalizedVin = data.vin ? normalizeVin(data.vin) : "";

    if (!normalizedPlate && !normalizedVin) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["plateNumber"],
        message: "plate_or_vin_required",
      });
    }

    if (normalizedVin && normalizedVin.length < 6) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["vin"],
        message: "vin_too_short",
      });
    }
  });

export type QueueEntryInput = z.infer<typeof queueEntrySchema>;
