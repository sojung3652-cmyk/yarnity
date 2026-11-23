import { describe, expect, it } from "vitest";
import { RECIPES } from "@/lib/stitchCharts";
import { STITCH_PATTERNS } from "@/lib/stitchPatterns";

describe("stitch charts", () => {
  it("every recipe builds a chart with finite points and some stitches", () => {
    for (const [name, r] of Object.entries(RECIPES)) {
      const c = r();
      expect(c.st.length + c.ch.length, name).toBeGreaterThan(8);
      for (const s of c.st) for (const v of [...s.b, ...s.t]) expect(Number.isFinite(v), name).toBe(true);
      for (const p of c.ch) expect(Number.isFinite(p[0]) && Number.isFinite(p[1]), name).toBe(true);
      expect(c.W > 0 && c.H > 0, name).toBe(true);
    }
  });
  it("every catalogue pattern is drawn", () => {
    const missing = STITCH_PATTERNS.filter(p => !p.draw).map(p => p.ko);
    expect(missing).toEqual([]);
  });
});
