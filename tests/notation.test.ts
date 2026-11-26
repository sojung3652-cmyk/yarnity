import { describe, expect, it } from "vitest";
import type { ChartKey } from "@/lib/crochetChart";
import { shownPlan } from "@/lib/knit";
import { countToks, evenToks, printToks, rowToks, withKorean } from "@/lib/koreanNotation";
import { HOOKS, plan, withChains, type PlanInput } from "@/lib/pattern";
import { phrased } from "@/lib/phrasing";
import { chartFromSteps, isKorean, koreanToSteps, readKorean } from "@/lib/stitchGrammar";

// 한국식 표기: every row the plan can write is read back (lib/stitchGrammar readKorean) and what it adds up to is
// checked against the count the formula gave the row - so "(18코)" is always what the row's pieces make.

/** one row checked: it reads, its pieces add up to its written count, and that count is the plan's */
function check(p: PlanInput) {
  const raw = plan(p), ko = withKorean(raw, p), plain = withChains(raw), tag = JSON.stringify(p);
  expect(ko.rows.length).toBe(raw.rows.length);
  ko.rows.forEach((r, i) => {
    // (a row's own number goes in front as patterns write it; 테두리 1, 손잡이 1 ... are this app's headings, not the row's words)
    const line = /^\d+단$/.test(r.label) ? `${r.label} ${r.how}` : r.how, read = readKorean(line), where = `${tag}\n${line}`;
    expect(read, where).not.toBeNull();
    expect(read!.total, where).not.toBeNull();
    expect(read!.ok, where).toBe(true);
    // the written count is the formula's: the row's own count (a net round: its arches, four stitches' width each)
    if (read!.total!.kind === "arch") expect(read!.total!.n * 4, where).toBe(raw.rows[i].n);
    else expect(read!.total!.n, where).toBe(r.n);
    // ... and the count beside the row is the one the plain words show
    expect(r.n, where).toBe(plain.rows[i].n);
    // the writer's own sum agrees with the reader's
    const c = countToks(rowToks(raw, p, i).toks);
    expect([read!.stitches, read!.chains, read!.arches, read!.base], where).toEqual([c.st, c.ch, c.arch, c.base]);
    // a round has its marker and closes into it
    if (/\(\*\)빼뜨기/.test(r.how)) expect(read!.marks, where).toBe(2);
  });
  return ko;
}

const base = { hook: "5호", weight: "medium" };
const sizes: [number, number][] = [[4, 4], [7.5, 5], [10, 6], [15, 10], [22.5, 14.5], [40, 30]];

describe("the written count is the formula's count", () => {
  it("bottoms and bags: every shape, hook, size, height and handle", () => {
    let rows = 0;
    for (const shape of ["circle", "oval", "rect"] as const) for (const [hook] of HOOKS) for (const [a, b] of sizes) {
      rows += check({ ...base, hook, shape, a, b, h: 15, object: "coaster", handle: "none" }).rows.length;
      for (const h of [2, 9.5, 40]) for (const handle of ["short", "long", "none"] as const) rows += check({ ...base, hook, shape, a, b, h, object: "bag", handle }).rows.length;
    }
    expect(rows).toBeGreaterThan(20000);
  }, 60_000);

  it("the taller stitches (their own 기둥사슬), every yarn weight", () => {
    for (const crochetStitch of ["sc", "blo", "hdc", "dc"] as const) for (const weight of ["thin", "medium", "thick"]) for (const shape of ["circle", "oval", "rect"] as const) {
      check({ ...base, weight, shape, a: 14, b: 8, h: 10, object: "bag", handle: "short", crochetStitch });
      check({ ...base, weight, shape: "rect", a: 22, b: 22, object: "rows", item: "dishcloth", crochetStitch });
      check({ ...base, weight, shape: "circle", a: 60, h: 25, object: "tube", item: "neckwarmer", crochetStitch });
    }
  });

  it("stitch patterns up the body, fitted bottoms, the staggered rounds with their half pattern", () => {
    const picks: Partial<PlanInput>[] = [{ pattern: "c12", crochetChart: "moss" }, { pattern: "c44", crochetChart: "shell" }, { pattern: "c45", crochetChart: "vst" }, { pattern: "c48", crochetChart: "net" }, { crochetChart: "mesh" }, { pattern: "c43" }, { pattern: "c31" }, { pattern: "c32" }, { pattern: "c53" }];
    for (const shape of ["circle", "oval", "rect"] as const) for (const [hook] of HOOKS) for (const [a, b] of sizes) for (const pick of picks) for (const gusset of shape === "circle" ? [undefined] : [undefined, "flat" as const])
      check({ ...base, hook, shape, a, b, h: 12, object: "bag", handle: "none", ...pick, ...(gusset ? { gusset } : {}) });
  }, 60_000);

  it("shaped bodies, flaps, drawstrings, wrist loops, flat pouches", () => {
    for (const shape of ["circle", "oval", "rect"] as const) for (const [a, b] of sizes) {
      check({ ...base, shape, a, b, h: 14, object: "bag", handle: "long", handleCm: 70, topA: a * 1.4 });
      check({ ...base, shape, a, b, h: 14, object: "bag", handle: "none", profile: [1, 1.3, 1.45, 1.2, .8, .7] });
      check({ ...base, shape, a, b, h: 14, object: "bag", handle: "short", handleKind: "wrist", closure: "drawstring" });
      check({ ...base, shape, a, b, h: 14, object: "bag", handle: "none", flapCm: 8, flapOver: "top", gusset: "box" });
      check({ ...base, shape, a, b, h: 14, object: "bag", handle: "none", flapCm: 6, gusset: "flat", pattern: "c17", topA: a * 1.2 });
    }
  });

  it("flat pieces and tubes, with and without a pattern", () => {
    for (const [hook] of HOOKS) for (const a of [4, 18, 22, 80]) for (const pick of [{}, { pattern: "c13" }, { pattern: "c43" }, { pattern: "c44", crochetChart: "shell" as ChartKey }]) {
      check({ ...base, hook, shape: "rect", a, b: 30, object: "rows", item: "dishcloth", ...pick });
      check({ ...base, hook, shape: "circle", a: a + 40, h: 12, object: "tube", item: "headband", ...pick });
    }
  });

  it("a drawn shape and a painted picture with holes and colours", () => {
    check({ ...base, shape: "circle", a: 10, object: "bag", free: { pts: [[0, 0], [.3, 0], [.45, .4], [.2, .8], [.25, 1]], hCm: 18 } });
    check({ ...base, shape: "circle", a: 10, object: "bag", free: { pts: [[.3, 0], [.35, .5], [.1, 1]], hCm: 12, bands: [[0, "#aaa"], [.5, "#b55"]] } });
    const cells = ["11111111", "11..1111", "11..2222", "22222222", ".222222.", "..2222.."].join("");
    const ko = check({ ...base, shape: "rect", a: 12, object: "rows", paint: { gw: 8, gh: 6, cells, palette: ["#fff", "#e9a", "#59c"], wCm: 12, hCm: 8, pieces: 2 } });
    expect(ko.rows.some(r => /\(짧은뜨기 \d+코 · 사슬 \d+코\)$/.test(r.how))).toBe(true);
  });
});

describe("how the rows read", () => {
  const ko = (p: PlanInput) => withKorean(plan(p), p).rows.map(r => `${r.label} ${r.how}`);
  it("a round bottom: the marker on the first stitch, groups in [ ], the count at the end", () => {
    const rows = ko({ ...base, shape: "circle", a: 15, object: "coaster" });
    expect(rows[0]).toBe("1단 매직링 - 사슬 1 - (*)짧은뜨기 6코 - (*)빼뜨기 (6코)");
    expect(rows[1]).toBe("2단 사슬 1 - (*)[다음 코에 짧은뜨기 2코] 6회 반복 - (*)빼뜨기 (12코)");
    expect(rows[2]).toBe("3단 사슬 1 - (*)[짧은뜨기 1코 - 다음 코에 짧은뜨기 2코] 6회 반복 - (*)빼뜨기 (18코)");
    expect(rows[4]).toBe("5단 사슬 1 - (*)짧은뜨기 1코 - [다음 코에 짧은뜨기 2코 - 짧은뜨기 3코] 5회 반복 - 다음 코에 짧은뜨기 2코 - 짧은뜨기 2코 - (*)빼뜨기 (30코)");
  });
  it("an oval and a square bottom: a group inside a group in { }", () => {
    const oval = ko({ ...base, shape: "oval", a: 18, b: 6, object: "coaster" }), rect = ko({ ...base, shape: "rect", a: 18, b: 6, object: "coaster" });
    expect(oval[0]).toBe("1단 기초 사슬 21코 - 사슬 1 - (*)[사슬을 따라 짧은뜨기 21코 - 끝 사슬에 짧은뜨기 3코 더] 2회 반복 - (*)빼뜨기 (48코)");
    expect(oval[2]).toBe("3단 사슬 1 - (*){짧은뜨기 21코 - [짧은뜨기 1코 - 다음 코에 짧은뜨기 2코] 3회 반복} 2회 반복 - (*)빼뜨기 (60코)");
    expect(rect[2]).toBe("3단 사슬 1 - (*)[짧은뜨기 22코 - 모서리 코에 짧은뜨기 3코 - 짧은뜨기 3코 - 모서리 코에 짧은뜨기 3코 - 짧은뜨기 1코] 2회 반복 - (*)빼뜨기 (64코)");
  });
  it("한길긴뜨기 rounds start with 사슬 3; a flat piece turns", () => {
    const dc = ko({ ...base, shape: "circle", a: 12, object: "coaster", crochetStitch: "dc" });
    expect(dc[2]).toBe("3단 사슬 3 - (*)[한길긴뜨기 1코 - 다음 코에 한길긴뜨기 2코] 6회 반복 - (*)빼뜨기 (18코)");
    const flat = ko({ ...base, shape: "rect", a: 10, b: 10, object: "rows", item: "dishcloth" });
    expect(flat.slice(0, 3)).toEqual(["시작 사슬 기초 사슬 18코 (18코)", "1단 사슬 1 - 짧은뜨기 18코 (18코)", "2단 사슬 1 - 뒤집어서 - 짧은뜨기 18코 (18코)"]);
  });
  it("a staggered pattern round begins and ends with half a pattern (조개 무늬)", () => {
    const rows = ko({ ...base, shape: "circle", a: 15, h: 10, object: "bag", handle: "none", pattern: "c43" });
    const wall = rows.filter(r => /한길긴뜨기/.test(r));
    expect(wall[0]).toMatch(/사슬 1 - \(\*\)\[짧은뜨기 1코 - 2코 건너뛰고 - 한 코에 한길긴뜨기 5코 - 2코 건너뛰고\] 13회 반복 - \(\*\)빼뜨기 \(78코\)$/);
    expect(wall[1]).toMatch(/사슬 3\(\*\) - 같은 코에 한길긴뜨기 2코 - \[부채 가운데에 짧은뜨기 1코 - 다음 짧은뜨기에 한길긴뜨기 5코\] 12회 반복 - 부채 가운데에 짧은뜨기 1코 - 처음 코에 한길긴뜨기 2코 - \(\*\)빼뜨기 \(78코\)$/);
  });
  it("shownPlan: the plain words unless asked; a knitted piece is knitting either way", () => {
    const bag: PlanInput = { ...base, shape: "circle", a: 15, h: 15, object: "bag", handle: "short" };
    // (with the pattern's own words on the rows: 반복 문구, 마커 이유 - lib/phrasing; the counts and the rows' words are withChains')
    expect(shownPlan(bag)).toEqual(phrased(withChains(plan(bag))));
    expect(shownPlan(bag).rows.map(r => [r.n, r.how])).toEqual(withChains(plan(bag)).rows.map(r => [r.n, r.how]));
    expect(shownPlan(bag, "korean").rows[2].how).toBe("사슬 1 - (*)[짧은뜨기 1코 - 다음 코에 짧은뜨기 2코] 6회 반복 - (*)빼뜨기 (18코)");
    const scarf = { ...base, shape: "rect" as const, a: 18, b: 150, object: "rows" as const, item: "scarf" };
    expect(shownPlan(scarf, "korean")).toEqual(shownPlan(scarf));
  });
  it("increases and decreases spread evenly use up the round exactly", () => {
    for (let prev = 4; prev <= 60; prev++) for (let n = Math.ceil(prev / 2); n <= prev * 2; n++) {
      const toks = evenToks(prev, n, "짧은뜨기"), read = readKorean(`${printToks(toks)} (${n}코)`)!;
      expect(read.ok, `${prev} -> ${n}: ${printToks(toks)}`).toBe(true);
    }
  });
});

describe("lib/stitchGrammar reads the notation", () => {
  it("(*), [ ] n회 반복, { [ ] } n회 반복, (○코)", () => {
    // the form Kim gave (its numbers are not ours: 사슬 3(*) stands as a stitch, 3 x 11 more = 34, so (36코) is not what it adds up to)
    const r = readKorean("3단 사슬 3(*) - [다음 코에 한길긴뜨기 2코 - 한길긴뜨기 1코] 11회 반복 - (*)빼뜨기 (36코)")!;
    expect([r.label, r.marks, r.stitches, r.total, r.ok]).toEqual(["3단", 2, 34, { kind: "count", n: 36 }, false]);
    expect(readKorean("3단 사슬 3(*) - [다음 코에 한길긴뜨기 2코 - 한길긴뜨기 1코] 11회 반복 - (*)빼뜨기 (총 34코)")!.ok).toBe(true);
    const nested = readKorean("{짧은뜨기 2코 - [다음 코에 짧은뜨기 2코] 3회 반복} 2회 반복 (16코)")!;
    expect([nested.stitches, nested.ok]).toEqual([16, true]);
    expect(readKorean("사슬 1 - (*)[짧은뜨기 1코 - 사슬 5코 - 3코 건너뛰고] 12회 반복 - (*)빼뜨기 (아치 12개)")).toMatchObject({ stitches: 12, chains: 60, arches: 12, ok: true });
    expect(readKorean("사슬 1 - 짧은뜨기 3코 - 짧은뜨기 2코 모아뜨기 - 짧은뜨기 3코 (7코)")!.ok).toBe(true);
    expect(readKorean("{짧은뜨기 2코 - [다음 코에 짧은뜨기 2코 3회 반복 (16코)")).toBeNull(); // a group left open
    expect(isKorean("1단: 짧은뜨기 1, (2코 건너뛰고 한 코에 한길긴뜨기 5, 2코 건너뛰고 짧은뜨기 1)을 끝까지")).toBe(false);
    expect(readKorean("겉면: 겉 2, 안 2를 끝까지 반복 (36코)")!.total).toEqual({ kind: "count", n: 36 });
  });
  it("such rows make a chart as the rows written the other way do", () => {
    expect(koreanToSteps("2단 사슬 3(*) - [다음 코에 한길긴뜨기 2코 - 한길긴뜨기 1코] 4회 반복 - (*)빼뜨기 (13코)")).toBe("2단: 사슬 3, (한 코에 한길긴뜨기 2, 한길긴뜨기 1) × 4");
    expect(koreanToSteps("1단 사슬 1 - {짧은뜨기 1코 - [사슬 1코 - 1코 건너뛰고] 2회 반복} 3회 반복 (15코)")).toBe("1단: (짧은뜨기 1, 사슬 1, 1코 건너뛰고, 사슬 1, 1코 건너뛰고) × 3");
    const ko = chartFromSteps(["1단 사슬 1 - 짧은뜨기 9코 (9코)", "2단 사슬 1 - 뒤집어서 - [짧은뜨기 2코 - 다음 코에 짧은뜨기 2코] 3회 반복 (12코)"], 9, 2)!;
    const plain = chartFromSteps(["1단: 짧은뜨기 9", "2단: (짧은뜨기 2, 한 코에 짧은뜨기 2) × 3"], 9, 2)!;
    expect(ko.st.length).toBe(21); expect(ko.st.length).toBe(plain.st.length); expect(ko.W).toBeCloseTo(plain.W, 6);
  });
});
