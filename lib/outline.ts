// A drawn body's own shape in space (Kim: the 3D came out a lemon, not the bag I drew). The drawing is the
// answer: at every height the body is as wide as the drawing is there. So the 3D no longer lets the stitches
// settle into whatever their counts give and then bends the result; every round is laid on this surface.
//   prof   the drawn widths from the bottom to the opening (lib/sketchMeasure), any scale
//   a, h   the bottom's width and the body's height in cm (the pattern's own: lib/pattern PlanInput)
//   depth  depth against width at evenly spaced heights
// Rounds are worked along the wall, so a round's place is a share of the wall's length (as lib/pattern counts
// its rows), not of the height.
import { profAt } from "./pattern";

export interface Outline { prof: number[]; a: number; h: number; depth: number[]; bottom: number; rounds: number }

/** the wall's curve: [half-width, height] in cm at a share (0-1) of its length */
export function wallCurve(o: Pick<Outline, "prof" | "a" | "h">) {
  const N = 60, R0 = o.a / 2 / o.prof[0], pts: [number, number][] = [];
  for (let i = 0; i <= N; i++) { const t = i / N; pts.push([R0 * profAt(o.prof, t), o.h * t]); }
  const acc = [0]; for (let i = 1; i <= N; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return (s: number): [number, number] => {
    const sv = Math.min(1, Math.max(0, s)) * acc[N]; let i = 1; while (i < N && acc[i] < sv) i++;
    const f = (sv - acc[i - 1]) / Math.max(1e-9, acc[i] - acc[i - 1]);
    return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f];
  };
}

/** A round's section: half its width and half its depth (cm) and its height, for the round `r` (0 = the first)
 *  of `o.rounds`; the first `o.bottom` rounds lie flat, growing out to the bottom's edge. */
export function roundSection(o: Outline, r: number): { hw: number; hd: number; y: number } {
  const dAt = (t: number) => Math.max(.12, Math.min(1.2, profAt(o.depth.length >= 2 ? o.depth : [.35, .35], t)));
  const wall = wallCurve(o), body = Math.max(1, o.rounds - o.bottom);
  if (r < o.bottom) { const k = (r + 1) / Math.max(1, o.bottom), [hw] = wall(0); return { hw: hw * k, hd: hw * k * dAt(0), y: 0 }; }
  const s = body <= 1 ? 1 : (r - o.bottom) / (body - 1), [hw, y] = wall(s);
  return { hw, hd: hw * dAt(y / Math.max(1e-9, o.h)), y };
}

/** `n` points evenly spaced round an ellipse (half-axes a along x, b along z), from angle 0, by arc length */
export function ellipseRing(a: number, b: number, n: number): [number, number][] {
  const M = 360, acc = [0]; let px = a, pz = 0;
  for (let i = 1; i <= M; i++) { const t = i / M * Math.PI * 2, x = a * Math.cos(t), z = b * Math.sin(t); acc.push(acc[i - 1] + Math.hypot(x - px, z - pz)); px = x; pz = z; }
  const out: [number, number][] = []; let j = 0;
  for (let k = 0; k < n; k++) { const want = acc[M] * k / n; while (j < M && acc[j + 1] < want) j++; const f = (want - acc[j]) / Math.max(1e-9, acc[j + 1] - acc[j]), t = (j + f) / M * Math.PI * 2; out.push([a * Math.cos(t), b * Math.sin(t)]); }
  return out;
}
