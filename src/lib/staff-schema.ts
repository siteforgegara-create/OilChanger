import { z } from "zod";

export const createStaffSchema = z
  .object({
    shopId: z.string().min(1),
    locale: z.enum(["az", "ru", "en"]),
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(254),
    password: z.string().min(8).max(128),
    confirmPassword: z.string().min(8).max(128),
    role: z.enum(["BRANCH_ADMIN", "MECHANIC"]),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "passwords_do_not_match",
  });

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
