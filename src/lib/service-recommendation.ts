export type ServiceRecommendationCandidate = {
  intervalKm: number | null;
  intervalMonths: number | null;
  priority: "RECOMMENDED" | "ALTERNATIVE";
  source: "PLATFORM" | "AI" | "SHOP";
  status: "PENDING" | "APPROVED" | "REJECTED" | "MERGED";
};

const STATUS_SCORE: Record<ServiceRecommendationCandidate["status"], number> = {
  APPROVED: 0,
  PENDING: 1,
  MERGED: 2,
  REJECTED: 3,
};

const PRIORITY_SCORE: Record<ServiceRecommendationCandidate["priority"], number> = {
  RECOMMENDED: 0,
  ALTERNATIVE: 1,
};

const SOURCE_SCORE: Record<ServiceRecommendationCandidate["source"], number> = {
  PLATFORM: 0,
  AI: 1,
  SHOP: 2,
};

export function pickServiceRecommendation(
  candidates: readonly ServiceRecommendationCandidate[],
): ServiceRecommendationCandidate | null {
  const eligible = candidates.filter(
    (candidate) =>
      (candidate.status === "APPROVED" || candidate.status === "PENDING") &&
      (candidate.intervalKm !== null || candidate.intervalMonths !== null),
  );

  return [...eligible].sort(compareRecommendations)[0] ?? null;
}

function compareRecommendations(
  left: ServiceRecommendationCandidate,
  right: ServiceRecommendationCandidate,
): number {
  return (
    STATUS_SCORE[left.status] - STATUS_SCORE[right.status] ||
    PRIORITY_SCORE[left.priority] - PRIORITY_SCORE[right.priority] ||
    SOURCE_SCORE[left.source] - SOURCE_SCORE[right.source]
  );
}
