import { ProductCategory, Unit } from "@prisma/client";
import { z } from "zod";

const optionalCleanString = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : undefined))
  .optional();

const positiveDecimalString = z.string().trim().regex(/^\d+(\.\d{1,3})?$/);
const moneyString = z.string().trim().regex(/^\d+([,.]\d{1,2})?$/);

export const inventoryProductSchema = z.object({
  shopId: z.string().cuid(),
  locale: z.enum(["az", "ru", "en"]),
  category: z.nativeEnum(ProductCategory),
  name: z.string().trim().min(2).max(120),
  brand: optionalCleanString,
  viscosity: optionalCleanString,
  specification: optionalCleanString,
  baseUnit: z.nativeEnum(Unit),
  quantity: positiveDecimalString,
  minQuantity: positiveDecimalString,
  purchasePrice: moneyString,
  salePrice: moneyString,
  servicePrice: moneyString,
  suggestedDiscount: moneyString.optional().or(z.literal("")),
});

export type InventoryProductInput = z.infer<typeof inventoryProductSchema>;
