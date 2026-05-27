export type CurrencyCode = "AZN" | "USD" | "EUR" | "TRY" | "GEL" | "KZT" | "UZS" | "RUB";

export type DiscountInput =
  | { type: "FIXED"; amountMinor: number }
  | { type: "PERCENT"; basisPoints: number };

export function assertMinorUnits(value: number, fieldName: string): void {
  if (!Number.isInteger(value)) {
    throw new Error(`${fieldName} must be an integer minor-unit value`);
  }

  if (value < 0) {
    throw new Error(`${fieldName} cannot be negative`);
  }
}

export function addMinorUnits(values: readonly number[]): number {
  return values.reduce((sum, value) => {
    assertMinorUnits(value, "money value");
    return sum + value;
  }, 0);
}

export function calculateDiscountMinor(subtotalMinor: number, discount: DiscountInput): number {
  assertMinorUnits(subtotalMinor, "subtotalMinor");

  if (discount.type === "FIXED") {
    assertMinorUnits(discount.amountMinor, "discount.amountMinor");
    return Math.min(subtotalMinor, discount.amountMinor);
  }

  if (!Number.isInteger(discount.basisPoints) || discount.basisPoints < 0 || discount.basisPoints > 10_000) {
    throw new Error("discount.basisPoints must be an integer from 0 to 10000");
  }

  return Math.floor((subtotalMinor * discount.basisPoints) / 10_000);
}

export function formatMoneyMinor(valueMinor: number, currency: CurrencyCode, locale: string): string {
  assertMinorUnits(valueMinor, "valueMinor");

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(valueMinor / 100);
}

export function parseMoneyToMinor(value: string): number {
  const normalized = value.trim().replace(",", ".");

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new Error("money value must have up to two decimal places");
  }

  const [major, minor = ""] = normalized.split(".");
  return Number(major) * 100 + Number(minor.padEnd(2, "0"));
}
