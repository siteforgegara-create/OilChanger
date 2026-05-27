import { z } from "zod";

const positiveMoneyString = z
  .string()
  .trim()
  .regex(/^\d+([.,]\d{1,2})?$/)
  .refine((value) => Number(value.replace(",", ".")) > 0);

export const createExpenseSchema = z.object({
  amount: positiveMoneyString,
  category: z.string().trim().min(2).max(80),
  comment: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(160).optional(),
  ),
  locale: z.enum(["az", "ru", "en"]),
  shopId: z.string().cuid(),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
