export type AiBudgetStatus = {
  canSpendEstimatedRequest: boolean;
  limitMinorUsd: number;
  remainingMinorUsd: number;
  usedMinorUsd: number;
};

export function currentAiUsageMonth(now = new Date()): string {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

export function calculateAiBudgetStatus(input: {
  estimatedRequestCostMinorUsd: number;
  limitMinorUsd: number;
  usedMinorUsd: number;
}): AiBudgetStatus {
  assertMinorUnits(input.estimatedRequestCostMinorUsd, "estimatedRequestCostMinorUsd");
  assertMinorUnits(input.limitMinorUsd, "limitMinorUsd");
  assertMinorUnits(input.usedMinorUsd, "usedMinorUsd");

  const remainingMinorUsd = Math.max(0, input.limitMinorUsd - input.usedMinorUsd);

  return {
    canSpendEstimatedRequest: remainingMinorUsd >= input.estimatedRequestCostMinorUsd,
    limitMinorUsd: input.limitMinorUsd,
    remainingMinorUsd,
    usedMinorUsd: input.usedMinorUsd,
  };
}

function assertMinorUnits(value: number, fieldName: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${fieldName} must be a non-negative integer minor-unit value`);
  }
}
