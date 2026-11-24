// Crochet stitch patterns as charts (Kim: 부채모양뜨기 and the like, in 3D). A chart is worked out stitch by
// stitch: every stitch has the point it is worked into (its base) and its own top; a stitch's top is its base
// raised by the stitch's height, moved along by how far it fans out. Chains are loops on their own. Units: one
// stitch wide is 1, one single crochet tall is 1 (the 3D scales them to the yarn and hook). Rows go upwards.
export type ChartKey = "shell" | "mesh" | "vst" | "moss" | "net";
/** crochet stitches (sc...dtr, sl a slip stitch, bob/puff/pop/cl the bobbles and clusters, bar a tunisian
 *  stitch, loop a loop stitch, picot, bull a bullion, crab a reverse single crochet) and, for knitting drawn
 *  on a chart, k (a knit V), p (a purl bump) and yo (a yarn over: a hole with a little ring) */
export type ChartType = "sc" | "hdc" | "dc" | "tr" | "dtr" | "sl" | "bob" | "puff" | "pop" | "cl" | "bar" | "loop" | "picot" | "bull" | "crab" | "k" | "p" | "yo";
/** c: the colour (0 the main yarn, 1, 2 the others); z: how far it stands out of the fabric (+) or sinks (-) */
export interface ChartStitch { type: ChartType; b: [number, number]; t: [number, number]; c?: number; z?: number; /** its cell (stitch, row) when built on a grid */ g?: [number, number] }
/** chains: [x, y] or [x, y, colour] */
export interface Chart { st: ChartStitch[]; ch: ([number, number] | [number, number, number])[]; W: number; H: number }

export const CHART_HT: Record<ChartType, number> = { sc: .95, hdc: 1.45, dc: 2.05, tr: 2.7, dtr: 3.35, sl: .45, bob: 2.05, puff: 1.6, pop: 2.05, cl: 2.05, bar: 1.1, loop: .95, picot: .9, bull: 2.05, crab: .95, k: .72, p: .72, yo: .72 };
/** the stitch multiple each chart needs (`cols` is rounded to it) */
export const CHART_MULT: Record<ChartKey, [number, number]> = { shell: [6, 1], mesh: [2, 1], vst: [3, 1], moss: [2, 1], net: [4, 1] };
/** how each is written, row by row (the 무늬 section shows it under the tiles) */
export const CHART_ROWS: Record<ChartKey, string[]> = {
  shell: ["1단: 짧은뜨기 1, (2코 건너뛰고 한 코에 한길긴뜨기 5, 2코 건너뛰고 짧은뜨기 1)을 끝까지", "2단: 사슬 3, 첫 코에 한길긴뜨기 2, (부채 가운데에 짧은뜨기 1, 짧은뜨기에 한길긴뜨기 5)를 끝까지, 마지막 코에 한길긴뜨기 3", "1단과 2단을 반복합니다."],
  mesh: ["1단: 사슬 4로 시작, (1코 건너뛰고 한길긴뜨기 1, 사슬 1)을 끝까지", "2단부터: 사슬 4, (아래 한길긴뜨기에 한길긴뜨기 1, 사슬 1)을 끝까지"],
  vst: ["1단: 짧은뜨기 1, (2코 건너뛰고 한 코에 한길긴뜨기 1 · 사슬 1 · 한길긴뜨기 1)을 끝까지", "2단부터: 사슬 3, (아래 V의 사슬 사이에 한길긴뜨기 1 · 사슬 1 · 한길긴뜨기 1)을 끝까지"],
  moss: ["1단: (짧은뜨기 1, 사슬 1, 1코 건너뛰기)를 끝까지", "2단부터: (아래 사슬 사이에 짧은뜨기 1, 사슬 1)을 끝까지 - 단마다 반 칸씩 엇갈립니다"],
  net: ["1단: 짧은뜨기 1, (사슬 5, 3코 건너뛰고 짧은뜨기 1)을 끝까지", "2단부터: (사슬 5, 아래 아치 가운데에 짧은뜨기 1)을 끝까지 - 아치가 반 칸씩 엇갈려 마름모 구멍이 됩니다"],
};

export function chartCols(k: ChartKey, want: number): number { const [m, a] = CHART_MULT[k]; return Math.max(m + a, Math.round((want - a) / m) * m + a); }

export function compileChart(k: ChartKey, cols: number, rows: number): Chart {
  const st: ChartStitch[] = [], ch: Chart["ch"] = [], N = chartCols(k, cols);
  const work = (type: ChartType, b: [number, number], dx = 0): [number, number] => { const t: [number, number] = [b[0] + dx, b[1] + CHART_HT[type]]; st.push({ type, b: [b[0], b[1]], t }); return t; };
  const chain = (n: number, y: number) => Array.from({ length: n }, (_, i): [number, number] => { ch.push([i, y]); return [i, y]; });
  let prev = chain(N, 0);
  if (k === "shell") {
    prev = prev.map(p => work("sc", p));
    for (let r = 0; r < rows; r++) {
      let cur: [number, number][] = [];
      if (r % 2 === 0) { prev.forEach((p, i) => { if (i % 6 === 0) cur.push(work("sc", p)); else if (i % 6 === 3) for (let j = -2; j <= 2; j++) cur.push(work("dc", p, j * .74)); }); }
      else {
        // the valleys (the row below's single crochet) take whole shells, the shells' middles a single crochet
        const s = [...prev].sort((a, b) => a[0] - b[0]), hi = Math.max(...s.map(p => p[1])), lows = s.filter(p => p[1] < hi - .5), tall = s.filter(p => p[1] >= hi - .5);
        lows.forEach((p, j) => { const n = j === 0 || j === lows.length - 1 ? 3 : 5, off = j === 0 ? 0 : j === lows.length - 1 ? -(n - 1) * .74 : -2 * .74; for (let q = 0; q < n; q++) cur.push(work("dc", p, off + q * .74)); });
        for (let g = 2; g < tall.length; g += 5) cur.push(work("sc", tall[g]));
      }
      cur = cur.sort((a, b) => a[0] - b[0]); prev = cur;
    }
  } else if (k === "mesh") {
    for (let r = 0; r < rows; r++) { const cur: [number, number][] = []; for (let i = 0; i < prev.length; i += 2) { const t = work("dc", prev[i]); cur.push(t); if (i + 2 < prev.length) { const m: [number, number] = [prev[i][0] + 1, t[1]]; ch.push(m); cur.push(m); } } prev = cur; }
  } else if (k === "net") {
    // 그물뜨기 (Kim: it came out as square filet): chain-5 arches anchored by single crochet; each row's single
    // crochet goes into the top of the arch below, half a repeat over, so the holes are diamonds
    const RISE = 1.45, arch = (a: [number, number], b: [number, number]) => {
      for (let q = 1; q <= 5; q++) { const f = q / 6, x = a[0] + (b[0] - a[0]) * f, y = a[1] + (b[1] - a[1]) * f + RISE * Math.sin(Math.PI * f); ch.push([x, y]); }
    };
    let anchors: [number, number][] = [];
    for (let x = 0; x < N; x += 4) anchors.push(work("sc", prev[x]));
    for (let r = 0; r < rows; r++) {
      const next: [number, number][] = [];
      for (let i = 0; i + 1 < anchors.length; i++) {
        const a = anchors[i], b = anchors[i + 1]; arch(a, b);
        // the next row's single crochet sits on this arch's top
        if (r < rows - 1) next.push(work("sc", [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + RISE * .95]));
      }
      if (r < rows - 1) {
        // the row's ends: a half arch out to the edge keeps the sides straight
        const first = next[0], last = next[next.length - 1];
        if (first) { const e = work("sc", [anchors[0][0], first[1]]); next.unshift(e); }
        if (last) { const e = work("sc", [anchors[anchors.length - 1][0], last[1]]); next.push(e); }
      }
      anchors = next; if (anchors.length < 2) break;
    }
  } else if (k === "vst") {
    prev = prev.map(p => work("sc", p)); let vs: [number, number][] = []; for (let i = 1; i < N - 1; i += 3) vs.push(prev[i]);
    for (let r = 0; r < rows; r++) { const nv: [number, number][] = []; vs.forEach(p => { const a = work("dc", p, -.85); work("dc", p, .85); ch.push([p[0], a[1] - .05]); nv.push([p[0], a[1] - .15]); }); vs = nv; } // the next V goes into this one's chain space, just under its top (it was .6 down: the V's crushed half into each other)
  } else {
    for (let r = 0; r < rows * 2; r++) for (let i = r % 2; i < N; i += 2) { const t = work("sc", r === 0 ? prev[i] : [i, r * CHART_HT.sc * .92]); if (i + 1 < N) ch.push([i + 1, t[1] - .05]); }
  }
  const H = Math.max(...st.map(s => s.t[1]), ...ch.map(c => c[1]));
  return { st, ch, W: N, H };
}
