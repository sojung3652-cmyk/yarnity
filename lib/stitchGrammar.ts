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
//
// 한국식 표기 (Kim: 나중에 가져온 도안을 읽을 때): the same rows written the way Korean patterns write them are
// read too - "3단 사슬 3(*) - [다음 코에 한길긴뜨기 2코 - 한길긴뜨기 1코] 11회 반복 - (*)빼뜨기 (36코)":
//   (*)                      단수링 자리 (after a chain: that chain stands as the first stitch)
//   [ ... ] n회 반복          a group n times;  { ... [ ... ] ... } n회 반복  a group with a group inside
//   (36코) / (총 36코)        the row's count at its end
// readKorean() counts a row (so a written count can be checked against what the row adds up to);
// chartFromSteps() takes such rows as it takes the others.
// Everything here works on the text it is handed and gives numbers and a chart back: nothing is stored, sent or
// logged. A pattern someone bought and brought in stays where it was put (lib/imported) - reading it here does
// not copy it anywhere.
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

// ------------------------------------------------------------------ 한국식 표기
type KNode = { text: string } | { body: KNode[]; times: number };
const K_STITCH = /(세길\s?긴뜨기|두길\s?긴뜨기|한길\s?긴뜨기|긴뜨기|짧은뜨기|빼뜨기)\s*(\d+)?/g;
/** a row is in the Korean notation when it has its marks: (*), a [ ] or { } group, or a count closing it */
export const isKorean = (line: string) => /\(\*\)|\[[^\]]*\]|\{[^}]*\}|\(\s*(?:총\s*)?\d+\s*코\s*\)\s*$|\(\s*아치\s*\d+\s*개\s*\)\s*$/.test(line);

/** "a - [b - c] 3회 반복 - d" -> its pieces, groups nested as written; null when a bracket is left open */
function splitKorean(s: string): KNode[] | null {
  const out: KNode[] = []; let i = 0, cur = "";
  const flush = () => { const t = cur.trim().replace(/^-\s*|\s*-$/g, "").trim(); if (t) for (const part of t.split(/\s+-\s+/)) if (part.trim()) out.push({ text: part.trim() }); cur = ""; };
  while (i < s.length) {
    const ch = s[i];
    if (ch === "[" || ch === "{") {
      const close = ch === "[" ? "]" : "}"; let depth = 1, j = i + 1;
      while (j < s.length && depth) { if (s[j] === ch) depth++; else if (s[j] === close) depth--; j++; }
      if (depth) return null;
      const mark = /\(\*\)\s*$/.test(cur); if (mark) cur = cur.replace(/\(\*\)\s*$/, "");
      flush(); if (mark) out.push({ text: "(*)" });
      const body = splitKorean(s.slice(i + 1, j - 1)); if (!body) return null;
      const m = s.slice(j).match(/^\s*(?:[을를]\s*)?(?:×\s*(\d+)|(\d+)\s*(?:회|번)(?:\s*반복)?)/);
      out.push({ body, times: m ? Number(m[1] ?? m[2]) : 1 }); i = j + (m ? m[0].length : 0); continue;
    }
    cur += ch; i++;
  }
  flush(); return out;
}

export interface KoreanRow {
  /** "3단" when the row says which it is */
  label: string | null;
  /** the count the row closes with: "(36코)" a count, "(아치 12개)" arches, "(짧은뜨기 9코 · 사슬 3코)" the two apart */
  total: { kind: "count" | "arch" | "split"; n: number; ch?: number } | null;
  /** what the row adds up to: stitches made (a chain marked (*) standing as one), chains inside the row,
   *  chain arches (사슬 4 or more one arch, 사슬 2 half of one), the base chain, the (*) marks */
  stitches: number; chains: number; arches: number; base: number; marks: number;
  /** the written count is what the row adds up to (true when it closes with none) */
  ok: boolean;
}
/** One row in the Korean notation, counted. Null when it is not written that way or a group is left open. */
export function readKorean(line: string): KoreanRow | null {
  if (!isKorean(line) && !/\s-\s/.test(line)) return null;
  let s = line.trim(), label: string | null = null, total: KoreanRow["total"] = null;
  const lm = s.match(/^(\d+)\s*단\s*:?\s*/); if (lm) { label = `${lm[1]}단`; s = s.slice(lm[0].length); }
  const tm = s.match(/\(\s*(?:총\s*)?(\d+)\s*코\s*\)\s*$/), am = s.match(/\(\s*아치\s*(\d+)\s*개\s*\)\s*$/), sm = s.match(/\(\s*\S+\s*(\d+)\s*코\s*·\s*사슬\s*(\d+)\s*코\s*\)\s*$/);
  if (sm) { total = { kind: "split", n: Number(sm[1]), ch: Number(sm[2]) }; s = s.slice(0, sm.index); }
  else if (am) { total = { kind: "arch", n: Number(am[1]) }; s = s.slice(0, am.index); }
  else if (tm) { total = { kind: "count", n: Number(tm[1]) }; s = s.slice(0, tm.index); }
  const nodes = splitKorean(s); if (!nodes) return null;
  const c = { stitches: 0, chains: 0, arches: 0, base: 0, marks: 0 }; let begun = false;
  const walk = (ns: KNode[], k: number) => {
    for (const nd of ns) {
      if ("body" in nd) { walk(nd.body, k * nd.times); continue; }
      let t = nd.text;
      const stand = /^사슬\s*\d+\s*(?:코)?\s*\(\*\)/.test(t);                 // "사슬 3(*)": the chain stands as a stitch
      const marks = t.match(/\(\*\)/g)?.length ?? 0; c.marks += marks * k; t = t.replace(/\(\*\)/g, "").trim();
      if (!t) continue;
      const base = t.match(/^기초\s*사슬\s*(\d+)/); if (base) { c.base += Number(base[1]) * k; continue; }
      const ch = t.match(/^사슬\s*(\d+)\s*(?:코)?$/);
      if (ch) {
        const n = Number(ch[1]);
        if (stand) c.stitches += k;
        else if (!begun) { /* the 기둥사슬: no stitch */ }
        else { c.chains += n * k; c.arches += (n >= 4 ? 1 : n === 2 ? .5 : 0) * k; }
        begun = true; continue;
      }
      t = t.replace(/(\d+)\s*코\s*건너\s*(뛰고|뛰기|뛰어)?/g, " ").trim(); if (!t) continue;       // skipped stitches make none
      if (/\d+\s*코\s*모아/.test(t)) { c.stitches += k; begun = true; continue; }               // several into one
      let last: RegExpExecArray | null = null, m: RegExpExecArray | null; K_STITCH.lastIndex = 0;
      while ((m = K_STITCH.exec(t))) if (m[2] !== undefined || !last || last[2] === undefined) last = m;
      if (!last) continue;                                                                    // words only (뒤집어서 ...)
      // a named stitch with its number makes that many; 빼뜨기 alone closes the round; another alone is one
      const sl = /빼뜨기/.test(last[1]), made = last[2] !== undefined ? Number(last[2]) : sl ? 0 : 1;
      c.stitches += made * k; if (made) begun = true;
    }
  };
  walk(nodes, 1);
  const ok = !total ? true : total.kind === "count" ? (c.base && !c.stitches ? c.base : c.stitches + c.chains) === total.n
    : total.kind === "arch" ? c.arches === total.n : c.stitches === total.n && c.chains === total.ch;
  return { label, total, ...c, ok };
}

/** a row in the Korean notation as the rows above are written ("(…) × n", commas), for chartFromSteps: groups
 *  inside a group written out, the marks, the base chain, the closing slip stitch and the count left off */
export function koreanToSteps(line: string): string {
  let s = line.trim(), label = "";
  const lm = s.match(/^(\d+)\s*단(부터)?\s*:?\s*/); if (lm) { label = `${lm[1]}단${lm[2] ?? ""}: `; s = s.slice(lm[0].length); }
  s = s.replace(/\(\s*[^()]*\d+\s*(?:코|개)\s*\)\s*$/, "");
  const nodes = splitKorean(s); if (!nodes) return line;
  let first = true;
  const one = (t0: string): string | null => {
    const stand = /^사슬\s*\d+\s*(?:코)?\s*\(\*\)/.test(t0), t = t0.replace(/\(\*\)/g, "").trim(), was = first; if (t) first = false;
    if (!t || /^기초\s*사슬/.test(t) || /^빼뜨기$/.test(t) || /^(뒤집어서|매직링)$/.test(t)) return null;
    const ch = t.match(/^사슬\s*(\d+)\s*(?:코)?$/);
    if (ch) return was && !stand && Number(ch[1]) === 1 ? null : `사슬 ${ch[1]}`;
    return t.replace(/^다음 코에/, "한 코에").replace(/(\d+)\s*코(?!\s*(건너|모아))/g, "$1");
  };
  const flat = (ns: KNode[]): string[] => ns.flatMap(nd => "body" in nd ? Array.from({ length: nd.times }, () => flat(nd.body)).flat() : [one(nd.text)].filter((x): x is string => !!x));
  const parts = nodes.flatMap(nd => "body" in nd ? [`(${flat(nd.body).join(", ")}) × ${nd.times}`] : [one(nd.text)].filter((x): x is string => !!x));
  return label + parts.join(", ");
}

/** a pattern's written rows -> a chart `rows` rows high on a foundation chain `cols` long; null when nothing reads */
export function chartFromSteps(lines: string[], cols: number, rows: number): Chart | null {
  // the rows as written: "N단:" one row, "N단부터:" from there on, a line with 반복 repeats the rows so far
  const defs: { text: string; from: boolean }[] = []; let cycle = false;
  for (const l0 of lines) {
    const l = isKorean(l0) ? koreanToSteps(l0) : l0; // 한국식 표기 is read as the rows above are
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
