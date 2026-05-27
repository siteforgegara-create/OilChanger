import { z } from "zod";

export const registerShopSchema = z
  .object({
    shopName: z.string().trim().min(2).max(120),
    ownerName: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(254),
    password: z.string().min(8).max(128),
    confirmPassword: z.string().min(8).max(128),
    countryCode: z.literal("AZ"),
    logoUrl: z.string().url().max(2048).optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "passwords_do_not_match",
  });

export type RegisterShopInput = z.infer<typeof registerShopSchema>;
