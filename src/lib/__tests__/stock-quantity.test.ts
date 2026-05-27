import { describe, expect, it } from "vitest";
import { calculateQuantityLineTotalMinor, parseQuantityToThousandths } from "@/lib/stock-quantity";

describe("stock quantity helpers", () => {
  it("parses integer and decimal quantities to thousandths", () => {
    expect(parseQuantityToThousandths("4")).toBe(4000);
    expect(parseQuantityToThousandths("4.5")).toBe(4500);
    expect(parseQuantityToThousandths("4,125")).toBe(4125);
  });

  it("rejects invalid quantities", () => {
    expect(() => parseQuantityToThousandths("-1")).toThrow();
    expect(() => parseQuantityToThousandths("1.1234")).toThrow();
    expect(() => parseQuantityToThousandths("abc")).toThrow();
  });

  it("calculates product line totals in minor units", () => {
    expect(calculateQuantityLineTotalMinor(1250, 4000)).toBe(5000);
    expect(calculateQuantityLineTotalMinor(999, 1500)).toBe(1499);
  });
});
