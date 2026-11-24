// Every named pattern of the 무늬 도감 as a chart the 3D can draw (Kim: 나머지도 다 해줘). A chart is stitches with a
// base (where each is worked into) and a top, plus chains (lib/crochetChart). Most patterns are written here on
// a grid: one cell for each stitch, each cell saying which stitch it is and how it sits - its colour, how far
// it leans (a cable, a slanted stitch), whether it stands out (a front post, the crossing in front, a bobble) or
// back, whether it reaches rows down (a spike), or a hole (lace, mesh). The next row is worked into the tops of
// this one, so short and tall stitches in a row make waves on their own. Shapes worked in rounds (motifs) and
// lace with arches have their own small builders.
// These are pictures of the fabric for the 3D, worked out from how each pattern is made - near, not exact:
// the written pattern rows for most of them are not here yet.
import { CHART_HT, compileChart, type Chart, type ChartKey, type ChartStitch, type ChartType } from "./crochetChart";

/** one cell: a stitch and how it sits; null = a hole (nothing worked there) */
export interface Cell {
  t: ChartType; c?: number;
  /** the top moved along (a lean, a cable), the base moved along (two stitches in one), raised (+) or sunk (-) */
  dx?: number; bx?: number; z?: number;
  /** worked this many rows down (a spike) */
  down?: number;
  /** other bases joined into this top (a cluster: offsets along) */
  join?: number[];
  /** a chain space instead of a stitch: chains at the row's top */
  chain?: boolean;
}
type CellFn = (i: number, j: number) => Cell | null;

/** a grid of W stitches by H rows */
export function grid(W: number, H: number, f: CellFn, foundation = true): Chart {
  const st: ChartStitch[] = [], ch: Chart["ch"] = [], tops: number[][] = [];
  if (foundation) for (let i = 0; i < W; i++) ch.push([i, 0]);
  let base = Array<number>(W).fill(0);
  for (let j = 0; j < H; j++) {
    const row = Array<number>(W).fill(0), cells = Array.from({ length: W }, (_, i) => f(i, j));
    let hi = 0;
    cells.forEach((c, i) => { if (c && !c.chain) hi = Math.max(hi, base[i] + CHART_HT[c.t]); });
    if (!hi) hi = Math.max(...base) + CHART_HT.sc;
    cells.forEach((c, i) => {
      if (!c) { row[i] = base[i]; return; }
      if (c.chain) { ch.push([i, hi - .1, c.c ?? 0]); row[i] = hi; return; }
      const by = c.down ? (tops[Math.max(0, j - c.down - 1)]?.[i] ?? 0) : base[i];
      const b: [number, number] = [i + (c.bx ?? 0), by], t: [number, number] = [i + (c.dx ?? 0), base[i] + CHART_HT[c.t]];
      st.push({ type: c.t, b, t, g: [i, j], ...(c.c ? { c: c.c } : {}), ...(c.z ? { z: c.z } : {}) });
      (c.join ?? []).forEach(o => st.push({ type: c.t, b: [i + o, base[Math.max(0, Math.min(W - 1, i + o))]], t, ...(c.c ? { c: c.c } : {}), ...(c.z ? { z: c.z } : {}) }));
      row[i] = t[1];
    });
    tops.push(row); base = row;
  }
  return { st, ch, W, H: Math.max(...base, 1) };
}

// ---- small helpers for the recipes
const K = (c?: number, x: Partial<Cell> = {}): Cell => ({ t: "k", c, ...x });
const Pp = (c?: number, x: Partial<Cell> = {}): Cell => ({ t: "p", c, ...x });
const CH: Cell = { t: "sc", chain: true };
const S = (t: ChartType, x: Partial<Cell> = {}): Cell => ({ t, ...x });
const tri = (i: number, n: number) => { const m = ((i % n) + n) % n; return m < n / 2 ? m : n - m; };
const hound = (i: number, j: number) => { const a = i % 4, b = j % 4; return (a + b) % 4 < 2 ? (a < 2 === b < 2 ? 1 : 0) : (a + b === 3 || a === b ? 1 : 0); };

/** a round piece worked from the middle out: rounds of `per`(r) stitches of `t`, colour by round */
function rounds(R: number, per: (r: number) => number, t: (r: number, k: number) => ChartType | "ch", color?: (r: number) => number, gap = 0): Chart {
  const st: ChartStitch[] = [], ch: Chart["ch"] = [], cx = R * 2.2, cy = R * 2.2;
  let prevR = 0;
  for (let r = 1; r <= R; r++) {
    const n = per(r), rad = r * 2.05;
    for (let k = 0; k < n; k++) {
      // each round turned a little against the one below (Kim: 3D 정밀): its stitches stood on the same angles as the
      // round below's, six of them in a line from the middle to the edge - spokes; in a real circle they never stack
      const a = (k + (r % 2) * .5) / n * Math.PI * 2 + r * .23, tt = t(r, k);
      if (tt === "ch") { ch.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, color?.(r) ?? 0]); continue; }
      const b: [number, number] = [cx + Math.cos(a) * prevR, cy + Math.sin(a) * prevR], top: [number, number] = [cx + Math.cos(a) * (rad - gap), cy + Math.sin(a) * (rad - gap)];
      st.push({ type: tt, b, t: top, ...(color ? { c: color(r) } : {}) });
    }
    prevR = rad;
  }
  return { st, ch, W: cx * 2, H: cy * 2 };
}

/** chain arches: from each point to the next, n chains bowing up */
function arches(pts: [number, number][], n: number, ch: Chart["ch"], c = 0, bow = .8) {
  for (let i = 0; i + 1 < pts.length; i++) for (let k = 1; k <= n; k++) { const f = k / (n + 1), [x0, y0] = pts[i], [x1, y1] = pts[i + 1]; ch.push([x0 + (x1 - x0) * f, y0 + (y1 - y0) * f + bow * Math.sin(Math.PI * f), c]); }
}

const W0 = 18, H0 = 9, W_CABLE = 17;
/** every pattern drawn here, by its name in the 무늬 도감 (lib/stitchPatterns) */
export const RECIPES: Record<string, () => Chart> = {
  // ---------------- 코바늘 · 기본 코
  "사슬뜨기": () => { const ch: Chart["ch"] = []; for (let j = 0; j < 6; j++) for (let i = 0; i < 16; i++) ch.push([i, j * 1.4]); return { st: [], ch, W: 16, H: 8 }; },
  "빼뜨기": () => grid(W0, 12, () => S("sl")),
  "두길긴뜨기": () => grid(W0, 4, () => S("tr")),
  "세길긴뜨기": () => grid(W0, 3, () => S("dtr")),
  "앞 고리 뜨기": () => grid(W0, H0, (_i, j) => S("sc", { z: j % 2 ? .18 : 0 })),
  "사슬 없는 기초코": () => grid(W0, H0, () => S("sc"), false),
  "연장 짧은뜨기": () => grid(W0, 7, () => S("hdc")),
  "이어 뜬 한길긴뜨기": () => grid(W0, 4, () => S("dc", { z: .05 })),
  // ---------------- 코바늘 · 촘촘한 질감
  "레몬필 스티치": () => grid(W0, 7, (i, j) => S((i + j) % 2 ? "dc" : "sc")),
  "그릿 스티치": () => grid(W0, 8, (i, j) => ((i + j) % 2 ? S("dc", { bx: -1 }) : S("sc", { dx: .25 }))),
  "수제트 스티치": () => grid(W0, 8, (i, j) => ((i + j) % 2 ? S("dc", { bx: -.9, dx: -.2 }) : S("sc"))),
  "크런치 스티치": () => grid(W0, 9, (i, j) => S((i + j) % 2 ? "hdc" : "sl")),
  "세지 스티치": () => grid(W0, 7, (i, j) => { const k = (i + j) % 3; return S(k === 0 ? "sc" : k === 1 ? "hdc" : "dc", { bx: -k }); }),
  "프림로즈 스티치": () => grid(W0, 6, (i, j) => ((i + j) % 3 === 1 ? CH : S("dc", { dx: (i + j) % 3 === 0 ? .3 : -.3 }))),
  "헤링본 긴뜨기": () => grid(W0, 7, (_i, j) => S("hdc", { dx: j % 2 ? .35 : -.35 })),
  "캐멀 스티치": () => grid(W0, 7, (_i, j) => S("hdc", { z: j % 2 ? .22 : 0 })),
  "니트 스티치 (와이스트코트)": () => grid(W0, 12, () => K()),
  "써멀 스티치": () => grid(W0, 12, (_i, j) => S("sc", { z: j % 2 ? .25 : -.05 })),
  "스파이크 스티치": () => grid(W0, 10, (i, j) => (j % 4 === 3 ? S("sc", { down: [0, 1, 2, 1][i % 4], c: 1 }) : S("sc", { c: Math.floor(j / 4) % 2 }))),
  "교차 한길긴뜨기": () => grid(W0, 4, (i) => S("dc", { bx: i % 2 ? -1 : 1, z: i % 2 ? .18 : 0 })),
  "별 스티치": () => grid(W0, 6, (i, j) => (j % 2 ? S("sc") : (i % 2 ? S("cl", { join: [-1, 1], z: .1 }) : CH))),
  "트리니티 스티치": () => grid(W0, 8, (i, j) => ((i + j) % 2 ? S("cl", { join: [-1, 1] }) : CH)),
  "재스민 스티치": () => grid(W0, 6, (i, j) => ((i + j) % 3 === 0 ? S("puff", { z: .2 }) : j % 2 ? S("sc") : CH)),
  // ---------------- 코바늘 · 기둥 무늬
  "앞 걸어뜨기 · 뒤 걸어뜨기": () => grid(W0, 5, (i) => S("dc", { z: i % 2 ? -.3 : .3 })),
  "걸어뜨기 고무단": () => grid(W0, 5, (i) => S("dc", { z: i % 4 < 2 ? .32 : -.3 })),
  "알파인 스티치": () => grid(W0, 9, (i, j) => (j % 2 ? S("sc") : (i + j / 2) % 2 ? S("dc", { down: 1, z: .3 }) : S("sc"))),
  "와플 스티치": () => grid(W0, 6, (i, j) => (i % 3 === 0 ? S("dc", { z: .32 }) : S("dc", { z: j % 2 ? .2 : 0 }))),
  "바구니 무늬": () => grid(16, 8, (i, j) => S("dc", { z: (Math.floor(i / 4) + Math.floor(j / 2)) % 2 ? -.28 : .3 })),
  "코바늘 꽈배기": () => grid(W0, 5, (i, j) => { const m = i % 6; if (m >= 1 && m <= 4) { const cr = j % 2 === 1; return S("tr", { dx: cr ? (m <= 2 ? 1 : -1) : 0, z: cr && m <= 2 ? .45 : .3 }); } return S("dc", { z: -.2 }); }),
  // 3D 정밀 (Kim): a scale hangs from its top - dc worked down one post and up the next fan out below it, the
  // rounded edge at the bottom - and each row lies over the one below, half a scale over (they opened upward)
  "악어 비늘 무늬": () => { const st: ChartStitch[] = [], ch: Chart["ch"] = []; for (let r = 0; r < 4; r++) for (let s = 0; s < 4; s++) { const x0 = s * 4 + (r % 2) * 2 + 1, top = r * 2.4 + 2.6; for (let k = 0; k < 9; k++) { const a = Math.PI * (1.12 + .76 * k / 8); st.push({ type: "dc", b: [x0, top], t: [x0 + Math.cos(a) * 2, top + Math.sin(a) * 2.3], z: .3 + r * .06 + .12 * -Math.sin(a) }); } } return { st, ch, W: 18, H: 12.5 }; },
  // ---------------- 코바늘 · 볼록 무늬
  "방울뜨기 (보블)": () => grid(W0, 9, (i, j) => (j % 2 && (i + (j >> 1)) % 4 === 1 ? S("bob", { z: .4 }) : S("sc"))),
  "퍼프 스티치": () => grid(W0, 6, (i, j) => (i % 2 ? CH : S("puff", { dx: j % 2 ? .3 : 0, z: .2 }))),
  "팝콘 스티치": () => grid(W0, 8, (i, j) => (j % 2 && (i + (j >> 1) * 2) % 4 === 1 ? S("pop", { z: .5 }) : S("sc"))),
  "빈 스티치 (콩 무늬)": () => grid(W0, 8, (i, j) => (i % 2 ? S("puff", { z: .15, dx: j % 2 ? .4 : -.4 }) : CH)),
  "클러스터 (모아뜨기 무늬)": () => grid(W0, 6, (i, j) => ((i + j) % 2 ? S("cl", { join: [-1, 1] }) : CH)),
  "피코": () => { const c = grid(W0, 6, () => S("sc")); for (let i = 1; i < W0; i += 3) c.st.push({ type: "picot", b: [i, c.H], t: [i, c.H + 1] }); c.H += 1; return c; },
  "불리온 스티치": () => grid(W0, 4, (i) => (i % 3 === 1 ? S("bull", { z: .2 }) : S("sc"))),
  "고리 뜨기 (루프)": () => grid(W0, 8, (_i, j) => (j % 2 ? S("loop", { z: .3 }) : S("sc"))),
  // ---------------- 코바늘 · 조개 · 부채 · 구멍
  "조개 무늬": () => compileChart("shell", 19, 6),
  "그래니 무늬": () => grid(W0, 5, (i, j) => ((i + j * 2) % 4 === 3 ? CH : S("dc", { dx: ((i + j * 2) % 4 - 1) * .2 }))),
  "방안뜨기 (필레)": () => grid(19, 6, (i, j) => (i % 2 === 0 || (Math.abs(i - 9) + Math.abs(j * 2 - 5)) < 6 ? S("dc") : CH)),
  "솔로몬 매듭": () => { const st: ChartStitch[] = [], ch: Chart["ch"] = []; for (let r = 0; r < 5; r++) for (let i = 0; i < 6; i++) { const x = i * 3 + (r % 2) * 1.5, y = r * 2.6; st.push({ type: "sc", b: [x, y], t: [x, y + .4] }); arches([[x, y + .4], [x + 1.5, y + 2.6 + .4]], 4, ch, 0, .2); arches([[x, y + .4], [x - 1.5, y + 2.6 + .4]], 4, ch, 0, .2); } return { st, ch, W: 18, H: 13 }; },
  "파인애플 무늬": () => { const c = compileChart("shell", 19, 2), y = c.H; for (let p = 0; p < 3; p++) { const x = 3 + p * 6; for (let r = 0; r < 5; r++) { const n = 5 - r; for (let k = 0; k < n; k++) arches([[x - n / 2 + k, y + r * 1.3], [x - n / 2 + k + 1, y + r * 1.3]], 2, c.ch, 0, .5); } c.st.push(...[-1, 0, 1].map(o => ({ type: "dc" as ChartType, b: [x + o * .5, y + 6.5] as [number, number], t: [x + o * .9, y + 8.5] as [number, number] }))); } c.H = y + 9; return c; },
  "라크스풋 무늬": () => grid(W0, 6, (i, j) => ((i + j) % 3 === 1 ? S("dc", { down: 1, dx: 0 }) : (i + j) % 3 === 0 ? S("dc") : CH)),
  "거미 무늬": () => { const st: ChartStitch[] = [], ch: Chart["ch"] = []; for (let s = 0; s < 3; s++) { const cx = 3 + s * 6, cy = 5; for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; arches([[cx, cy], [cx + Math.cos(a) * 3, cy + Math.sin(a) * 3]], 3, ch, 0, .1); } for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; st.push({ type: "sc", b: [cx + Math.cos(a) * 3, cy + Math.sin(a) * 3], t: [cx + Math.cos(a) * 3.3, cy + Math.sin(a) * 3.3] }); } } return { st, ch, W: 18, H: 10 }; },
  "브룸스틱 레이스": () => { const st: ChartStitch[] = [], ch: Chart["ch"] = []; for (let r = 0; r < 3; r++) { const y = r * 4.2; for (let i = 0; i < 18; i++) st.push({ type: "loop", b: [i, y], t: [Math.floor(i / 5) * 5 + 2, y + 3.4] }); for (let g = 0; g < 4; g++) for (let k = 0; k < 5; k++) st.push({ type: "sc", b: [g * 5 + 2, y + 3.4], t: [g * 5 + k, y + 4.2] }); } return { st, ch, W: 18, H: 13 }; },
  "헤어핀 레이스": () => { const st: ChartStitch[] = [], ch: Chart["ch"] = []; for (let s = 0; s < 3; s++) { const x = 3 + s * 6; for (let k = 0; k < 14; k++) { st.push({ type: "loop", b: [x, k * .8], t: [x - 2.6, k * .8 + .3] }); st.push({ type: "loop", b: [x, k * .8 + .4], t: [x + 2.6, k * .8 + .7] }); st.push({ type: "sc", b: [x, k * .8], t: [x, k * .8 + .6] }); } } return { st, ch, W: 18, H: 12 }; },
  "아이리시 크로셰": () => { const net: Chart["ch"] = [], st: ChartStitch[] = []; for (let r = 0; r < 5; r++) for (let i = 0; i < 6; i++) arches([[i * 3 + (r % 2) * 1.5, r * 2.4], [i * 3 + 3 + (r % 2) * 1.5, r * 2.4]], 4, net, 0, 1.1); const fl = rounds(2, r => (r === 1 ? 6 : 12), r => (r === 1 ? "sc" : "dc"), () => 1); fl.st.forEach(s => st.push({ ...s, b: [s.b[0] + 4.5, s.b[1] + 2], t: [s.t[0] + 4.5, s.t[1] + 2], z: .3 })); return { st, ch: net, W: 18, H: 12 }; },
  // ---------------- 코바늘 · 물결 · 지그재그 · 모티프
  "물결 무늬 (높이 변화)": () => grid(W0, 5, (i, j) => { const k = tri(i, 8); return S((["sc", "hdc", "dc", "tr", "tr"] as ChartType[])[j % 2 ? 4 - Math.min(4, k) : Math.min(4, k)], { c: j % 2 }); }),
  "쉐브론 (리플)": () => ripple(grid(24, 10, (i, j) => S("dc", { dx: (i % 12 < 6 ? 1 : -1) * .5, c: Math.floor(j / 2) % 3 }))),
  "캐서린 휠": () => grid(W0, 6, (i, j) => ((i + j * 4) % 8 < 4 ? S("cl", { join: [-1, 1], c: j % 2 }) : S("dc", { dx: ((i + j * 4) % 8 - 5.5) * .35, c: j % 2 }))),
  "코너 투 코너 (C2C)": () => grid(16, 12, (i, j) => S("dc", { dx: .45, c: (Math.floor((i + j) / 3) % 2) })),
  // 3D 정밀 (Kim): built as it is worked - round by round out from the middle, each side's clusters of three
  // parallel dc standing out from their side, in the spaces of the round below, a chain space at each corner
  // (it was spokes from the middle)
  "그래니 스퀘어": () => {
    const st: ChartStitch[] = [], ch: Chart["ch"] = [], R = 4, step = 2.1, C = R * step + 1;
    const sides: [number, number, number, number][] = [[1, 0, 0, 1], [0, 1, -1, 0], [-1, 0, 0, -1], [0, -1, 1, 0]]; // outward normal (nx,ny), along (ax,ay)
    for (let r = 1; r <= R; r++) {
      const outer = r * step, inner = (r - 1) * step + .2, n = r, col = r % 2;
      for (const [nx, ny, ax, ay] of sides) {
        for (let k = 0; k < n; k++) {
          const u = (k + .5) / n * 2 - 1; // -1 .. 1 along the side
          for (const o of [-.55, 0, .55]) {
            // parallel posts; only past the inner square's corner (the corner cluster, worked into the corner space) they fan
            const along = u * outer * .82 + o, lim = Math.max(.4, inner) * .95, bAlong = Math.max(-lim, Math.min(lim, along));
            st.push({ type: "dc", b: [C + nx * inner + ax * bAlong, C + ny * inner + ay * bAlong], t: [C + nx * outer + ax * along, C + ny * outer + ay * along], c: col });
          }
          if (k < n - 1) { const g = ((k + 1) / n * 2 - 1) * outer * .82; ch.push([C + nx * outer + ax * g, C + ny * outer + ay * g, col]); }
        }
        // the corner space: two chains at this side's end
        const e = outer * .98; ch.push([C + nx * outer + ax * e, C + ny * outer + ay * e, col]);
      }
    }
    return { st, ch, W: C * 2, H: C * 2 };
  },
  "원형 · 육각 모티프": () => rounds(4, r => r * 6, () => "dc", r => r % 2),
  "꽃 모티프": () => { const c = rounds(2, r => (r === 1 ? 8 : 0), () => "sc"); const st = c.st; for (let p = 0; p < 6; p++) { const a = p / 6 * Math.PI * 2; for (let k = 0; k < 5; k++) { const a2 = a + (k - 2) * .16; st.push({ type: "tr", b: [c.W / 2 + Math.cos(a) * 2, c.H / 2 + Math.sin(a) * 2], t: [c.W / 2 + Math.cos(a2) * 5.4, c.H / 2 + Math.sin(a2) * 5.4], c: 1, z: .1 }); } } return c; },
  "바바리안 무늬": () => grid(W0, 6, (i, j) => ((i + j * 3) % 6 < 3 ? S("cl", { join: [-2, -1, 1, 2], c: j % 2 }) : S("dc", { dx: ((i + j * 3) % 6 - 4) * .5, c: j % 2 }))),
  // ---------------- 코바늘 · 배색
  "줄무늬": () => grid(W0, 12, (_i, j) => S("sc", { c: Math.floor(j / 2) % 2 })),
  "타피스트리 (태피스트리)": () => grid(W0, 12, (i, j) => S("sc", { c: (tri(i, 8) + j) % 6 < 2 ? 1 : 0 })),
  "모자이크 크로셰": () => grid(W0, 12, (i, j) => (j % 2 && i % 4 === 1 ? S("dc", { down: 1, c: 1 }) : S("sc", { c: Math.floor(j / 2) % 2 }))),
  "인타샤": () => grid(W0, 12, (i, j) => S("sc", { c: i > 4 + j / 2 && i < 14 - j / 3 ? 1 : 0 })),
  "하운드투스": () => grid(16, 14, (i, j) => S("sc", { c: hound(i, j) })),
  "깅엄 체크": () => grid(W0, 12, (i, j) => S("sc", { c: (Math.floor(i / 3) % 2) + (Math.floor(j / 3) % 2) })),
  // ---------------- 코바늘 · 튀니지안
  "튀니지안 심플 스티치": () => grid(W0, 10, () => S("bar")),
  "튀니지안 니트 스티치": () => grid(W0, 12, () => K()),
  "튀니지안 펄 스티치": () => grid(W0, 12, () => Pp()),
  "튀니지안 풀 스티치": () => grid(W0, 10, (i) => S("bar", { bx: i % 2 ? .5 : -.5 })),
  "튀니지안 허니콤": () => grid(W0, 12, (i, j) => ((i + j) % 2 ? Pp() : S("bar"))),
  "튀니지안 엔터락": () => grid(16, 12, (i, j) => S("bar", { dx: (Math.floor(j / 4) % 2 ? .35 : -.35), c: (Math.floor(i / 4) + Math.floor(j / 4)) % 2 })),
  // ---------------- 코바늘 · 가장자리
  "짧은뜨기 테두리": () => grid(W0, 6, (_i, j) => S("sc", { c: j >= 4 ? 1 : 0 })),
  "새우뜨기 (되돌아 짧은뜨기)": () => { const c = grid(W0, 5, () => S("sc")); for (let i = 0; i < W0; i++) c.st.push({ type: "crab", b: [i, c.H], t: [i + .6, c.H + .8], c: 1 }); c.H += 1; return c; },
  "피코 테두리": () => { const c = grid(W0, 5, () => S("sc")); for (let i = 1; i < W0; i += 3) c.st.push({ type: "picot", b: [i, c.H], t: [i, c.H + 1], c: 1 }); c.H += 1; return c; },
  "조개 테두리": () => { const c = grid(19, 4, () => S("sc")), y = c.H; for (let s = 0; s < 3; s++) { const x = 3 + s * 6; for (let k = -2; k <= 2; k++) c.st.push({ type: "dc", b: [x, y], t: [x + k * .75, y + 2.05], c: 1 }); } c.H += 2.2; return c; },

  // ---------------- 대바늘 · 기본 뜨기 (the ones that are not plain knit and purl)
  "꼬아뜨기": () => grid(W0, 12, () => K(0, { z: .08 })),
  "걸러뜨기": () => grid(W0, 12, (i, j) => (i % 4 === 1 && j % 2 ? K(1, { down: 1 }) : K(Math.floor(j / 2) % 2 ? 0 : 0))),
  "바늘비우기": () => grid(W0, 12, (i, j) => (j === 6 && i % 3 === 1 ? S("yo") : K())),
  "모아뜨기": () => grid(W0, 12, (i, j) => (j % 4 === 2 && i % 4 === 1 ? K(0, { dx: .45, z: .1 }) : K())),
  "늘려뜨기": () => grid(W0, 12, (i, j) => (j % 4 === 2 && i % 4 === 1 ? K(0, { bx: -.5 }) : K())),
  // ---------------- 대바늘 · 도톰한 고무 · 브리오쉬
  "하프 피셔맨 립": () => grid(W0, 12, (i, j) => (i % 2 ? Pp() : K(0, { z: j % 2 ? .15 : 0 }))),
  "브리오쉬": () => grid(W0, 12, (i) => (i % 2 ? Pp(0, { z: -.2 }) : K(0, { z: .3 }))),
  "2색 브리오쉬": () => grid(W0, 12, (i) => (i % 2 ? Pp(1, { z: -.2 }) : K(0, { z: .3 }))),
  // ---------------- 대바늘 · 꽈배기
  "기본 꽈배기 (밧줄)": () => grid(17, 16, cable(6, 6, 2)),
  "땋은 꽈배기": () => grid(W0, 16, (i, j) => { const m = i % 9; if (m < 1 || m > 7) return Pp(); const left = j % 8 === 3 && m <= 4, right = j % 8 === 7 && m >= 4; return K(0, { dx: left ? (m <= 2 ? 2 : -2) : right ? (m >= 6 ? -2 : 2) : 0, z: left || right ? (m % 2 ? .45 : .15) + .2 : .25 }); }),
  "말굽 꽈배기": () => grid(W0, 16, (i, j) => { const m = i % 9; if (m < 1 || m > 7) return Pp(); const on = j % 8 === 3; return K(0, { dx: on ? (m < 4 ? 1.5 : m > 4 ? -1.5 : 0) : 0, z: on ? .45 : .25 }); }),
  "벌집 꽈배기": () => grid(W0, 16, (i, j) => K(0, { dx: j % 4 === 1 ? ((i + (j % 8 === 1 ? 0 : 1)) % 2 ? -1 : 1) : 0, z: j % 4 === 1 ? .35 : .12 })),
  "다이아몬드 · 격자 꽈배기": () => grid(W0, 16, (i, j) => { const d = (tri(i, 8) + j) % 8, on = d === 0 || (tri(i + 4, 8) + j) % 8 === 0; return on ? K(0, { dx: (i % 8 < 4 ? 1 : -1) * .9, z: .4 }) : Pp(); }),
  "미니 교차 (트위스트)": () => grid(W0, 12, (i, j) => (i % 4 === 0 || i % 4 === 3 ? Pp() : K(0, { dx: j % 4 === 1 ? (i % 4 === 1 ? 1 : -1) : 0, z: j % 4 === 1 && i % 4 === 1 ? .4 : .15 }))),
  "아란 무늬 조합": () => grid(W0, 16, (i, j) => (i < 3 || i > 14 ? Pp(0, { z: (i + j) % 2 ? .1 : 0 }) : i < 9 ? cable(6, 6, 3)(i - 3, j) : (tri(i, 6) + j) % 6 === 0 ? K(0, { dx: .8, z: .35 }) : Pp())),
  "스모킹 무늬": () => grid(W0, 16, (i, j) => (i % 4 === 1 ? Pp() : K(0, { dx: j % 6 === 3 ? (i % 8 < 4 ? .6 : -.6) : 0, z: .15 }))),
  // ---------------- 대바늘 · 레이스
  "아일렛 줄": () => grid(W0, 12, (i, j) => (j % 6 === 3 ? (i % 2 ? S("yo") : K(0, { dx: .45 })) : K())),
  "그물 무늬": () => grid(W0, 12, (i, j) => (j % 2 ? K() : (i + (j % 4 ? 1 : 0)) % 2 ? S("yo") : K(0, { dx: .45 }))),
  "페더 앤 팬 (올드 셰일)": () => ripple(grid(W0, 12, (i, j) => (j % 4 === 3 ? Pp() : K(0, { dx: (tri(i, 9) - 2.2) * .18 * (j % 4 === 1 ? 1 : .5) }))), 9),
  "나뭇잎 레이스": () => grid(W0, 16, (i, j) => { const m = i % 9, r = j % 8, w = r < 4 ? r : 8 - r; return m === 4 && r === 0 ? S("yo") : Math.abs(m - 4) === w + 1 && r % 2 === 0 ? S("yo") : K(0, { dx: Math.abs(m - 4) <= w ? (m < 4 ? .3 : m > 4 ? -.3 : 0) : 0 }); }),
  // 3D 정밀 (Kim): every hole has its decrease beside it, leaning in - that slant is what draws the diamond's lines
  // (the holes stood alone, scattered); on the purl rows between, plain stitches
  "다이아몬드 레이스": () => grid(W0, 16, (i, j) => {
    const hole = (x: number) => (tri(x, 8) + tri(j, 8)) === 4 && j % 2 === 0;
    if (hole(i)) return S("yo");
    const m = ((i % 8) + 8) % 8;
    if (hole(i + 1)) return K(0, { dx: m < 4 ? .5 : -.5 }); // k2tog / ssk beside the hole, leaning along the diamond's side
    if (hole(i - 1)) return K(0, { dx: m < 4 ? .5 : -.5 });
    return K();
  }),
  "말굽 레이스": () => grid(W0, 12, (i, j) => (j % 2 ? K() : i % 10 === 1 || i % 10 === 9 ? S("yo") : K(0, { dx: i % 10 < 5 ? -.25 : .25 }))),
  "사다리 무늬": () => grid(W0, 12, (i, j) => (i % 6 === 2 ? (j % 2 ? S("yo") : null) : K())),
  // 3D 정밀 (Kim): the dropped stitch leaves a ladder - a bar of yarn across the gap at every row (it was only a gap)
  "늘어뜨린 코 (드롭 스티치)": () => grid(W0, 12, (i, j) => (i % 5 === 2 ? (j === 0 ? K() : { t: "sc", chain: true }) : K())),
  "에스토니아 누프": () => grid(W0, 12, (i, j) => (j % 4 === 2 && i % 4 === 1 ? S("bob", { z: .3 }) : K())),
  // ---------------- 대바늘 · 걸러뜨기 · 짜임
  "리넨 스티치": () => grid(W0, 14, (i, j) => ((i + j) % 2 ? K(0, { z: .12, dx: .2 }) : Pp())),
  "헤링본 스티치": () => grid(W0, 14, (_i, j) => K(0, { dx: j % 2 ? .45 : -.45, z: .08 })),
  "트위드 (슬립 스티치 무늬)": () => grid(W0, 12, (i, j) => ((i + j) % 2 && j % 2 ? K(1 - Math.floor(j / 2) % 2, { down: 1 }) : K(Math.floor(j / 2) % 2))),
  "모자이크 뜨기": () => grid(W0, 12, (i, j) => (j % 4 >= 2 && (i % 6 < 2) ? K(0, { down: 1 }) : K(Math.floor(j / 2) % 2 ? 1 : 0))),
  "걸러뜨기 벌집": () => grid(W0, 12, (i, j) => (i % 4 === (j % 8 < 4 ? 1 : 3) ? K(0, { down: 2, z: .2 }) : K())),
  // ---------------- 대바늘 · 볼록
  "보블": () => grid(W0, 12, (i, j) => (j % 6 === 3 && i % 6 === 2 ? S("bob", { z: .55 }) : j % 6 === 3 && i % 6 === 5 ? S("bob", { z: .55 }) : Pp())),
  // 3D 정밀 (Kim): knit, not crochet - little round berries ((k1,p1,k1) in one, p3tog) close on a purl ground,
  // half a berry over each time (they were crochet clusters, posts crossing)
  "트리니티 (블랙베리)": () => grid(W0, 12, (i, j) => (j % 2 === 0 && (i + (j % 4 === 0 ? 0 : 2)) % 4 === 1 ? S("bob", { z: .4 }) : Pp())),
  "별 무늬 (데이지)": () => grid(W0, 12, (i, j) => (j % 4 === 1 && i % 3 === 1 ? S("cl", { join: [-1, 1], z: .25 }) : K())),
  "고리 뜨기": () => grid(W0, 12, (_i, j) => (j % 2 ? S("loop", { z: .35 }) : K())),
  // ---------------- 대바늘 · 배색
  "페어아일 (가로 배색)": () => grid(W0, 14, (i, j) => K((j % 7 < 5 && (tri(i, 6) + tri(j, 7)) % 4 === 1) ? 1 : 0)),
  "인타샤 (세로 배색)": () => grid(W0, 14, (i, j) => K(Math.abs(i - 9) + Math.abs(j - 7) < 6 ? 1 : 0)),
  "이중뜨기 (더블 니팅)": () => grid(W0, 14, (i, j) => K(Math.floor(i / 3) % 2 === Math.floor(j / 3) % 2 ? 1 : 0, { z: .12 })),
  "그림자 뜨기 (일루전)": () => grid(W0, 14, (i, j) => (j % 2 ? (Math.abs(i - 9) < 5 && j > 3 && j < 11 ? Pp(1, { z: .12 }) : K(1)) : K(0))),
  "라트비안 브레이드": () => { const c = grid(W0, 12, () => K()); for (let i = 0; i < W0; i++) c.st.push({ type: "k", b: [i - .5, 6.2], t: [i + .5, 6.9], c: i % 2 ? 1 : 2, z: .35 }); return c; },
  // ---------------- 대바늘 · 모양을 만드는 기법
  "원통뜨기": () => grid(W0, 12, () => K()),
  "되돌아뜨기 (경사뜨기)": () => grid(W0, 12, (i, j) => (i < W0 - j * 1.2 ? K() : null)),
  "엔터락": () => grid(16, 12, (i, j) => K((Math.floor(i / 4) + Math.floor(j / 4)) % 2, { dx: Math.floor(j / 4) % 2 ? .3 : -.3 })),
  "아이코드": () => grid(4, 16, () => K(0, { z: .3 })),
  "미터드 스퀘어": () => grid(16, 12, (i, j) => (i >= j && i < 16 - j ? K(Math.floor(j / 2) % 2, { dx: i === j ? .4 : i === 15 - j ? -.4 : 0 }) : null)),
  "피코 단": () => grid(W0, 12, (i, j) => (j === 6 ? (i % 2 ? S("yo") : K(0, { dx: .45 })) : K())),
};

/** a cable: w stitches between purls, crossing every `every` rows, `half` stitches over each other */
function cable(w: number, every: number, half: number): CellFn {
  return (i, j) => {
    const m = i % (w + 2); if (m === 0 || m === w + 1 || i >= Math.floor(W_CABLE / (w + 2)) * (w + 2)) return Pp();
    const k = m - 1, cross = j % every === Math.floor(every / 2);
    return K(0, { dx: cross ? (k < half ? half : -half) * .9 : 0, z: cross ? (k < half ? .5 : .1) : .25 });
  };
}
/** a round's point pushed out to a square (a granny square's corners) */
function sq([x, y]: [number, number], c: number): [number, number] {
  const dx = x - c, dy = y - c, r = Math.hypot(dx, dy) || 1, m = Math.max(Math.abs(dx), Math.abs(dy)) || 1, k = r / m * .82 + .18;
  return [c + dx * k, c + dy * k];
}

/** the rows rise and fall in a zigzag (a chevron's increases and decreases), every n stitches */
function ripple(c: Chart, n = 12): Chart {
  const f = (x: number) => tri(x, n) * .55;
  c.st.forEach(s => { s.b = [s.b[0], s.b[1] + f(s.b[0])]; s.t = [s.t[0], s.t[1] + f(s.t[0])]; });
  c.ch = c.ch.map(([x, y, k]) => [x, y + f(x), k ?? 0] as [number, number, number]); c.H += n * .3; return c;
}

/** a pattern's chart by its name, or null when it is drawn another way (the knit engine, a plain stitch) */
export function chartFor(name: string): Chart | null {
  const keys: Record<string, ChartKey> = { "부채모양뜨기": "shell", "그물뜨기": "mesh", "V 스티치": "vst", "모스 스티치 (리넨·그래닛)": "moss" };
  if (keys[name]) return compileChart(keys[name], 19, 5);
  const r = RECIPES[name]; return r ? r() : null;
}
export const hasChart = (name: string) => !!RECIPES[name] || ["부채모양뜨기", "그물뜨기", "V 스티치", "모스 스티치 (리넨·그래닛)"].includes(name);
