import { describe, expect, it } from "vitest";
import { platformReviewNotificationChannels, userVisibleNotificationChannel } from "@/lib/notification-delivery";

describe("notification delivery", () => {
  it("queues platform review notifications for in-app and email delivery", () => {
    expect(platformReviewNotificationChannels()).toEqual(["IN_APP", "EMAIL"]);
  });

  it("keeps user-facing notification lists scoped to in-app delivery", () => {
    expect(userVisibleNotificationChannel()).toBe("IN_APP");
  });
});
