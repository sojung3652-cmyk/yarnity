import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { dots, gauge, HOOKS, plan, type PlanInput } from "@/lib/pattern";
import { drawing } from "@/lib/drawing";

// Verbatim copy of the prototype engine (see header of that file).
const legacy = createRequire(import.meta.url)("./legacy-engine.js");

describe("documented examples", () => {
  it("circle 15cm, 5호, medium -> 13 rounds, last round 78 stitches", () => {
    const pp = plan({ shape: "circle", a: 15, hook: "5호", weight: "medium", object: "coaster" });
    expect(pp.bottomRounds).toBe(13);
    expect(pp.last).toBe(78);
    expect(pp.rows[0].how).toBe("매직링에 짧은뜨기 6코");
    expect(pp.rows.map(r => r.n).slice(0, 6)).toEqual([6, 12, 18, 24, 30, 36]);
  });

  it("default draft (bag, circle 15cm, h 15cm, short handle) matches prototype", () => {
    const pp = plan({ shape: "circle", a: 15, b: 10, h: 15, hook: "5호", weight: "medium", object: "bag", handle: "short" });
    expect(pp.bottomRounds).toBe(13);
    expect(pp.bodyRows).toBe(25);
    expect(pp.rows.length).toBe(13 + 25 + 2 + 2);
  });

  it("gauge: 5호 x medium = 0.6cm stitch height", () => {
    expect(gauge({ shape: "circle", a: 15, hook: "5호", weight: "medium", object: "coaster" }).h).toBeCloseTo(0.6, 10);
  });
});

describe("identical to the prototype engine", () => {
  const shapes = ["circle", "oval", "rect"] as const;
  const objects = ["coaster", "bag"] as const;
  const weights = ["thin", "medium", "thick"] as const;
  const handles = ["short", "long", "none"] as const;
  const sizes: [number, number][] = [[4, 4], [7.5, 5], [10, 6], [15, 10], [22.5, 14.5], [40, 30]];
  const heights = [2, 9.5, 15, 40];
  const measured = [null, 0.42, 0.6, 0.83];

  const cases: PlanInput[] = [];
  for (const shape of shapes) for (const object of objects) for (const [hook] of HOOKS) for (const weight of weights)
    for (const [a, b] of sizes) for (const m of measured) {
      if (object === "coaster") cases.push({ shape, object, hook, weight, a, b, h: 15, handle: "short", measuredH: m });
      else for (const h of heights) for (const handle of handles) cases.push({ shape, object, hook, weight, a, b, h, handle, measuredH: m });
    }

  it(`plan() deep-equals the original for ${cases.length} inputs`, () => {
    for (const c of cases) expect(plan(c), JSON.stringify(c)).toEqual(legacy.plan({ ...c }));
  }, 30_000); // large sweep: allow for a busy machine

  it("dots() (stitch map + increase marks) deep-equals the original", () => {
    for (const c of cases.filter((_, i) => i % 7 === 0)) {
      const pp = plan(c), lp = legacy.plan({ ...c });
      expect(dots(pp, c.shape, pp.bottomRounds), JSON.stringify(c)).toEqual(legacy.dots(lp, c.shape, lp.bottomRounds));
    }
  }, 30_000);
});

describe("drawing", () => {
  it("bag drawing shows height and body rows", () => {
    const p = { shape: "circle", a: 15, b: 10, h: 15, hook: "5호", weight: "medium", object: "bag", handle: "short" } as const;
    const svg = drawing(p, plan(p));
    expect(svg).toContain("높이 15cm · 몸통 25단");
    expect(svg).toContain('viewBox="0 0 360 176"');
  });
});

describe("bag options (widening body, flap, handle length)", () => {
  const base = { object: "bag" as const, shape: "circle" as const, a: 15, h: 15, hook: "5호", weight: "medium", handle: "short" as const };
  it("a wider opening adds stitches evenly up to the opening's size", () => {
    const pp = plan({ ...base, topA: 20 }), body = pp.rows.filter(r => r.part === "body");
    expect(body[0].n).toBe(pp.last);
    expect(body[body.length - 1].n).toBe(Math.round(pp.last * 20 / 15));
    body.slice(1).forEach((r, i) => expect(r.n - body[i].n).toBe(r.inc));
    expect(pp.rows.find(r => r.part === "rim")!.n).toBe(body[body.length - 1].n);
  });
  it("no opening size = the straight body as before", () => {
    expect(plan({ ...base, topA: 15 })).toEqual(plan(base));
  });
  it("a flap is worked back and forth over half the opening", () => {
    const pp = plan({ ...base, flapCm: 9 }), flap = pp.rows.filter(r => r.part === "flap");
    expect(flap.length).toBe(15);
    expect(flap[0].n).toBe(Math.round(pp.last / 2) - 2);
    expect(flap[0].label).toBe("덮개 1");
  });
  it("handleCm sets the handle chain", () => {
    const pp = plan({ ...base, handleCm: 120 }), g = pp.g;
    expect(pp.rows.find(r => r.part === "handle")!.n).toBe(Math.round(120 / (g.w * 0.85)));
  });
});
