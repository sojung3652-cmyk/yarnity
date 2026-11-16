// Geometry of the WebGL paper book. Pure math (no three.js), unit-tested in tests/book-geometry.test.ts.
//
// Units: cm. Book frame: lying on a table (y up), front cover facing +Y, spine on the left (-X),
// top edge of the book at -Z. The table is at y = -FAB (the book group is lifted by FAB).
//
// Knit sleeve = one fabric ribbon whose cross-section (a 2-D path in XY) is extruded along Z:
//   back (cream) -> SPINE BAND (lavender) -> front (cream, picture on top)
// The spine band is a strip of fixed length from the back board's spine edge (B, fixed) to the front
// board's spine edge (F). Closed, it follows a half ellipse around the page block; while the book
// opens its curvature relaxes in proportion, until at 180 degrees it lies flat on the table. The front
// cover is attached rigidly at the band's far end, along the band's direction there, so cover and
// spine can never separate and the cover angle is simply 180 degrees x opening progress.

export const W = 16;            // cover width   (4:5)
export const D = 20;            // cover height
export const T = 0.16 * W;      // thickness, board outside to board outside (16% of the width, 2.56cm)
export const BOARD = 0.3;       // board thickness
export const FAB = 0.25;        // knit thickness
export const H = FAB / 2;
export const SQUARE = 0.3;      // pages are inset this much from the boards
export const SPINE_RX = 0.25 * T; // rounded spine bulge, in proportion to the thickness
// Cover border: a flat lavender binding tape (design comp), 2.5% of the cover width across.
export const BORDER_HW = 0.025 * W / 2;   // half width (in the cover plane)
export const BORDER_HT = H + 0.04;         // half thickness (wraps the knit's raw edge)
export const BORDER_R = BORDER_HW;        // overall half extent (bounding boxes, caps)
export const SHEETS = 6;        // pages that turn
export const SHEET_GAP = 0.012; // paper thickness in the stack
export const DIP = 0.45;        // how far the top page curls down into the gutter
export const FORE_CONCAVE = 0.22; // fore edge of the page block is slightly hollow

// The tape is centred on the fabric's edge so it wraps the raw edge neatly.
export const BORDER_OUT = 0.04;                 // tape centre just outside the board edge
export const BORDER_Y_FRONT = T + H;            // centre height of the front tape (closed frame) = fabric centre
export const BORDER_Y_BACK = -H;
export const BORDER_CORNER = 0.6;               // corner radius (>= 2x the tape's thickness)
export const BORDER_TUCK = 0.25;                // border ends run this far under the spine cloth

export type V2 = [number, number];
/** The picture panel ends where the border begins, so the whole roundness of the border shows. */
export const PANEL_SIZE: V2 = [W + 2 * BORDER_OUT - 1.7 * BORDER_HW, D + 2 * BORDER_OUT - 1.7 * BORDER_HW];
const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const rotV = (v: V2, a: number): V2 => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)];

// ---- page block ----
export const BLOCK = { x0: -W / 2, x1: W / 2 - SQUARE, y0: BOARD, y1: T - BOARD - SHEETS * SHEET_GAP - 0.006, z0: -D / 2 + SQUARE, z1: D / 2 - SQUARE };
/** Height of the block's top surface at x: flat, curling down into the gutter near the spine. */
export const blockTop = (x: number) => BLOCK.y1 - DIP * (1 - smooth(0, 3, x - BLOCK.x0));
export const SHEET_W = BLOCK.x1 - BLOCK.x0 - 0.05; // a sheet reaches from the gutter to the fore edge
export const GUTTER_X = BLOCK.x0 + 0.04;

// ---- spine band ----
/** Back board's spine edge (fabric centre line): where the band starts. */
export const B: V2 = [-W / 2, -H];
/** Front board's spine edge (fabric centre line) in the closed position. */
export const Q0: V2 = [-W / 2, T + H];
export const N_BAND = 40;

/** Half ellipse around the spine (closed shape), resampled by arc length: heading of each piece. */
const ELLIPSE = (() => {
  const rx = SPINE_RX + H, ry = T / 2 + H, c: V2 = [-W / 2, T / 2], fine: V2[] = [];
  for (let i = 0; i <= 2000; i++) { const a = -Math.PI / 2 - Math.PI * i / 2000; fine.push([c[0] + rx * Math.cos(a), c[1] + ry * Math.sin(a)]); }
  const cum = [0]; for (let i = 1; i < fine.length; i++) cum.push(cum[i - 1] + Math.hypot(fine[i][0] - fine[i - 1][0], fine[i][1] - fine[i - 1][1]));
  const L = cum[cum.length - 1], heads: number[] = [];
  // heading of each of the N_BAND equal-length pieces, unwrapped from pi (leaving the back) down to 0
  for (let k = 0; k < N_BAND; k++) {
    const s = (k + 0.5) / N_BAND * L; let i = cum.findIndex(v => v >= s); i = Math.max(1, Math.min(fine.length - 1, i));
    let h = Math.atan2(fine[i][1] - fine[i - 1][1], fine[i][0] - fine[i - 1][0]); while (h < -1e-9) h += 2 * Math.PI;
    heads.push(h);
  }
  // remember the tiny integration error so the closed band ends exactly at Q0
  let p: V2 = [...B]; const step = L / N_BAND;
  for (const h of heads) p = [p[0] + Math.cos(h) * step, p[1] + Math.sin(h) * step];
  return { L, heads, err: [Q0[0] - p[0], Q0[1] - p[1]] as V2 };
})();
/** Length of the spine band (constant at every angle). */
export const BAND_L = ELLIPSE.L;

/** Spine band for opening progress w (0 closed .. 1 open flat): points B..F and the cover angle A. */
export function spineBand(w: number) {
  const step = BAND_L / N_BAND, pts: V2[] = [[...B]];
  let p: V2 = [...B];
  for (let k = 0; k < N_BAND; k++) {
    // closed: the heading turns from pi (leaving the back, going left) down to 0 (onto the front);
    // relaxing the turn by (1 - w) flattens the band, so at w = 1 it is a straight strip
    const h = Math.PI - (Math.PI - ELLIPSE.heads[k]) * (1 - w);
    p = [p[0] + Math.cos(h) * step, p[1] + Math.sin(h) * step];
    const f = (k + 1) / N_BAND * (1 - w); // closing-error correction, faded out as the band opens
    pts.push([p[0] + ELLIPSE.err[0] * f, p[1] + ELLIPSE.err[1] * f]);
  }
  return { pts, F: pts[pts.length - 1], A: Math.PI * w };
}

/** Rigid transform of the front cover for opening progress w: its spine edge rides on the band's end. */
export function coverPose(w: number) {
  const { F, A } = spineBand(w);
  // rotate the closed cover by A about Q0, then move Q0 onto F
  return { A, F, apply: (p: V2): V2 => { const r = rotV([p[0] - Q0[0], p[1] - Q0[1]], A); return [F[0] + r[0], F[1] + r[1]]; } };
}

// ---- sleeve path (ribbon cross-section) ----
export interface PathPoint { p: V2; n: V2; u: number; seg: 0 | 1 | 2 } // seg: 0 back, 1 spine band, 2 front
const N_BACK = 24, N_FRONT = 24;

/** Sleeve centre line for opening progress w. Same point count at every w; texture u never slides. */
export function sleevePath(w: number): PathPoint[] {
  const pose = coverPose(w), band = spineBand(w).pts, pts: { p: V2; seg: 0 | 1 | 2; u: number }[] = [];
  for (let i = 0; i <= N_BACK; i++) pts.push({ p: [lerp(W / 2, -W / 2, i / N_BACK), -H], seg: 0, u: W * i / N_BACK });
  for (let k = 1; k <= N_BAND; k++) pts.push({ p: band[k], seg: 1, u: W + BAND_L * k / N_BAND });
  for (let i = 1; i <= N_FRONT; i++) pts.push({ p: pose.apply([lerp(-W / 2, W / 2, i / N_FRONT), T + H]), seg: 2, u: W + BAND_L + W * i / N_FRONT });
  // u is arc length along the fabric: the band's length never changes, so stitches stay put
  return pts.map((q, i) => {
    const a = pts[Math.max(0, i - 1)].p, b = pts[Math.min(pts.length - 1, i + 1)].p;
    const tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1;
    return { p: q.p, n: [-ty / l, tx / l], u: q.u, seg: q.seg };
  });
}

/** Spine-edge yarn path: the band, extended a little under both covers' borders so they overlap. */
export function spineYarn(w: number): PathPoint[] {
  const all = sleevePath(w), pts = all.slice(N_BACK, N_BACK + N_BAND + 2); // back's spine end .. front's spine end
  const first = pts[0], last = pts[pts.length - 1];
  const t0: V2 = [pts[1].p[0] - first.p[0], pts[1].p[1] - first.p[1]], l0 = Math.hypot(...t0);
  const t1: V2 = [last.p[0] - pts[pts.length - 2].p[0], last.p[1] - pts[pts.length - 2].p[1]], l1 = Math.hypot(...t1);
  const pre: PathPoint = { ...first, p: [first.p[0] - t0[0] / l0 * BORDER_TUCK, first.p[1] - t0[1] / l0 * BORDER_TUCK], u: first.u - BORDER_TUCK };
  const post: PathPoint = { ...last, p: [last.p[0] + t1[0] / l1 * BORDER_TUCK, last.p[1] + t1[1] / l1 * BORDER_TUCK], u: last.u + BORDER_TUCK };
  return [pre, ...pts, post];
}

// ---- turning sheets ----
// A sheet is a curve of arc length SHEET_W from the gutter, described by its heading a(s). All sheets
// share one binding point (the gutter); their stacking offset grows away from it, so they never cross.
// Resting on the right a sheet follows the block top (curling into the gutter); resting on the left it
// slopes down from the gutter onto the open cover. While turning the heading blends from one to the
// other with the outer part lagging, so the sheet bows like paper and is flat again at rest.
export const NS = 64; // fine enough that the curl out of the gutter shades smoothly (28 left a visible crease)

function curveHeadings(pts: V2[]): number[] {
  const a: number[] = [];
  for (let i = 0; i < pts.length - 1; i++) a.push(Math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0]));
  return a;
}
/** Resample a polyline into NS equal pieces of total length SHEET_W. */
function resample(poly: V2[]): V2[] {
  const out: V2[] = [poly[0]], step = SHEET_W / NS; let need = step, i = 0, cur = poly[0];
  while (out.length <= NS) {
    const nx = poly[Math.min(i + 1, poly.length - 1)], seg = Math.hypot(nx[0] - cur[0], nx[1] - cur[1]);
    if (i >= poly.length - 1) { const a = out[out.length - 1], b = out[out.length - 2] ?? poly[0]; const dx = a[0] - b[0], dy = a[1] - b[1], l = Math.hypot(dx, dy) || 1; out.push([a[0] + dx / l * step, a[1] + dy / l * step]); continue; }
    if (seg >= need) { const t = need / seg; cur = [cur[0] + (nx[0] - cur[0]) * t, cur[1] + (nx[1] - cur[1]) * t]; out.push(cur); need = step; }
    else { need -= seg; cur = nx; i++; }
  }
  return out;
}
/** The common binding point of all sheets, at the bottom of the gutter curl. */
export const GUTTER: V2 = [GUTTER_X, blockTop(GUTTER_X) + 0.004];
const rightOff = (k: number) => (SHEETS - k) * SHEET_GAP + 0.006;
const leftOff = (k: number) => (k + 1) * SHEET_GAP + 0.006;

/** Open cover's inside surface: it lies flat on the table, left of the flattened spine. */
const openCover = coverPose(1);
export const COVER_INSIDE = (() => {
  const a = openCover.apply([-W / 2, T - BOARD]), b = openCover.apply([W / 2, T - BOARD]);
  return { a, b, y: (x: number) => a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]) };
})();

function restRight(k: number): number[] {
  // stack offset grows from 0 at the binding to full 1.5cm away: sheets meet at the gutter, never cross
  const pts: V2[] = [];
  for (let i = 0; i <= 240; i++) { const x = GUTTER[0] + (SHEET_W + 1) * i / 240; pts.push([x, blockTop(x) + 0.004 + rightOff(k) * smooth(0, 1.5, x - GUTTER[0])]); }
  return curveHeadings(resample(pts));
}
// One base curve for the left stack: from the binding, curl down out of the gutter and land on the open
// cover a little left of its spine edge. Every sheet is this curve lifted by its stack offset (growing
// away from the binding), so the sheets are parallel and can never poke through each other.
const LEFT_BASE = (() => {
  // height above the open cover blends from the gutter down to the cover with a smootherstep: its
  // curvature is continuous too, so the curl shades without a crease line where it meets the flat part
  const run = GUTTER[0] - (COVER_INSIDE.a[0] - 1.4), pts: V2[] = [];
  const s5 = (t: number) => { const u = Math.min(1, Math.max(0, t)); return u * u * u * (u * (u * 6 - 15) + 10); };
  for (let i = 0; i <= 400; i++) {
    const x = GUTTER[0] - (SHEET_W + 2) * i / 400, cy = COVER_INSIDE.y(x);
    pts.push([x, cy + (GUTTER[1] - cy) * (1 - s5((GUTTER[0] - x) / run))]);
  }
  const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, cum };
})();
function restLeft(k: number): number[] {
  const pts = LEFT_BASE.pts.map((p, i): V2 => [p[0], p[1] + leftOff(k) * smooth(0, 1.5, LEFT_BASE.cum[i])]);
  return curveHeadings(resample(pts));
}
const REST = Array.from({ length: SHEETS + 1 }, (_, k) => ({ r: restRight(k), l: k < SHEETS ? restLeft(k) : null }));

/** Sheet centre line for sheet k at turn progress p (0 = on the right, 1 = on the left). */
export function sheetCurve(k: number, p: number): { pts: V2[]; heads: number[] } {
  const { r, l } = REST[k], pts: V2[] = [[...GUTTER]], heads: number[] = [];
  for (let i = 0; i < NS; i++) {
    const s = (i + 0.5) / NS;
    // inner part leads, outer part lags behind (cylindrical bow), flat again at both ends
    const w = l ? Math.min(1, Math.max(0, p - 0.42 * Math.sin(Math.PI * p) * Math.pow(s, 0.9))) : 0;
    // always turn counter-clockwise (up and over), never down through the block
    let delta = l ? l[i] - r[i] : 0; while (delta < 0) delta += 2 * Math.PI;
    const a = r[i] + delta * w;
    heads.push(a);
    const prev = pts[pts.length - 1], st = SHEET_W / NS;
    pts.push([prev[0] + Math.cos(a) * st, prev[1] + Math.sin(a) * st]);
  }
  return { pts, heads };
}
