// 모자·후드 기본형 (lib/wear) as they sit on a head: every stitch of the plan's own rows set where it lies when
// the piece is worn - a crown's rounds as a cap, a side as a ring under it, a brim sloping out, a hood's rows
// round the back of the head, strips hanging from its ends. The engine draws these places as they are (shape
// "form": nothing settles, so nothing waits), over a stand in a very pale colour (Kim: 받침은 아주 연한 색).
// Light: no three.js here. Units: cm, y up from the table, the front towards +z.
import { knitFold, knitTop } from "@/lib/knitwear";
import { balaclava, bonnet, bucketHat, bustier, earflap, halter, hoodScarf, kerchief, knotBag, moonBag, motifHat, motifScarf, bigSocks, trapBag, twoWay, type WearId } from "@/lib/wear";
import type { Plan, PlanInput } from "@/lib/pattern";
import type { FormCourse, WallStitch, YarnStand } from "./engine";

const TAU = Math.PI * 2;
type V3 = [number, number, number];
export interface Worn { courses: FormCourse[]; /** null: it stands by itself (a bag) */ stand: YarnStand | null; size: [number, number, number | null]; key: string; /** more colours than the yarn's: a seam's */ seam?: boolean;
  /** the colours its courses' indexes stand for, when not the yarn's alone: the yarn, the second yarn, a seam's */
  tones?: ("main" | "second" | "seam")[] }

/** a head as a lathe's outline ([radius, height] from the table up): a pole, a neck, a jaw, a skull as wide as
 *  `r` whose top is at `top` */
export function headProfile(r: number, top: number): [number, number][] {
  const out: [number, number][] = [[0, 0], [r * .8, 0], [r * .82, .5], [r * .78, 1], [r * .2, 1.4]], yNeck = top - 2.9 * r;
  if (yNeck > 2.4) out.push([r * .15, 2], [r * .15, yNeck - .6]);
  out.push([r * .44, Math.max(1.6, yNeck)], [r * .44, top - 2.4 * r]);
  for (let i = 0; i <= 8; i++) { const t = i / 8, d = 2.35 - .85 * t; out.push([r * (.5 + .4 * (1 - Math.cos(Math.PI * t)) / 2), top - d * r]); } // jaw
  for (let i = 1; i <= 5; i++) { const t = i / 5, d = 1.5 - .55 * t; out.push([r * (.9 + .1 * (1 - (1 - t) ** 2)), top - d * r]); }
  for (let i = 1; i <= 14; i++) { const t = i / 14, d = .95 * r * (1 - t); out.push([r * Math.sqrt(Math.max(0, 1 - (1 - d / (.95 * r)) ** 2)), top - d]); }
  return out;
}
/** a head's radius at a height (the same outline), for laying cloth on it */
const headR = (r: number, top: number, y: number) => { const d = top - y; if (d <= 0) return 0; if (d < .95 * r) return r * Math.sqrt(Math.max(0, 1 - (1 - d / (.95 * r)) ** 2)); if (d < 1.5 * r) return r * (.9 + .1 * (1 - ((d - .95 * r) / (.55 * r)) ** 2)); return r * .9; };
/** a bottle as a lathe's outline: a body `r` wide, a shoulder, a neck, a lip; `h` tall */
export function bottleProfile(r: number, h: number): [number, number][] {
  const out: [number, number][] = [[0, 0], [r * .9, 0], [r, r * .12], [r, h * .6]];
  for (let i = 1; i <= 8; i++) { const t = i / 8; out.push([r * (1 - .6 * (1 - Math.cos(Math.PI * t)) / 2), h * (.6 + .18 * t)]); }
  out.push([r * .4, h * .93], [r * .47, h * .935], [r * .47, h], [0, h]);
  return out;
}

/** the sphere whose cap, `L` along its surface from the pole, has a rim of radius `rho` (Infinity: a flat disc) */
function capOf(L: number, rho: number): (s: number) => [number, number] {
  if (L <= rho * 1.001) return s => [s * rho / L, 0];
  let lo = 1e-3, hi = Math.PI / 2; const t = rho / L;
  for (let i = 0; i < 40; i++) { const x = (lo + hi) / 2; if (Math.sin(x) / x > t) lo = x; else hi = x; }
  const rs = L / ((lo + hi) / 2);
  return s => [rs * Math.sin(s / rs), rs * (1 - Math.cos(s / rs))];
}
/** a round of `n` stitches, `rad` from the axis at height `y`; it starts at the back */
const ring = (n: number, rad: number, y: number): number[] => { const p: number[] = []; for (let i = 0; i < n; i++) { const a = (i + .5) / n * TAU; p.push(rad * Math.sin(a), y, -rad * Math.cos(a)); } return p; };

/** a crown worked round (its rounds' counts), its last round `rho` from the axis: the cap's courses, and how far
 *  its rim is under its top */
function crown(counts: number[], gh: number, rho: number, top: number, cen: V3, out: FormCourse[]): number {
  const L = counts.length * gh, at = capOf(L, rho);
  out.push({ p: [0, top + gh * .2, 0], on: -1, ghost: true, cen });
  counts.forEach((n, r) => { const [rad, dy] = at((r + .5) * gh); out.push({ p: ring(n, Math.max(.05, rad), top - dy), closed: true, on: out.length - 1, cen }); });
  return at(L)[1];
}

/** a strip of `T` stitches going on from where its first row is (the last row's stitches `from`): `rows` rows
 *  straight down, and - where the table is reached - along it, away from the axis */
function strip(from: number[], rows: number, gh: number, onto: number, out: FormCourse[]) {
  const n = from.length / 3; let mx = 0, mz = 0, y = 0;
  for (let i = 0; i < n; i++) { mx += from[i * 3] / n; y += from[i * 3 + 1] / n; mz += from[i * 3 + 2] / n; }
  const k = Math.hypot(mx, mz) || 1, dx = mx / k, dz = mz / k, floor = .45; let on = onto, lie = 0;
  for (let j = 0; j < rows; j++) {
    const yy = y - (j + 1) * gh, p: number[] = [];
    if (yy > floor) { for (let i = 0; i < n; i++) p.push(from[i * 3], yy, from[i * 3 + 2]); out.push({ p, on, cen: [0, yy, 0] }); }
    else { lie++; for (let i = 0; i < n; i++) p.push(from[i * 3] + dx * lie * gh, floor, from[i * 3 + 2] + dz * lie * gh); out.push({ p, on, cen: [mx, -60, mz] }); }
    on = out.length - 1;
  }
}

// ---------------------------------------------------------------- 버킷햇 · 모티프 버킷햇
function bucketForm(p: PlanInput, pp: Plan): Worn {
  const g = pp.g, H = bucketHat(p, g), rho = H.N * g.w / TAU, rs = Math.max(4, rho - .45), topS = 3.3 * rs, top = topS + .4, out: FormCourse[] = [];
  const bottom = pp.rows.filter(r => r.part === "bottom").map(r => r.n), cen: V3 = [0, top - 14, 0];
  const drop = crown(bottom, g.h, rho, top, cen, out); let y = top - drop;
  for (let i = 0; i < H.S; i++) { y -= g.h; out.push({ p: ring(H.N, rho, y + g.h / 2), closed: true, on: out.length - 1, cen }); }
  // the brim: each round as far out as its stitches reach, as far down as a row's height then leaves
  let rad = rho; const at: [number, number][] = []; y += g.h / 2;
  H.counts.forEach(n => { const want = n * g.w / TAU, d = Math.min(g.h * .97, Math.max(0, want - rad)); rad += d; y -= Math.sqrt(g.h * g.h - d * d); at.push([rad, y]); out.push({ p: ring(n, rad, y), closed: true, on: out.length - 1, cen }); });
  // 두 겹 챙: the inner layer comes back under the outer one, round for round
  const under = Math.max(.35, ((p as { yarnMm?: number | null }).yarnMm ?? 3) / 10 * 1.5);
  H.inner.forEach((n, i) => { const [r0, y0] = at[Math.max(0, H.B - 1 - i)]; out.push({ p: ring(n, i === 0 ? r0 + under * .5 : r0, y0 - (i === 0 ? under * .5 : under)), closed: true, on: out.length - 1, cen: [0, top + 60, 0] }); });
  const wide = 2 * (at.length ? at[at.length - 1][0] : rho);
  return { courses: out, stand: { kind: "head", prof: headProfile(rs, topS) }, size: [wide, wide, top - y], key: "" };
}
function motifForm(p: PlanInput, pp: Plan): Worn {
  const g = pp.g, M = motifHat(p, g), rho = M.ring * g.w / TAU, rs = Math.max(4, rho - .45), topS = 3.3 * rs, top = topS + .4, out: FormCourse[] = [], cen: V3 = [0, top - 14, 0];
  const drop = crown(Array.from({ length: M.Rc }, (_, r) => 8 * (r + 1)), g.h, rho, top, cen, out); let y = top - drop;
  // the seams show (Kim: 모티프 경계가 보이게): a motif's first column and the ring's first round in the seam's colour
  const seam = (n: number, E: number, first: boolean) => Array.from({ length: n }, (_, i) => (first || i % E === 0 ? 1 : 0));
  for (let j = 0; j < M.E; j++) { y -= g.h; out.push({ p: ring(M.ring, rho, y + g.h / 2), closed: true, on: out.length - 1, cen, cols: seam(M.ring, M.E, j === 0) }); }
  const nb = M.n * M.Eb, rb = nb * g.w / TAU, step = (rb - rho) / M.Eb, dy = Math.sqrt(Math.max(.01, g.h * g.h - step * step)); let rad = rho; y += g.h / 2;
  for (let j = 0; j < M.Eb; j++) { rad += step; y -= dy; out.push({ p: ring(nb, rad, y), closed: true, on: out.length - 1, cen, cols: seam(nb, M.Eb, j === 0) }); }
  return { courses: out, stand: { kind: "head", prof: headProfile(rs, topS) }, size: [2 * rad, 2 * rad, top - y], key: "", seam: true };
}

// ---------------------------------------------------------------- 후드 스카프
function hoodForm(p: PlanInput, pp: Plan): Worn {
  const g = pp.g, H = hoodScarf(p, g), rho = H.N * g.w / TAU, rs = Math.max(4, rho - .45), out: FormCourse[] = [];
  const cap = capOf(H.R * g.h, rho)(H.R * g.h)[1], hang = Math.min(H.PR * g.h, 34), topS = Math.max(3.3 * rs, cap + H.H * g.h + hang + .6), top = topS + .4, cen: V3 = [0, top - 14, 0];
  crown(pp.rows.filter(r => r.part === "bottom").map(r => r.n), g.h, rho, top, cen, out);
  // the hood's rows: two thirds of the round, its middle at the back - the rest is the face
  const span = TAU * H.W / H.N; let y = top - cap, last: number[] = [];
  for (let j = 0; j < H.H; j++) {
    y -= g.h; const pts: number[] = [];
    for (let i = 0; i < H.W; i++) { const a = -span / 2 + (i + .5) / H.W * span; pts.push(rho * Math.sin(a), y + g.h / 2, -rho * Math.cos(a)); }
    out.push({ p: pts, on: out.length - 1, cen }); last = pts;
  }
  const edge = out.length - 1;
  strip(last.slice(0, H.T * 3), H.PR, g.h, edge, out); strip(last.slice((H.W - H.T) * 3), H.PR, g.h, edge, out);
  return { courses: out, stand: { kind: "head", prof: headProfile(rs, topS) }, size: [2 * rho, 2 * rho, top - y], key: "" };
}

// ---------------------------------------------------------------- 이어플랩 후드
function earflapForm(p: PlanInput, pp: Plan): Worn {
  const g = pp.g, H = earflap(p, g), L = H.W * g.w, rho = L / Math.PI, rs = Math.max(4, rho - .45), out: FormCourse[] = [];
  const fall = rho + Math.max(0, H.R * g.h - Math.PI * rho / 2), hang = Math.min(H.PR * g.h, 34), topS = Math.max(3.3 * rs, fall + hang + .6), top = topS + .4, cen: V3 = [0, top - rho, 0];
  // a row lies as a U round the back of the head: as wide as the head is at its height, what is left of its
  // length going forward at each side (at the top the U is a hairpin: the seam)
  const rowAt = (j: number): number[] => {
    const s = (j + .5) * g.h, ph = Math.min(Math.PI / 2, s / rho), a = Math.max(.12, rho * Math.sin(ph)), y = top - rho * (1 - Math.cos(ph)) - Math.max(0, s - Math.PI * rho / 2);
    const sl = Math.max(0, (L - Math.PI * a) / 2), zc = -(rho - a) * .75, pts: number[] = [];
    for (let i = 0; i < H.W; i++) {
      const t = (i + .5) * g.w;
      if (t < sl) pts.push(-a, y, zc + sl - t);
      else if (t < sl + Math.PI * a) { const th = (t - sl) / a; pts.push(-a * Math.cos(th), y, zc - a * Math.sin(th)); }
      else pts.push(a, y, zc + (t - sl - Math.PI * a));
    }
    return pts;
  };
  const rows = Array.from({ length: H.R }, (_, j) => rowAt(j));
  out.push({ p: rows[0].map((v, i) => (i % 3 === 1 ? v + g.h : v)), on: -1, ghost: true, cen });
  rows.forEach(pts => out.push({ p: pts, on: out.length - 1, cen }));
  const edge = out.length - 1, last = rows[H.R - 1];
  strip(last.slice(0, H.T * 3), H.PR, g.h, edge, out); strip(last.slice((H.W - H.T) * 3), H.PR, g.h, edge, out);
  // 앞선 무늬: rows of 한길긴뜨기 along the face edge (up one side's row ends, over the top, down the other's)
  if (H.rib) {
    const path: V3[] = [];
    for (let j = H.R - 1; j >= 0; j--) path.push([rows[j][0], rows[j][1], rows[j][2]]);
    for (let j = 0; j < H.R; j++) { const k = (H.W - 1) * 3; path.push([rows[j][k], rows[j][k + 1], rows[j][k + 2]]); }
    const acc = [0]; for (let i = 1; i < path.length; i++) acc.push(acc[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1], path[i][2] - path[i - 1][2]));
    const along = (s: number): V3 => { let i = 1; while (i < path.length - 1 && acc[i] < s) i++; const f = Math.min(1, Math.max(0, (s - acc[i - 1]) / Math.max(1e-6, acc[i] - acc[i - 1]))); return [0, 1, 2].map(k => path[i - 1][k] + (path[i][k] - path[i - 1][k]) * f) as V3; };
    const hh = g.h * 2.05, len = acc[acc.length - 1], course = (fwd: number): number[] => { const q: number[] = []; for (let i = 0; i < H.F; i++) { const [x, yy, z] = along((i + .5) / H.F * len); q.push(x, yy, z + fwd); } return q; };
    out.push({ p: course(0), on: -1, ghost: true, cen });
    for (let m = 0; m < H.rib; m++) out.push({ p: course((m + 1) * hh), on: out.length - 1, cen, ty: "dc" });
  }
  return { courses: out, stand: { kind: "head", prof: headProfile(rs, topS) }, size: [2 * rho, L / 2, fall], key: "" };
}

// ---------------------------------------------------------------- 삼각 헤드스카프
/** The triangle laid over the head as cloth is: every stitch pulled down, kept at its distance from its
 *  neighbours, kept outside the head; the middle of the long edge held at the hairline, its two ends drawn round
 *  to the nape where the cords tie. A few thousand small steps, done once for a size (kept below). */
function kerchiefForm(p: PlanInput, pp: Plan): Worn {
  const g = pp.g, K = kerchief(p, g, g), sw = g.w, rh = K.ht * g.h, R = K.counts.length, Ht = R * rh, Wd = K.W * sw;
  const rs = Math.max(4, K.circ / TAU - .2), topS = Math.max(3.3 * rs, 1.6 * rs + K.tie + 1.2), yc = topS - .95 * rs, off = .38;
  // the cloth as a coarse net (a knot every ~1.7cm: a few hundred, so laying it takes a few milliseconds - the
  // stitches are set between its knots afterwards): rows from the point (j 0) to the long edge
  const CELL = 1.7, J = Math.max(4, Math.round(Ht / CELL) + 1), wAt = (v: number) => Math.max(sw * 2, Wd * v / Ht), rows: number[][] = [], X: number[] = [], Y: number[] = [], Z: number[] = [];
  // where the long edge goes round the head: from the hairline at the front, down behind the ears, to the nape
  const a0 = 52 * Math.PI / 180, yF = yc + (.95 * rs + off) * Math.cos(a0), yN = yc - .42 * rs, skin = (y: number) => (y >= yc ? (rs + off) * Math.sqrt(Math.max(.04, 1 - ((y - yc) / (.95 * rs + off)) ** 2)) : headR(rs, topS, y) + off);
  const ringAt = (x: number): V3 => { const th = Math.max(-3.05, Math.min(3.05, x / (rs * .95))), y = yF + (yN - yF) * (1 - Math.cos(th)) / 2, r = skin(y); return [r * Math.sin(th), y, r * Math.cos(th)]; };
  const FX: number[] = [], FZ: number[] = [];
  for (let j = 0; j < J; j++) {
    const v = Ht * j / (J - 1), w = wAt(v), m = Math.max(2, Math.round(w / CELL) + 1), row: number[] = [];
    // wrapped round the head first, the long edge on that line, the rest held out from it up and back (from the
    // front: over the crown and out behind the head) - it falls onto the crown and down the back from there
    for (let k = 0; k < m; k++) {
      const x = (k / (m - 1) - .5) * w, d = Ht - v, q = ringAt(x), th = x / (rs * .95), c = Math.cos(th), ux = -.25 * Math.sin(th), uy = .45 + .3 * (1 - c), uz = -.9 * (1 + c) / 2, ul = Math.hypot(ux, uy, uz);
      row.push(X.length); FX.push(x); FZ.push(v); X.push(q[0] + ux / ul * d); Y.push(q[1] + uy / ul * d); Z.push(q[2] + uz / ul * d);
    }
    rows.push(row);
  }
  const E: [number, number, number][] = [], link = (a: number, b: number) => E.push([a, b, Math.hypot(FX[a] - FX[b], FZ[a] - FZ[b])]);
  rows.forEach((row, j) => {
    for (let k = 0; k + 1 < row.length; k++) link(row[k], row[k + 1]);
    if (!j) return; const below = rows[j - 1];
    row.forEach(a => { const near = below.map(b => [Math.abs(FX[a] - FX[b]), b]).sort((x, y) => x[0] - y[0]); link(a, near[0][1]); if (near[1]) link(a, near[1][1]); });
  });
  const longRow = rows[J - 1], mid = longRow[Math.floor(longRow.length / 2)], cA = longRow[0], cB = longRow[longRow.length - 1];
  const pins: [number, V3][] = [mid, cA, cB].map(c => [c, ringAt(FX[c])]);
  // (the last steps without weight: what the falling stretched is drawn tight again, so the stitches keep their size)
  const N = X.length, IT = 280, FALL = 230;
  for (let it = 0; it < IT; it++) {
    for (let i = 0; i < N; i++) Y[i] -= it < FALL ? .14 : .04;
    for (let pass = 0; pass < (it < FALL ? 4 : 7); pass++) {
      for (const [a, b, d0] of E) { const dx = X[b] - X[a], dy = Y[b] - Y[a], dz = Z[b] - Z[a], d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6, c = (d - d0) / d * .5; X[a] += dx * c; Y[a] += dy * c; Z[a] += dz * c; X[b] -= dx * c; Y[b] -= dy * c; Z[b] -= dz * c; }
      for (const [c, q] of pins) { X[c] = q[0]; Y[c] = q[1]; Z[c] = q[2]; }
      // outside the head: its skull as an ellipsoid, under it as wide as it is at that height
      for (let i = 0; i < N; i++) {
        if (Y[i] >= yc) { const ex = X[i] / (rs + off), ey = (Y[i] - yc) / (.95 * rs + off), ez = Z[i] / (rs + off), f = ex * ex + ey * ey + ez * ez; if (f < 1) { const k = 1 / Math.sqrt(Math.max(1e-9, f)); X[i] *= k; Z[i] *= k; Y[i] = yc + (Y[i] - yc) * k; } }
        else { const rr = headR(rs, topS, Y[i]) + off, d = Math.sqrt(X[i] * X[i] + Z[i] * Z[i]); if (d < rr) { const k = rr / (d || 1e-6); X[i] *= k; Z[i] *= k; } }
        if (Y[i] < .5) Y[i] = .5;
      }
    }
  }
  // a stitch's place: between the net's rows over and under it, as far along each as it is along its own row
  const onRow = (j: number, t: number): V3 => { const row = rows[j], f = Math.min(1, Math.max(0, t)) * (row.length - 1), k = Math.min(row.length - 2, Math.floor(f)), q = f - k, a = row[k], b = row[k + 1]; return [X[a] + (X[b] - X[a]) * q, Y[a] + (Y[b] - Y[a]) * q, Z[a] + (Z[b] - Z[a]) * q]; };
  const place = (x: number, v: number): V3 => { const f = Math.min(J - 1, Math.max(0, v / Ht * (J - 1))), j = Math.min(J - 2, Math.floor(f)), q = f - j, t = x / wAt(v) + .5, A = onRow(j, t), B = onRow(j + 1, t); return [A[0] + (B[0] - A[0]) * q, A[1] + (B[1] - A[1]) * q, A[2] + (B[2] - A[2]) * q]; };
  const cen: V3 = [0, yc, 0], out: FormCourse[] = [], kind = K.kind, tip = place(0, 0);
  out.push({ p: [tip[0], tip[1] - rh * .6, tip[2] - rh * .6], on: -1, ghost: true, cen });
  K.counts.forEach((n, r) => {
    const pts: number[] = []; for (let i = 0; i < n; i++) pts.push(...place((i - (n - 1) / 2) * sw, (r + .5) * rh));
    const ty: WallStitch[] | undefined = kind === "net" ? Array.from({ length: n }, (_, i): WallStitch => ((i + (r % 2 ? 2 : 0)) % 4 === 0 ? "sc" : "ch")) : kind === "vst" ? Array.from({ length: n }, (_, i): WallStitch => (i % 3 === 1 ? "ch" : "dc")) : undefined;
    out.push({ p: pts, on: out.length - 1, cen, ...(ty ? { ty } : {}) });
  });
  // the two cords, from the long edge's ends: down from where they are tied
  for (const c of [cA, cB]) { const pts: number[] = [], n = Math.max(4, Math.round(K.tie / .6)); for (let i = 1; i <= n; i++) { const s = i / n * K.tie, yy = Y[c] - s; pts.push(X[c] * (1 + .12 * Math.sin(s * .35)), Math.max(.4, yy), Z[c] - .25 - (yy < .4 ? .4 - yy : 0)); } out.push({ p: pts, on: -1, cen }); }
  return { courses: out, stand: { kind: "head", prof: headProfile(rs, topS) }, size: [Wd, Ht, null], key: "" };
}

// ================================================================ 작은 가방 · 보닛 · 옷 (lib/wear)
/** a torso as a lathe's outline ([radius, height]): hips, a waist, a chest `r` wide at the height `bust`,
 *  shoulders, a neck */
const TORSO: [number, number][] = [[.9, -2.3], [.92, -1.8], [.8, -1.05], [.78, -.8], [.88, -.3], [1, 0], [.97, .3], [.87, .7], [.66, 1.05], [.36, 1.22], [.29, 1.4], [.28, 1.75]];
export function torsoProfile(r: number, bust: number): [number, number][] {
  const out: [number, number][] = [[0, Math.max(0, bust + TORSO[0][1] * r)]];
  for (let i = 0; i + 1 < TORSO.length; i++) for (let k = 0; k < 4; k++) { const t = k / 4, a = TORSO[i], b = TORSO[i + 1], s = t * t * (3 - 2 * t); out.push([r * (a[0] + (b[0] - a[0]) * s), Math.max(0, bust + (a[1] + (b[1] - a[1]) * t) * r)]); }
  const last = TORSO[TORSO.length - 1]; out.push([r * last[0], bust + last[1] * r], [0, bust + (last[1] + .04) * r]);
  return out;
}
/** the torso's radius at a height (the same outline) */
const torsoR = (r: number, bust: number, y: number) => { const d = (y - bust) / r; if (d <= TORSO[0][1]) return r * TORSO[0][0]; for (let i = 0; i + 1 < TORSO.length; i++) { const a = TORSO[i], b = TORSO[i + 1]; if (d <= b[1]) { const t = (d - a[1]) / (b[1] - a[1]), s = t * t * (3 - 2 * t); return r * (a[0] + (b[0] - a[0]) * s); } } return r * TORSO[TORSO.length - 1][0]; };
/** a cord from `a` by `via` to `b`: a strand (nothing under it) */
const cordTo = (a: V3, via: V3, b: V3, cen: V3): FormCourse => { const p: number[] = []; for (let i = 1; i <= 24; i++) { const t = i / 24, u = 1 - t; p.push(u * u * a[0] + 2 * u * t * via[0] + t * t * b[0], u * u * a[1] + 2 * u * t * via[1] + t * t * b[1], u * u * a[2] + 2 * u * t * via[2] + t * t * b[2]); } return { p, on: -1, cen }; };
const netTy = (n: number, odd: boolean): WallStitch[] => Array.from({ length: n }, (_, i): WallStitch => ((i + (odd ? 2 : 0)) % 4 === 0 ? "sc" : "ch"));

// ---------------------------------------------------------------- 사다리꼴 주머니백
/** Two panels joined at their narrow edges and their sides, filled: each row bows out as an arc as long as the
 *  row, most a little over half way up - the bottom is a seam, the body swells, the opening is nearly as wide
 *  again. The band goes from one side seam over to the other as an arch as long as it is worked. */
function trapForm(p: PlanInput, pp: Plan): Worn {
  const g = pp.g, B = trapBag(p, g), out: FormCourse[] = [], R = B.R, y0 = .45, top = y0 + R * g.h * .97;
  const bow = (t: number) => 1.05 * Math.sin(Math.PI / 2 * Math.min(1, t / .55)) * (1 - .3 * Math.max(0, (t - .55) / .45));
  let chordTop = B.top, deep = 0;
  for (const side of [1, -1]) {
    out.push({ p: [0, y0 - g.h, side * .1], on: -1, ghost: true, cen: [0, top / 2, 0] });
    B.counts.forEach((n, j) => {
      const t = (j + .5) / R, th = Math.max(.02, bow(t)), w = n * g.w, rad = w / (2 * th), pts: number[] = [];
      for (let k = 0; k < n; k++) { const ph = -th + (k + .5) / n * 2 * th; pts.push(rad * Math.sin(ph), y0 + (j + .5) * g.h * .97, side * (rad * (Math.cos(ph) - Math.cos(th)) + .15)); }
      out.push({ p: pts, on: out.length - 1, cen: [0, y0 + (j + .5) * g.h * .97, 0] });
      if (j === R - 1) chordTop = 2 * rad * Math.sin(th); deep = Math.max(deep, 2 * rad * (1 - Math.cos(th)));
    });
  }
  // the band: an arch from the left seam's top to the right one's, as long as its rows (half an ellipse that long)
  const half = chordTop / 2, L = B.HR * g.h, per = (b: number) => Math.PI * (3 * (half + b) - Math.sqrt((3 * half + b) * (half + 3 * b))) / 2;
  let lo = .05, hi = L; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (per(m) < L) lo = m; else hi = m; }
  const rise = L <= chordTop * 1.02 ? .05 : (lo + hi) / 2, N = 80, arc: [number, number][] = [], acc = [0];
  for (let i = 0; i <= N; i++) { const a = Math.PI * i / N; arc.push([-half * Math.cos(a), top + rise * Math.sin(a)]); if (i) acc.push(acc[i - 1] + Math.hypot(arc[i][0] - arc[i - 1][0], arc[i][1] - arc[i - 1][1])); }
  const at = (s: number): [number, number] => { let i = 1; while (i < N && acc[i] < s) i++; const f = Math.min(1, Math.max(0, (s - acc[i - 1]) / Math.max(1e-6, acc[i] - acc[i - 1]))); return [arc[i - 1][0] + (arc[i][0] - arc[i - 1][0]) * f, arc[i - 1][1] + (arc[i][1] - arc[i - 1][1]) * f]; };
  const band = (x: number, y: number) => { const q: number[] = []; for (let k = 0; k < B.T; k++) q.push(x, y, (k - (B.T - 1) / 2) * g.w); return q; };
  out.push({ p: band(-half, top - g.h * .6), on: -1, ghost: true, cen: [0, top, 0] });
  for (let i = 0; i < B.HR; i++) { const [x, y] = at((i + .5) / B.HR * acc[N]); out.push({ p: band(x, y), on: out.length - 1, cen: [0, top - 2, 0] }); }
  return { courses: out, stand: null, size: [Math.max(chordTop, B.top * .8), deep, top - y0], key: "" };
}

// ---------------------------------------------------------------- 반달 미니백
/** Two circles standing face to face: joined round their lower halves (there they lie together), apart at the
 *  top (the opening), each swelling a little; the hand's slot is the chains of its round, at the top. */
function moonForm(p: PlanInput, pp: Plan): Worn {
  const g = pp.g, M = moonBag(p, g), out: FormCourse[] = [], rad = M.R * g.h, yc = rad + .5, phase = M.hs ? (2 + M.hs / 2) / (6 * M.rh) * TAU : 0;
  for (const side of [1, -1]) {
    const cen: V3 = [0, yc, -side * 40];
    out.push({ p: [0, yc, side * 1.2], on: -1, ghost: true, cen });
    for (let r = 1; r <= M.R; r++) {
      const n = 6 * r, rho = (r - .5) * g.h, pts: number[] = [];
      // the slot held open, a hole a hand goes through (Kim: 손잡이 부분이 뚫려야): the chains and the rounds over
      // them arch out, the rounds under it give in - a gap `hh` tall at its middle, closed at its two ends
      const span = M.hs ? M.hs / (6 * M.rh) * Math.PI : 0, hh = Math.min(4, Math.max(2.2, M.hw * .4));
      for (let i = 0; i < n; i++) {
        const a = (i + .5) / n * TAU - phase, da = Math.abs(Math.atan2(Math.sin(a), Math.cos(a))), c = M.hs > 0 && da < span ? Math.cos(da / span * Math.PI / 2) : 0;
        const push = !c ? 0 : r >= M.rh ? hh * .6 * c * .62 ** (r - M.rh) : -hh * .4 * c * .5 ** (M.rh - 1 - r);
        const x = (rho + push) * Math.sin(a), y = yc + (rho + push) * Math.cos(a), up = Math.max(0, (y - yc) / rad);
        pts.push(x, y, side * (.25 + 1.1 * (1 - (rho / rad) ** 2) + 2.1 * up ** 1.3));
      }
      const ty: WallStitch[] | undefined = r === M.rh && M.hs ? Array.from({ length: n }, (_, i): WallStitch => (i >= 2 && i < 2 + M.hs ? "ch" : "sc")) : undefined;
      out.push({ p: pts, closed: true, on: out.length - 1, cen, ...(ty ? { ty } : {}) });
    }
  }
  return { courses: out, stand: null, size: [2 * rad, 6, 2 * rad], key: "" };
}

// ---------------------------------------------------------------- 보닛
function bonnetForm(p: PlanInput, pp: Plan): Worn {
  const g = pp.g, B = bonnet(p, g), rho = B.N * g.w / TAU, rs = Math.max(4, rho - .45), out: FormCourse[] = [];
  const cap = capOf(B.R * g.h, rho)(B.R * g.h)[1], topS = Math.max(3.3 * rs, cap + B.H * g.h + Math.min(B.tie, 30) + 1), top = topS + .4, cen: V3 = [0, top - 14, 0];
  crown(pp.rows.filter(r => r.part === "bottom").map(r => r.n), g.h, rho, top, cen, out);
  const span = TAU * B.W / B.N; let y = top - cap, last: number[] = [];
  for (let j = 0; j < B.H; j++) {
    y -= g.h; const pts: number[] = [];
    for (let i = 0; i < B.W; i++) { const a = -span / 2 + (i + .5) / B.W * span; pts.push(rho * Math.sin(a), y + g.h / 2, -rho * Math.cos(a)); }
    out.push({ p: pts, on: out.length - 1, cen }); last = pts;
  }
  // 턱끈: a cord down from each lower end
  for (const k of [0, (B.W - 1) * 3]) { const a: V3 = [last[k], last[k + 1], last[k + 2]]; out.push(cordTo(a, [a[0] * 1.05, a[1] - B.tie * .5, a[2] + 1], [a[0] * .8, Math.max(.4, a[1] - B.tie), a[2] + 1.5], cen)); }
  return { courses: out, stand: { kind: "head", prof: headProfile(rs, topS) }, size: [2 * rho, 2 * rho, top - y], key: "" };
}

// ---------------------------------------------------------------- 몸 (Kim: 인체에 맞추어)
/** A body for a top: the torso's lathe wider than deep, a bust on its front and round shoulders (the stand is drawn
 *  so). Cloth is laid round its section at each height - the hull, so a band bridges the hollow between the bust -
 *  stretched over it when shorter, hanging in soft folds when longer (Kim: 흐물거리는 편물, 레고처럼 하지 말 것). */
const TSX = 1.1, TSZ = .8;
type Bump = [number, number, number, number, number, number];
interface Body { r: number; bust: number; bumps: Bump[] }
// (flattened, set into the torso so they read as its own shape: a bust a little low and apart, sloping shoulders)
const bodyOf = (r: number, bust: number): Body => ({ r, bust, bumps: [
  ...[-1, 1].map((s): Bump => [s * .38 * r, bust - .06 * r, .6 * r, .3 * r, .28 * r, .3 * r]),
  ...[-1, 1].map((s): Bump => [s * .6 * r, bust + .78 * r, -.02 * r, .52 * r, .28 * r, .38 * r])] });
const torsoStand = (B: Body): YarnStand => ({ kind: "torso", prof: torsoProfile(B.r, B.bust), sx: TSX, sz: TSZ, bumps: B.bumps });
function hull2(pts: [number, number][]): [number, number][] {
  const s = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo: [number, number][] = [], up: [number, number][] = [];
  for (const p of s) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = s.length - 1; i >= 0; i--) { const p = s[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return [...lo.slice(0, -1), ...up.slice(0, -1)];
}
/** the body's section at a height, `off` out from it: walked along from the back (s = 0) towards +x, the front,
 *  -x; a point at `s`, its outward normal, and where an angle (0 the back, as ring() counts) falls */
interface Sec { L: number; at: (s: number) => [number, number]; nrm: (s: number) => [number, number]; sAt: (a: number) => number }
function sectionOf(B: Body, y: number, off: number): Sec {
  const R = torsoR(B.r, B.bust, y), raw: [number, number][] = [];
  for (let i = 0; i < 120; i++) {
    const a = i / 120 * TAU, dx = Math.sin(a), dz = -Math.cos(a); let t = R / Math.hypot(dx / TSX, dz / TSZ);
    for (const [bx, by, bz, rx, ry, rz] of B.bumps) {
      const f2 = 1 - ((y - by) / ry) ** 2; if (f2 <= 0) continue; const a2 = rx * rx * f2, c2 = rz * rz * f2;
      const qa = dx * dx / a2 + dz * dz / c2, qb = -2 * (dx * bx / a2 + dz * bz / c2), qc = bx * bx / a2 + bz * bz / c2 - 1, disc = qb * qb - 4 * qa * qc;
      if (disc > 0) t = Math.max(t, (-qb + Math.sqrt(disc)) / (2 * qa));
    }
    raw.push([dx * (t + off), dz * (t + off)]);
  }
  const h = hull2(raw).map(q => ({ q, a: (Math.atan2(q[0], -q[1]) + TAU) % TAU })).sort((u, v) => u.a - v.a), n = h.length, cum = [0];
  for (let i = 0; i < n; i++) { const a = h[i].q, b = h[(i + 1) % n].q; cum.push(cum[i] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
  const L = cum[n];
  const at = (s0: number): [number, number] => { const s = ((s0 % L) + L) % L; let i = 0; while (i < n - 1 && cum[i + 1] <= s) i++; const a = h[i].q, b = h[(i + 1) % n].q, f = (s - cum[i]) / Math.max(1e-9, cum[i + 1] - cum[i]); return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]; };
  const nrm = (s: number): [number, number] => { const p = at(s + .4), q = at(s - .4), c = at(s); let x = p[1] - q[1], z = -(p[0] - q[0]); const m = Math.hypot(x, z) || 1; x /= m; z /= m; if (x * c[0] + z * c[1] < 0) { x = -x; z = -z; } return [x, z]; };
  const sAt = (a: number) => { const A = ((a % TAU) + TAU) % TAU; let i = 0; while (i < n - 1 && h[i + 1].a <= A) i++; const a0 = h[i].a, a1 = i + 1 < n ? h[i + 1].a : h[0].a + TAU; return cum[i] + (cum[i + 1] - cum[i]) * Math.min(1, Math.max(0, (A - a0) / Math.max(1e-9, a1 - a0))); };
  return { L, at, nrm, sAt };
}
/** how far out a fold goes, for cloth `e` times as long as the line it lies along, in `k` folds over `L`: the
 *  waves that take up the length (a sine `A` deep over `L / k` is about sqrt(1 + (A w)^2 / 2) as long) */
const foldDepth = (e: number, k: number, L: number, cap: number) => (e > 1 ? Math.min(cap, 2 * Math.sqrt(2 * (e * e - 1)) / (TAU * k / L)) : 0);
/** a round of `n` stitches `w` apart round the body: at the height `y`, on the section at `yS` (cloth hangs from
 *  the widest part above it) */
function clothRing(B: Body, y: number, n: number, w: number, off: number, ph = 0, yS = y, k = 7, cap = 1.4): number[] {
  const S = sectionOf(B, yS, off), A = foldDepth(n * w / S.L, k, S.L, cap), om = TAU * k / S.L, p: number[] = [];
  for (let i = 0; i < n; i++) { const s = (i + .5) / n * S.L, [x, z] = S.at(s), [nx, nz] = S.nrm(s), d = A * (1 + Math.sin(om * s + ph)) / 2; p.push(x + nx * d, y, z + nz * d); }
  return p;
}
/** a row of `n` stitches `w` apart along the section, its middle at the angle `a` (0 the back, PI the front) */
function clothRow(S: Sec, y: number, n: number, w: number, a: number): number[] {
  const s0 = S.sAt(a), p: number[] = [];
  for (let k = 0; k < n; k++) { const [x, z] = S.at(s0 + (k - (n - 1) / 2) * w); p.push(x, y, z); }
  return p;
}

// ---------------------------------------------------------------- 모티프 뷔스티에 · 그물 홀터 탑
/** The band of motifs round the body; above it (하트 윗선) two cups each over one side of the bust, their rows
 *  following it, or (일자 윗선 - Kim: 둘 다) the band itself higher, its top straight across over the bust. */
function bustierForm(p: PlanInput, pp: Plan): Worn {
  const g = pp.g, B = bustier(p, g), rho = B.ring * g.w / TAU, r = Math.max(6, rho / .98), bust = 2.3 * r + 1, body = bodyOf(r, bust), out: FormCourse[] = [];
  const straight = p.topLine === "straight", yTop = straight ? bust + .36 * r : bust - .26 * r, cen = (y: number): V3 => [0, y, 0];
  const seam = (n: number, first: boolean) => Array.from({ length: n }, (_, i) => (first || i % B.E === 0 ? 1 : 0));
  // (a fitted band: no folds - it is worked smaller than the body and stretches over it)
  const band = (y: number) => clothRing(body, y, B.ring, g.w, .45, 0, y, 7, 0);
  out.push({ p: band(yTop + g.h), on: -1, ghost: true, cen: cen(yTop) });
  for (let j = 0; j < B.E; j++) { const y = yTop - (j + .5) * g.h; out.push({ p: band(y), closed: true, on: out.length - 1, cen: cen(y), cols: seam(B.ring, j === 0) }); }
  const tips: V3[] = [];
  if (straight) for (const s of [-1, 1]) { const S = sectionOf(body, yTop, .45), [x, z] = S.at(S.sAt(Math.PI - s * .55)); tips.push([x, yTop, z]); }
  else for (const s of [-1, 1]) {
    const [bx, , bz] = body.bumps[s < 0 ? 0 : 1], a = Math.atan2(bx, -bz); let on = 1;
    for (let i = 0; i < B.CR; i++) {
      const n = B.Cb - 2 * i, y = yTop + (i + .5) * g.h * .92, S = sectionOf(body, y, .45);
      out.push({ p: clothRow(S, y, n, g.w, a), on, cen: cen(y) }); on = out.length - 1;
      if (i === B.CR - 1) { const [x, z] = S.at(S.sAt(a)); tips.push([x, y, z]); }
    }
  }
  // 어깨끈: from each top corner up over the shoulder by the neck, down to the middle of the back - on the body
  const shY = bust + 1.1 * r;
  tips.forEach((t, k) => { const s = k ? 1 : -1, top: V3 = [s * .56 * r, shY, 0];
    out.push(cordTo(t, [(t[0] + top[0]) / 2, (t[1] + shY) / 2 + .1 * r, Math.max(t[2], .66 * r)], top, cen(shY)));
    out.push(cordTo(top, [s * .46 * r, shY, -.74 * r], [s * .16 * r, bust + .5 * r, -.84 * r], cen(shY))); });
  return { courses: out, stand: torsoStand(body), size: [2 * rho, 2 * rho, B.E * g.h + (straight ? 0 : B.CR * g.h)], key: "", seam: true };
}
function halterForm(p: PlanInput, pp: Plan): Worn {
  const g = pp.g, H = halter(p, g), rho = H.N * g.w / TAU, r = Math.max(6, rho / .98), bust = 2.3 * r + 1, body = bodyOf(r, bust), out: FormCourse[] = [];
  const rows = pp.rows.filter(x => x.part === "body"), apexY = bust + 1.18 * r, tubeTop = apexY - H.vCm;
  // the rounds from the foot up: a plain round a row tall, a net round as tall as its arches
  let total = 0; rows.forEach(x => { total += (x.hk ?? 1) * g.h; }); let y = tubeTop - total, net = 0;
  out.push({ p: clothRing(body, y - g.h, H.N, g.w, .45, 0, y - g.h, 7, .5), on: -1, ghost: true, cen: [0, y, 0] });
  rows.forEach(x => { const hgt = (x.hk ?? 1) * g.h; y += hgt; const yy = y - hgt / 2; out.push({ p: clothRing(body, yy, H.N, g.w, .45, 0, yy, 7, .5), closed: true, on: out.length - 1, cen: [0, yy, 0], ...(x.wall ? { ty: netTy(H.N, net++ % 2 === 1) } : {}) }); });
  // 앞 V: the front's arches, one fewer a row, their middle at the front
  const rise = 1.45 * g.h; let tip: V3 = [0, tubeTop, r];
  for (let i = 1; i <= H.V; i++) {
    const n = 4 * (H.F - i) + 1, yy = tubeTop + (i - .5) * rise, S = sectionOf(body, yy, .45), q = clothRow(S, yy, n, g.w, Math.PI);
    out.push({ p: q, on: out.length - 1, cen: [0, yy, 0], ty: netTy(n, i % 2 === 1) }); const [x, z] = S.at(S.sAt(Math.PI)); tip = [x, yy, z];
  }
  // 목끈: from the point, round each side of the neck, to its back
  for (const s of [-1, 1]) out.push(cordTo(tip, [s * r * .36, tip[1] + r * .2, r * .1], [s * r * .1, tip[1] + r * .12, -r * .33], [0, tip[1], 0]));
  return { courses: out, stand: torsoStand(body), size: [2 * rho, 2 * rho, H.len], key: "" };
}

// ================================================================ 10종 더 (lib/wear)
/** an arch `L` long over a foot `2 x half` wide (half an ellipse): where it is at the length `s` along it -
 *  [across from -half to half, up] - and how long it is as drawn */
function archOf(half: number, L: number): { at: (s: number) => [number, number]; len: number } {
  const per = (b: number) => Math.PI * (3 * (half + b) - Math.sqrt((3 * half + b) * (half + 3 * b))) / 2;
  let lo = .02, hi = Math.max(1, L); for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (per(m) < L) lo = m; else hi = m; }
  const rise = L <= 2 * half * 1.02 ? .05 : (lo + hi) / 2, N = 80, pts: [number, number][] = [], acc = [0];
  for (let i = 0; i <= N; i++) { const a = Math.PI * i / N; pts.push([-half * Math.cos(a), rise * Math.sin(a)]); if (i) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); }
  return { len: acc[N], at: s => { let i = 1; while (i < N && acc[i] < s) i++; const f = Math.min(1, Math.max(0, (s - acc[i - 1]) / Math.max(1e-6, acc[i] - acc[i - 1]))); return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f]; } };
}
/** a strand along points (nothing under it) */
const strandOf = (pts: V3[], cen: V3, closed = false): FormCourse => ({ p: pts.flat(), on: -1, cen, ...(closed ? { closed: true } : {}) });

// ---------------------------------------------------------------- 매듭 손잡이백
/** One panel folded at the bottom: its first half down the front, its second up the back, a little full. The
 *  short loop stands over one end of the opening; the long strap from the other end leans across and through it. */
function knotForm(p: PlanInput, pp: Plan): Worn {
  const g = pp.g, K = knotBag(p, g), out: FormCourse[] = [], c = K.W * g.w, R = K.R, y0 = .45, rise = g.h * .98, top = y0 + R * rise;
  const bow = (t: number) => .06 + .42 * Math.sin(Math.PI * Math.min(1, t * .9 + .05));
  const rowAt = (j: number, side: number) => { const th = bow((j + .5) / R), rad = c / (2 * th), q: number[] = []; for (let k = 0; k < K.W; k++) { const ph = -th + (k + .5) / K.W * 2 * th; q.push(rad * Math.sin(ph), y0 + (j + .5) * rise, side * (rad * (Math.cos(ph) - Math.cos(th)) + .15)); } return q; };
  out.push({ p: rowAt(R - 1, 1).map((v, i) => (i % 3 === 1 ? v + rise : v)), on: -1, ghost: true, cen: [0, top / 2, 0] });
  for (let i = 0; i < 2 * R; i++) { const front = i < R, j = front ? R - 1 - i : i - R; out.push({ p: rowAt(j, front ? 1 : -1), on: out.length - 1, cen: [0, y0 + (j + .5) * rise, 0] }); }
  const last = out.length - 1, edge = out[last].p, deep = Math.abs(edge[Math.floor(K.W / 2) * 3 + 2]) + .1, xr = edge[(K.W - 1) * 3], xl = edge[0];
  // the short loop, over the row's right end: an arch from the back's edge to the front's, wide enough for the
  // strap to go through
  const tw = K.T * g.w, A = archOf(tw / 2 + .7, K.PS * g.h), loopTop = A.at(A.len / 2)[1]; let on = last;
  for (let i = 0; i < K.PS; i++) { const [u, v] = A.at((i + .5) / K.PS * A.len), q: number[] = []; for (let k = 0; k < K.T; k++) q.push(xr - k * g.w, top + v, u); out.push({ p: q, on, cen: [xr - tw / 2, top - 3, 0] }); on = out.length - 1; }
  // the long strap, from the left end: one band up over the opening, down through the loop and a little beyond
  // it (Kim: 긴 끈을 고리에 끼워 묶음)
  const x0 = xl + tw / 2, x1 = xr - tw / 2, D = Math.max(2, x1 - x0), len = K.PL * g.h, tail = Math.min(4, len * .12), B2 = archOf(D / 2, Math.max(D * 1.08, len - tail)), yEnd = loopTop * .45;
  const along = (d: number): [number, number] => { if (d <= B2.len) { const [u, v] = B2.at(d); return [x0 + D / 2 + u, top + v + yEnd * (u + D / 2) / D]; } const e = d - B2.len; return [x1 + e * .75, top + yEnd - e * .65]; };
  on = last;
  for (let i = 0; i < K.PL; i++) { const [x, yy] = along((i + .5) / K.PL * (B2.len + tail)), q: number[] = []; for (let k = 0; k < K.T; k++) q.push(x, yy, (k - (K.T - 1) / 2) * g.w); out.push({ p: q, on, cen: [x0 + D / 2, top - 4, 0] }); on = out.length - 1; }
  return { courses: out, stand: null, size: [c, 2 * deep, K.h], key: "" };
}

// ---------------------------------------------------------------- 2WAY 조임 토트
/** Two panels joined round three sides. Open: a tote, a little full. Drawn in (`cinched`): the cord's row
 *  gathered to a third of its width, the body under it round, the rows over it standing out as a frill. */
function twoWayForm(p: PlanInput, pp: Plan): Worn {
  const g = pp.g, T = twoWay(p, g), out: FormCourse[] = [], c = T.W * g.w, R = T.R, y0 = .45, rise = g.h * .98, te = (T.eye - .5) / R, cin = !!p.cinched;
  const bow = (t: number) => (cin ? .12 + .95 * Math.sin(Math.PI / 2 * Math.min(1, t / (te * .7))) : .06 + .4 * Math.sin(Math.PI * Math.min(1, t * .95 + .03)));
  const pull = (t: number) => (cin ? 1 - .66 * Math.exp(-(((t - te) / .08) ** 2)) - (t < te ? .12 * (1 - Math.abs(t / te - .55) / .55) * 0 : 0) : 1);
  const rowAt = (j: number, side: number) => {
    const t = (j + .5) / R, th = bow(t), rad = c / (2 * th), k0 = pull(t), q: number[] = [];
    for (let k = 0; k < T.W; k++) { const ph = -th + (k + .5) / T.W * 2 * th, frill = cin ? (1 - k0) * .9 * Math.sin(k * 1.25) + (t > te ? .5 * (t - te) / (1 - te) * Math.sin(k * .9) : 0) : 0; q.push(rad * Math.sin(ph) * k0, y0 + (j + .5) * rise, side * ((rad * (Math.cos(ph) - Math.cos(th))) * (cin ? Math.max(.45, k0) : 1) + .15 + frill)); }
    return q;
  };
  let wide = 0, deep = 0;
  for (const side of [1, -1]) {
    out.push({ p: rowAt(0, side).map((v, i) => (i % 3 === 1 ? v - rise : v)), on: -1, ghost: true, cen: [0, y0, 0] });
    for (let j = 0; j < R; j++) { const q = rowAt(j, side); out.push({ p: q, on: out.length - 1, cen: [0, y0 + (j + .5) * rise, 0] }); for (let i = 0; i < q.length; i += 3) { wide = Math.max(wide, Math.abs(q[i])); deep = Math.max(deep, Math.abs(q[i + 2])); } }
  }
  const top = y0 + R * rise, topRow = rowAt(R - 1, 1), zt = Math.abs(topRow[Math.floor(T.W / 2) * 3 + 2]), xt = Math.abs(topRow[0]), cen: V3 = [0, top, 0];
  // the two handles (a chain and back: a cord each), over the front's and the back's top
  for (const side of [1, -1]) { const A = archOf(xt * .45, T.hl), pts: V3[] = []; for (let i = 0; i <= 36; i++) { const [u, v] = A.at(i / 36 * A.len); pts.push([u, top + v, side * (zt + .25)]); } out.push(strandOf(pts, cen)); }
  // the cord round the eyelets' row, its ends tied at the front when it is drawn in
  const er = rowAt(T.eye - 1, 1), ye = y0 + (T.eye - .5) * rise, ex = Math.abs(er[0]) + .35, ez = Math.abs(er[Math.floor(T.W / 2) * 3 + 2]) + .45, ring: V3[] = [];
  for (let i = 0; i < 44; i++) { const a = i / 44 * TAU; ring.push([ex * Math.sin(a), ye + .15 * Math.sin(a * 5), ez * Math.cos(a)]); }
  out.push(strandOf(ring, [0, ye, 0], true));
  if (cin) for (const s of [-1, 1]) out.push(cordTo([0, ye, ez], [s * 3.5, ye + 1.5, ez + 2.5], [s * 4.5, ye - Math.min(9, T.cordCm * .1), ez + 1.2], [0, ye, 0]));
  return { courses: out, stand: null, size: [2 * wide, 2 * deep, T.h], key: "" };
}

// ---------------------------------------------------------------- 바라클라바
/** From the neck up, on a head - a very soft fabric (Kim: 아주 흐물거리는 편물, 원물의 텍스처를 살려서): every row
 *  laid along the head's own outline, as far down from its top as the rows above it reach; where a row is longer
 *  than the head is round there (the neck, the chin) it hangs in soft folds instead of standing out as a tube.
 *  The face's rows open at the front; ears on the crown. */
function balaForm(p: PlanInput, pp: Plan): Worn {
  const g = pp.g, B = balaclava(p, g), rho = B.N1 * g.w / TAU, rs = Math.max(4, rho - .45), out: FormCourse[] = [];
  const M = B.neckRows + 1 + B.chin + B.faceRows + 1 + B.brow, topS = Math.max(3.3 * rs, (B.R1 - 1 + M) * g.h + 2.5 + .8 * rs), lift = .35, top = topS + lift, cen: V3 = [0, top - 14, 0];
  // the head's outline from its top down, a little out from it; under the jaw it keeps the neck's width
  const jaw = topS - 1.5 * rs, prof = headProfile(rs, topS).filter(q => q[1] > 1.3).reverse().map(([x, y]): [number, number] => [(y < jaw ? Math.max(x, rs * .44) : x) + lift, y + lift]);
  prof.unshift([0, top]); const cum = [0]; for (let i = 1; i < prof.length; i++) cum.push(cum[i - 1] + Math.hypot(prof[i][0] - prof[i - 1][0], prof[i][1] - prof[i - 1][1]));
  const Lp = cum[cum.length - 1];
  // where a row `s` down from the top lies: on the outline, or past its end gathered on the stand's foot, spreading
  const at = (s: number): [number, number] => {
    if (s >= Lp) { const [x, y] = prof[prof.length - 1], o = s - Lp; return [x + o * .4, Math.max(.6, y - o * .6)]; }
    let i = 1; while (i < prof.length - 1 && cum[i] < s) i++; const f = (s - cum[i - 1]) / Math.max(1e-9, cum[i] - cum[i - 1]);
    return [prof[i - 1][0] + (prof[i][0] - prof[i - 1][0]) * f, prof[i - 1][1] + (prof[i][1] - prof[i - 1][1]) * f];
  };
  // a row of `n` stitches round the axis over the angle `span` (from the back): its own length laid round the
  // head there, the rest of it taken up in folds
  const row = (n: number, s: number, span: number, ph: number): number[] => {
    // (gravity takes most of it down the head - the folds are shallow, deeper only where it hangs free under the jaw)
    const [rad, y] = at(s), Lh = Math.max(.3, rad) * span, k = Math.max(4, Math.round(10 * span / TAU)), A = foldDepth(n * g.w / Lh, k, Lh, y < jaw ? 1.1 : .45), q: number[] = [];
    for (let i = 0; i < n; i++) { const a = -span / 2 + (i + .5) / n * span, R = rad + A * (1 + Math.sin(k * (a + span / 2) / span * TAU + ph)) / 2; q.push(R * Math.sin(a), y, -R * Math.cos(a)); }
    return q;
  };
  const sBody = (k: number) => (B.R1 - 1) * g.h + (M - k - .5) * g.h; let k = 0;
  out.push({ p: row(B.N0, sBody(-1), TAU, 0), on: -1, ghost: true, cen });
  const full = (n: number) => { out.push({ p: row(n, sBody(k), TAU, k * .7), closed: true, on: out.length - 1, cen: [0, at(sBody(k))[1], 0] }); k++; };
  for (let i = 0; i < B.neckRows; i++) full(B.N0);
  full(B.N1);
  for (let i = 0; i < B.chin; i++) full(B.N1);
  const span = TAU * (B.N1 - B.F) / B.N1;
  for (let i = 0; i < B.faceRows; i++) { out.push({ p: row(B.N1 - B.F, sBody(k), span, k * .7), on: out.length - 1, cen: [0, at(sBody(k))[1], 0] }); k++; }
  for (let i = 0; i < 1 + B.brow; i++) full(B.N1);
  for (let r = B.R1 - 1; r >= 1; r--) out.push({ p: row(6 * r, (r - .5) * g.h, TAU, r * .5), closed: true, on: out.length - 1, cen });
  if (B.ears) for (const sx of [-1, 1]) {
    let s = 0; while (s < Lp && at(s)[0] < rs * .52) s += .1;
    const ex = sx * at(s)[0] * .96, ey = at(s)[1] + 1.4 * g.h, ec: V3 = [ex, ey, -40];
    out.push({ p: [ex, ey, 0], on: -1, ghost: true, cen: ec });
    for (let r = 1; r <= 3; r++) { const n = 6 * r, rr = (r - .5) * g.h, q: number[] = []; for (let i = 0; i < n; i++) { const a = (i + .5) / n * TAU; q.push(ex + rr * Math.sin(a), ey + rr * Math.cos(a), 0); } out.push({ p: q, closed: true, on: out.length - 1, cen: ec }); }
  }
  return { courses: out, stand: { kind: "head", prof: headProfile(rs, topS) }, size: [2 * rho, 2 * rho, (B.R1 - 1 + M) * g.h], key: "" };
}

// ---------------------------------------------------------------- 모티프 머플러
/** The motifs in one line on the table, each its own square rounds from its middle out, in its colours. */
function scarfForm(p: PlanInput, pp: Plan): Worn {
  // (laid in a horseshoe, as a scarf lies round a neck, so that a long one is seen whole and is not taken for a
  // mat: it is one line of motifs, bent where the line turns)
  const g = pp.g, M = motifScarf(p, g), out: FormCourse[] = [], y = .35, S = M.E * g.w, len = M.n * S, Rc = 1.3 * S, bent = len >= Math.PI * Rc + 2 * S, L1 = bent ? (len - Math.PI * Rc) / 2 : 0, z0 = (L1 + Rc) / 2;
  // the band's middle `s` along it (x, z), and the way across it there
  const at = (t: number): [number, number, number, number] => {
    if (!bent) return [t - len / 2, 0, 0, 1];
    if (t <= L1) return [-Rc, z0 - t, 1, 0];
    const a = (t - L1) / Rc;
    return a <= Math.PI ? [-Rc * Math.cos(a), z0 - L1 - Rc * Math.sin(a), Math.cos(a), Math.sin(a)] : [Rc, z0 - L1 + (t - L1 - Math.PI * Rc), -1, 0];
  };
  for (let k = 0; k < M.n; k++) {
    const sk = (k + .5) * S, [mx, mz] = at(sk), cen: V3 = [mx, -60, mz];
    out.push({ p: [mx, y, mz], on: -1, ghost: true, cen });
    for (let r = 1; r <= M.R; r++) {
      const n = 8 * r, hs = (r - .5) * g.w, q: number[] = [];
      for (let i = 0; i < n; i++) { const d = (i + .5) / n * 8 * hs, e = Math.min(3, Math.floor(d / (2 * hs))), u = d - e * 2 * hs - hs; const [x, z] = e === 0 ? [u, -hs] : e === 1 ? [hs, u] : e === 2 ? [-u, hs] : [-hs, -u], [px, pz, nx, nz] = at(sk + x); q.push(px + z * nx, y, pz + z * nz); }
      const tone = M.colors === "alt" ? k % 2 : M.colors === "ring" && r >= M.turn ? 1 : 0;
      out.push({ p: q, closed: true, on: out.length - 1, cen, ci: tone });
    }
  }
  return { courses: out, stand: null, size: [M.lenCm, M.sideCm, null], key: "", tones: ["main", "second"] };
}

// ---------------------------------------------------------------- 오버사이즈 양말
/** A pair, side by side: the toe's cap, the tube lying along the foot, turned up at the heel, loose up the leg,
 *  the cuff folded down outside it. */
function sockForm(p: PlanInput, pp: Plan): Worn {
  const g = pp.g, B = bigSocks(p, g), toe = pp.rows.filter(r => r.part === "bottom"), rim = pp.rows.filter(r => r.part === "rim"), out: FormCourse[] = [];
  const rho = B.N * g.w / TAU, cap = capOf(B.R * g.h, rho), capLen = cap(B.R * g.h)[1], rb = rho * .95, yc = rho + .3, Lf = Math.max(g.h, B.heel * g.h - rb * .6), z0 = (capLen + Lf) / 2;
  // where the tube's middle is `s` along it from the toe's tip, and which way it goes there
  const mid = (s: number): [V3, V3] => {
    if (s <= capLen + Lf) return [[0, yc, z0 - s], [0, 0, -1]];
    const a = (s - capLen - Lf) / rb, zh = z0 - capLen - Lf;
    if (a <= Math.PI / 2) return [[0, yc + rb * (1 - Math.cos(a)), zh - rb * Math.sin(a)], [0, Math.sin(a), -Math.cos(a)]];
    return [[0, yc + rb + (a - Math.PI / 2) * rb, zh - rb], [0, 1, 0]];
  };
  const round = (n: number, rad: number, s: number, x0: number): { p: number[]; c: V3 } => { const [c, t] = mid(s), u: V3 = [0, -t[2], t[1]], q: number[] = []; for (let i = 0; i < n; i++) { const a = (i + .5) / n * TAU; q.push(x0 + c[0] + rad * Math.cos(a), c[1] + rad * Math.sin(a) * u[1], c[2] + rad * Math.sin(a) * u[2]); } return { p: q, c: [x0 + c[0], c[1], c[2]] }; };
  let height = 0;
  for (const x0 of [-(rho + 1.4), rho + 1.4]) {
    out.push({ p: [x0, yc, z0 + g.h * .2], on: -1, ghost: true, cen: [x0, yc, z0 - capLen] });
    toe.forEach((r, i) => { const [rad, d] = cap((i + .5) * g.h), k = round(r.n, Math.max(.05, rad), d, x0); out.push({ p: k.p, closed: true, on: out.length - 1, cen: [x0, yc, z0 - capLen] }); });
    let s = capLen, c: V3 = [x0, yc, 0];
    // (loose up the leg: it slumps a little, round by round)
    for (let j = 0; j < B.rows; j++) { s += g.h; const leg = j > B.heel ? 1 + .05 * Math.sin(j * 1.7) : 1, k = round(B.N, rho * leg, s - g.h / 2, x0); c = k.c; out.push({ p: k.p, closed: true, on: out.length - 1, cen: c }); }
    rim.forEach((r, i) => { const k = round(r.n, rho + (i === 0 ? .25 : .6), s + g.h * .5 - (i === 0 ? 0 : i * g.h), x0); out.push({ p: k.p, closed: true, on: out.length - 1, cen: k.c }); height = Math.max(height, k.c[1]); });
    height = Math.max(height, c[1]);
  }
  return { courses: out, stand: null, size: [B.foot, 4 * rho + 2.8, height + rho], key: "" };
}

// ================================================================ 대바늘 기본형 (lib/knitwear)
/** 접어 만드는 대바늘 가방: the long panel folded at its middle row - the front's rows from the fold up, the
 *  back's the same behind - each row bowing out a little as a filled bag's do; the strap from the front's right
 *  end up over the side and down to the back's, as an arch as long as its rows. */
function knitFoldForm(p: PlanInput, pp: Plan): Worn {
  const g = pp.g, B = knitFold(p, g), out: FormCourse[] = [], R = B.L / 2, c = B.W * g.w, y0 = .45, rise = g.h * .98, top = y0 + R * rise;
  const bow = (t: number) => .07 + .36 * Math.sin(Math.PI * Math.min(1, t * .85 + .1));
  const rowAt = (j: number, side: number, n = B.W, from = 0) => { const th = bow((j + .5) / R), rad = c / (2 * th), q: number[] = []; for (let k = from; k < from + n; k++) { const ph = -th + (k + .5) / B.W * 2 * th; q.push(rad * Math.sin(ph), y0 + (j + .5) * rise, side * (rad * (Math.cos(ph) - Math.cos(th)) + .25)); } return q; };
  out.push({ p: rowAt(0, 1).map((v, i) => (i % 3 === 1 ? y0 : v)), on: -1, ghost: true, cen: [0, top / 2, 0] });
  // the fold is the bottom: the front's rows from it up, then the back's (worked on from the front's last row in the panel; drawn here as they hang)
  for (let i = 0; i < 2 * R; i++) { const front = i < R, j = front ? R - 1 - i : i - R; out.push({ p: rowAt(j, front ? 1 : -1), on: out.length - 1, cen: [0, y0 + (j + .5) * rise, 0] }); }
  // the strap: K stitches at the right end, from the front over the side to the back
  const last = out.length - 1, edge = out[last].p, deep = Math.max(.6, Math.abs(edge[Math.floor(B.W / 2) * 3 + 2])), xr = edge[(B.W - 1) * 3], A = archOf(deep + .4, B.SR * g.h);
  let on = last;
  for (let i = 0; i < B.SR; i++) { const [u, v] = A.at((i + .5) / B.SR * A.len), q: number[] = []; for (let k = 0; k < B.K; k++) q.push(xr - k * g.w, top + v, u); out.push({ p: q, on, cen: [xr - B.K * g.w / 2, top - 3, 0] }); on = out.length - 1; }
  return { courses: out, stand: null, size: [c, 2 * deep, B.h], key: "" };
}
/** 위에서부터 뜨는 니트 탑 (Kim: 어깨 경사를 따라, 흐물거리는 편물): on a body, the back's rows down its back from
 *  the shoulders and the front's down its front, each row as wide as its stitches, laid on the body's own section
 *  (what is wider than it there turns down over the shoulder's slope); the body's rounds from the underarm to the
 *  hem following the body, the ease in soft folds; each sleeve from the shoulder point, down and a little out,
 *  narrowing to its cuff. */
function knitTopForm(p: PlanInput, pp: Plan): Worn {
  const g = pp.g, K = knitTop(p, g), out: FormCourse[] = [], r = Math.max(6, K.bust / 6.15), bust = 2.3 * r + 1, body = bodyOf(r, bust), off = .7;
  const panel = pp.rows.filter(x => x.part === "panel" && x.n > 0 && /단$/.test(x.label)), shTop = bust + 1.04 * r, rh = g.h * .95;
  // a panel's row: its middle at the back (a = 0) or the front (a = PI), on the body from side to side; wider than
  // that it lies looser, in soft folds (`gap`: the front's neck, stitches left out at its middle)
  let reach = 0;
  const panelRow = (n: number, y: number, a: number, gap = 0): number[] => {
    const S = sectionOf(body, y, off), s0 = S.sAt(a), dir = a === 0 ? 1 : -1, sR = S.sAt(Math.PI / 2), sL = S.sAt(3 * Math.PI / 2);
    const lim = Math.min(a === 0 ? sR - s0 : s0 - sR, a === 0 ? s0 + S.L - sL : sL - s0), half = (n + gap) * g.w / 2, c = Math.min(1, lim / half), A = foldDepth(1 / c, 3, 2 * lim, 1.2), q: number[] = [];
    for (let k = 0; k < n; k++) {
      const kk = gap && k >= n / 2 ? k + gap : k, u = (kk - (n + gap - 1) / 2) * g.w * c, [x, z] = S.at(s0 + dir * u), [nx, nz] = S.nrm(s0 + dir * u), d = A * (1 + Math.cos(u / Math.max(1, lim) * 3 * Math.PI)) / 2;
      reach = Math.max(reach, Math.abs(x)); q.push(x + nx * d, y, z + nz * d);
    }
    return q;
  };
  let under = shTop;
  for (const [name, a] of [["뒤판", 0], ["앞판", Math.PI]] as const) {
    const rows = panel.filter(x => x.label.startsWith(name)), front = a !== 0;
    out.push({ p: panelRow(rows[0]?.n ?? K.T, shTop + rh * .5, a), on: -1, ghost: true, cen: [0, shTop, 0] });
    let L = out.length - 1, R = L;
    rows.forEach((x, i) => {
      const y = shTop - (i + .5) * rh; under = Math.min(under, y - rh * .5);
      // 앞판의 목: the two shoulders worked side by side over the neck's rows - two pieces, nothing across the neck
      if (front && i < K.ND) {
        const q = panelRow(x.n, y, a, K.neck), h = q.length / 2;
        out.push({ p: q.slice(0, h), on: L, cen: [0, y, 0] }); L = out.length - 1; out.push({ p: q.slice(h), on: R, cen: [0, y, 0] }); R = out.length - 1;
        if (i === K.ND - 1) { out.push({ p: q, on: -1, ghost: true, cen: [0, y, 0] }); L = R = out.length - 1; }
        return;
      }
      out.push({ p: panelRow(x.n, y, a), on: L, cen: [0, y, 0] }); L = R = out.length - 1;
    });
  }
  // the body round by round from the underarm down, the hem's rib at its foot: on the body, its ease in folds
  const rows = pp.rows.filter(x => x.part === "body" || x.part === "rim");
  out.push({ p: clothRing(body, under + g.h * .5, K.N, g.w, off), on: -1, ghost: true, cen: [0, under, 0] });
  rows.forEach((x, i) => { const y = under - (i + .5) * g.h; out.push({ p: clothRing(body, y, x.n, g.w, off, i * .04, y, 6), closed: true, on: out.length - 1, cen: [0, y, 0] }); });
  // the sleeves: from the shoulder point, leaving it sideways and turning down and a little out, as an arm hangs
  const sleeve = pp.rows.filter(x => x.part === "strap" && x.n > 0), Ls = Math.max(4, sleeve.length * g.h);
  for (const s of [-1, 1]) {
    const rA = (sleeve[0]?.n ?? K.P) * g.w / TAU, o: V3 = [s * (Math.max(reach, 1.2 * r) + .3), Math.min(shTop - rA * .6, under + rA), 0];
    // the line down the sleeve's middle: a curve leaving the armhole sideways, then down and out about 20 degrees
    const P1: V3 = [o[0] + s * rA * .7, o[1] - rA * .2, 0], P2: V3 = [o[0] + s * (rA * .7 + Ls * .34), o[1] - Ls * .94, 0], N = 120, line: V3[] = [], acc = [0];
    for (let i = 0; i <= N; i++) { const t = i / N, u = 1 - t; line.push([u * u * o[0] + 2 * u * t * P1[0] + t * t * P2[0], u * u * o[1] + 2 * u * t * P1[1] + t * t * P2[1], 0]); if (i) acc.push(acc[i - 1] + Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1])); }
    const scale = Ls / acc[N];
    const ringAt = (n: number, d: number, ph: number): number[] => {
      let i = 1; while (i < N && acc[i] * scale < d) i++; const c = line[i], tx = line[i][0] - line[i - 1][0], ty = line[i][1] - line[i - 1][1], tl = Math.hypot(tx, ty) || 1;
      const ux = -ty / tl * s, uy = tx / tl * s, rad = n * g.w / TAU, q: number[] = [];
      // (soft: a hanging sleeve settles a little flat front to back, in a few shallow folds)
      for (let k = 0; k < n; k++) { const a = (k + .5) / n * TAU, R = rad * (1 + .07 * Math.sin(5 * a + d * .25)); q.push(c[0] + ux * Math.cos(a) * R, c[1] + uy * Math.cos(a) * R, Math.sin(a) * R * .9); }
      return q;
    };
    out.push({ p: ringAt(sleeve[0]?.n ?? K.P, 0, 0), on: -1, ghost: true, cen: [o[0], o[1], 0] });
    sleeve.forEach((x, i) => { const d = (i + .5) * g.h; out.push({ p: ringAt(x.n, d, i), closed: true, on: out.length - 1, cen: [o[0] + s * 3, o[1] - d, 0] }); });
  }
  return { courses: out, stand: torsoStand(body), size: [2 * Math.max(reach, 1.2 * r) + K.sleeveCm * .7, 2 * r, K.len], key: "" };
}

const cache = new Map<string, Worn>();
/** a wear piece as it is worn, from its plan (kept for the sizes it was made for: the same piece asked again
 *  - a colour changed, a screen opened - is not laid out again) */
export function wornForm(p: PlanInput, pp: Plan): Worn | null {
  const id = p.item as WearId, key = JSON.stringify([id, pp.g.h, pp.g.w, p.circ, p.h, p.headH, p.brimCm, p.brimFold, p.motifN, p.brimMore, p.sleeveCm, p.strapCm, p.tieCm, p.tieWcm, p.ribRows, p.crochetChart, pp.rows.length, p.a, p.topA, p.holeW, p.handleCm, p.handleWcm, p.bust, p.b, p.strapCm, p.cinched, p.neckCm, p.faceW, p.faceH, p.ears, p.motifColors, p.footL, p.ankleCm, p.cuffCm, p.topLine]);
  const hit = cache.get(key); if (hit) return hit;
  const f = id === "knitfold" ? knitFoldForm(p, pp) : id === "knittop" ? knitTopForm(p, pp) : id === "buckethat" ? bucketForm(p, pp) : id === "motifhat" ? motifForm(p, pp) : id === "hoodscarf" ? hoodForm(p, pp) : id === "earflap" ? earflapForm(p, pp) : id === "kerchief" ? kerchiefForm(p, pp)
    : id === "trapbag" ? trapForm(p, pp) : id === "moonbag" ? moonForm(p, pp) : id === "bonnet" ? bonnetForm(p, pp) : id === "bustier" ? bustierForm(p, pp) : id === "halter" ? halterForm(p, pp)
    : id === "knotbag" ? knotForm(p, pp) : id === "twoway" ? twoWayForm(p, pp) : id === "balaclava" ? balaForm(p, pp) : id === "motifscarf" ? scarfForm(p, pp) : id === "bigsocks" ? sockForm(p, pp) : null;
  if (!f) return null;
  f.key = key; if (cache.size > 12) cache.delete(cache.keys().next().value as string); cache.set(key, f);
  return f;
}
