import { describe, expect, it } from "vitest";
import { calculateDimensions, getSavingsPercent } from "./image";

describe("calculateDimensions", () => {
  it("keeps small images unchanged", () => {
    expect(calculateDimensions(1200, 800, 1920)).toEqual({
      width: 1200,
      height: 800,
    });
  });

  it("resizes landscape and portrait images proportionally", () => {
    expect(calculateDimensions(4000, 3000, 2000)).toEqual({
      width: 2000,
      height: 1500,
    });
    expect(calculateDimensions(2000, 4000, 1000)).toEqual({
      width: 500,
      height: 1000,
    });
  });
});

describe("getSavingsPercent", () => {
  it("reports positive savings and output growth", () => {
    expect(getSavingsPercent(1000, 650)).toBe(35);
    expect(getSavingsPercent(1000, 1100)).toBe(-10);
    expect(getSavingsPercent(0, 0)).toBe(0);
  });
});
