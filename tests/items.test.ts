import { describe, expect, it } from "vitest";
import { engineDims, ENGINE, fieldsFor, ITEM, ITEMS, itemIdOf } from "@/lib/items";
import { gauge, plan, planRows, planTube, type PlanInput } from "@/lib/pattern";

const base = { hook: "5호", weight: "medium" } as const;
function inputFor(id: keyof typeof ITEM): PlanInput {
  const it = ITEM[id], d = it.defaults, shape = d.shape ?? "rect";
  const e = engineDims(it, { shape, a: d.a, b: d.b ?? d.a, h: d.h ?? 0, circ: d.circ, depth: d.depth });
  return { ...base, ...e, object: ENGINE[it.kind], handle: d.handle ?? "none" };
}

describe("existing results unchanged", () => {
  it("mini bag, circle 15cm, 5호, medium -> 13 rounds, last round 78", () => {
    const pp = plan(inputFor("minibag"));
    expect(pp.bottomRounds).toBe(13);
    expect(pp.last).toBe(78);
  });
});

describe("all 19 items build a pattern from their defaults", () => {
  it.each(ITEMS.map(i => i.id))("%s", id => {
    const pp = plan(inputFor(id));
    expect(pp.rows.length).toBeGreaterThan(1);
    for (const r of pp.rows) { expect(Number.isFinite(r.n)).toBe(true); expect(r.n).toBeGreaterThan(0); expect(r.label).toBeTruthy(); }
    expect(fieldsFor(ITEM[id], ITEM[id].defaults.shape ?? "rect").length).toBeGreaterThan(0);
  });
});

describe("flat rows (scarf)", () => {
  it("width 18cm, 5호, medium: stitches = round(18 / 0.57) = 32, chain 33, rows = round(150 / 0.6) = 250", () => {
    const g = gauge({ ...base, shape: "rect", a: 18, object: "rows" });
    expect(g.h).toBeCloseTo(0.6, 6); expect(g.w).toBeCloseTo(0.57, 6);
    const pp = planRows({ ...base, shape: "rect", a: 18, b: 150, object: "rows" });
    expect(pp.rows[0]).toMatchObject({ part: "start", n: 33, how: "사슬 33코" });
    expect(pp.rows[1]).toMatchObject({ part: "rows", n: 32, how: "두 번째 사슬부터 짧은뜨기 32코", label: "1단" });
    expect(pp.rows[2].how).toBe("사슬 1, 뒤집어서 짧은뜨기 32코");
    expect(pp.bodyRows).toBe(250);
    expect(pp.rows.length).toBe(251);
  });
  it("a measurement changes the rows, never the stitch count", () => {
    const pp = planRows({ ...base, shape: "rect", a: 18, b: 150, object: "rows", measuredH: 0.75, measuredW: 0.6 });
    expect(pp.last).toBe(32);
    expect(pp.bodyRows).toBe(200); // 150 / 0.75
  });
});

describe("tube (neck warmer)", () => {
  it("circumference 60cm: chain round(60 / 0.57) = 105, rounds round(25 / 0.6) = 42", () => {
    const pp = planTube({ ...base, shape: "circle", a: 60, h: 25, object: "tube" });
    expect(pp.rows[0]).toMatchObject({ part: "start", n: 105 });
    expect(pp.rows[0].how).toContain("빼뜨기로 고리 연결");
    expect(pp.bodyRows).toBe(42);
    expect(pp.rows.every(r => r.n === 105)).toBe(true);
  });
});

describe("beanie conversion", () => {
  it("crown diameter = 56 / pi x 0.95, body = depth - crown radius", () => {
    const e = engineDims(ITEM.beanie, { shape: "circle", a: 0, b: 0, h: 0, circ: 56, depth: 20 });
    expect(e.a).toBeCloseTo(16.9, 1);
    expect(e.h).toBeCloseTo(20 - 16.9 / 2, 1);
  });
});

describe("old saved works", () => {
  it("map to the mini bag / coaster", () => {
    expect(itemIdOf({ object: "bag" })).toBe("minibag");
    expect(itemIdOf({ object: "coaster" })).toBe("coaster");
    expect(itemIdOf({ object: "rows", item: "scarf" })).toBe("scarf");
  });
});
