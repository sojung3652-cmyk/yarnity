import { describe, expect, it } from "vitest";
import { countToks, rowToks, withKorean } from "@/lib/koreanNotation";
import { CROCHET, gauge, grownHandle, plan, withChains, type CrochetStitch, type PlanInput } from "@/lib/pattern";
import { readKorean } from "@/lib/stitchGrammar";
import { yarnUse } from "@/lib/yarnUse";

// 몸통에서 이어 뜨는 손잡이 (Kim): the opening's round shared out between two feet and two gaps, each foot
// narrowed a stitch at each edge a row to the strap's width, then straight. Every count is the gauge's.

const base = { hook: "5호", weight: "medium", object: "bag", handle: "short", handleKind: "grown" } as const;
const bags: Partial<PlanInput>[] = [
  { shape: "circle", a: 15, h: 15 }, { shape: "oval", a: 28, b: 10, h: 20 }, { shape: "rect", a: 30, b: 12, h: 24, gusset: "box" },
  { shape: "circle", a: 6, h: 5 }, { shape: "oval", a: 24, b: 8, h: 18, crochetChart: "mesh" }, { shape: "rect", a: 20, b: 6, h: 14, pattern: "c43" },
  { shape: "circle", a: 18, h: 16, crochetStitch: "dc" }, { shape: "oval", a: 26, b: 9, h: 18, topA: 34 },
];
const handles: Partial<PlanInput>[] = [{}, { handleCm: 30, handleWcm: 2, handleBaseCm: 10 }, { handleCm: 90, handleWcm: 4.5, handleBaseCm: 26 }, { handleCm: 15, handleWcm: 6, handleBaseCm: 60 }, { handleCm: 50, handleWcm: 1, handleBaseCm: 1 }];
const stitches: (CrochetStitch | undefined)[] = [undefined, "sc", "hdc", "dc"];
const each = (fn: (p: PlanInput) => void) => { for (const b of bags) for (const h of handles) for (const handleStitch of stitches) fn({ ...base, ...b, ...h, ...(handleStitch ? { handleStitch } : {}) } as PlanInput); };

describe("a handle grown out of the opening", () => {
  it("shares the opening out: two feet and two gaps make the round", () => each(p => {
    const pp = plan(p), rim = pp.rows.filter(r => r.part === "rim").pop()!.n, G = grownHandle(p, pp.g, rim), tag = JSON.stringify(p);
    expect(2 * G.base + G.gapA + G.gapB, tag).toBe(rim);
    expect(G.gapA, tag).toBeGreaterThanOrEqual(1);
    expect(G.gapB - G.gapA, tag).toBeGreaterThanOrEqual(0);
    expect(G.gapB - G.gapA, tag).toBeLessThanOrEqual(1);
    expect(G.strap, tag).toBeGreaterThanOrEqual(1);
    expect(G.base, tag).toBeGreaterThanOrEqual(G.strap);
    expect((G.base - G.strap) % 2, tag).toBe(0);
    expect(G.even, tag).toBeGreaterThanOrEqual(1);
  }));

  it("the foot, the strap and the rows come from the gauge", () => {
    const p = { ...base, shape: "oval", a: 28, b: 10, h: 20, handleCm: 60, handleWcm: 3, handleBaseCm: 20 } as PlanInput, g = gauge(p);
    for (const st of ["sc", "hdc", "dc"] as const) {
      const pp = plan({ ...p, handleStitch: st }), rim = pp.rows.filter(r => r.part === "rim").pop()!.n, G = grownHandle({ ...p, handleStitch: st }, g, rim);
      expect(Math.abs(G.strap - 3 / g.w)).toBeLessThanOrEqual(1);          // the strap's width / a stitch's width
      expect(Math.abs(G.base - 20 / g.w)).toBeLessThanOrEqual(1);           // the foot's width / a stitch's width (to the strap's parity)
      expect(G.rows).toBe(Math.max(G.dec + 2, Math.round(30 / (g.h * CROCHET[st].h)))); // half the length / the stitch's row height
      expect(G.ends).toBe(Math.round(2 * G.rows * g.h * CROCHET[st].h / g.w)); // the edge's length / a stitch's width
    }
    // a taller stitch: fewer rows for the same length
    const rowsOf = (st: CrochetStitch) => plan({ ...p, handleStitch: st }).rows.filter(r => r.grown && r.grown.side === 0 && r.grown.k !== "edge").length;
    expect(rowsOf("dc")).toBeLessThan(rowsOf("hdc"));
    expect(rowsOf("hdc")).toBeLessThan(rowsOf("sc"));
  });

  it("its rows: picked up, two stitches fewer a row to the strap, straight; the same on the other side; an edging round each side", () => each(p => {
    const pp = plan(p), rim = pp.rows.filter(r => r.part === "rim").pop()!.n, G = grownHandle(p, pp.g, rim), tag = JSON.stringify(p);
    const hs = pp.rows.filter(r => r.part === "handle");
    expect(hs.every(r => r.grown), tag).toBe(true);
    expect(pp.rows.filter(r => r.part === "rim" && r.how.startsWith("빼뜨기")).length, tag).toBe(0); // its edging finishes the opening
    for (const side of [0, 1] as const) {
      const rows = hs.filter(r => r.grown!.side === side && r.grown!.k !== "edge");
      expect(rows.length, tag).toBe(G.rows);
      expect(rows[0].n, tag).toBe(G.base);
      rows.forEach((r, i) => { if (i) expect(rows[i - 1].n - r.n, tag).toBe(r.grown!.k === "dec" ? 2 : 0); });
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
    });
  }));

  it("another handle is as it was", () => {
    const p = { hook: "5호", weight: "medium", object: "bag", shape: "circle", a: 15, h: 15, handle: "short" } as PlanInput, pp = plan(p);
    expect(pp.rows.filter(r => r.part === "handle").length).toBe(2);
    expect(pp.rows.filter(r => r.part === "rim").length).toBe(2);
    expect(pp.rows.some(r => r.grown)).toBe(false);
  });
});
