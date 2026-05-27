import { NotificationStatus } from "@prisma/client";
import { z } from "zod";

export const updateNotificationStatusSchema = z.object({
  notificationId: z.string().cuid(),
  locale: z.enum(["az", "ru", "en"]),
  shopId: z.string().cuid(),
  status: z.enum([NotificationStatus.SENT, NotificationStatus.READ]),
});

export type UpdateNotificationStatusInput = z.infer<typeof updateNotificationStatusSchema>;
