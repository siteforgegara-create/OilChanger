import type { ReviewStatus } from "@prisma/client";

export type PlatformReviewDecision = "APPROVED" | "REJECTED";
export type PlatformReviewEntity = "VehicleCatalog" | "VehicleCatalogOverride";

const REVIEWABLE_STATUSES: readonly ReviewStatus[] = ["PENDING"];

export function canReviewStatus(status: ReviewStatus): boolean {
  return REVIEWABLE_STATUSES.includes(status);
}

export function canMergeCatalogStatus(status: ReviewStatus): boolean {
  return status !== "MERGED";
}

export function platformReviewNotificationKeys(entity: PlatformReviewEntity, decision: PlatformReviewDecision) {
  const entityKey = entity === "VehicleCatalog" ? "catalog" : "override";
  const decisionKey = decision === "APPROVED" ? "approved" : "rejected";

  return {
    titleKey: `notification.platformReview.${entityKey}.${decisionKey}.title`,
    bodyKey: `notification.platformReview.${entityKey}.${decisionKey}.body`,
  };
}

export function platformCatalogMergeNotificationKeys() {
  return {
    titleKey: "notification.platformReview.catalog.merged.title",
    bodyKey: "notification.platformReview.catalog.merged.body",
  };
}
