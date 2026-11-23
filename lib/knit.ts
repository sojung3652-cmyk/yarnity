// 대바늘 무늬 (knitting stitch patterns) for the knitted items (Kim: 목도리 is knitted; 무늬 정하는 섹션).
// A knit-and-purl pattern is one chart: for every (row, stitch) a knit or a purl, as seen from the right
// side. The same chart draws the tile on the 무늬 page, the fabric in the 3D (src/features/yarn3d) and
// writes the rows of the pattern ("겉 1, 안 1을 끝까지 반복").
// The stitch engine (lib/pattern.ts) is single crochet and stays as it is (tests check it against the
// prototype): withKnit() rewrites only the text of a knitted item's rows, as withChains() does for crochet.
// Not here yet: a knitting gauge of its own. The counts are the engine's (a knitted row is lower than a
// crocheted one), so a knitted piece relies on the measuring step after the first rows.
import { PART_KO, plan, withChains, type Part, type Plan, type PlanInput, type Row } from "./pattern";

export interface KnitStitch {
  key: string; ko: string; en: string;
  /** stitch multiple and row repeat of the chart */
  mult: number; rep: number;
  /** knit (1) or purl (-1) at row j, stitch i (both from 0; row 0 is the first right-side row), seen from the right side */
  f: (j: number, i: number) => 1 | -1;
  /** one line for the 무늬 page */
  note: string;
}
const tri = (i: number, n: number) => { const m = ((i % n) + n) % n; return m < n / 2 ? m : n - m; };
const K = 1 as const, P = -1 as const;
export const KNIT_STITCHES: KnitStitch[] = [
  { key: "stock", ko: "메리야스", en: "stockinette", mult: 1, rep: 2, f: () => K, note: "매끈한 기본 무늬입니다. 가장자리가 말리므로 목도리에는 양옆에 다른 무늬를 두면 좋습니다." },
  { key: "garter", ko: "가터", en: "garter", mult: 1, rep: 2, f: j => (j % 2 ? P : K), note: "모든 단을 겉뜨기로 뜹니다. 말리지 않고 양면이 같아 목도리에 가장 쉽습니다." },
  { key: "rib1", ko: "1×1 고무", en: "1×1 rib", mult: 2, rep: 1, f: (_j, i) => (i % 2 ? P : K), note: "세로 골이 생기고 잘 늘어납니다. 폭이 조금 좁아집니다." },
  { key: "rib2", ko: "2×2 고무", en: "2×2 rib", mult: 4, rep: 1, f: (_j, i) => (Math.floor(i / 2) % 2 ? P : K), note: "굵은 세로 골입니다. 양면이 같고 말리지 않습니다." },
  { key: "seed", ko: "멍석", en: "seed stitch", mult: 2, rep: 2, f: (j, i) => ((i + j) % 2 ? P : K), note: "오돌토돌한 결입니다. 말리지 않고 양면이 같습니다." },
  { key: "moss", ko: "이중 멍석", en: "double moss", mult: 4, rep: 4, f: (j, i) => ((Math.floor(i / 2) + Math.floor(j / 2)) % 2 ? P : K), note: "작은 체크 무늬입니다. 말리지 않습니다." },
  { key: "basket", ko: "바구니", en: "basketweave", mult: 8, rep: 8, f: (j, i) => ((Math.floor(i / 4) + Math.floor(j / 4)) % 2 ? P : K), note: "겉뜨기 칸과 안뜨기 칸이 바둑판처럼 엇갈립니다." },
  { key: "broken", ko: "변형 고무", en: "broken rib", mult: 2, rep: 2, f: (j, i) => (j % 2 ? K : i % 2 ? P : K), note: "고무뜨기보다 덜 조이는 잔잔한 결입니다." },
  { key: "ridge", ko: "안뜨기 줄", en: "purl ridge", mult: 1, rep: 4, f: j => (j % 4 === 3 ? P : K), note: "메리야스 위에 가로 줄이 네 단마다 생깁니다." },
  { key: "diag", ko: "사선", en: "diagonal rib", mult: 4, rep: 4, f: (j, i) => ((i + j) % 4 < 2 ? K : P), note: "비스듬한 줄무늬입니다. 편물이 조금 기울 수 있습니다." },
  { key: "zig", ko: "지그재그", en: "zigzag", mult: 8, rep: 4, f: (j, i) => ((tri(i, 8) + j) % 4 === 0 ? P : K), note: "안뜨기 점이 꺾인 선을 그립니다." },
  { key: "dia", ko: "다이아몬드", en: "diamond brocade", mult: 8, rep: 8, f: (j, i) => { const s = tri(i, 8) + tri(j, 8); return s === 4 || s === 0 ? P : K; }, note: "안뜨기 점으로 마름모를 그립니다." },
];
export const KNIT_STITCH: Record<string, KnitStitch> = Object.fromEntries(KNIT_STITCHES.map(s => [s.key, s]));
export const stitchOf = (key?: string | null): KnitStitch => KNIT_STITCH[key ?? ""] ?? KNIT_STITCHES[0];

/** items that are knitted with needles (the rest is crochet) */
const KNIT_ITEMS = new Set(["scarf"]);
export const isKnit = (p: { item?: string }) => KNIT_ITEMS.has(p.item ?? "");

/** One row of the chart as it is worked back and forth on `n` stitches: "겉 2, 안 2를 끝까지 반복".
 *  Stitch 0 is the chart's right-hand column, as charts are numbered: a right-side row (row 0, 2, ...) is
 *  worked right to left from it; a wrong-side row comes back the other way and every stitch is the opposite
 *  of what the right side shows. */
export function knitRowText(s: KnitStitch, j: number, n: number): string {
  const rs = j % 2 === 0, seq: number[] = [];
  for (let k = 0; k < n; k++) { const i = rs ? k : n - 1 - k, v = s.f(j, i); seq.push(rs ? v : -v); }
  const name = (v: number) => (v > 0 ? "겉" : "안");
  if (seq.every(v => v === seq[0])) return `${rs ? "겉면" : "안면"}: 모두 ${name(seq[0])}뜨기 ${n}코`;
  // the shortest unit the row repeats
  let per = n;
  for (let q = 1; q <= Math.min(16, n); q++) { if (seq.every((v, k) => v === seq[k % q])) { per = q; break; } }
  const runs: string[] = [];
  for (let k = 0; k < per;) { let e = k; while (e < per && seq[e] === seq[k]) e++; runs.push(`${name(seq[k])} ${e - k}`); k = e; }
  return `${rs ? "겉면" : "안면"}: ${runs.join(", ")}${per < n ? "을 끝까지 반복" : ""} (${n}코)`.replace(/(\d)을 끝까지/, (_m, d) => `${d}${"136780".includes(d) ? "을" : "를"} 끝까지`);
}

/** A knitted item's rows as knitting: cast on, the chart's rows, bind off. Counts stay the engine's. */
export function withKnit(pp: Plan, p: { stitch?: string | null; a?: number }): Plan {
  const s = stitchOf(p.stitch), body = pp.rows.filter(r => r.part === "rows"), n = body[0]?.n ?? pp.last;
  let j = 0;
  const rows = pp.rows.map((r): Row => {
    if (r.part === "start") return { ...r, n, label: "코잡기", how: `대바늘에 ${n}코 잡기`, why: r.why.replace(/, 기둥 사슬 1코 더$/, "") };
    if (r.part !== "rows") return r;
    const k = j++, last = k === body.length - 1;
    return { ...r, how: knitRowText(s, k, n) + (last ? " · 다 뜨면 코막음" : ""), why: k === 0 ? `${s.ko} 무늬 1단` : `무늬 ${(k % s.rep) + 1}단` + (k === 1 && /÷/.test(r.why) ? ` · ${r.why}` : "") };
  });
  return { ...pp, rows };
}

/** The plan as the pattern and 따라 뜨기 show it: knitting rows for a knitted item, else crochet with its 기둥사슬. */
export function shownPlan(p: PlanInput & { item?: string; stitch?: string | null }): Plan {
  return isKnit(p) ? withKnit(plan(p), p) : withChains(plan(p));
}
/** A part's heading: a knitted piece starts with 코잡기, not a chain. */
export const partName = (part: Part, p: { item?: string }) => (part === "start" && isKnit(p) ? "코잡기" : PART_KO[part]);
