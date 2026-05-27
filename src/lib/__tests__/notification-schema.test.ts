import { describe, expect, it } from "vitest";
import { updateNotificationStatusSchema } from "@/lib/notification-schema";

describe("updateNotificationStatusSchema", () => {
  it("accepts SENT and READ status updates", () => {
    expect(
      updateNotificationStatusSchema.safeParse({
        notificationId: "cmabc12345678901234567890",
        locale: "ru",
        shopId: "cmshop12345678901234567890",
        status: "SENT",
      }).success,
    ).toBe(true);

    expect(
      updateNotificationStatusSchema.safeParse({
        notificationId: "cmabc12345678901234567890",
        locale: "az",
        shopId: "cmshop12345678901234567890",
        status: "READ",
      }).success,
    ).toBe(true);
  });

  it("rejects invalid target status", () => {
    const result = updateNotificationStatusSchema.safeParse({
      notificationId: "cmabc12345678901234567890",
      locale: "en",
      shopId: "cmshop12345678901234567890",
      status: "FAILED",
    });

    expect(result.success).toBe(false);
  });
});
