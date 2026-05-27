import { describe, expect, it } from "vitest";
import { canMergeCatalogStatus, canReviewStatus, platformCatalogMergeNotificationKeys, platformReviewNotificationKeys } from "@/lib/platform-admin-review";

describe("platform admin review helpers", () => {
  it("allows review only for pending shared records", () => {
    expect(canReviewStatus("PENDING")).toBe(true);
    expect(canReviewStatus("APPROVED")).toBe(false);
    expect(canReviewStatus("REJECTED")).toBe(false);
    expect(canReviewStatus("MERGED")).toBe(false);
  });

  it("builds catalog notification keys for the shop", () => {
    expect(platformReviewNotificationKeys("VehicleCatalog", "APPROVED")).toEqual({
      titleKey: "notification.platformReview.catalog.approved.title",
      bodyKey: "notification.platformReview.catalog.approved.body",
    });
  });

  it("builds override notification keys for the shop", () => {
    expect(platformReviewNotificationKeys("VehicleCatalogOverride", "REJECTED")).toEqual({
      titleKey: "notification.platformReview.override.rejected.title",
      bodyKey: "notification.platformReview.override.rejected.body",
    });
  });

  it("allows catalog merge unless the record is already merged", () => {
    expect(canMergeCatalogStatus("PENDING")).toBe(true);
    expect(canMergeCatalogStatus("APPROVED")).toBe(true);
    expect(canMergeCatalogStatus("REJECTED")).toBe(true);
    expect(canMergeCatalogStatus("MERGED")).toBe(false);
  });

  it("builds catalog merge notification keys", () => {
    expect(platformCatalogMergeNotificationKeys()).toEqual({
      titleKey: "notification.platformReview.catalog.merged.title",
      bodyKey: "notification.platformReview.catalog.merged.body",
    });
  });
});
