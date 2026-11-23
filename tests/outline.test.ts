import { describe, expect, it } from "vitest";
import { roundSection, type Outline } from "../lib/outline";
import { profAt } from "../lib/pattern";

// the 3D's front view must be the drawing: at every round's height the body is as wide as the drawn width there
const shapes: Record<string, number[]> = {
  "half-moon (wide at the top)": [.3, .62, .82, .93, .98, 1, .99],
  "hobo (swells, gathers)": [.55, .85, 1, .98, .85, .7, .6],
  "bucket (straight)": [.8, .82, .84, .86, .88, .9, .92],
  "vase (narrow neck)": [.5, .9, 1, .8, .5, .35, .4],
};
describe("a drawn body laid on its own outline", () => {
  for (const [name, prof] of Object.entries(shapes)) it(name, () => {
    const o: Outline = { prof, a: 24 * prof[0], h: 16, depth: [.5, .4, .35, .35], bottom: 6, rounds: 40 };
    let worst = 0;
    for (let r = o.bottom; r < o.rounds; r++) {
      const s = roundSection(o, r), drawn = 12 * profAt(prof, s.y / o.h);
      worst = Math.max(worst, Math.abs(s.hw - drawn) / 12);
      expect(s.hd).toBeLessThanOrEqual(s.hw * 1.2 + 1e-9);
    }
    expect(worst).toBeLessThan(.02); // within 2% of the piece's width
    expect(roundSection(o, o.rounds - 1).y).toBeCloseTo(16, 5); // the last round is the opening
    expect(roundSection(o, 0).y).toBe(0);
  });
});
