// The drawing measured, not guessed (Kim: ChatGPT drew my bag right, why can't you?). The AI read a few numbers
// off the picture ("about 24cm wide, round-ish") and the 3D came out a box. The outline is all there in the
// pixels, so it is measured here: the width of the drawn piece on every row, bottom to top, is the body's curve;
// where the drawing opens into a hole (the space under a handle) or narrows into a strap, the body ends and the
// handle begins. The AI keeps what only it can tell - colours, a flap, a button, how big the piece is meant to be.
import type { ShapeSpec } from "./sketchShape";

type Mask = { w: number; h: number; on: (x: number, y: number) => boolean };
export type Measured = {
  /** widths from the bottom to the opening, the widest 1 (7 of them) */
  profile: number[];
  widePx: number;
  bodyPx: number;
  /** the opening's width (px), for a handle across it */
  openPx: number;
  /** a loop over the opening, or a strap rising from it, and how long (px, along the handle) */
  handle: { kind: "loop" | "strap"; lenPx: number } | null;
};

/** the drawn piece as a mask: the ink itself when the piece is coloured in (holes stay holes); for a bare outline,
 *  everything the outline closes in */
export function maskOf(rgba: Uint8ClampedArray, w: number, h: number): Mask | null {
  const ink = new Uint8Array(w * h); let n = 0;
  // ink: drawn, and not paper-white (a photo or scan brought onto the sheet has its white paper too)
  for (let i = 0; i < w * h; i++) { const j = i * 4; if (rgba[j + 3] > 40 && !(rgba[j] > 232 && rgba[j + 1] > 232 && rgba[j + 2] > 228)) { ink[i] = 1; n++; } }
  if (n < 50) return null;
  // the paper reachable from the edge without crossing ink is outside
  const out = new Uint8Array(w * h), st: number[] = [];
  for (let x = 0; x < w; x++) st.push(x, x + (h - 1) * w);
  for (let y = 0; y < h; y++) st.push(y * w, y * w + w - 1);
  while (st.length) { const k = st.pop()!; if (out[k] || ink[k]) continue; out[k] = 1; const x = k % w; if (x > 0) st.push(k - 1); if (x < w - 1) st.push(k + 1); if (k >= w) st.push(k - w); if (k < w * (h - 1)) st.push(k + w); }
  let inside = 0; for (let i = 0; i < w * h; i++) if (!out[i]) inside++;
  const filled = n / Math.max(1, inside) > .55;
  return { w, h, on: filled ? (x, y) => ink[y * w + x] === 1 : (x, y) => out[y * w + x] === 0 };
}

/** one row: its runs of the piece [from, to] */
function runs(m: Mask, y: number): [number, number][] {
  const r: [number, number][] = []; let s = -1;
  for (let x = 0; x < m.w; x++) { const o = m.on(x, y); if (o && s < 0) s = x; if (!o && s >= 0) { r.push([s, x - 1]); s = -1; } }
  if (s >= 0) r.push([s, m.w - 1]);
  return r;
}

export function measure(m: Mask): Measured | null {
  const rows: [number, number][][] = []; let top = -1, bot = -1;
  for (let y = 0; y < m.h; y++) { const r = runs(m, y); rows.push(r); if (r.length) { if (top < 0) top = y; bot = y; } }
  if (top < 0 || bot - top < 8) return null;
  const span = (r: [number, number][]) => r.length ? r[r.length - 1][1] - r[0][0] + 1 : 0;
  // a gap inside a row (the paper under a handle) wider than a pen line, beside ink on both sides
  const gapped = (r: [number, number][], wide: number) => { for (let i = 1; i < r.length; i++) if (r[i][0] - r[i - 1][1] > Math.max(8, wide * .08)) return true; return false; };
  // up from the bottom: the body goes on while a row is whole and not much narrower than the body so far
  let wide = 0, end = bot;
  for (let y = bot; y >= top; y--) {
    const r = rows[y], sp = span(r);
    if (!sp) continue;
    if (y < bot - 6 && (gapped(r, wide) || sp < wide * .35)) break;
    wide = Math.max(wide, sp); end = y;
  }
  const bodyPx = bot - end + 1;
  if (bodyPx < 8 || wide < 8) return null;
  // the widths at 7 heights (each the mean of a few rows; the very bottom is a curve's tip, so it starts a little up)
  const prof: number[] = [];
  for (let i = 0; i < 7; i++) {
    const y = Math.round(bot - (.04 + .92 * i / 6) * (bodyPx - 1)); let s = 0, c = 0;
    for (let d = -2; d <= 2; d++) { const yy = Math.min(bot, Math.max(end, y + d)), sp = span(rows[yy]); if (sp) { s += sp; c++; } }
    prof.push(c ? s / c : 0);
  }
  const pm = Math.max(...prof) || 1, openPx = span(rows[end]);
  // above the body: a ring (a loop handle over the opening) or a narrow band (a strap)
  let handle: Measured["handle"] = null;
  const hPx = end - top;
  if (hPx > 6) {
    let ring = 0, band = 0, bandW = 0;
    for (let y = top; y < end; y++) { const r = rows[y]; if (!r.length) continue; if (gapped(r, wide) || r.length > 1) ring++; else { band++; bandW += span(r); } }
    if (ring >= band) {
      // half an ellipse over the opening (Ramanujan), along the handle's middle
      const a = openPx / 2, b = hPx;
      handle = { kind: "loop", lenPx: Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b))) / 2 };
    } else if (band && bandW / band < wide * .45) handle = { kind: "strap", lenPx: hPx * 2 }; // seen from the front, a strap's loop is both its sides
  }
  return { profile: prof.map(v => Math.round(v / pm * 1000) / 1000), widePx: wide, bodyPx, openPx, handle };
}

/** the AI's reading, with the measured outline put in its place */
export function withMeasure(s: ShapeSpec, front: Measured | null, side: Measured | null): ShapeSpec {
  if (!front) return s;
  const W = s.widthCm > 0 ? s.widthCm : 24, cm = W / front.widePx;
  const curved = Math.max(...front.profile) - Math.min(...front.profile) > .12;
  const out: ShapeSpec = { ...s, widthCm: W, heightCm: Math.max(2, Math.round(front.bodyPx * cm)), profile: front.profile };
  if (curved) { out.rounded = true; out.topWidthCm = undefined; out.body = "straight"; }
  // the side drawn as well: its depth against its own height, the height the front's
  if (side && side.bodyPx > 0) out.depthCm = Math.max(2, Math.round(side.widePx * (out.heightCm / side.bodyPx)));
  // a handle drawn makes it a bag (a "basket" or "pouch" has none to carry it by)
  if (front.handle) { out.handles = 1; out.handleCm = Math.round(front.handle.lenPx * cm); if (out.kind !== "bag") out.kind = "bag"; }
  return out;
}
