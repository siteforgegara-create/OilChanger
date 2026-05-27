import type { Prisma, PrismaClient } from "@prisma/client";
import { calculateAiBudgetStatus, currentAiUsageMonth } from "@/lib/ai-usage";

export type AiUsageRecord = {
  id: string;
};

export type AiUsageStore = {
  createUsage(input: {
    estimatedCostMinorUsd: number;
    month: string;
    purpose: string;
    shopId: string;
    tenantId: string;
    userId: string;
  }): Promise<AiUsageRecord>;
  sumTenantUsage(input: {
    month: string;
    tenantId: string;
  }): Promise<number>;
};

export type RecordAiUsageInput = {
  estimatedCostMinorUsd: number;
  limitMinorUsd: number;
  month?: string;
  purpose: string;
  shopId: string;
  tenantId: string;
  userId: string;
};

export class AiUsageLimitExceededError extends Error {
  constructor() {
    super("AI monthly usage limit exceeded");
    this.name = "AiUsageLimitExceededError";
  }
}

export async function recordAiUsage(input: RecordAiUsageInput, store: AiUsageStore): Promise<AiUsageRecord> {
  assertMinorUnits(input.estimatedCostMinorUsd, "estimatedCostMinorUsd");
  assertMinorUnits(input.limitMinorUsd, "limitMinorUsd");

  const month = input.month ?? currentAiUsageMonth();
  const usedMinorUsd = await store.sumTenantUsage({
    month,
    tenantId: input.tenantId,
  });
  const budget = calculateAiBudgetStatus({
    estimatedRequestCostMinorUsd: input.estimatedCostMinorUsd,
    limitMinorUsd: input.limitMinorUsd,
    usedMinorUsd,
  });

  if (!budget.canSpendEstimatedRequest) {
    throw new AiUsageLimitExceededError();
  }

  return store.createUsage({
    estimatedCostMinorUsd: input.estimatedCostMinorUsd,
    month,
    purpose: input.purpose,
    shopId: input.shopId,
    tenantId: input.tenantId,
    userId: input.userId,
  });
}

export function createPrismaAiUsageStore(client: PrismaClient | Prisma.TransactionClient): AiUsageStore {
  return {
    async createUsage(input) {
      const created = await client.aiUsage.create({
        data: input,
        select: {
          id: true,
        },
      });

      return created;
    },
    async sumTenantUsage(input) {
      const result = await client.aiUsage.aggregate({
        where: {
          month: input.month,
          tenantId: input.tenantId,
        },
        _sum: {
          estimatedCostMinorUsd: true,
        },
      });

      return result._sum.estimatedCostMinorUsd ?? 0;
    },
  };
}

function assertMinorUnits(value: number, fieldName: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${fieldName} must be a non-negative integer minor-unit value`);
  }
}
