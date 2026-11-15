import { describe, expect, it } from "vitest";
import { BOARD, D, FAB, frontBoardCorners, H, OPEN_ANGLE, PAGES, sleevePath, SPINE_RX, T, W, type V2 } from "@/components/Book/three/geometry";

const angles = Array.from({ length: 41 }, (_, i) => (OPEN_ANGLE * i) / 40);
const insidePages = ([x, y]: V2, m = 0) => x > PAGES.x0 + m && x < PAGES.x1 - m && y > PAGES.y0 + m && y < PAGES.y1 - m;
// spine block: half ellipse left of x = -W/2
const insideSpine = ([x, y]: V2, m = 0) => x < -W / 2 && ((x + W / 2) / (SPINE_RX - m)) ** 2 + ((y - T / 2) / (T / 2 - m)) ** 2 < 1;

describe("sleeve path", () => {
  it("open angle is 180deg plus a small droop", () => {
    expect(OPEN_ANGLE).toBeGreaterThan(Math.PI);
    expect(OPEN_ANGLE).toBeLessThan(Math.PI + 0.5);
  });

  it("has the same vertex count at every angle (geometry is updated in place)", () => {
    const n = sleevePath(0).length;
    for (const a of angles) expect(sleevePath(a).length).toBe(n);
  });

  it("is continuous: no gaps or tears at any angle", () => {
    for (const a of angles) {
      const p = sleevePath(a);
      for (let i = 1; i < p.length; i++) expect(Math.hypot(p[i].p[0] - p[i - 1].p[0], p[i].p[1] - p[i - 1].p[1])).toBeLessThan(0.75);
    }
  });

  it("front texture coordinates do not slide while opening", () => {
    const u0 = sleevePath(0).filter(q => q.front).map(q => q.u), u1 = sleevePath(OPEN_ANGLE).filter(q => q.front).map(q => q.u);
    u1.forEach((u, i) => expect(u).toBeCloseTo(u0[i], 9));
  });

  it("fabric never passes through the page block, the spine or the table", () => {
    for (const a of angles) for (const { p, n } of sleevePath(a)) for (const s of [-H, 0, H]) {
      const q: V2 = [p[0] + n[0] * s, p[1] + n[1] * s];
      expect(insidePages(q, 0.01), `angle ${a.toFixed(2)} point ${q}`).toBe(false);
      expect(insideSpine(q, 0.01), `angle ${a.toFixed(2)} point ${q}`).toBe(false);
      expect(q[1]).toBeGreaterThan(-FAB - 0.05);
    }
  });

  it("front board never passes through the pages or below the table", () => {
    for (const a of angles) {
      const cs = frontBoardCorners(a);
      // sample the board's edges, not just its corners
      for (let i = 0; i < 4; i++) for (let k = 0; k <= 20; k++) {
        const A = cs[i], B = cs[(i + 1) % 4], q: V2 = [A[0] + (B[0] - A[0]) * k / 20, A[1] + (B[1] - A[1]) * k / 20];
        expect(insidePages(q, 0.01), `angle ${a.toFixed(2)} board ${q}`).toBe(false);
        expect(insideSpine(q, 0.01)).toBe(false);
        expect(q[1]).toBeGreaterThan(-FAB - 0.01);
      }
    }
  });

  it("closed: sleeve hugs the book (front flap rests on the pages, back on the table)", () => {
    const p = sleevePath(0);
    const ys = p.map(q => q.p[1]);
    expect(Math.min(...ys)).toBeCloseTo(-H, 5);
    expect(Math.max(...ys)).toBeCloseTo(T + H, 5);
    expect(PAGES.y1).toBeLessThan(T - BOARD - FAB);
    expect(D).toBe(20);
  });
});
