import { PaymentMethod } from "@prisma/client";
import { z } from "zod";

const positiveDecimalString = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,3})?$/)
  .refine((value) => Number(value.replace(",", ".")) > 0);

export const createRetailSaleSchema = z.object({
  customerId: z.preprocess((value) => (value === "" ? undefined : value), z.string().cuid().optional()),
  locale: z.enum(["az", "ru", "en"]),
  paymentMethod: z.nativeEnum(PaymentMethod),
  quantity: positiveDecimalString,
  shopId: z.string().cuid(),
  stockId: z.string().cuid(),
});

export type CreateRetailSaleInput = z.infer<typeof createRetailSaleSchema>;
