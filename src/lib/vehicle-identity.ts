const NON_ALPHANUMERIC = /[^a-z0-9]/gi;

export function normalizeVin(value: string): string {
  return value.replace(NON_ALPHANUMERIC, "").toUpperCase();
}

export function normalizePlate(value: string): string {
  return value.replace(NON_ALPHANUMERIC, "").toUpperCase();
}

export function maskVin(value: string): string {
  const normalized = normalizeVin(value);

  if (normalized.length <= 6) {
    return normalized.replace(/.(?=.{2})/g, "*");
  }

  return `${normalized.slice(0, 3)}${"*".repeat(Math.max(0, normalized.length - 6))}${normalized.slice(-3)}`;
}
