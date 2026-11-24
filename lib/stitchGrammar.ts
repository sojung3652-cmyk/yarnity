// 뜨는 법 → 3D 코 (Kim: 원리를 알았으니 사이트에 적용할 수 있는 건 다): a crochet pattern written the way a
// pattern is written - "사슬 3, 한 코에 한길긴뜨기 5, 2코 건너뛰고 짧은뜨기 1" - worked out stitch by stitch into a
// chart. Every stitch is decided by where it is worked (its base) and where its head closes (its top), as the
// how-to sheets draw it (knitter.kr 초보자자료실, the principle only):
//   한 코에 / 같은 코에 / 첫 코에 / 마지막 코에   several stitches on one base - they fan out (늘려뜨기)
//   사슬 사이에 / 사슬 공간에 / 아치에 ...        into the chain space below, not a stitch (코 아래에서)
//   N코 모아 / 모아뜨기                           several bases, one top (모아뜨기)
//   구슬 / 팝콘 / 퍼프                             one base, one top, bulging between
//   앞걸어 / 뒤걸어                                worked round the post: standing out or sunk
//   N코 건너(뛰고)                                 skip; 사슬 N   chains, a space for the row above
// Rows: "1단:", "2단:", "N단부터:" (that row from there on), "... 반복" (the rows so far over and over);
// "( ... )을 끝까지" repeats to the end of the row, "× N" N times. What cannot be read is skipped, and a text
// with nothing readable gives null (the caller keeps its own drawing).
import { CHART_HT, type Chart, type ChartStitch, type ChartType } from "./crochetChart";

type Slot = { x: number; y: number; kind: "st" | "sp"; type: ChartType | "ch"; w: number };
type Item = { kind: "st"; st: ChartStitch } | { kind: "ch"; n: number; c: number };

const WORDS: [RegExp, ChartType][] = [
  [/세길\s?긴뜨기|3길\s?긴/, "dtr"], [/두길\s?긴뜨기|2길\s?긴/, "tr"], [/한길\s?긴뜨기|1길\s?긴|한길긴/, "dc"], [/긴뜨기/, "hdc"],
  [/짧은뜨기|짧은/, "sc"], [/빼뜨기/, "sl"], [/팝콘/, "pop"], [/구슬|방울|보블/, "bob"], [/퍼프/, "puff"], [/피코/, "picot"],
];
const typeOf = (s: string): ChartType | null => { for (const [re, t] of WORDS) if (re.test(s)) return t; return null; };
const numOf = (s: string, d = 1) => { const m = s.match(/(\d+)\s*(코|번|개)?(?!\s*단)/); return m ? Number(m[1]) : d; };

/** one row's text -> its items, worked into the slots of the row below */
function workRow(text: string, below: Slot[], rowIx: number): { items: Item[]; ok: boolean } {
  const items: Item[] = []; let cur = 0, ok = false;
  const c = rowIx % 2 ? 0 : 0;
  const take = (pred?: (s: Slot) => boolean): Slot | null => {
    for (let i = cur; i < below.length; i++) if (!pred || pred(below[i])) { cur = i + 1; return below[i]; }
    return null;
  };
  const peekSame = (): Slot | null => below[Math.max(0, cur - 1)] ?? null;
  const put = (type: ChartType, b: Slot, dx = 0, z?: number): ChartStitch => {
    const st: ChartStitch = { type, b: [b.x, b.y], t: [b.x + dx, b.y + CHART_HT[type]], ...(z ? { z } : {}) };
    items.push({ kind: "st", st }); ok = true; return st;
  };
  // the parts: "( ... )을 끝까지" / "× N" expanded, then split by commas
  const expand = (s: string): string[] => {
    const out: string[] = []; const re = /\(([^()]*)\)\s*(?:[을를]\s*)?(끝까지|×\s*(\d+))?/g; let last = 0, m: RegExpExecArray | null;
    while ((m = re.exec(s))) {
      out.push(...s.slice(last, m.index).split(","));
      const body = m[1].split(","), times = m[2] === "끝까지" ? 400 : m[3] ? Number(m[3]) : 1;
      for (let k = 0; k < times; k++) out.push("§rep", ...body); // §rep: a new round of the repeat (stops at the row's end)
      last = re.lastIndex;
    }
    out.push(...s.slice(last).split(","));
    return out.map(x => x.trim()).filter(Boolean);
  };
  const parts = expand(text.replace(/\s-\s.*$/, ""));
  let first = true, repCur = -1;
  for (let pi = 0; pi < parts.length; pi++) {
    let p = parts[pi];
    // a repeat goes on while it uses up the row below; a round of it that took nothing ends the row
    if (p === "§rep") { if (cur >= below.length || cur === repCur) break; repCur = cur; continue; }
    // a turning chain at the row's start stands as a stitch (사슬 3 = a 한길긴뜨기, 사슬 4 = one and a chain)
    const turn = p.match(/^사슬\s*(\d+)(\s*로\s*시작)?$/);
    if (first && turn) {
      first = false; const n = Number(turn[1]);
      if (n >= 2) {
        const nextFirst = /^첫\s?코/.test(parts[pi + 1] ?? "");
        const s = nextFirst ? below[0] : take(); if (!s) continue;
        put(n >= 3 ? "dc" : "hdc", s);
        if (n >= 4) items.push({ kind: "ch", n: n - 3, c });
        continue;
      }
    }
    first = false;
    // skip
    const skip = p.match(/(\d+)\s*코\s*건너/);
    if (skip) { let k = Number(skip[1]); while (k > 0 && cur < below.length) { k -= below[cur].kind === "sp" ? below[cur].w : 1; cur++; } p = p.replace(skip[0], "").replace(/^\s*(뛰고|뛰기)?\s*/, ""); if (!p) continue; }
    // chains on their own
    const chOnly = p.match(/^사슬\s*(\d+)\s*$/);
    if (chOnly) { items.push({ kind: "ch", n: Number(chOnly[1]), c }); continue; }
    // where it goes
    let target: Slot | null = null, same = false, rest = p;
    // a place is named when the words before "에" end in 코, 사이, 공간, 아치, 가운데 or a stitch's name
    const at = p.match(/^(.*?(?:코|사이|공간|아치|가운데|뜨기))에\s+(.*)$/);
    if (at) {
      const where = at[1].trim(); rest = at[2];
      if (/첫\s?코/.test(where)) { target = below[0] ?? null; cur = Math.max(cur, 1); }
      else if (/마지막\s?코/.test(where)) { target = below[below.length - 1] ?? null; cur = below.length; }
      else if (/사슬|사이|공간|아치/.test(where)) target = take(s => s.kind === "sp");
      else if (/가운데/.test(where)) { cur += 2; target = take(); }
      else if (/같은\s?코/.test(where)) target = peekSame();
      else { const ty = typeOf(where); target = ty ? take(s => s.type === ty) : take(); }
      same = true;
    }
    // "한길긴뜨기 1 · 사슬 1 · 한길긴뜨기 1" into one place: the parts share the target
    const sub = rest.split("·").map(x => x.trim()).filter(Boolean);
    const stCount = sub.reduce((a, s) => a + (/^사슬/.test(s) ? 0 : (typeOf(s) ? numOf(s) : 0)), 0);
    let fanIx = 0;
    for (const s of sub) {
      if (/^사슬/.test(s)) { items.push({ kind: "ch", n: numOf(s), c }); continue; }
      const ty = typeOf(s); if (!ty) continue;
      const n = numOf(s), z = /앞\s?걸어/.test(s) ? .3 : /뒤\s?걸어/.test(s) ? -.3 : undefined;
      const mo = s.match(/(\d+)\s*코\s*모아/);
      if (mo) { // several bases, one top
        const k = Number(mo[1]), bases: Slot[] = []; for (let q = 0; q < k; q++) { const b = take(); if (b) bases.push(b); }
        if (!bases.length) continue; const tx = bases.reduce((a, b) => a + b.x, 0) / bases.length, ty2 = Math.max(...bases.map(b => b.y)) + CHART_HT[ty];
        bases.forEach(b => { items.push({ kind: "st", st: { type: ty, b: [b.x, b.y], t: [tx, ty2] } }); }); ok = true; continue;
      }
      for (let q = 0; q < n; q++) {
        const b = same ? target : take(); if (!b) break;
        const spread = same && stCount > 1 ? (fanIx - (stCount - 1) / 2) * .74 : 0; fanIx++;
        put(ty, b, spread, z);
      }
    }
  }
  return { items, ok };
}

/** the row's items laid out: chains between their neighbours, a long run rising as an arch; the next row's slots */
function layRow(items: Item[]): { st: ChartStitch[]; ch: Chart["ch"]; slots: Slot[] } {
  const st: ChartStitch[] = [], ch: Chart["ch"] = [], slots: Slot[] = [];
  const tops = items.map((it, i) => (it.kind === "st" ? i : -1)).filter(i => i >= 0);
  items.forEach((it, i) => {
    if (it.kind === "st") { st.push(it.st); slots.push({ x: it.st.t[0], y: it.st.t[1], kind: "st", type: it.st.type, w: 1 }); return; }
    const prev = [...tops].reverse().find(j => j < i), next = tops.find(j => j > i);
    const a = prev !== undefined ? (items[prev] as { st: ChartStitch }).st.t : null, b = next !== undefined ? (items[next] as { st: ChartStitch }).st.t : null;
    const ax = a ? a[0] : (b ? b[0] - it.n * .6 : 0), bx = b ? b[0] : ax + it.n * .6, ay = a ? a[1] : b ? b[1] : 1, by = b ? b[1] : ay;
    const rise = it.n >= 4 ? .9 : it.n >= 2 ? .3 : 0;
    for (let k = 1; k <= it.n; k++) { const f = k / (it.n + 1); ch.push([ax + (bx - ax) * f, ay + (by - ay) * f - .05 + rise * Math.sin(Math.PI * f), it.c]); }
    slots.push({ x: (ax + bx) / 2, y: Math.max(ay, by) - .05 + rise * .95, kind: "sp", type: "ch", w: it.n });
  });
  return { st, ch, slots };
}

/** a pattern's written rows -> a chart `rows` rows high on a foundation chain `cols` long; null when nothing reads */
export function chartFromSteps(lines: string[], cols: number, rows: number): Chart | null {
  // the rows as written: "N단:" one row, "N단부터:" from there on, a line with 반복 repeats the rows so far
  const defs: { text: string; from: boolean }[] = []; let cycle = false;
  for (const l of lines) {
    if (/반복/.test(l) && !/[,(]/.test(l)) { cycle = true; continue; }
    const m = l.match(/^\s*(\d+)\s*단(부터)?\s*:?\s*(.*)$/);
    if (m) defs.push({ text: m[3], from: !!m[2] }); else if (l.trim()) defs.push({ text: l.trim(), from: false });
  }
  if (!defs.length) return null;
  const pick = (r: number) => { const f = defs.findIndex(d => d.from); if (f >= 0 && r >= f) return defs[f]; if (r < defs.length) return defs[r]; return cycle ? defs[r % defs.length] : defs[defs.length - 1]; };
  const st: ChartStitch[] = [], ch: Chart["ch"] = [];
  let below: Slot[] = Array.from({ length: cols }, (_, i) => { ch.push([i, 0]); return { x: i, y: 0, kind: "st" as const, type: "ch" as const, w: 1 }; });
  let any = false;
  for (let r = 0; r < rows; r++) {
    const { items, ok } = workRow(pick(r).text, below, r); if (!ok) break; any = true;
    const laid = layRow(items); st.push(...laid.st); ch.push(...laid.ch);
    // turned (a flat piece is worked back along the row just made): the next row starts at this one's end - without
    // it every row began on the same side and a half-stitch shift added up (모스 leaned into a triangle)
    if (!laid.slots.length) break; below = laid.slots.reverse();
  }
  if (!any || !st.length) return null;
  const xs = [...st.flatMap(s => [s.b[0], s.t[0]]), ...ch.map(c => c[0])], ys = [...st.map(s => s.t[1]), ...ch.map(c => c[1])];
  const x0 = Math.min(...xs); if (x0 < 0) { st.forEach(s => { s.b[0] -= x0; s.t[0] -= x0; }); ch.forEach(c => { c[0] -= x0; }); }
  return { st, ch, W: Math.max(...xs) - Math.min(0, x0) + 1, H: Math.max(...ys, 1) };
}
