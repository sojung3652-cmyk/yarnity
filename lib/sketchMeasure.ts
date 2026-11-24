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
  // ink: drawn, and not paper. A photo brought onto the sheet has its own background (Kim's test: a bag on a beige
  // wall): when the sheet's edge is mostly opaque, the edge's colour is the paper; otherwise paper is near-white
  // the photo's own edge (fitted onto the square sheet it leaves transparent bands): the box of what is opaque
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) if (rgba[(y * w + x) * 4 + 3] > 200) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  let er = 0, eg = 0, eb = 0, en = 0, edge = 0;
  if (x1 >= 0) {
    const at = (x: number, y: number) => { const j = (y * w + x) * 4; edge++; if (rgba[j + 3] > 200) { er += rgba[j]; eg += rgba[j + 1]; eb += rgba[j + 2]; en++; } };
    for (let x = x0; x <= x1; x++) { at(x, y0); at(x, y1); }
    for (let y = y0; y <= y1; y++) { at(x0, y); at(x1, y); }
  }
  // a photo: a large opaque box whose edge is opaque all round (a drawing's edge is bare paper, transparent)
  const photo = (x1 - x0) * (y1 - y0) > w * h * .4 && en > edge * .9, bg = photo ? [er / en, eg / en, eb / en] : null;
  // against a photo's background by hue, not by light: a light pink bag on a beige wall is near it in plain
  // distance but another hue; its shadow on the wall and floor is the wall's hue, only darker. Ink lines on paper
  // (a photo of a drawing) are far darker than any shadow.
  const hueSat = (r: number, g: number, b: number): [number, number] => {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), c = mx - mn; if (!c) return [0, 0];
    const hh = mx === r ? ((g - b) / c + 6) % 6 : mx === g ? (b - r) / c + 2 : (r - g) / c + 4;
    return [hh * 60, c / mx];
  };
  const bgH = bg ? hueSat(bg[0], bg[1], bg[2]) : null, bgL = bg ? (bg[0] + bg[1] + bg[2]) / 3 : 0;
  const paper = (j: number) => {
    const r = rgba[j], g = rgba[j + 1], b = rgba[j + 2];
    if (!bg || !bgH) return r > 232 && g > 232 && b > 228;
    if (bgL - (r + g + b) / 3 > 95) return false; // ink-dark
    const [hh, sat] = hueSat(r, g, b), dh = Math.min(Math.abs(hh - bgH[0]), 360 - Math.abs(hh - bgH[0]));
    return !(sat > .08 && dh > 14) && Math.abs(sat - bgH[1]) < .22;
  };
  for (let i = 0; i < w * h; i++) { const j = i * 4; if (rgba[j + 3] > 40 && !paper(j)) { ink[i] = 1; n++; } }
  if (n < 50) return null;
  // the paper reachable from the edge without crossing ink is outside. The lines are first thickened a little
  // (Kim's card wallet: a hand-drawn outline with a small break at a corner let the outside in, only the pen lines
  // were left as the piece, every row read as the hole under a handle - a handbag, round as a jar)
  const R = Math.max(3, Math.round(Math.min(w, h) / 90)), wall = new Uint8Array(w * h), tmp = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) { let last = -1e9; for (let x = 0; x < w; x++) { if (ink[y * w + x]) last = x; if (x - last <= R) tmp[y * w + x] = 1; } last = 1e9; for (let x = w - 1; x >= 0; x--) { if (ink[y * w + x]) last = x; if (last - x <= R) tmp[y * w + x] = 1; } }
  for (let x = 0; x < w; x++) { let last = -1e9; for (let y = 0; y < h; y++) { if (tmp[y * w + x]) last = y; if (y - last <= R) wall[y * w + x] = 1; } last = 1e9; for (let y = h - 1; y >= 0; y--) { if (tmp[y * w + x]) last = y; if (last - y <= R) wall[y * w + x] = 1; } }
  const out = new Uint8Array(w * h), st: number[] = [];
  for (let x = 0; x < w; x++) st.push(x, x + (h - 1) * w);
  for (let y = 0; y < h; y++) st.push(y * w, y * w + w - 1);
  while (st.length) { const k = st.pop()!; if (out[k] || wall[k]) continue; out[k] = 1; const x = k % w; if (x > 0) st.push(k - 1); if (x < w - 1) st.push(k + 1); if (k >= w) st.push(k - w); if (k < w * (h - 1)) st.push(k + w); }
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
  // a gap inside a row (the paper under a handle), wider than a pen line or a photo's speck, beside ink on both
  // sides; against the widest the drawing gets anywhere
  let W = 0; for (let y = top; y <= bot; y++) W = Math.max(W, span(rows[y]));
  const gapped = (r: [number, number][]) => { for (let i = 1; i < r.length; i++) if (r[i][0] - r[i - 1][1] > Math.max(10, W * .06)) return true; return false; };
  // up from the bottom: the body goes on while rows are whole and not much narrower than the body so far; it ends
  // where that stops for a few rows running (one ragged row is no handle)
  let wide = 0, end = bot, run = 0;
  for (let y = bot; y >= top; y--) {
    const r = rows[y], sp = span(r);
    if (!sp) continue;
    if (y < bot - 6 && (gapped(r) || sp < wide * .35)) { if (++run >= 4) break; continue; }
    run = 0; wide = Math.max(wide, sp); end = y;
  }
  const bodyPx = bot - end + 1;
  if (bodyPx < 8 || wide < 8) return null;
  // the widths at 7 heights (each the mean of a few rows; the very bottom is a curve's tip, so it starts a little up)
  // the top of the body without a handle's roots: where a handle joins, its legs widen the last rows, so those
  // rows may not stand out more than a little past the body a sixth of its height lower
  const refY = Math.min(bot, end + Math.round(bodyPx * .16)), ref = rows[refY], rl = ref.length ? ref[0][0] : 0, rr = ref.length ? ref[ref.length - 1][1] : m.w - 1, slack = W * .03;
  const bodySpan = (y: number) => { const r = rows[y]; if (!r.length) return 0; if (y >= refY) return span(r); const l = Math.max(r[0][0], rl - slack), rt = Math.min(r[r.length - 1][1], rr + slack); return Math.max(0, rt - l + 1); };
  const prof: number[] = [];
  for (let i = 0; i < 7; i++) {
    const y = Math.round(bot - (.04 + .92 * i / 6) * (bodyPx - 1)); let s = 0, c = 0;
    for (let d = -2; d <= 2; d++) { const yy = Math.min(bot, Math.max(end, y + d)), sp = bodySpan(yy); if (sp) { s += sp; c++; } }
    prof.push(c ? s / c : 0);
  }
  const pm = Math.max(...prof) || 1, openPx = span(rows[end]);
  // above the body: a ring (a loop handle over the opening) or a narrow band (a strap)
  let handle: Measured["handle"] = null;
  const hPx = end - top;
  if (hPx > 6) {
    let ring = 0, band = 0, bandW = 0;
    for (let y = top; y < end; y++) { const r = rows[y]; if (!r.length) continue; if (gapped(r)) ring++; else { band++; bandW += span(r); } }
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
  if (side && side.bodyPx > 0) {
    const sk = out.heightCm / side.bodyPx; // the side's cm a pixel: its body as high as the front's
    out.depthCm = Math.max(2, Math.round(side.widePx * sk));
    // depth against width at each height, for the 3D to press the body to
    out.depthProfile = front.profile.map((f, i) => Math.round(Math.max(.12, Math.min(1.2, (side.profile[i] * side.widePx * sk) / Math.max(1e-6, f * front.widePx * cm))) * 1000) / 1000);
  }
  // a handle drawn makes it a bag (a "basket" or "pouch" has none to carry it by)
  if (front.handle) { out.handles = 1; out.handleCm = Math.round(front.handle.lenPx * cm); if (out.kind !== "bag") out.kind = "bag"; }
  // nothing drawn above the body: no handle, whatever the AI guessed (Kim's card wallet got one)
  else { out.handles = 0; out.handleCm = undefined; }
  return out;
}
