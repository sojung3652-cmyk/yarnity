import { describe, it, expect } from "vitest";
import { maskOf, measure } from "../lib/sketchMeasure";

// a picture painted from a test: (x, y) => is there ink
const paint = (S: number, f: (x: number, y: number) => boolean) => { const d = new Uint8ClampedArray(S * S * 4); for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (f(x, y)) d[(y * S + x) * 4 + 3] = 255; return d; };

describe("measuring a drawn piece", () => {
  it("an egg-shaped bag with a loop handle over its opening: a curved body and a loop", () => {
    const S = 200, cx = 100;
    // the outer egg (rx 60, ry 85, centre y 110) coloured in, the space under the handle left bare
    const d = paint(S, (x, y) => { const e = ((x - cx) / 60) ** 2 + ((y - 110) / 85) ** 2 <= 1, hole = y < 110 && ((x - cx) / 48) ** 2 + ((y - 110) / 72) ** 2 < 1; return e && !hole; });
    const m = measure(maskOf(d, S, S)!)!;
    expect(m.handle?.kind).toBe("loop");
    expect(m.bodyPx).toBeGreaterThan(70); expect(m.bodyPx).toBeLessThan(95);
    expect(Math.max(...m.profile) - Math.min(...m.profile)).toBeGreaterThan(.12); // curved, not a box
    expect(m.profile[0]).toBeLessThan(.75); // the bottom rounds in
  });
  it("a knot bag: a teardrop body and one strap rising from it", () => {
    const S = 200;
    const d = paint(S, (x, y) => (y >= 80 && y <= 190 && Math.abs(x - 100) <= 15 + (y - 80) * .6 * Math.sin(Math.min(1, (190 - y) / 25) * Math.PI / 2)) || (y >= 20 && y < 80 && x >= 92 && x <= 106));
    const m = measure(maskOf(d, S, S)!)!;
    expect(m.handle?.kind).toBe("strap");
    expect(m.bodyPx).toBeGreaterThan(80);
  });
  it("a bare outline is filled in", () => {
    const S = 120; const d = paint(S, (x, y) => { const r = Math.hypot(x - 60, y - 60); return r <= 40 && r >= 37; });
    const m = measure(maskOf(d, S, S)!)!;
    expect(m.widePx).toBeGreaterThan(75); expect(m.handle).toBeNull();
  });
});
