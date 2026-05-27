import { FluidType, RecommendationPriority } from "@prisma/client";
import { z } from "zod";

const optionalCleanString = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : undefined))
  .optional();

const optionalYear = z
  .string()
  .trim()
  .regex(/^\d{4}$/)
  .transform(Number)
  .optional()
  .or(z.literal("").transform(() => undefined));

const optionalPositiveInteger = z
  .string()
  .trim()
  .regex(/^\d+$/)
  .transform(Number)
  .optional()
  .or(z.literal("").transform(() => undefined));

const decimalString = z.string().trim().regex(/^\d+(\.\d{1,2})?$/);

export const vehicleCatalogSchema = z
  .object({
    locale: z.enum(["az", "ru", "en"]),
    shopId: z.string().cuid(),
    make: z.string().trim().min(2).max(80),
    model: z.string().trim().min(1).max(100),
    generation: optionalCleanString,
    yearFrom: optionalYear,
    yearTo: optionalYear,
    engineCode: optionalCleanString,
    engineVolume: decimalString.optional().or(z.literal("")),
    fuelType: optionalCleanString,
    transmission: optionalCleanString,
    bodyType: optionalCleanString,
  })
  .refine((data) => !data.yearFrom || !data.yearTo || data.yearFrom <= data.yearTo, {
    path: ["yearTo"],
    message: "year_range_invalid",
  });

export const vehicleCatalogRecommendationSchema = z.object({
  locale: z.enum(["az", "ru", "en"]),
  shopId: z.string().cuid(),
  catalogId: z.string().cuid(),
  fluidType: z.nativeEnum(FluidType),
  viscosity: z.string().trim().min(2).max(40),
  specification: optionalCleanString,
  volumeLiters: decimalString,
  intervalKm: optionalPositiveInteger,
  intervalMonths: optionalPositiveInteger,
  priority: z.nativeEnum(RecommendationPriority),
});

export const vehicleCatalogLinkSchema = z.object({
  locale: z.enum(["az", "ru", "en"]),
  orderId: z.string().cuid(),
  catalogId: z.string().cuid(),
});

export type VehicleCatalogInput = z.infer<typeof vehicleCatalogSchema>;
export type VehicleCatalogRecommendationInput = z.infer<typeof vehicleCatalogRecommendationSchema>;
export type VehicleCatalogLinkInput = z.infer<typeof vehicleCatalogLinkSchema>;
