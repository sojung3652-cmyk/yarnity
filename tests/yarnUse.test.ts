import { describe, expect, it } from "vitest";
import { plan } from "../lib/pattern";
import { mPer100gFromMm, yarnUse } from "../lib/yarnUse";

const bag = plan({ object: "bag", shape: "circle", a: 15, h: 15, hook: "5호", weight: "medium", handle: "short" });

describe("yarnUse", () => {
  it("adds up every stitch with a 10% margin", () => {
    const w = bag.g.w;
    const cm = bag.rows.reduce((s, r) => s + r.n * (r.part === "handle" ? 6.1 : 4.5) * w, 0);
    expect(yarnUse(bag, { weight: "medium" }).m).toBe(Math.ceil((cm / 100) * 1.1));
  });
  it("a small bag in medium yarn comes out at tens of grams, not thousands", () => {
    const u = yarnUse(bag, { weight: "medium" });
    expect(u.g).toBeGreaterThan(20);
    expect(u.g).toBeLessThan(120);
  });
  it("grams from the label when its numbers are a real yarn's, else from the thickness", () => {
    const u = yarnUse(bag, { weight: "medium" });
    expect(u.basis).toBe("level");
    expect(u.g).toBe(Math.ceil(u.m / 200 * 100));
    const l = yarnUse(bag, { weight: "medium", skeinG: 50, skeinM: 80 });
    expect([l.basis, l.per100, l.g]).toEqual(["label", 160, Math.ceil(u.m / 160 * 100)]);
    const mm = yarnUse(bag, { weight: "medium", yarnMode: "mm", yarnMm: 3 });
    expect([mm.basis, mm.per100]).toEqual(["mm", 200]);
  });
  it("label numbers no yarn has (a typo, fields swapped) are left out and flagged", () => {
    const odd = yarnUse(bag, { weight: "medium", skeinG: 100, skeinM: 2 }); // 2m per 100g
    expect(odd.labelOdd).toBe(true);
    expect(odd.basis).toBe("level");
    expect(odd.g).toBeLessThan(120);
    expect(odd.skeins).toBeNull();
  });
  it("skeins needed and a warning when fewer are on hand", () => {
    const u = yarnUse(bag, { weight: "medium", skeinG: 50, skeinM: 80, skeins: 1 });
    expect(u.skeins).toBe(Math.ceil(u.m / 80));
    expect(u.short).toBe(u.skeins! > 1);
    expect(yarnUse(bag, { weight: "medium" }).skeins).toBeNull();
  });
  it("splits the length over the colours", () => {
    expect(yarnUse(bag, { weight: "medium", colors: 2 }).perColor).toBe(Math.ceil(yarnUse(bag, { weight: "medium" }).m / 2));
  });
  it("length per 100g falls as the yarn gets thicker", () => {
    expect(mPer100gFromMm(2)).toBe(400);
    expect(mPer100gFromMm(3)).toBe(200);
    expect(mPer100gFromMm(2.5)).toBeGreaterThan(200);
    expect(mPer100gFromMm(2.5)).toBeLessThan(400);
  });
});
