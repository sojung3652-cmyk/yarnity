import { describe, expect, it } from "vitest";
import { countToks, rowToks, withKorean } from "@/lib/koreanNotation";
import { gauge, plan, withChains, type PlanInput, type Row } from "@/lib/pattern";
import { readKorean } from "@/lib/stitchGrammar";
import { isChainRow, panelRows, pieceLayout, pieceOf, taper } from "@/lib/structure";
import { toYarnPattern } from "@/src/features/yarn3d/fromPattern";

// 구조 부품 (Kim): 판 2장 + 띠, 판 하나 호보, 사선과 삼각형, 브러싱. Every count is the gauge's, and the words, the
// symbol chart's grid and the 3D's grid are the same rows.

const base = { hook: "5호", weight: "medium" } as const;
const near = (a: number, b: number, tol = 1) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol);

/** every written row read back in the Korean notation: its pieces add up to the row's count */
function readsBack(p: PlanInput) {
  const raw = plan(p), ko = withKorean(raw, p), plain = withChains(raw), tag = JSON.stringify(p);
  ko.rows.forEach((r, i) => {
    const src = raw.rows[i];
    if (src.part === "finish" || (src.part === "join" && !src.n)) { expect(r.how, tag).toBe(src.how); return; }
    if (!(src.own || src.edge)) return;
    const read = readKorean(r.how), where = `${tag}\n${r.how}`;
    expect(read, where).not.toBeNull();
    expect(read!.ok, where).toBe(true);
    expect(read!.total!.n, where).toBe(src.n);
    const c = countToks(rowToks(raw, p, i).toks);
    expect(c.st || c.base, where).toBe(src.n);
    expect(plain.rows[i].n, where).toBe(src.n);
  });
  return raw;
}
/** the chart's grid and the 3D's grid hold, row by row, the stitches the words count */
function gridAgrees(rows: Row[]) {
  const body = rows.filter(r => !isChainRow(r) && r.post == null), lay = pieceLayout(body);
  body.forEach((r, i) => {
    expect(lay.at[i][1]).toBe(r.n);
    expect(lay.cells.slice(i * lay.W, (i + 1) * lay.W).filter(c => c >= 0).length).toBe(r.n);
    expect(lay.at[i][0]).toBeGreaterThanOrEqual(0);
    expect(lay.at[i][0] + r.n).toBeLessThanOrEqual(lay.W);
  });
  return lay;
}

describe("사선과 삼각형", () => {
  it("the rule: an edge loses what it must, spread over the rows", () => {
    for (const n0 of [6, 17, 31, 60]) for (const R of [2, 5, 14, 40]) for (const side of ["left", "right", "both"] as const) for (const tip of [1, 2, 3, 7]) {
      const t = taper(n0, R, side, tip), tag = `${n0} ${R} ${side} ${tip}`;
      expect(t.counts.length, tag).toBe(R);
      expect(t.counts[0], tag).toBe(n0);
      expect(t.tip, tag).toBe(t.counts[R - 1]);
      expect(Math.abs(t.tip - Math.min(tip, n0 - 1)), tag).toBeLessThanOrEqual(side === "both" ? 1 : 0);
      t.rows.forEach(([dl, dr], r) => {
        if (r) expect(t.counts[r - 1] - t.counts[r], tag).toBe(dl + dr);
        if (side === "left") expect(dr, tag).toBe(0);
        if (side === "right") expect(dl, tag).toBe(0);
        if (side === "both") expect(dl, tag).toBe(dr);
      });
      // "every k rows one stitch" / "m stitches a row" is what the rows do
      const e = (side === "both" ? (n0 - t.tip) / 2 : n0 - t.tip), steps = R - 1;
      if (e > 0 && steps > 0) { if (e <= steps) expect(t.every, tag).toBe(Math.floor(steps / e)); else expect(t.by, tag).toBe(Math.ceil(e / steps)); }
    }
  });

  it("a flat piece: its rows, its cord, the chart and the 3D", () => {
    for (const taperSide of ["left", "right", "both"] as const) for (const [a, b] of [[12, 12], [20, 9], [8, 30]]) for (const cord of [false, true]) {
      const p = { ...base, object: "rows", shape: "rect", a, b, taper: taperSide, taperTip: 3, taperCord: cord, taperCordCm: 18 } as PlanInput, g = gauge(p), pp = readsBack(p);
      const rows = pp.rows.filter(r => r.part === "rows"), cords = pp.rows.filter(r => r.part === "strap");
      near(rows[0].n, a / g.w); near(rows.length, b / g.h);
      rows.forEach((r, i) => { if (i) expect(rows[i - 1].n + (r.edge![0] + r.edge![1])).toBe(r.n); });
      expect(Math.abs(rows[rows.length - 1].n - 3)).toBeLessThanOrEqual(1);
      expect(cords.length).toBe(cord ? Math.max(2, Math.round(18 / g.h)) : 0);
      cords.forEach(r => expect(r.n).toBe(rows[rows.length - 1].n));
      const lay = gridAgrees(pp.rows);
      // a slant keeps its other edge straight
      const xs = lay.at.slice(0, rows.length);
      if (taperSide === "left") xs.forEach(([x, n]) => expect(x + n).toBe(lay.W));
      if (taperSide === "right") xs.forEach(([x]) => expect(x).toBe(0));
      // the 3D draws that very grid
      const yp = toYarnPattern(p as never, pp)!;
      expect(yp.shape.kind).toBe("grid");
      if (yp.shape.kind === "grid") { expect(yp.shape.cells).toEqual(lay.cells); expect(yp.shape.W).toBe(lay.W); expect(yp.shape.H).toBe(rows.length + cords.length); }
    }
  });

  it("a bag's flap narrows the same way, and the 3D's flap takes its shape", () => {
    for (const [taperSide, shape] of [["left", "slant-l"], ["right", "slant-r"], ["both", "triangle"]] as const) {
      const p = { ...base, object: "bag", shape: "rect", a: 20, b: 6, h: 14, handle: "none", gusset: "box", flapCm: 9, taper: taperSide, taperTip: 3 } as PlanInput, pp = readsBack(p);
      const flap = pp.rows.filter(r => r.part === "flap"), plain = plan({ ...p, taper: null }).rows.filter(r => r.part === "flap");
      expect(flap.length).toBe(plain.length);
      expect(flap[0].n).toBe(plain[0].n);
      flap.forEach((r, i) => { if (i) expect(flap[i - 1].n + r.edge![0] + r.edge![1]).toBe(r.n); });
      expect(Math.abs(flap[flap.length - 1].n - 3)).toBeLessThanOrEqual(1);
      gridAgrees(flap);
      const yp = toYarnPattern(p as never, pp)!;
      expect(yp.flap?.shape).toBe(shape);
      near(yp.flap!.tip! * flap[0].n, flap[flap.length - 1].n, .01);
    }
    // with none picked the flap is as it was
    const q = { ...base, object: "bag", shape: "circle", a: 15, h: 12, handle: "none", flapCm: 8 } as PlanInput;
    expect(plan(q).rows.filter(r => r.part === "flap").every(r => !r.edge)).toBe(true);
  });
});

describe("판 2장 + 띠", () => {
  const each = (fn: (p: PlanInput) => void) => { for (const [a, h] of [[24, 20], [14, 30], [36, 12]]) for (const corner of [0, .35, 1]) for (const stripCm of [3, 6, 11]) for (const stripHandle of [false, true]) fn({ ...base, object: "bag", shape: "rect", build: "panels", a, h, corner, stripCm, stripHandle, handle: "short", handleCm: 50 } as PlanInput); };

  it("two panels the same: the chain the narrowest row, growing at the two edges only", () => each(p => {
    const g = gauge(p), pp = readsBack(p), P = panelRows(p, g), tag = JSON.stringify(p);
    for (const name of ["앞판", "뒤판"]) {
      const rows = pp.rows.filter(r => r.part === "panel" && pieceOf(r) === name), chain = rows.find(isChainRow)!, body = rows.filter(r => !isChainRow(r));
      near(P.W, p.a / g.w); near(P.R, (p.h as number) / g.h);
      expect(body.length, tag).toBe(P.R);
      expect(chain.n, tag).toBe(body[0].n);
      expect(body[body.length - 1].n, tag).toBe(P.W);
      body.forEach((r, i) => {
        if (!i) return;
        expect(r.edge![0], tag).toBe(r.edge![1]);                       // the two lower corners alike
        expect(r.edge![0], tag).toBeGreaterThanOrEqual(0);              // only ever wider
        expect(body[i - 1].n + 2 * r.edge![0], tag).toBe(r.n);
        expect(r.inc, tag).toBe(2 * r.edge![0]);
      });
      if (!p.corner) expect(body.every(r => r.n === P.W), tag).toBe(true);
      gridAgrees(rows);
    }
  }));

  it("the strip: as wide as asked, as long as a side + the bottom + a side (+ the handle)", () => each(p => {
    const g = gauge(p), pp = plan(p), P = panelRows(p, g), strip = pp.rows.filter(r => r.part === "strip" && !isChainRow(r)), tag = JSON.stringify(p);
    near(strip[0].n, (p.stripCm as number) / g.w);
    expect(strip.every(r => r.n === strip[0].n), tag).toBe(true);
    near(P.edgeCm, 2 * P.sideCm + P.bottomCm, 1e-6);
    expect(strip.length, tag).toBe(Math.max(3, Math.round(P.edgeCm / g.h)) + (p.stripHandle ? Math.max(2, Math.round(50 / g.h)) : 0));
    // a square panel's edge is its two sides and its bottom; rounding the corners shortens it
    if (!p.corner) near(P.edgeCm, 2 * (p.h as number) + p.a, 1e-6); else expect(P.edgeCm).toBeLessThan(2 * (p.h as number) + p.a);
    expect(pp.rows.some(r => r.part === "handle"), tag).toBe(!p.stripHandle);
  }));

  it("joined in 되돌아짧은뜨기 after the markers are set, each panel along the same edge", () => each(p => {
    const g = gauge(p), pp = plan(p), P = panelRows(p, g), joins = pp.rows.filter(r => r.part === "join"), tag = JSON.stringify(p);
    expect(joins[0].how, tag).toContain("잇기 전에 마커링으로 두 판의 옆면·바닥 위치를 먼저 맞춥니다");
    expect(joins.slice(1).map(r => r.n), tag).toEqual([Math.max(3, Math.round(P.edgeCm / g.w)), Math.max(3, Math.round(P.edgeCm / g.w))]);
    expect(joins.slice(1).every(r => r.how.includes("되돌아짧은뜨기")), tag).toBe(true);
    expect(pp.rows.findIndex(r => r.part === "join"), tag).toBeGreaterThan(pp.rows.findIndex(r => r.part === "strip"));
  }));

  it("in another stitch the joining is still 되돌아짧은뜨기, and the 3D stands as a box of the same sizes", () => {
    const p = { ...base, object: "bag", shape: "rect", build: "panels", a: 24, h: 20, corner: .3, stripCm: 6, stripHandle: true, handle: "short", handleCm: 50, crochetStitch: "dc" } as PlanInput, pp = plan(p);
    expect(pp.rows.filter(r => r.part === "join" && r.n).every(r => r.how.includes("되돌아짧은뜨기") && !r.how.includes("되돌아한길긴뜨기"))).toBe(true);
    expect(pp.rows.filter(r => r.part === "panel" && !isChainRow(r)).every(r => r.how.includes("한길긴뜨기"))).toBe(true);
    const yp = toYarnPattern({ ...p, crochetStitch: undefined } as never, plan({ ...p, crochetStitch: null }))!;
    expect(yp.shape.kind).toBe("rect");
    expect(yp.strap).toBe("long");
    expect(yp.strapWcm).toBe(6);
    expect(yp.strapCm).toBe(50);
  });
});

describe("판 하나 호보", () => {
  const each = (fn: (p: PlanInput) => void) => { for (const [a, h] of [[28, 18], [16, 24]]) for (const corner of [0, .6, 1]) for (const postSt of [2, 5, 40]) for (const hoboFold of [false, true]) fn({ ...base, object: "bag", shape: "rect", build: "hobo1", a, h, corner, postSt, strapCm: 60, hoboFold, handle: "short" } as PlanInput); };

  it("the panel, then its two ends go on up alone as posts", () => each(p => {
    const g = gauge(p), pp = readsBack(p), P = panelRows(p, g), tag = JSON.stringify(p);
    for (const name of ["앞판", "뒤판"]) {
      const rows = pp.rows.filter(r => pieceOf(r) === name), body = rows.filter(r => r.part === "panel" && !isChainRow(r)), posts = rows.filter(r => r.post != null);
      expect(body.length, tag).toBe(P.R);
      expect(body[body.length - 1].n, tag).toBe(P.W);
      const post = posts[0].n;
      expect(post, tag).toBe(Math.min(Math.max(2, p.postSt as number), Math.max(2, Math.floor(P.W / 2) - 1)));
      expect(posts.every(r => r.n === post), tag).toBe(true);
      expect(posts.filter(r => r.post === 0).length, tag).toBe(Math.max(2, Math.round(30 / g.h)));   // half the strap / a row's height
      expect(posts.filter(r => r.post === 1).length, tag).toBe(posts.filter(r => r.post === 0).length);
      expect(2 * post, tag).toBeLessThan(P.W);                                                       // stitches are left between them: the opening
      // a post stands on an end of the panel's last row
      const lay = pieceLayout(rows.filter(r => !isChainRow(r))), at = lay.at.slice(body.length);
      at.forEach(([x, n], i) => { expect([0, lay.W - n], tag).toContain(x); expect(n, tag).toBe(posts[i].n); });
      gridAgrees(rows);
    }
    // folded: the back grows from the other side of the same chain (one chain), and only the sides are joined
    expect(pp.rows.filter(isChainRow).length, tag).toBe(p.hoboFold ? 1 : 2);
    const join = pp.rows.filter(r => r.part === "join" && r.n)[0];
    expect(join.n, tag).toBe(p.hoboFold ? 2 * Math.max(2, Math.round(P.sideCm / g.w)) : Math.max(3, Math.round(P.edgeCm / g.w)));
    expect(pp.rows.find(r => r.part === "join")!.how, tag).toContain("잇기 전에 마커링으로 두 판의 옆면·바닥 위치를 먼저 맞춥니다");
  }));

  it("the 3D: a flat bag as wide and as tall, its strap the posts", () => {
    const p = { ...base, object: "bag", shape: "rect", build: "hobo1", a: 28, h: 18, corner: .6, postSt: 5, strapCm: 60, handle: "short" } as PlanInput, pp = plan(p), g = gauge(p);
    const yp = toYarnPattern(p as never, pp)!;
    expect(["oval", "rect"]).toContain(yp.shape.kind);
    expect(yp.strap).toBe("long");
    expect(yp.strapCm).toBe(60);
    near(yp.strapWcm!, 5 * g.w, 1e-6);
  });
});

describe("브러싱", () => {
  it("one more step at the end, no count moved, more hair in the 3D", () => {
    for (const p of [{ ...base, object: "bag", shape: "circle", a: 15, h: 12, handle: "short" }, { ...base, object: "rows", shape: "rect", a: 20, b: 20 }, { ...base, object: "bag", shape: "rect", build: "panels", a: 24, h: 20, stripCm: 6, handle: "none" }] as PlanInput[]) {
      const off = plan(p), on = readsBack({ ...p, brush: .55 });
      expect(on.rows.length).toBe(off.rows.length + 1);
      expect(on.rows.slice(0, -1).map(r => [r.part, r.n, r.how])).toEqual(off.rows.map(r => [r.part, r.n, r.how]));
      const last = on.rows[on.rows.length - 1];
      expect([last.part, last.n, last.how]).toEqual(["finish", 0, "다 뜬 뒤 브러시로 표면을 빗어 털 질감을 냅니다"]);
      const a = toYarnPattern(p as never, off)!, b = toYarnPattern({ ...p, brush: .55 } as never, on)!, c = toYarnPattern({ ...p, brush: 1 } as never, on)!;
      expect(a.fuzzK ?? 1).toBe(1); expect(a.hairK ?? 1).toBe(1);
      expect(b.fuzzK!).toBeGreaterThan(1); expect(b.hairK!).toBeGreaterThan(1);
      expect(c.fuzzK!).toBeGreaterThan(b.fuzzK!); expect(c.hairK!).toBeGreaterThan(b.hairK!);
      expect(b.shape).toEqual(a.shape);
    }
  });
});

describe("호보백에는 덮개가 없다", () => {
  it("a handle grown out of the opening, or a hobo panel: a flap asked for is not worked, in the words or the 3D", () => {
    const bag = { ...base, object: "bag", shape: "oval", a: 28, b: 10, h: 18, handle: "short", flapCm: 9 } as PlanInput;
    expect(plan(bag).rows.some(r => r.part === "flap")).toBe(true);
    for (const p of [{ ...bag, handleKind: "grown" }, { ...bag, shape: "rect", build: "hobo1", postSt: 5, strapCm: 60 }] as PlanInput[]) {
      const pp = plan(p);
      expect(pp.rows.some(r => r.part === "flap")).toBe(false);
      expect(toYarnPattern(p as never, pp)!.flap).toBeUndefined();
    }
  });
});
