import { z } from "zod";

export const createBranchSchema = z.object({
  locale: z.enum(["az", "ru", "en"]),
  name: z.string().trim().min(2).max(120),
  address: z.string().trim().max(240).optional(),
});

export const updateTenantSettingsSchema = z.object({
  locale: z.enum(["az", "ru", "en"]),
  name: z.string().trim().min(2).max(120),
});

export const updateBranchSettingsSchema = z.object({
  locale: z.enum(["az", "ru", "en"]),
  shopId: z.string().cuid(),
  name: z.string().trim().min(2).max(120),
  address: z.string().trim().max(240).optional(),
  lat: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.coerce.number().min(-90).max(90).optional(),
  ),
  lng: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.coerce.number().min(-180).max(180).optional(),
  ),
});

export type CreateBranchInput = z.infer<typeof createBranchSchema>;
export type UpdateBranchSettingsInput = z.infer<typeof updateBranchSettingsSchema>;
export type UpdateTenantSettingsInput = z.infer<typeof updateTenantSettingsSchema>;
