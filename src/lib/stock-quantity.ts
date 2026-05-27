import { assertMinorUnits } from "@/lib/money";

const QUANTITY_SCALE = 1000;

export function parseQuantityToThousandths(value: string): number {
  const normalized = value.trim().replace(",", ".");

  if (!/^\d+(\.\d{1,3})?$/.test(normalized)) {
    throw new Error("quantity must have up to three decimal places");
  }

  const [whole, fractional = ""] = normalized.split(".");
  return Number(whole) * QUANTITY_SCALE + Number(fractional.padEnd(3, "0"));
}

export function formatQuantityFromDecimal(value: { toString(): string }): string {
  return value.toString();
}

export function calculateQuantityLineTotalMinor(unitPriceMinor: number, quantityThousandths: number): number {
  assertMinorUnits(unitPriceMinor, "unitPriceMinor");

  if (!Number.isInteger(quantityThousandths) || quantityThousandths < 0) {
    throw new Error("quantityThousandths must be a non-negative integer");
  }

  return Math.round((unitPriceMinor * quantityThousandths) / QUANTITY_SCALE);
}
