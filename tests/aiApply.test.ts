import { describe, expect, it } from "vitest";
import { proposalFrom } from "../lib/aiApply";
import { freshDraft } from "../lib/items";

describe("proposalFrom (AI suggestions -> draft)", () => {
  const d = freshDraft();
  it("a new item starts from its defaults; sizes inside its range are kept", () => {
    const p = proposalFrom({ item: "coaster", a: 12 }, d)!;
    expect(p.patch.item).toBe("coaster");
    expect(p.patch.itemPicked).toBe(true);
    expect(p.patch.a).toBe(12);
    expect(p.labels).toEqual(["품목 코스터", "지름 12cm"]);
  });
  it("drops what the app cannot make: unknown items, shapes, sizes out of range, bad colours", () => {
    expect(proposalFrom({ item: "sweater", shape: "star", a: 500, color: "red" }, d)).toBeNull();
    const p = proposalFrom({ item: "coaster", shape: "oval" }, d)!; // a coaster is round or square
    expect(p.patch.shape).toBe("circle"); // its default, not the oval asked for
    expect(p.labels).not.toContain("모양 타원");
  });
  it("bag options, yarn and hook", () => {
    const p = proposalFrom({ topA: 20, flapCm: 9, handleCm: 120, yarnMm: 3.2, hookMm: 3, colorName: "라벤더", color: "#C9B8E0" }, d)!;
    expect(p.patch).toMatchObject({ topA: 20, flapCm: 9, handle: "short", handleCm: 120, yarnMm: 3.2, yarnMode: "mm", hook: "5호", hookMm: 3, color: "#C9B8E0", colorName: "라벤더" });
    expect(p.labels).toContain("바늘 5호 · 3mm");
  });
  it("a wider opening must be wider than the bottom", () => {
    expect(proposalFrom({ topA: 10 }, d)).toBeNull(); // the mini bag's bottom is 15cm
  });
  it("nothing usable -> null", () => {
    expect(proposalFrom({}, d)).toBeNull();
    expect(proposalFrom(undefined, d)).toBeNull();
  });
});
