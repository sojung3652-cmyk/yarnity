import { describe, expect, it } from "vitest";
import {
  B, BAND_L, BLOCK, blockTop, BOARD, BORDER_R, BORDER_TUCK, BORDER_Y_BACK, BORDER_Y_FRONT, coverPose, COVER_INSIDE, D, FAB, H, N_BAND,
  sheetCurve, SHEETS, sleevePath, spineBand, spineYarn, T, W, type V2,
} from "@/components/Book/three/geometry";

const ws = Array.from({ length: 51 }, (_, i) => i / 50);
const inBlock = ([x, y]: V2, m = 0.01) => x > BLOCK.x0 + m && x < BLOCK.x1 - m && y > BLOCK.y0 + m && y < blockTop(x) - m;
const inBackBoard = ([x, y]: V2) => x > -W / 2 + 0.01 && x < W / 2 - 0.01 && y > 0.01 && y < BOARD - 0.01;
const distToPolyline = (q: V2, pts: V2[]) => {
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1e-9;
    const t = Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / l2));
    best = Math.min(best, Math.hypot(q[0] - a[0] - t * dx, q[1] - a[1] - t * dy));
  }
  return best;
};

describe("proportions", () => {
  it("4:5 cover, thickness 16% of the width, border 4-5% of the width", () => {
    expect(W / D).toBeCloseTo(0.8, 5);
    expect(T / W).toBeCloseTo(0.16, 5);
    expect((2 * BORDER_R) / W).toBeGreaterThanOrEqual(0.04);
    expect((2 * BORDER_R) / W).toBeLessThanOrEqual(0.05);
  });
});

describe("spine band", () => {
  it("keeps its length at every angle (it is cloth: it bends, it does not stretch)", () => {
    for (const w of ws) {
      const p = spineBand(w).pts; let L = 0;
      for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
      expect(L, `w=${w}`).toBeCloseTo(BAND_L, 1);
    }
  });
  it("is a half round around the block when closed, ending exactly at the front cover", () => {
    const { F, A, pts } = spineBand(0);
    expect(F[0]).toBeCloseTo(-W / 2, 6); expect(F[1]).toBeCloseTo(T + H, 6); expect(A).toBe(0);
    expect(Math.min(...pts.map(p => p[0]))).toBeLessThan(-W / 2 - 0.5); // bulges out
  });
  it("lies flat on the table when fully open, the cover beside it", () => {
    const { pts, A } = spineBand(1);
    for (const p of pts) expect(p[1]).toBeCloseTo(-H, 3);
    expect(A).toBeCloseTo(Math.PI, 9);
    expect(COVER_INSIDE.a[1]).toBeCloseTo(BOARD, 3); // cover lies flat, inside up
    expect(COVER_INSIDE.a[1]).toBeLessThan(BLOCK.y1); // left side lower than the pages
  });
  it("cover angle grows steadily with progress (0 to 180 degrees)", () => {
    let prev = -1;
    for (const w of ws) { const a = coverPose(w).A; expect(a).toBeGreaterThan(prev); prev = a; }
  });
});

describe("sleeve", () => {
  it("same point count at every angle", () => {
    const n = sleevePath(0).length;
    for (const w of ws) expect(sleevePath(w).length).toBe(n);
  });
  it("has no tears, and its texture never slides", () => {
    const u0 = sleevePath(0).map(q => q.u);
    for (const w of ws) {
      const p = sleevePath(w);
      for (let i = 1; i < p.length; i++) expect(Math.hypot(p[i].p[0] - p[i - 1].p[0], p[i].p[1] - p[i - 1].p[1]), `w=${w} i=${i}`).toBeLessThan(0.75);
      p.forEach((q, i) => expect(q.u).toBe(u0[i]));
    }
  });
  it("fabric never passes through the page block, the back board or the table", () => {
    for (const w of ws) for (const { p, n } of sleevePath(w)) for (const s of [-H, 0, H]) {
      const q: V2 = [p[0] + n[0] * s, p[1] + n[1] * s];
      expect(inBlock(q), `w=${w} ${q}`).toBe(false);
      expect(inBackBoard(q), `w=${w} ${q}`).toBe(false);
      expect(q[1], `w=${w}`).toBeGreaterThan(-FAB - 0.02);
    }
  });
  it("front board never passes through the block or the table", () => {
    for (const w of ws) {
      const pose = coverPose(w);
      const cs = ([[-W / 2, T - BOARD], [W / 2, T - BOARD], [W / 2, T], [-W / 2, T]] as V2[]).map(pose.apply);
      for (let i = 0; i < 4; i++) for (let k = 0; k <= 40; k++) {
        const a = cs[i], b = cs[(i + 1) % 4], q: V2 = [a[0] + (b[0] - a[0]) * k / 40, a[1] + (b[1] - a[1]) * k / 40];
        expect(inBlock(q), `w=${w} board ${q}`).toBe(false);
        expect(q[1], `w=${w} board above table`).toBeGreaterThan(-FAB - 0.01);
      }
    }
  });
});

describe("borders meet the spine yarn", () => {
  it("at every angle both ends of the spine yarn overlap the cover borders (no gap)", () => {
    for (const w of ws) {
      const yarn = spineYarn(w).map(q => q.p), pose = coverPose(w);
      // border ends (centre line) tuck BORDER_TUCK past each cover's spine edge
      const backEnd: V2 = [-W / 2 - BORDER_TUCK, BORDER_Y_BACK];
      const frontEnd = pose.apply([-W / 2 - BORDER_TUCK, BORDER_Y_FRONT]);
      expect(distToPolyline(backEnd, yarn), `w=${w} back`).toBeLessThan(BORDER_R * 0.6);
      expect(distToPolyline(frontEnd, yarn), `w=${w} front`).toBeLessThan(BORDER_R * 0.6);
    }
  });
  it("spine yarn has the band's points plus a tuck at each end", () => {
    expect(spineYarn(0).length).toBe(N_BAND + 2 + 2);
    expect(spineYarn(0)[1].p).toEqual([B[0], B[1]]);
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
  it("never cross each other at rest (stacked in order away from the binding)", () => {
    const at = (k: number, p: number, i: number) => sheetCurve(k, p).pts[i];
    for (let i = 8; i <= 64; i++) for (let k = 0; k < SHEETS - 1; k++) {
      expect(at(k, 0, i)[1], `right stack i=${i} k=${k}`).toBeGreaterThan(at(k + 1, 0, i)[1]); // k on top of k+1
      expect(at(k + 1, 1, i)[1], `left stack i=${i} k=${k}`).toBeGreaterThan(at(k, 1, i)[1]); // last turned on top
    }
  });
  it("stay above the flattened spine and the open cover's spine edge", () => {
    const band = spineBand(1).pts;
    for (let k = 0; k < SHEETS; k++) for (const q of sheetCurve(k, 1).pts) for (const b of band) if (Math.abs(q[0] - b[0]) < 0.2) expect(q[1]).toBeGreaterThan(b[1] + FAB);
  });
  it("bow while turning and are flat-ish at rest", () => {
    const bow = (p: number) => { const h = sheetCurve(0, p).heads; return Math.max(...h) - Math.min(...h); };
    expect(bow(0.5)).toBeGreaterThan(0.6);
    expect(bow(0)).toBeLessThan(0.6);
  });
});
