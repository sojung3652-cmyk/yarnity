// 한국식 도안 표기 (Kim: 도안 글을 한국 도안에서 흔히 쓰는 표기로도): the same plan, each row written the way
// Korean patterns write one -
//   3단 사슬 1 - (*)[짧은뜨기 1코 - 다음 코에 짧은뜨기 2코] 6회 반복 - (*)빼뜨기 (18코)
//   (*)            단수링 자리: the stitch the round's marker sits in, and where the round closes
//   [ ... ] n회 반복       a group worked n times
//   { ... [ ... ] ... } n회 반복   a group with a group inside it
//   (18코)          the row's stitches, all of them, at its end
// Only the form is taken from how such patterns are written. Every number here is the plan's own (lib/pattern):
// a row is built as a list of pieces from the same counts the plan worked out, and its closing count is the
// plan's count for the row - tests/notation.test.ts reads every written row back (lib/stitchGrammar readKorean)
// and checks that its pieces add up to that count, so a row can never say one number and mean another.
//
// What counts as a stitch at a row's end: every stitch made (an increase is the stitches it makes, a 모아뜨기 is
// one), a chain inside the row that the next row works into or over (사슬 1코 of a 모스 무늬), and a starting
// chain marked (*) that stands as the first stitch (사슬 3(*) = a 한길긴뜨기). The 기둥사슬 of a short stitch
// (사슬 1) is not a stitch, as everywhere in this app. Two kinds of row say their end differently because one
// number would be untrue: 그물뜨기 counts its arches ("(아치 12개)", four stitches' width each), and a painted
// row with holes says its stitches and the chains over the holes apart ("(짧은뜨기 9코 · 사슬 3코)").
import type { ChartKey } from "./crochetChart";
import { CROCHET, NET, type Plan, type PlanInput, type Row } from "./pattern";
import { archOf } from "./stitchGrammar";

export type Tok =
  | { t: "st"; n: number; name: string; at?: string; more?: boolean }   // "[at ]name n코[ 더]": n stitches
  | { t: "tog"; n: number; name: string }                                 // "name n코 모아뜨기": one stitch
  | { t: "ch"; n: number; kind: "turn" | "stand" | "base" | "sp" }        // 기둥사슬 / 사슬 n(*) / 기초 사슬 / a chain in the row
  | { t: "skip"; n: number }
  | { t: "sl"; n: number }                                                // n 0: the closing slip stitch into (*)
  | { t: "mark" }
  | { t: "rep"; body: Tok[]; times: number }
  | { t: "note"; text: string };

const SC = "짧은뜨기", DC = "한길긴뜨기";
const st = (n: number, name: string, at?: string, more?: boolean): Tok[] => (n > 0 ? [{ t: "st", n, name, ...(at ? { at } : {}), ...(more ? { more } : {}) }] : []);
const rep = (body: Tok[], times: number): Tok[] => (times <= 0 || !body.length ? [] : times === 1 ? body : [{ t: "rep", body, times }]);
const sp = (n: number): Tok => ({ t: "ch", n, kind: "sp" });
const skip = (n: number): Tok => ({ t: "skip", n });
const note = (text: string): Tok => ({ t: "note", text });
const CLOSE: Tok = { t: "sl", n: 0 }, MARK: Tok = { t: "mark" };

/** the pieces as text, joined the way these patterns join them */
export function printToks(toks: Tok[]): string {
  const out: string[] = []; let mark = false;
  for (const k of toks) {
    if (k.t === "mark") { mark = true; continue; }
    const s = k.t === "st" ? `${k.at ? k.at + " " : ""}${k.name} ${k.n}코${k.more ? " 더" : ""}`
      : k.t === "tog" ? `${k.name} ${k.n}코 모아뜨기`
      : k.t === "ch" ? (k.kind === "turn" ? `사슬 ${k.n}` : k.kind === "stand" ? `사슬 ${k.n}(*)` : k.kind === "base" ? `기초 사슬 ${k.n}코` : `사슬 ${k.n}코`)
      : k.t === "skip" ? `${k.n}코 건너뛰고`
      : k.t === "sl" ? (k.n ? `빼뜨기 ${k.n}코` : "(*)빼뜨기")
      : k.t === "rep" ? (k.body.some(b => b.t === "rep") ? `{${printToks(k.body)}} ${k.times}회 반복` : `[${printToks(k.body)}] ${k.times}회 반복`)
      : k.text;
    out.push((mark ? "(*)" : "") + s); mark = false;
  }
  return out.join(" - ");
}
/** what the pieces add up to (the writer's own sum; the test reads the printed text back instead) */
export function countToks(toks: Tok[], big = bigChain(toks)): { st: number; ch: number; arch: number; base: number } {
  const c = { st: 0, ch: 0, arch: 0, base: 0 };
  for (const k of toks) {
    if (k.t === "st") c.st += k.n; else if (k.t === "tog") c.st += 1; else if (k.t === "sl") c.st += k.n;
    else if (k.t === "ch") { if (k.kind === "stand") c.st += 1; else if (k.kind === "base") c.base += k.n; else if (k.kind === "sp") { c.ch += k.n; c.arch += archOf(k.n, big); } }
    else if (k.t === "rep") { const b = countToks(k.body, big); c.st += b.st * k.times; c.ch += b.ch * k.times; c.arch += b.arch * k.times; c.base += b.base * k.times; }
  }
  return c;
}
/** the longest run of chains inside a row: the row's arch (a net's is 5 chains, or 3 or 7 - lib/pattern NET) */
function bigChain(toks: Tok[]): number { let m = 0; for (const k of toks) { if (k.t === "ch" && k.kind === "sp") m = Math.max(m, k.n); else if (k.t === "rep") m = Math.max(m, bigChain(k.body)); } return m; }


/** `prev` stitches worked into `n`: the increases (or the decreases) spread evenly, written as groups.
 *  prev = inc x q + rem: `rem` groups get one plain stitch more, so the groups use up the round exactly. */
export function evenToks(prev: number, n: number, name: string): Tok[] {
  const inc = n - prev;
  if (!inc || prev <= 0) return st(n, name);
  if (inc > 0) {
    const k = Math.min(inc, prev), q = Math.floor(prev / k), rem = prev % k, two = st(2, name, "다음 코에");
    return [...rep([...st(q, name), ...two], rem), ...rep([...st(q - 1, name), ...two], k - rem)];
  }
  const d = Math.min(-inc, Math.floor(prev / 2)), q = Math.floor(prev / d), rem = prev % d, tog: Tok = { t: "tog", n: 2, name };
  return [...rep([...st(q - 1, name), tog], rem), ...rep([...st(q - 2, name), tog], d - rem)];
}

/** a round: its 기둥사슬, the marker on its first stitch, the stitches, closed into the marked stitch */
const round = (body: Tok[], turn: number, lead: Tok[] = []): Tok[] => [...lead, { t: "ch", n: turn, kind: "turn" }, MARK, ...body, CLOSE];

/** a stitch pattern's round up a bag's body (lib/pattern bodyPattern writes the same rounds in words): `i` the
 *  pattern round (0 the first, on plain 짧은뜨기), `r` the repeats. A round that sits half a repeat over begins
 *  with half a pattern and ends with the other half. */
function wallToks(k: ChartKey, i: number, r: number, arch = 5): Tok[] {
  const stand: Tok = { t: "ch", n: 3, kind: "stand" }, A = NET[arch] ?? NET[5];
  if (k === "shell") {
    const fan = [...st(1, SC, "부채 가운데에"), ...st(5, DC, "다음 짧은뜨기에")];
    if (i === 0) return round(rep([...st(1, SC), skip(2), ...st(5, DC, "한 코에"), skip(2)], r), 1);
    if (i % 2) return [stand, ...st(2, DC, "같은 코에"), ...rep(fan, r - 1), ...st(1, SC, "부채 가운데에"), ...st(2, DC, "처음 코에"), CLOSE];
    return round(rep(fan, r), 1);
  }
  if (k === "moss") {
    const unit = [...st(1, SC, "사슬 사이에"), sp(1)];
    if (i === 0) return round(rep([...st(1, SC), sp(1), skip(1)], r), 1);
    if (i % 2) return round([sp(1), ...rep(unit, r - 1), ...st(1, SC, "사슬 사이에")], 1);
    return round(rep(unit, r), 1);
  }
  if (k === "net") {
    if (i === 0) return round(rep([...st(1, SC), sp(arch), skip(A.m - 1)], r), 1);
    if (i % 2) return [stand, sp(A.half), ...rep([...st(1, SC, "아치 가운데에"), sp(arch)], r - 1), ...st(1, SC, "아치 가운데에"), sp(A.half), CLOSE];
    return round([...st(1, SC, "닫은 자리에"), ...rep([sp(arch), ...st(1, SC, "아치 가운데에")], r - 1), sp(arch)], 1);
  }
  if (k === "mesh") return [stand, sp(1), ...rep(i === 0 ? [skip(1), ...st(1, DC), sp(1)] : [...st(1, DC, "한길긴뜨기 위에"), sp(1)], r - 1), CLOSE];
  // vst
  if (i === 0) return [stand, sp(1), ...st(1, DC, "같은 코에"), ...rep([skip(2), ...st(1, DC, "한 코에"), sp(1), ...st(1, DC, "같은 코에")], r - 1), CLOSE];
  return [note("빼뜨기로 첫 V 사이까지 옮겨"), stand, sp(1), ...st(1, DC, "같은 곳에"), ...rep([...st(1, DC, "다음 V 사이에"), sp(1), ...st(1, DC, "같은 곳에")], r - 1), CLOSE];
}

/** one row of a plan as pieces. `raw`: the plan as lib/pattern plan() gives it (before its 기둥사슬 text). */
export function rowToks(raw: Plan, p: PlanInput, i: number): { toks: Tok[]; end: "count" | "arch" | "split" | "base" | "none" } {
  const r = raw.rows[i], TC = raw.turn ?? 1, cs = p.crochetStitch && p.crochetStitch !== "sc" ? p.crochetStitch : null;
  const name = !cs ? SC : cs === "blo" ? "이랑 짧은뜨기" : CROCHET[cs].ko, prev = i > 0 ? raw.rows[i - 1].n : 0;
  const rd = (body: Tok[], lead: Tok[] = []) => round(body, TC, lead), ok = (toks: Tok[]) => ({ toks, end: "count" as const });
  const turnT: Tok = { t: "ch", n: TC, kind: "turn" };

  // ---- 구조 부품 (lib/structure): a step with no stitch of its own, joining, a panel / a strip / a post or a
  // cord, and any flat row that loses stitches at its ends (a slant, a triangle - a flat piece's or a flap's)
  // 가장자리 짧은뜨기: round a free edge (closed into its first stitch), or along one from end to end
  if (r.border) return ok(r.border === "loop" ? round(st(r.n, SC), 1, [note(r.how.replace(/ 사슬 1, .*$/, ""))]) : [note("새 실을 걸어"), { t: "ch", n: 1, kind: "turn" }, ...st(r.n, SC)]);
  if (r.part === "finish" || (r.part === "join" && !r.n)) return { toks: [note(r.how)], end: "none" };
  // (모티프와 후드는 겉에서 짧은뜨기로 잇는다 - lib/wear; a bag's edges in 되돌아짧은뜨기)
  if (r.part === "join") return ok([note("두 겹을 함께 떠서"), ...st(r.n, /되돌아짧은뜨기/.test(r.how) ? "되돌아짧은뜨기" : SC)]);
  // ---- 모자 기본형 (lib/wear): a square motif's round, a row of post stitches, a head scarf's rows and cords
  if (r.motif) return ok(r.motif.r === 1 ? rd(st(8, name), [note("매직링")]) : rd(rep([...st(3, name, "모서리 코에"), ...st(2 * r.motif.r - 3, name)], 4)));
  if (r.rib) {
    const two: Tok = { t: "ch", n: 2, kind: "turn" };
    if (r.rib === "base") return ok([note("얼굴선을 따라 새 실을 걸어"), two, ...st(r.n, DC)]);
    const [a, b] = r.rib === "fb" ? ["앞걸어", "뒤걸어"] : ["뒤걸어", "앞걸어"];
    return ok([two, note("뒤집어서"), ...rep([...st(1, DC, a), ...st(1, DC, b)], r.n / 2)]);
  }
  if (r.lace) {
    const k = r.lace.reps;
    if (r.lace.k === "net") return { toks: r.lace.i === 0 ? [turnT, ...st(1, SC, "시작 사슬에"), sp(5), ...st(1, SC, "같은 코에")] : [turnT, note("뒤집어서"), sp(5), ...st(1, SC, "첫 아치에"), ...rep([sp(5), ...st(1, SC, "다음 아치에")], k - 2), sp(5), ...st(1, SC, "같은 아치에")], end: "arch" };
    const stand: Tok = { t: "ch", n: 3, kind: "stand" };
    return ok(r.lace.i === 0 ? [stand, sp(1), ...st(1, DC, "시작 사슬에")] : [stand, sp(1), note("뒤집어서"), ...st(1, DC, "첫 코에"), ...rep([...st(1, DC, "V 사이에"), sp(1), ...st(1, DC, "같은 곳에")], k - 1)]);
  }
  if (p.item === "kerchief" && r.part === "rows") return ok(r.no === 1 ? [turnT, ...st(3, name, "시작 사슬에")] : [turnT, note("뒤집어서"), ...st(2, name, "첫 코에"), ...st(prev - 2, name), ...st(2, name, "마지막 코에")]);
  // a cord: a chain, and back along it in slip stitches (a head scarf's ties, a backpack's cord)
  if (r.part === "handle" && /빼뜨기로 되돌아/.test(r.how)) return ok([{ t: "ch", n: r.n, kind: "base" }, note("되돌아"), { t: "sl", n: r.n }]);
  // ---- 작은 가방 · 옷 기본형 (lib/wear): a circle worked as a piece (its slot for the hand), a net that comes to a point,
  // a ring of chains a top begins with
  if (r.disc) {
    const no = r.disc.r, two = st(2, name, "다음 코에");
    if (no === 1) return ok(rd(st(6, name), [note("매직링")]));
    if (r.disc.hole) return ok(rd([...st(2, name), sp(r.disc.hole), skip(r.disc.hole), ...evenToks(6 * (no - 1) - r.disc.hole - 2, r.n - r.disc.hole - 2, name)]));
    if (no === 2) return ok(rd(rep(two, 6)));
    if (no % 2 === 0 || no < 4) return ok(rd(rep([...st(no - 2, name), ...two], 6)));
    const k = Math.floor((no - 2) / 2);
    return ok(rd([...st(k, name), ...rep([...two, ...st(no - 2, name)], 5), ...two, ...st(no - 2 - k, name)]));
  }
  if (r.vnet) return { toks: [note("뒤집어서 첫 아치 가운데까지 빼뜨기로 건너가"), turnT, ...st(1, SC, "아치 가운데에"), ...rep([sp(5), ...st(1, SC, "다음 아치 가운데에")], r.vnet)], end: "arch" };
  if (r.part === "start" && /고리 연결$/.test(r.how)) return { toks: [{ t: "ch", n: r.n, kind: "base" }, note("첫 사슬에 빼뜨기로 고리")], end: "base" };
  if (r.part === "flap" && r.step) return ok([turnT, note(`뒤집어서 첫 ${r.step}코는 빼뜨기로 건너가고`), ...st(r.n, name), note(`마지막 ${r.step}코는 남기고`)]);
  if (r.part === "flap" && /새 실을 걸어/.test(r.how)) return ok([note("새 실을 걸어"), turnT, ...st(r.n, name)]);
  if (r.part === "flap" && r.work && (r.work[0] || r.work[1]) && r.own) { const tog: Tok = { t: "tog", n: 2, name }; return ok([turnT, note("뒤집어서"), ...rep([tog], r.work[0]), ...st(r.n - r.work[0] - r.work[1], name), ...rep([tog], r.work[1])]); }
  if (r.part === "panel" || r.part === "strip" || r.part === "strap") {
    if (/시작 사슬$/.test(r.label)) return { toks: [{ t: "ch", n: r.n, kind: "base" }], end: "base" };
    const d = r.edge ? r.edge[0] : 0;
    // a ribbed panel's hole: the stitches below it and over it apart, then chains across it
    if (r.gap) return ok(r.gap[2] ? [turnT, note("뒤집어서"), ...st(r.gap[0], name, "아래쪽"), sp(r.gap[1]), ...st(r.n - r.gap[0] - r.gap[1], name, "위쪽")] : [turnT, note("뒤집어서"), ...st(r.gap[0], name, "아래쪽"), ...st(r.n - r.gap[0], name, "위쪽")]);
    if (d > 0) return ok([turnT, note("뒤집어서"), ...st(d + 1, name, "첫 코에"), ...st(prev - 2, name), ...st(d + 1, name, "마지막 코에")]);
    return ok([turnT, ...(/뒤집어서/.test(r.how) ? [note("뒤집어서")] : /새 실을 걸어/.test(r.how) ? [note("새 실을 걸어")] : []), ...st(r.n, name)]);
  }
  if (r.work && (r.work[0] || r.work[1])) { const tog: Tok = { t: "tog", n: 2, name }; return ok([turnT, note("뒤집어서"), ...rep([tog], r.work[0]), ...st(r.n - r.work[0] - r.work[1], name), ...rep([tog], r.work[1])]); }
  // ---- a painted picture: its rows as they are, the holes as chains
  if (p.paint) {
    if (r.part === "start") return { toks: [{ t: "ch", n: Math.max(1, r.n - 1), kind: "base" }], end: "base" };
    const first = r.how.startsWith("두 번째 사슬부터"), body = r.how.replace(/^두 번째 사슬부터 /, "").replace(/^사슬 1, 뒤집어서 /, "");
    const lead = body.match(/^(\d+번째 코부터): /), toks: Tok[] = [turnT, ...(first ? [] : [note("뒤집어서")]), ...(lead ? [note(lead[1])] : [])];
    let holes = 0;
    for (const part of body.replace(/^\d+번째 코부터: /, "").split(", ")) {
      const h = part.match(/^사슬 (\d+)코 \(구멍\)$/), s = part.match(/^(색 \d+로 )?(.+?) (\d+)$/);
      if (h) { toks.push(sp(Number(h[1]))); holes += Number(h[1]); } else if (s) toks.push(...st(Number(s[3]), s[2], s[1]?.trim()));
    }
    return { toks, end: holes ? "split" : "count" };
  }
  // ---- a drawn shape: rounds that follow the drawing
  if (p.free) {
    if (i === 0) return ok(r.how.startsWith("매직링") ? rd(st(r.n, name), [note("매직링")]) : [{ t: "ch", n: r.n, kind: "base" }, note("첫 사슬에 빼뜨기로 고리"), turnT, MARK, ...st(r.n, name), CLOSE]);
    return ok(rd(evenToks(prev, r.n, name)));
  }
  // ---- flat pieces and tubes
  if (r.part === "start") return { toks: p.object === "tube" ? [{ t: "ch", n: r.n, kind: "base" }, note("첫 사슬에 빼뜨기로 고리")] : [{ t: "ch", n: Math.max(1, r.n - 1), kind: "base" }], end: "base" };
  if (r.part === "rows") return ok([turnT, ...(r.no === 1 ? [] : [note("뒤집어서")]), ...st(r.n, name)]);
  if (r.part === "rounds") return ok(rd(st(r.n, name)));
  // ---- a bottom worked round, and what stands on it
  if (r.part === "bottom") {
    const no = r.no ?? i + 1;
    if (p.shape === "circle") {
      if (no === 1) return ok(rd(st(6, name), [note("매직링")]));
      if (r.n !== 6 * no) return ok(rd(evenToks(prev, r.n, name)));                         // fitted to a stitch pattern
      const two = st(2, name, "다음 코에");
      if (no === 2) return ok(rd(rep(two, 6)));
      if (no % 2 === 0 || no < 4) return ok(rd(rep([...st(no - 2, name), ...two], 6)));
      const k = Math.floor((no - 2) / 2);                                                    // the increases moved half a step
      return ok(rd([...st(k, name), ...rep([...two, ...st(no - 2, name)], 5), ...two, ...st(no - 2 - k, name)]));
    }
    // oval / square: m stitches along each long side, the two ends take the increases
    const m = raw.c - 1, per = p.shape === "oval" ? 6 : 8;
    if (no === 1) return ok([{ t: "ch", n: m, kind: "base" }, turnT, MARK, ...rep([...st(m, name, "사슬을 따라"), ...st(3, name, "끝 사슬에", true)], 2), CLOSE]);
    if (r.inc !== per) {                                                                     // fitted: each end takes its share
      const end = (prev - 2 * m) / 2, a = Math.ceil(r.inc / 2), b = r.inc - a;
      const half = (e: number) => [...st(m, name), ...evenToks(end, end + e, name)];
      return ok(rd(a === b ? rep(half(a), 2) : [...half(a), ...half(b)]));
    }
    if (p.shape === "oval") return ok(rd(rep([...st(m, name), ...rep([...st(no - 2, name), ...st(2, name, "다음 코에")], 3)], 2)));
    return ok(rd(rep([...st(m + no - 2, name), ...st(3, name, "모서리 코에"), ...st(2 * no - 3, name), ...st(3, name, "모서리 코에"), ...st(no - 2, name)], 2)));
  }
  if (r.part === "body") {
    if (r.wall) return { toks: wallToks(r.wall.k, r.wall.i, r.wall.reps, r.wall.ch), end: r.wall.k === "net" ? "arch" : "count" };
    return ok(rd(evenToks(prev, r.n, name)));
  }
  if (r.part === "rim") {
    // an edging round in a stitch pattern (폰 크로스백): the pattern's own round
    if (r.wall) return { toks: wallToks(r.wall.k, r.wall.i, r.wall.reps, r.wall.ch), end: r.wall.k === "net" ? "arch" : "count" };
    if (r.how.startsWith("빼뜨기")) return ok([{ t: "sl", n: r.n }]);
    // the round that leaves the handles standing: 짧은뜨기, a chain over skipped stitches, twice
    const hs = r.how.match(/^\S+(?: \S+)? (\d+)코, 사슬 (\d+)코를 띄우고 (\d+)코 건너뛰기, \S+(?: \S+)? (\d+)코, 사슬 \d+코를 띄우고 \d+코 건너뛰기, \S+(?: \S+)? (\d+)코$/);
    if (hs) { const [A, C, B, D, E] = hs.slice(1).map(Number); return ok(rd([...st(A, name), sp(C), skip(B), ...st(D, name), sp(C), skip(B), ...st(E, name)])); }
    if (r.how.startsWith("끈 구멍 단")) { const holes = Math.floor(r.n / 2); return ok(rd([...rep([sp(1), skip(1), ...st(1, name)], holes), ...st(r.n % 2, name)])); }
    // a brim (lib/wear 버킷햇): a round that grows or comes in again, its fold worked in the back loop
    if (r.inc) return ok(rd(evenToks(prev, r.n, name)));
    return ok(rd(st(r.n, name, r.how.startsWith("무늬 위에") ? "무늬 위에" : r.how.startsWith("뒷고리에만") ? "뒷고리에" : undefined)));
  }
  if (r.part === "flap") {
    if (r.how.startsWith("뒤판 마지막 단에 이어서")) return ok([note("뒤판에 이어서"), ...st(r.n, name)]);
    return ok([turnT, note("뒤집어서"), ...st(r.n, name), ...(r.how.includes("단추 구멍") ? [note("가운데에 단추 고리")] : [])]);
  }
  // a handle grown out of the opening: picked up, narrowed at both edges, straight; the edging round
  if (r.grown) {
    const G = r.grown, K = G.st === "blo" ? "이랑 짧은뜨기" : CROCHET[G.st].ko, turn: Tok = { t: "ch", n: CROCHET[G.st].turn, kind: "turn" }, tog: Tok = { t: "tog", n: 2, name: K };
    if (G.k === "edge") return ok(round(st(r.n, SC), 1, [note(`${G.side ? "반대편" : "한편"} 가장자리를 따라`)]));
    // in the body's stitch pattern: its repeats, the row's stitches all of them (a repeat off each edge is slip
    // stitches over the first and the last left unworked - the pattern's own stitches are the body's rounds')
    if (G.unit) return ok([note(G.k === "pick" ? `${G.side ? "반대쪽" : "한쪽"} 옆선을 가운데로 새 실을 걸어` : G.k === "dec" ? "뒤집어서 양 끝에서 무늬 하나씩 줄이고" : "뒤집어서"), ...st(r.n, "무늬대로"), ...(/감침질/.test(r.how) ? [note("한쪽 끝과 맞대고 감침질")] : [])]);
    if (G.k === "pick") return ok([note(`${G.side ? "반대쪽" : "한쪽"} 옆선을 가운데로 새 실을 걸어`), turn, ...st(r.n, K)]);
    if (G.k === "dec") return ok([turn, note("뒤집어서"), tog, ...st(r.n - 2, K), tog]);
    return ok([turn, note("뒤집어서"), ...st(r.n, K), ...(/감침질/.test(r.how) ? [note("한쪽 끝과 맞대고 감침질")] : [])]);
  }
  // handle: a chain, and back along it
  return ok([{ t: "ch", n: r.n, kind: "base" }, turnT, ...st(r.n, name, "되돌아")]);
}

/** The plan in the Korean notation: every row's words replaced, its counts untouched. `raw`: plan(p).
 *  (A knitted piece is written as knitting - lib/knit shownPlan - and never comes here.) */
export function withKorean(raw: Plan, p: PlanInput): Plan {
  const rows = raw.rows.map((r, i): Row => {
    const { toks, end } = rowToks(raw, p, i), c = countToks(toks), text = printToks(toks);
    if (end === "none") return r; // a step, not a row of stitches: its own words, no count
    // a flat piece's first line is its base chain alone (its 기둥사슬 belongs to row 1, as withChains has it)
    const n = end === "base" ? c.base : r.n;
    const tail = end === "arch" ? `(아치 ${c.arch}개)` : end === "split" ? `(${SC} ${c.st}코 · 사슬 ${c.ch}코)` : `(${n}코)`;
    return { ...r, n, how: `${text} ${tail}`, ...(end === "base" ? { why: r.why.replace(/, 기둥 사슬 1코 더$/, "") } : {}) };
  });
  return { ...raw, rows };
}
/** the line under a pattern written this way */
export const KOREAN_LEGEND = "(*)은 단수링 자리입니다. 그 코에 단수링을 걸고, 단 끝의 (*)빼뜨기는 그 코에 뜹니다. [ ]와 { }는 묶음이고, 단 끝의 ( )는 그 단의 총 코 수입니다.";
