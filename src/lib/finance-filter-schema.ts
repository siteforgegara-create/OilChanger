import { z } from "zod";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const financeFilterSchema = z
  .object({
    dateFrom: dateString.optional(),
    dateTo: dateString.optional(),
    locale: z.enum(["az", "ru", "en"]),
    shopId: z.string().cuid().or(z.literal("all")).optional(),
  })
  .refine(
    (value) => {
      if (!value.dateFrom || !value.dateTo) {
        return true;
      }

      return value.dateFrom <= value.dateTo;
    },
    {
      path: ["dateTo"],
    },
  );

export type FinanceFilterInput = z.infer<typeof financeFilterSchema>;
