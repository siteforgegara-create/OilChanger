import { describe, expect, it } from "vitest";
import { pickServiceRecommendation } from "@/lib/service-recommendation";

describe("pickServiceRecommendation", () => {
  it("prefers approved recommended platform data", () => {
    expect(
      pickServiceRecommendation([
        {
          intervalKm: 7000,
          intervalMonths: 4,
          priority: "ALTERNATIVE",
          source: "SHOP",
          status: "APPROVED",
        },
        {
          intervalKm: 8000,
          intervalMonths: 6,
          priority: "RECOMMENDED",
          source: "PLATFORM",
          status: "APPROVED",
        },
      ]),
    ).toEqual({
      intervalKm: 8000,
      intervalMonths: 6,
      priority: "RECOMMENDED",
      source: "PLATFORM",
      status: "APPROVED",
    });
  });

  it("uses pending data when approved data is absent", () => {
    expect(
      pickServiceRecommendation([
        {
          intervalKm: 9000,
          intervalMonths: null,
          priority: "RECOMMENDED",
          source: "AI",
          status: "PENDING",
        },
      ])?.intervalKm,
    ).toBe(9000);
  });

  it("ignores rejected recommendations and entries without intervals", () => {
    expect(
      pickServiceRecommendation([
        {
          intervalKm: 10_000,
          intervalMonths: 6,
          priority: "RECOMMENDED",
          source: "PLATFORM",
          status: "REJECTED",
        },
        {
          intervalKm: null,
          intervalMonths: null,
          priority: "RECOMMENDED",
          source: "SHOP",
          status: "APPROVED",
        },
      ]),
    ).toBeNull();
  });
});
