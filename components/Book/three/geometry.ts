// Geometry of the WebGL paper book. Pure math (no three.js), unit-tested in tests/book-geometry.test.ts.
//
// Units: cm. Book frame: lying on a table (y up), front cover facing +Y, spine on the left (-X),
// top edge of the book at -Z. The table is at y = -FAB (the book group is lifted by FAB).
//
// Knit sleeve: one fabric ribbon whose cross-section (a 2-D path in XY) is extruded along Z:
//   back (cream) -> rounded spine (lavender) -> JOINT (lavender) -> front (cream, picture on top)
// Opening a 4.8cm book about a fixed hinge would leave the open cover *above* the pages. Real books
// settle lower on the left, so while the cover opens, the point where the knit leaves the spine slides
// from the top of the spine to its left side and the cover comes to rest beside the spine, sloping
// down to the table. The joint is a smooth Hermite curve between the spine and the cover, so the
// fabric never tears, kinks or separates from the boards.

export const W = 16;            // cover width   (4:5)
export const D = 20;            // cover height
export const T = 0.16 * W;      // thickness, board outside to board outside (16% of the width, 2.56cm)
export const BOARD = 0.3;       // board thickness
export const FAB = 0.25;        // knit thickness
export const H = FAB / 2;
export const SQUARE = 0.3;      // pages are inset this much from the boards
export const SPINE_RX = 0.25 * T; // rounded spine bulge, in proportion to the thickness
export const BORDER_R = 0.045 * W / 2; // chain border: ~4.5% of the cover width across (spec ~4%, photo ~5%)
export const RHO = 0.3;         // bend radius of the joint while the cover lifts
export const SHEETS = 6;        // pages that turn
export const SHEET_GAP = 0.012; // paper thickness in the stack
export const DIP = 0.45;        // how far the top page curls down into the gutter
export const FORE_CONCAVE = 0.22; // fore edge of the page block is slightly hollow

export type V2 = [number, number];
const rot = (p: V2, a: number, c: V2): V2 => {
  const s = Math.sin(a), k = Math.cos(a), x = p[0] - c[0], y = p[1] - c[1];
  return [c[0] + x * k - y * s, c[1] + x * s + y * k];
};
const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Joint pivot while the cover lifts (just above the cover at the spine). */
export const P0: V2 = [-W / 2, T + H + RHO];
/** Outer-hinge corner of the front fabric in the closed position. */
export const Q0: V2 = [-W / 2, T + H];
/** Where that corner comes to rest when open: beside the spine, a little above its middle. */
export const Q_END: V2 = [-W / 2 - SPINE_RX - 0.55, T / 2 + 0.1];
const SPINE_C: V2 = [-W / 2, T / 2];
const SRX = SPINE_RX + H, SRY = T / 2 + H;

// ---- page block ----
export const BLOCK = { x0: -W / 2, x1: W / 2 - SQUARE, y0: BOARD, y1: T - BOARD - SHEETS * SHEET_GAP - 0.006, z0: -D / 2 + SQUARE, z1: D / 2 - SQUARE };
/** Height of the block's top surface at x: flat, curling down into the gutter near the spine. */
export const blockTop = (x: number) => BLOCK.y1 - DIP * (1 - smooth(0, 3, x - BLOCK.x0));
export const SHEET_W = BLOCK.x1 - BLOCK.x0 - 0.05; // a sheet reaches from the gutter to the fore edge
export const GUTTER_X = BLOCK.x0 + 0.04;

// ---- front cover pose ----
/** Rigid transform of the front cover for its progress e in [0,1]: rotate by A about P0, then slide. */
export function coverPose(e: number) {
  const A = A_END * e, slide = smooth(0.35, 1, e);
  const qRot = rot(Q0, A, P0), qEnd = rot(Q0, A_END, P0);
  const dx = (Q_END[0] - qEnd[0]) * slide, dy = (Q_END[1] - qEnd[1]) * slide;
  return { A, dx, dy, slide, apply: (p: V2): V2 => { const r = rot(p, A, P0); return [r[0] + dx, r[1] + dy]; }, q: [qRot[0] + dx, qRot[1] + dy] as V2 };
}

/** Points of the front cover outline (closed frame) that must stay above the table: far-edge border. */
// The chain border sits on the cover's edge, proud of the surface (as in the photo), not buried in the board.
export const BORDER_OUT = 0.12;                 // tube centre outside the board edge
export const BORDER_Y_FRONT = T + 0.1;          // centre height of the front border (closed frame)
export const BORDER_Y_BACK = -0.1;
/** The picture panel ends where the border begins, so the whole roundness of the border shows. */
export const PANEL_SIZE: V2 = [W + 2 * BORDER_OUT - 1.7 * BORDER_R, D + 2 * BORDER_OUT - 1.7 * BORDER_R];
const farEdge: V2[] = [[W / 2 + BORDER_OUT, BORDER_Y_FRONT]]; // far-edge border centre; lowest point = centre - BORDER_R

/** Fully open angle: 180 degrees plus the droop that lets the far edge rest on the table. */
export let A_END = Math.PI;
{
  let lo = Math.PI * 0.95, hi = Math.PI + 0.7;
  for (let i = 0; i < 50; i++) {
    const m = (lo + hi) / 2;
    // final transform = rotate about Q0 by m, then move Q0 to Q_END
    const low = Math.min(...farEdge.map(p => { const r = rot(p, m, Q0); return r[1] - Q0[1] + Q_END[1] - BORDER_R; }));
    if (low > -FAB + 0.01) lo = m; else hi = m;
  }
  A_END = lo;
}

// ---- sleeve path ----
export interface PathPoint { p: V2; n: V2; u: number; seg: 0 | 1 | 2 } // seg: 0 back, 1 spine+joint, 2 front

const N_BACK = 24, N_SPINE = 30, N_JOINT = 18, N_FRONT = 24;
export const SEG_RANGES = { back: [0, N_BACK + 1], spine: [N_BACK + 1, N_BACK + 1 + N_SPINE + N_JOINT], front: [N_BACK + 1 + N_SPINE + N_JOINT, N_BACK + 1 + N_SPINE + N_JOINT + N_FRONT] };
const U_FRONT = 60; // fixed texture offset of the front, so its stitches never slide

/** Spine detach angle (ellipse parameter, decreasing from -90 at the bottom): -270 = top, -180 = left side. */
const detachAngle = (e: number) => lerp(-1.5 * Math.PI, -Math.PI, smooth(0.25, 1, e));

function hermite(p0: V2, t0: V2, p1: V2, t1: V2, n: number): V2[] {
  const out: V2[] = [];
  for (let i = 1; i <= n; i++) {
    const s = i / n, s2 = s * s, s3 = s2 * s, h00 = 2 * s3 - 3 * s2 + 1, h10 = s3 - 2 * s2 + s, h01 = -2 * s3 + 3 * s2, h11 = s3 - s2;
    out.push([h00 * p0[0] + h10 * t0[0] + h01 * p1[0] + h11 * t1[0], h00 * p0[1] + h10 * t0[1] + h01 * p1[1] + h11 * t1[1]]);
  }
  return out;
}

/** Sleeve centre line for the cover progress e (0 closed, 1 open). Same point count for every e. */
export function sleevePath(e: number): PathPoint[] {
  const pose = coverPose(e), pts: { p: V2; seg: 0 | 1 | 2 }[] = [];
  for (let i = 0; i <= N_BACK; i++) pts.push({ p: [lerp(W / 2, -W / 2, i / N_BACK), -H], seg: 0 });
  const b1 = detachAngle(e);
  for (let i = 1; i <= N_SPINE; i++) { const a = lerp(-Math.PI / 2, b1, i / N_SPINE); pts.push({ p: [SPINE_C[0] + SRX * Math.cos(a), SPINE_C[1] + SRY * Math.sin(a)], seg: 1 }); }
  // joint: leaves the spine along its tangent, arrives along the cover
  const d = pts[pts.length - 1].p, tSpine: V2 = [Math.sin(b1) * SRX, -Math.cos(b1) * SRY], tl = Math.hypot(...tSpine);
  const q = pose.q, dir: V2 = [Math.cos(pose.A), Math.sin(pose.A)], dist = Math.hypot(q[0] - d[0], q[1] - d[1]), m = Math.max(0.2, dist * 1.1);
  for (const p of hermite(d, [tSpine[0] / tl * m, tSpine[1] / tl * m], q, [dir[0] * m, dir[1] * m], N_JOINT)) pts.push({ p, seg: 1 });
  for (let i = 1; i <= N_FRONT; i++) pts.push({ p: pose.apply([lerp(-W / 2, W / 2, i / N_FRONT), T + H]), seg: 2 });

  const out: PathPoint[] = [];
  let u = 0;
  const frontStart = SEG_RANGES.front[0], jointStart = frontStart - N_JOINT;
  pts.forEach((q, i) => {
    const a = pts[Math.max(0, i - 1)].p, b = pts[Math.min(pts.length - 1, i + 1)].p;
    const tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1;
    if (i) u += Math.hypot(q.p[0] - pts[i - 1].p[0], q.p[1] - pts[i - 1].p[1]);
    let uu = u;
    if (i >= frontStart) uu = U_FRONT + (i - frontStart + 1) * (W / N_FRONT);
    else if (i >= jointStart) uu = 0; // filled below
    out.push({ p: q.p, n: [-ty / l, tx / l], u: uu, seg: q.seg });
  });
  // joint texture coordinates: spread evenly between the spine end and the fixed front start
  const uS = out[jointStart - 1].u;
  for (let k = 0; k < N_JOINT; k++) out[jointStart + k].u = lerp(uS, U_FRONT, (k + 1) / (N_JOINT + 1));
  return out;
}

// ---- turning sheets ----
// A sheet is a curve of arc length SHEET_W from the gutter pivot, described by its heading angle a(s).
// Resting on the right it follows the block top (curling into the gutter); resting on the left it
// lies on the open cover. While turning, the heading blends from one to the other; the part near
// the spine leads and the outer part lags, so the sheet bows like paper and is flat again at rest.
export const NS = 28;

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

/** Stack height offset of sheet k (k = 0 is on top of the right stack and turns first). */
const rightOffset = (k: number) => (SHEETS - k) * SHEET_GAP + 0.006;
const leftOffset = (k: number) => (k + 1) * SHEET_GAP + 0.006;
export const gutterPivot = (k: number): V2 => [GUTTER_X, blockTop(GUTTER_X) + rightOffset(k)];

/** Open cover's inside surface, as a function of x (world), valid left of the joint. */
const openCover = coverPose(1);
const coverInside = (() => {
  const a = openCover.apply([-W / 2, T - BOARD]), b = openCover.apply([W / 2, T - BOARD]);
  return { a, b, y: (x: number) => a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]) };
})();
export const COVER_INSIDE = coverInside;

function restRight(k: number): number[] {
  const pts: V2[] = []; const g = gutterPivot(k);
  for (let i = 0; i <= 200; i++) { const x = g[0] + (SHEET_W + 1) * i / 200; pts.push([x, blockTop(x) + rightOffset(k)]); }
  return curveHeadings(resample(pts));
}
function restLeft(k: number): number[] {
  // from the gutter down onto the open cover (leaving room for the joint), then along the cover
  const g = gutterPivot(k), land = coverInside.a[0] - 1.2, off = leftOffset(k);
  const p1: V2 = [land, coverInside.y(land) + off], dirC: V2 = [coverInside.b[0] - coverInside.a[0], coverInside.b[1] - coverInside.a[1]];
  const dl = Math.hypot(...dirC), dc: V2 = [dirC[0] / dl, dirC[1] / dl], m = Math.hypot(p1[0] - g[0], p1[1] - g[1]) * 1.2;
  const pts: V2[] = [g, ...hermite(g, [-m, 0], p1, [dc[0] * m, dc[1] * m], 60)];
  for (let i = 1; i <= 60; i++) pts.push([p1[0] + dc[0] * SHEET_W * i / 60, p1[1] + dc[1] * SHEET_W * i / 60]);
  return curveHeadings(resample(pts));
}
const REST = Array.from({ length: SHEETS + 1 }, (_, k) => ({ r: restRight(k), l: k < SHEETS ? restLeft(k) : null }));

/** Sheet centre line for sheet k at turn progress p (0 = on the right, 1 = on the left). */
export function sheetCurve(k: number, p: number): { pts: V2[]; heads: number[] } {
  const { r, l } = REST[k], g = gutterPivot(k), pts: V2[] = [g], heads: number[] = [];
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
