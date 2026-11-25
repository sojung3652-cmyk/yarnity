import { describe, expect, it } from "vitest";
import { CHART_MULT } from "@/lib/crochetChart";
import { countToks, rowToks, withKorean } from "@/lib/koreanNotation";
import { CROCHET, gauge, grownHandle, openingN, plan, withChains, type CrochetStitch, type PlanInput } from "@/lib/pattern";
import { readKorean } from "@/lib/stitchGrammar";
import { yarnUse } from "@/lib/yarnUse";

// 몸통에서 이어 뜨는 손잡이 (Kim): the opening's round shared out between two feet and two gaps, each foot
// narrowed at each edge a row to the strap's width, then straight. It is the body going on: the body's stitch,
// or the body's stitch pattern a whole repeat at a time (Kim: 몸통과 동일하게, 그게 무슨 무늬든). Every count is
// the gauge's.

const base = { hook: "5호", weight: "medium", object: "bag", handle: "short", handleKind: "grown" } as const;
const bags: Partial<PlanInput>[] = [
  { shape: "circle", a: 15, h: 15 }, { shape: "oval", a: 28, b: 10, h: 20 }, { shape: "rect", a: 30, b: 12, h: 24, gusset: "box" },
  { shape: "circle", a: 6, h: 5 }, { shape: "oval", a: 26, b: 9, h: 18, topA: 34 },
];
// the body: each plain stitch, each stitch pattern written up a bag's wall, a named pattern
const bodies: Partial<PlanInput>[] = [{}, { crochetStitch: "blo" }, { crochetStitch: "hdc" }, { crochetStitch: "dc" },
  { crochetChart: "shell" }, { crochetChart: "mesh" }, { crochetChart: "vst" }, { crochetChart: "moss" }, { crochetChart: "net" }, { pattern: "c43" }];
const handles: Partial<PlanInput>[] = [{}, { handleCm: 30, handleWcm: 2, handleBaseCm: 10 }, { handleCm: 90, handleWcm: 4.5, handleBaseCm: 26 }, { handleCm: 15, handleWcm: 6, handleBaseCm: 60 }, { handleCm: 50, handleWcm: 1, handleBaseCm: 1 }];
const each = (fn: (p: PlanInput) => void) => { for (const b of bags) for (const body of bodies) for (const h of handles) fn({ ...base, ...b, ...body, ...h } as PlanInput); };
const rimOf = (p: PlanInput) => { const pp = plan(p); return { pp, rim: openingN(pp) }; };

describe("a handle grown out of the opening", () => {
  it("shares the opening out: two feet and two gaps make the round", () => each(p => {
    const { pp, rim } = rimOf(p), G = grownHandle(p, pp.g, rim), tag = JSON.stringify(p);
    expect(2 * G.base + G.gapA + G.gapB, tag).toBe(rim);
    expect(G.gapA, tag).toBeGreaterThanOrEqual(1);
    expect(G.gapB - G.gapA, tag).toBeGreaterThanOrEqual(0);
    expect(G.gapB - G.gapA, tag).toBeLessThanOrEqual(1);
    expect(G.strap, tag).toBeGreaterThanOrEqual(1);
    expect(G.base, tag).toBeGreaterThanOrEqual(G.strap);
    expect(G.even, tag).toBeGreaterThanOrEqual(1);
    // whole units: a stitch, or the body's pattern's repeat; a unit off each edge a row reaches the strap exactly
    expect(G.base % G.u, tag).toBe(0);
    expect(G.strap % G.u, tag).toBe(0);
    expect(((G.base - G.strap) / G.u) % 2, tag).toBe(0);
  }));

  it("is in the body's own stitch, or its stitch pattern", () => {
    const bag = { ...base, shape: "oval", a: 28, b: 10, h: 20 } as PlanInput;
    for (const st of ["sc", "blo", "hdc", "dc"] as CrochetStitch[]) {
      const p = { ...bag, crochetStitch: st }, { pp, rim } = rimOf(p), G = grownHandle(p, pp.g, rim);
      expect([G.st, G.u, G.wk]).toEqual([st, 1, null]);
      expect(pp.rows.filter(r => r.grown && r.grown.k !== "edge").every(r => r.grown!.st === st && r.how.includes(CROCHET[st].ko))).toBe(true);
    }
    for (const k of ["shell", "mesh", "vst", "moss", "net"] as const) {
      const p = { ...bag, crochetChart: k }, { pp, rim } = rimOf(p), G = grownHandle(p, pp.g, rim);
      expect([G.wk, G.u]).toEqual([k, CHART_MULT[k][0]]);
      const hs = pp.rows.filter(r => r.grown && r.grown.k !== "edge");
      expect(hs.every(r => r.grown!.unit === CHART_MULT[k][0] && r.how.includes("무늬") && r.n % CHART_MULT[k][0] === 0)).toBe(true);
    }
    // 조개 무늬 (c43) is written up the wall as shells: so is its handle
    const { pp, rim } = rimOf({ ...bag, pattern: "c43" }); expect(grownHandle({ ...bag, pattern: "c43" }, pp.g, rim).wk).toBe("shell");
  });

  it("the foot, the strap and the rows come from the gauge", () => {
    const p = { ...base, shape: "oval", a: 28, b: 10, h: 20, handleCm: 60, handleWcm: 3, handleBaseCm: 20 } as PlanInput;
    for (const st of ["sc", "hdc", "dc"] as const) {
      const q = { ...p, crochetStitch: st }, g = gauge(q), { rim } = rimOf(q), G = grownHandle(q, g, rim);
      expect(Math.abs(G.strap - 3 / g.w)).toBeLessThanOrEqual(1);          // the strap's width / a stitch's width
      expect(Math.abs(G.base - 20 / g.w)).toBeLessThanOrEqual(1.5);         // the foot's width / a stitch's width (a stitch more for the strap's parity)
      expect(G.rows).toBe(Math.max(G.dec + 2, Math.round(30 / (g.h * CROCHET[st].h)))); // half the length / the body's row height
      expect(G.ends).toBe(Math.round(2 * G.rows * g.h * CROCHET[st].h / g.w)); // the edge's length / a stitch's width
    }
    // a taller stitch: fewer rows for the same length
    const rowsOf = (st: CrochetStitch) => plan({ ...p, crochetStitch: st }).rows.filter(r => r.grown && r.grown.side === 0 && r.grown.k !== "edge").length;
    expect(rowsOf("dc")).toBeLessThan(rowsOf("hdc"));
    expect(rowsOf("hdc")).toBeLessThan(rowsOf("sc"));
    // a stitch pattern: the foot is whole repeats near its width
    const m = { ...p, crochetChart: "shell" as const }, gm = gauge(m), { rim } = rimOf(m), Gm = grownHandle(m, gm, rim);
    expect(Math.abs(Gm.base - 20 / gm.w)).toBeLessThanOrEqual(9); // within a repeat and a half (six stitches each; one more for the parity)
  });

  it("its rows: picked up, a unit fewer at each edge a row to the strap, straight; the same on the other side; an edging round each side", () => each(p => {
    const { pp, rim } = rimOf(p), G = grownHandle(p, pp.g, rim), tag = JSON.stringify(p);
    const hs = pp.rows.filter(r => r.part === "handle");
    expect(hs.every(r => r.grown), tag).toBe(true);
    // no edging between the body and its handle (Kim: 경계선이 생기면 안 된다): the handle's first row stands on the body's last round
    expect(pp.rows.filter(r => r.part === "rim").length, tag).toBe(0);
    expect(pp.rows[pp.rows.findIndex(r => r.grown) - 1].part, tag).toBe("body");
    expect(rim, tag).toBe(pp.rows.filter(r => r.part === "body").pop()!.n);
    for (const side of [0, 1] as const) {
      const rows = hs.filter(r => r.grown!.side === side && r.grown!.k !== "edge");
      expect(rows.length, tag).toBe(G.rows);
      expect(rows[0].n, tag).toBe(G.base);
      rows.forEach((r, i) => { if (i) expect(rows[i - 1].n - r.n, tag).toBe(r.grown!.k === "dec" ? 2 * G.u : 0); });
      expect(rows[rows.length - 1].n, tag).toBe(G.strap);
    }
    const edges = hs.filter(r => r.grown!.k === "edge");
    expect(edges.map(r => r.n), tag).toEqual([G.gapA + G.ends, G.gapB + G.ends]);
    expect(yarnUse(pp, { weight: "medium" }).m, tag).toBeGreaterThan(0);
  }));

  it("the Korean notation of every row adds up to the row's count", () => each(p => {
    const raw = plan(p), ko = withKorean(raw, p), plain = withChains(raw), tag = JSON.stringify(p);
    ko.rows.forEach((r, i) => {
      if (!raw.rows[i].grown) return;
      const read = readKorean(r.how), where = `${tag}\n${r.how}`;
      expect(read, where).not.toBeNull();
      expect(read!.ok, where).toBe(true);
      expect(read!.total!.n, where).toBe(raw.rows[i].n);
      expect(plain.rows[i].how, where).toBe(raw.rows[i].how); // its plain words are its own (no second 기둥사슬 added)
      const c = countToks(rowToks(raw, p, i).toks);
      expect(read!.stitches, where).toBe(c.st);
      expect(c.st, where).toBe(raw.rows[i].n);
    });
  }));

  it("another handle is as it was", () => {
    const p = { hook: "5호", weight: "medium", object: "bag", shape: "circle", a: 15, h: 15, handle: "short" } as PlanInput, pp = plan(p);
    expect(pp.rows.filter(r => r.part === "handle").length).toBe(2);
    expect(pp.rows.filter(r => r.part === "rim").length).toBe(2);
    expect(pp.rows.some(r => r.grown)).toBe(false);
  });
});
