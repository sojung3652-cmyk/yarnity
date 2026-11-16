import { describe, expect, it } from "vitest";
import { plan } from "@/lib/pattern";
import { clean, hookYarnMismatch, parseNum, weightFromMm } from "@/lib/yarn";

describe("yarn mm -> level", () => {
  it("below 2.5 thin, 2.5-4 medium, above 4 thick", () => {
    expect(weightFromMm(2.4)).toBe("thin"); expect(weightFromMm(2.5)).toBe("medium");
    expect(weightFromMm(3.2)).toBe("medium"); expect(weightFromMm(4)).toBe("medium"); expect(weightFromMm(4.1)).toBe("thick");
  });
});
describe("inputs", () => {
  it("comma decimals, trimming, 40 chars", () => {
    expect(parseNum("3,2")).toBe(3.2); expect(parseNum(" 1.25 ")).toBe(1.25); expect(parseNum("a")).toBeNaN();
    expect(clean("  야크  ")).toBe("야크"); expect(clean("x".repeat(50)).length).toBe(40);
  });
});
describe("hook vs yarn", () => {
  it("warns below 0.6x / above 2.5x only", () => {
    expect(hookYarnMismatch(1.5, 3)).toBe("thin"); expect(hookYarnMismatch(3, 3)).toBeNull(); expect(hookYarnMismatch(8, 3)).toBe("thick"); expect(hookYarnMismatch(8, null)).toBeNull();
  });
});
describe("hook in mm", () => {
  const base = { shape: "circle", a: 15, b: 10, h: 15, weight: "medium", object: "bag", handle: "short" } as const;
  it("old works (size name only) and 5호 = 3.0mm give the same 13 / 78", () => {
    expect(plan({ ...base, hook: "5호" }).last).toBe(78);
    expect(plan({ ...base, hook: "5호", hookMm: 3.0 }).bottomRounds).toBe(13);
  });
  it("hookMm wins over the size name", () => {
    expect(plan({ ...base, hook: "5호", hookMm: 6 }).g.h).toBeCloseTo(1.2, 6);
  });
});
