import type { NotificationChannel } from "@prisma/client";

export const PLATFORM_REVIEW_NOTIFICATION_CHANNELS: readonly NotificationChannel[] = ["IN_APP", "EMAIL"];
export const USER_VISIBLE_NOTIFICATION_CHANNEL: NotificationChannel = "IN_APP";

export function platformReviewNotificationChannels(): readonly NotificationChannel[] {
  return PLATFORM_REVIEW_NOTIFICATION_CHANNELS;
}

export function userVisibleNotificationChannel(): NotificationChannel {
  return USER_VISIBLE_NOTIFICATION_CHANNEL;
}
