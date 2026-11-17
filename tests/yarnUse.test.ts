import { describe, expect, it } from "vitest";
import { plan } from "../lib/pattern";
import { yarnUse } from "../lib/yarnUse";

const bag = plan({ object: "bag", shape: "circle", a: 15, h: 15, hook: "5호", weight: "medium", handle: "short" });

describe("yarnUse", () => {
  it("adds up every stitch with a 10% margin", () => {
    const w = bag.g.w;
    const cm = bag.rows.reduce((s, r) => s + r.n * (r.part === "handle" ? 6.1 : 4.5) * w, 0);
    expect(yarnUse(bag, { weight: "medium" }).m).toBe(Math.ceil((cm / 100) * 1.1));
  });
  it("grams from the label's length per weight, else a typical one for the thickness", () => {
    const u = yarnUse(bag, { weight: "medium" });
    expect(u.g).toBe(Math.ceil(u.m / 200 * 100));
    expect(yarnUse(bag, { weight: "medium", skeinG: 50, skeinM: 80 }).g).toBe(Math.ceil(u.m / 160 * 100));
  });
  it("skeins needed and a warning when fewer are on hand", () => {
    const u = yarnUse(bag, { weight: "medium", skeinG: 50, skeinM: 80, skeins: 1 });
    expect(u.skeins).toBe(Math.ceil(u.m / 80));
    expect(u.short).toBe(u.skeins! > 1);
    expect(yarnUse(bag, { weight: "medium" }).skeins).toBeNull();
  });
  it("splits the length over the colours", () => {
    const u = yarnUse(bag, { weight: "medium", colors: 2 });
    expect(u.perColor).toBe(Math.ceil(u.m / 2));
  });
});
