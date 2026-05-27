import { describe, expect, it } from "vitest";
import { addMinorUnits, calculateDiscountMinor, formatMoneyMinor, parseMoneyToMinor } from "@/lib/money";

describe("money helpers", () => {
  it("adds integer minor units without using floating point storage", () => {
    expect(addMinorUnits([1250, 275, 30])).toBe(1555);
  });

  it("rounds percentage discounts down", () => {
    expect(calculateDiscountMinor(999, { type: "PERCENT", basisPoints: 1250 })).toBe(124);
  });

  it("caps fixed discounts at the subtotal", () => {
    expect(calculateDiscountMinor(500, { type: "FIXED", amountMinor: 700 })).toBe(500);
  });

  it("formats AZN at display boundary only", () => {
    expect(formatMoneyMinor(12575, "AZN", "az")).toContain("125,75");
  });

  it("parses decimal money input into integer minor units", () => {
    expect(parseMoneyToMinor("12.50")).toBe(1250);
    expect(parseMoneyToMinor("12,5")).toBe(1250);
    expect(parseMoneyToMinor("12")).toBe(1200);
  });
});
