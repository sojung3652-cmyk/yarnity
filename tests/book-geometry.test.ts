import { describe, expect, it } from "vitest";
import {
  A_END, BLOCK, blockTop, BOARD, BORDER_R, coverPose, COVER_INSIDE, D, FAB, H, Q_END, SEG_RANGES, sheetCurve, SHEETS, sleevePath, SPINE_RX, T, W, type V2,
} from "@/components/Book/three/geometry";

const es = Array.from({ length: 51 }, (_, i) => i / 50);
const inBlock = ([x, y]: V2, m = 0.01) => x > BLOCK.x0 + m && x < BLOCK.x1 - m && y > BLOCK.y0 + m && y < blockTop(x) - m;
const inBackBoard = ([x, y]: V2) => x > -W / 2 + 0.01 && x < W / 2 - 0.01 && y > 0.01 && y < BOARD - 0.01;

describe("proportions", () => {
  it("4:5 cover, thickness 16% of the width, border 4-5% of the width", () => {
    expect(W / D).toBeCloseTo(0.8, 5);
    expect(T / W).toBeCloseTo(0.16, 5);
    expect((2 * BORDER_R) / W).toBeGreaterThanOrEqual(0.04);
    expect((2 * BORDER_R) / W).toBeLessThanOrEqual(0.05);
  });
});

describe("sleeve", () => {
  it("same point count at every opening progress", () => {
    const n = sleevePath(0).length;
    for (const e of es) expect(sleevePath(e).length).toBe(n);
  });
  it("is continuous (no tears) and its front texture never slides", () => {
    const f0 = sleevePath(0).filter(q => q.seg === 2).map(q => q.u);
    for (const e of es) {
      const p = sleevePath(e);
      for (let i = 1; i < p.length; i++) expect(Math.hypot(p[i].p[0] - p[i - 1].p[0], p[i].p[1] - p[i - 1].p[1]), `e=${e} i=${i}`).toBeLessThan(1.0);
      p.filter(q => q.seg === 2).forEach((q, i) => expect(q.u).toBeCloseTo(f0[i], 9));
    }
  });
  it("hugs the closed book", () => {
    const ys = sleevePath(0).map(q => q.p[1]);
    expect(Math.min(...ys)).toBeCloseTo(-H, 5);
    expect(Math.max(...ys)).toBeCloseTo(T + H, 5);
  });
  it("fabric never passes through the page block, the back board or the table", () => {
    for (const e of es) for (const { p, n } of sleevePath(e)) for (const s of [-H, 0, H]) {
      const q: V2 = [p[0] + n[0] * s, p[1] + n[1] * s];
      expect(inBlock(q), `e=${e} ${q}`).toBe(false);
      expect(inBackBoard(q), `e=${e} ${q}`).toBe(false);
      expect(q[1], `e=${e}`).toBeGreaterThan(-FAB - 0.02);
    }
  });
  it("front board never passes through the block, the spine fabric zone or the table", () => {
    for (const e of es) {
      const pose = coverPose(e);
      const corners = ([[-W / 2, T - BOARD], [W / 2, T - BOARD], [W / 2, T], [-W / 2, T]] as V2[]).map(pose.apply);
      for (let i = 0; i < 4; i++) for (let k = 0; k <= 40; k++) {
        const A = corners[i], B = corners[(i + 1) % 4], q: V2 = [A[0] + (B[0] - A[0]) * k / 40, A[1] + (B[1] - A[1]) * k / 40];
        expect(inBlock(q), `e=${e} board ${q}`).toBe(false);
        expect(q[1], `e=${e} board above table`).toBeGreaterThan(-FAB);
      }
    }
  });
  it("open cover rests left of the spine, lower than the pages, far edge on the table", () => {
    expect(A_END).toBeGreaterThan(Math.PI);
    expect(Q_END[0]).toBeLessThan(-W / 2 - SPINE_RX);
    expect(COVER_INSIDE.a[1]).toBeLessThan(BLOCK.y1);
    expect(COVER_INSIDE.b[1]).toBeLessThan(COVER_INSIDE.a[1]);
  });
});

describe("turning sheets", () => {
  const ps = Array.from({ length: 21 }, (_, i) => i / 20);
  it("rest on the block when closed and on the open cover when open", () => {
    for (let k = 0; k < SHEETS; k++) {
      for (const q of sheetCurve(k, 0).pts) if (q[0] < BLOCK.x1) expect(q[1], `k=${k} right`).toBeGreaterThan(blockTop(q[0]) - 1e-6);
      for (const q of sheetCurve(k, 1).pts) if (q[0] < COVER_INSIDE.a[0]) expect(q[1], `k=${k} left`).toBeGreaterThan(COVER_INSIDE.y(q[0]) - 1e-6);
    }
  });
  it("never dive into the page block while turning", () => {
    for (let k = 0; k < SHEETS; k++) for (const p of ps) for (const q of sheetCurve(k, p).pts) expect(inBlock(q, 0.02), `k=${k} p=${p} ${q}`).toBe(false);
  });
  it("stay above the knit joint when open (pages cover the gutter, not the fabric)", () => {
    const joint = sleevePath(1).filter(q => q.seg === 1);
    for (let k = 0; k < SHEETS; k++) {
      const sh = sheetCurve(k, 1).pts;
      for (const j of joint) {
        const above = sh.filter(q => Math.abs(q[0] - j.p[0]) < 0.3);
        for (const q of above) expect(q[1], `k=${k} sheet over joint at x=${j.p[0].toFixed(2)}`).toBeGreaterThan(j.p[1] + H);
      }
    }
  });
  it("bow while turning and are flat-ish at rest", () => {
    const bow = (p: number) => { const h = sheetCurve(0, p).heads; return Math.max(...h) - Math.min(...h); };
    expect(bow(0.5)).toBeGreaterThan(0.6);
    expect(bow(0)).toBeLessThan(0.6);
  });
  it("keep the depth of the book", () => { expect(BLOCK.z1 - BLOCK.z0).toBeCloseTo(D - 0.6, 5); });
});
