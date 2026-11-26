import { describe, expect, it } from "vitest";
import { guessItem, partLines } from "@/lib/assemble";
import { ENGINE, GROUPS, ITEM } from "@/lib/items";
import { countToks, rowToks, withKorean } from "@/lib/koreanNotation";
import { CHAIN_LOOP, gauge, NET, partKo, plan, ringWrap, withChains, type PlanInput, type Row } from "@/lib/pattern";
import { PROTOS, protoDraft } from "@/lib/prototypes";
import { readKorean } from "@/lib/stitchGrammar";
import { stepCards } from "@/lib/stepCards";
import { DEFAULT_DRAFT, type Draft } from "@/lib/types";
import { BALA_NECK_EASE, balaclava, bigSocks, KITS, kitSize, kitValue, knotBag, motifScarf, SOCK_EASE, twoWay, wearNote } from "@/lib/wear";
import { yarnUse } from "@/lib/yarnUse";
import { toYarnPattern } from "@/src/features/yarn3d/fromPattern";
import type { FormCourse } from "@/src/features/yarn3d/engine";

// 기본형 10종 더 (Kim): 매듭 손잡이백, 코인 미니백, 사다리꼴 토트, 접는 덮개 클러치, 링 손잡이백, 미니 그물 버킷,
// 2WAY 조임 토트, 바라클라바, 모티프 머플러, 오버사이즈 양말 (룸부츠 대신). Only how each is put together; every count
// is the gauge's and the sizes typed; the words, the step cards and the 3D are the same rows.

const yarn = { hook: "5호", weight: "medium", yarnMode: "mm", yarnMm: 3 } as const;
const BAGS = ["knotbag", "coinbag", "traptote", "clutch", "ringbag", "netbucket", "twoway"], FORMS = ["knotbag", "twoway", "balaclava", "motifscarf", "bigsocks"];
const IDS = [...BAGS, "balaclava", "motifscarf", "bigsocks"];
const draft = (id: string, over: Partial<Draft> = {}): Draft => ({ ...protoDraft({ ...DEFAULT_DRAFT, ...yarn }, PROTOS.find(p => p.id === id)!), ...over });
const starter = (id: string, over: Partial<Draft> = {}): PlanInput => { const d = draft(id, over); return { ...d, object: ENGINE[ITEM[d.item!].kind] } as PlanInput; };
const rnd = (v: number) => Math.round(+v.toFixed(6));
const of = (rows: Row[], part: string) => rows.filter(r => r.part === part && !r.border);
function readsBack(p: PlanInput) {
  const raw = plan(p), ko = withKorean(raw, p), plain = withChains(raw);
  ko.rows.forEach((r, i) => {
    const src = raw.rows[i]; if (!src.n) return;
    const line = /^\d+단$/.test(r.label) ? `${r.label} ${r.how}` : r.how, read = readKorean(line), where = `${src.label}: ${r.how}`;
    expect(read, where).not.toBeNull(); expect(read!.ok, where).toBe(true);
    if (read!.total!.kind === "arch") expect(read!.total!.n * (src.wall?.ch ? NET[src.wall.ch].m : 4), where).toBe(src.n); else expect(read!.total!.n, where).toBe(plain.rows[i].n);
    const c = countToks(rowToks(raw, p, i).toks); expect([read!.stitches, read!.chains], where).toEqual([c.st, c.ch]);
  });
  return raw;
}
const yp = (p: PlanInput) => toYarnPattern(p as never, plan(p))!;
const courses = (p: PlanInput): FormCourse[] => { const y = yp(p); expect(y.shape.kind).toBe("form"); return y.shape.kind === "form" ? y.shape.courses.filter(c => !c.ghost) : []; };

describe("기본형 목록: 10종 더", () => {
  it("seven bags after 폰 크로스백, 바라클라바 among the hats, 모티프 머플러 and 오버사이즈 양말 in 소품", () => {
    const bags = PROTOS.filter(p => p.group === "가방"), at = bags.findIndex(p => p.id === "phonebag");
    // (the four after them, from 실제 도안들에서 배운 원리: tests/pattern-plus)
    expect(bags.slice(at + 1, at + 8).map(p => [p.id, p.name, p.note])).toEqual([
      ["knotbag", "매듭 손잡이백", "판 양 끝을 비대칭으로 길게 · 끼워 묶는 손잡이"], ["coinbag", "코인 미니백", "작은 직사각형 통 · 짧은 손잡이 둘 · 체인 걸이"],
      ["traptote", "사다리꼴 토트", "좁은 바닥 · 넓은 입구 · 짧은 손잡이 둘"], ["clutch", "접는 덮개 클러치", "직사각형 통 · 뒤판을 길게 올려 앞으로 접는 덮개"],
      ["ringbag", "링 손잡이백", "금속 링에 입구를 감싸 붙이기"], ["netbucket", "미니 그물 버킷", "원형 바닥 · 그물 몸통 · 짧은 손잡이"], ["twoway", "2WAY 조임 토트", "끈으로 조이면 복주머니, 펴면 토트"]]);
    const one = (id: string) => { const p = PROTOS.find(q => q.id === id)!; return [p.group, p.name, p.note]; };
    expect(one("balaclava")).toEqual(["모자", "바라클라바", "목부터 원통 · 얼굴 구멍 · 원형 정수리"]);
    expect(one("motifscarf")).toEqual(["소품", "모티프 머플러", "사각 모티프를 한 줄로 이어 띠"]);
    // (Kim: 룸부츠 대신 그냥 오버사이즈 양말로)
    expect(one("bigsocks")).toEqual(["소품", "오버사이즈 양말", "발끝 원형 · 넉넉한 긴 통 · 접어 신기"]);
    expect(PROTOS.some(p => /부츠/.test(p.name))).toBe(false);
    expect(new Set(PROTOS.map(p => p.id)).size).toBe(PROTOS.length);
    // starters only: not in the lists of things to pick
    for (const id of IDS) expect((GROUPS as readonly string[]).includes(ITEM[id as keyof typeof ITEM].group), id).toBe(false);
  });
  it("each has a plan that reads back, a 3D and step cards at once", () => {
    for (const id of IDS) {
      const p = starter(id), pp = readsBack(p);
      expect(pp.rows.length, id).toBeGreaterThan(10);
      expect(pp.rows.every(r => Number.isInteger(r.n) && r.n >= 0), id).toBe(true);
      expect(toYarnPattern(p as never, pp), id).not.toBeNull();
      expect(stepCards(pp, undefined, id).length, id).toBeGreaterThanOrEqual(3);
      if (FORMS.includes(id)) { expect(wearNote(p, gauge(p)), id).toBeTruthy(); expect(yp(p).shape.kind, id).toBe("form"); }
    }
  });
  it("the words a reader types find them", () => {
    const words: [string, string][] = [["매듭 가방", "knotbag"], ["재팬백", "knotbag"], ["코인 가방", "coinbag"], ["동전 가방", "coinbag"], ["사다리꼴 가방", "traptote"], ["사다리꼴 토트", "traptote"], ["클러치", "clutch"],
      ["링 가방", "ringbag"], ["링 손잡이백", "ringbag"], ["바라클라바", "balaclava"], ["발라클라바", "balaclava"], ["그래니 머플러", "motifscarf"], ["모티프 머플러", "motifscarf"], ["양말", "bigsocks"], ["오버사이즈 삭스", "bigsocks"]];
    for (const [w, id] of words) expect(guessItem(w), w).toBe(id);
    // the words that were another piece's stay its
    expect([guessItem("사다리꼴 주머니백"), guessItem("복주머니형 가방"), guessItem("동전지갑"), guessItem("동전 지갑"), guessItem("드로스트링 백팩")]).toEqual(["trapbag", "trapbag", "pouch", "pouch", "backpack"]);
    expect(guessItem("스트링 파우치")).not.toBe("ringbag");
  });
  it("조립하기: their own parts, each slider inside its range on the starter's own size", () => {
    for (const id of IDS) {
      const d = draft(id);
      expect(KITS[id], id).toBeTruthy(); expect(new Set(KITS[id].map(p => p.key)).size, id).toBe(KITS[id].length);
      for (const part of KITS[id]) {
        for (const f of part.fields) { const v = kitValue(d, f); expect(v >= f.min && v <= f.max, `${id} ${f.label}`).toBe(true); if (!f.get) expect(v, `${id} ${f.label}`).toBe(typeof d[f.key] === "number" ? d[f.key] : f.def); }
        for (const k of part.picks ?? []) expect(k.options.map(o => o[0]), id + k.label).toContain(k.value(d));
        expect(part.sum(d), id + part.key).toBeTruthy();
      }
      expect(partLines(d).map(l => l[0]).slice(0, KITS[id].length), id).toEqual(KITS[id].map(p => p.title));
      expect(kitSize(d), id).toMatch(/cm/);
    }
    // a bag's handle is its last part: the 가장자리 box sits under it
    for (const id of ["knotbag", "coinbag", "traptote", "netbucket", "twoway"]) expect(KITS[id][KITS[id].length - 1].title, id).toBe("손잡이");
    expect([partKo("bottom", "bigsocks"), partKo("body", "bigsocks"), partKo("rim", "bigsocks")]).toEqual(["발끝", "발과 목", "접는 단"]);
  });
});

describe("매듭 손잡이백", () => {
  const p = starter("knotbag"), pp = plan(p), g = pp.g, K = knotBag(p, g);
  it("one panel folded: the chain is the width, twice the height in rows", () => {
    expect(K.W).toBe(rnd(K.a / g.w)); expect(K.R).toBe(rnd(K.h / g.h));
    const panel = of(pp.rows, "panel"); expect(panel.length).toBe(2 * K.R + 1); expect(panel.every(r => r.n === K.W)).toBe(true);
  });
  it("a short loop at one end of the opening and a long strap at the other, as wide as each other", () => {
    const loop = pp.rows.filter(r => r.post === 0), strap = pp.rows.filter(r => r.post === 1);
    expect([loop.length, strap.length]).toEqual([K.PS, K.PL]); expect(K.PL).toBeGreaterThan(K.PS);
    expect([K.PS, K.PL]).toEqual([rnd(K.short / g.h), rnd(K.long / g.h)]);
    expect([...loop, ...strap].every(r => r.n === K.T)).toBe(true); expect(K.T).toBe(rnd(K.hw / g.w));
    expect(pp.rows.filter(r => r.part === "join").map(r => r.label)).toEqual(["잇기 준비", "옆선 잇기", "끼워 묶기"]);
  });
  it("a longer strap is more rows of it, and nothing else", () => {
    const more = plan(starter("knotbag", { strapCm: K.long + 10 }));
    expect(more.rows.filter(r => r.post === 1).length).toBe(rnd((K.long + 10) / g.h));
    expect(of(more.rows, "panel")).toEqual(of(pp.rows, "panel"));
  });
  it("the edging: 짧은뜨기 round the opening and round the loop and strap", () => {
    const edge = pp.rows.filter(r => r.border);
    expect(edge.map(r => r.label)).toEqual(["입구 가장자리", "고리와 끈 바깥 가장자리"]);
    expect(edge.every(r => /짧은뜨기/.test(r.how) && r.n > 0)).toBe(true);
    expect(plan(starter("knotbag", { edgeSc: undefined })).rows.filter(r => r.border)).toEqual([]);
  });
  it("the 3D: the panel's rows front and back, the loop's and the strap's rows over the opening", () => {
    const cs = courses(p), n = cs.map(c => c.p.length / 3);
    expect(cs.length).toBe(2 * K.R + K.PS + K.PL);
    expect(n.slice(0, 2 * K.R).every(v => v === K.W)).toBe(true); expect(n.slice(2 * K.R).every(v => v === K.T)).toBe(true);
    // the strap rises over the opening: higher than the loop it goes down through
    const topOf = (c: FormCourse[]) => Math.max(...c.flatMap(k => k.p.filter((_, i) => i % 3 === 1)));
    expect(topOf(cs.slice(2 * K.R + K.PS))).toBeGreaterThan(topOf(cs.slice(2 * K.R, 2 * K.R + K.PS)));
  });
});

describe("코인 미니백 · 접는 덮개 클러치", () => {
  it("the coin bag: a small tube, two short handles and a chain loop at each side", () => {
    const p = starter("coinbag"), pp = plan(p);
    expect(of(pp.rows, "handle").map(r => r.label)).toEqual(["손잡이 1", "손잡이 2", "체인 고리 1", "체인 고리 2"]);
    const loops = pp.rows.filter(r => /체인 고리/.test(r.label)); expect(loops[0].n).toBe(loops[1].n); expect(loops[0].n).toBe(Math.max(3, rnd(CHAIN_LOOP / (pp.g.w * .85))));
    expect(yp(p).sideLoops).toBe(true);
  });
  it("the clutch: the flap is the back's stitches, as long as its share of the body's height", () => {
    const p = starter("clutch"), pp = plan(p), flap = of(pp.rows, "flap"), half = flap[0].n;
    expect(of(pp.rows, "handle")).toEqual([]);
    expect(flap.every(r => r.n === half)).toBe(true); expect(half * 2).toBe(pp.last);
    const ratio = KITS.clutch.flatMap(k => k.fields).find(f => f.get && f.unit === "%")!;
    expect(ratio).toBeTruthy();
    const longer = { ...draft("clutch"), ...ratio.set!(draft("clutch"), Math.min(ratio.max, kitValue(draft("clutch"), ratio) + 20)) } as Draft;
    expect(longer.flapCm!).toBeGreaterThan(draft("clutch").flapCm!);
    expect(of(plan({ ...longer, object: "bag" } as PlanInput).rows, "flap").length).toBeGreaterThan(flap.length);
  });
  it("체인 끈: a loop at each side for a chain, drawn in the 3D", () => {
    const p = starter("clutch", { chainLoops: true }), pp = readsBack(p);
    expect(pp.rows.filter(r => /체인 고리/.test(r.label)).length).toBe(2);
    expect(yp(p).sideLoops).toBe(true); expect(yp(starter("clutch")).sideLoops).toBeUndefined();
  });
});

describe("사다리꼴 토트", () => {
  const p = starter("traptote"), pp = plan(p), body = of(pp.rows, "body");
  it("a narrow bottom, an opening as much wider as the two widths are", () => {
    expect(body[0].n).toBeLessThan(body[body.length - 1].n);
    for (let i = 1; i < body.length; i++) expect(body[i].n).toBeGreaterThanOrEqual(body[i - 1].n);
    // (the round grows as the opening's round is longer than the bottom's: the width alone is wider, not the depth)
    const bottomN = of(pp.rows, "bottom").at(-1)!.n, want = bottomN * (p.topA! + p.b!) / (p.a! + p.b!);
    expect(Math.abs(body.at(-1)!.n - want)).toBeLessThanOrEqual(4);
    expect(of(pp.rows, "handle").map(r => r.label)).toEqual(["손잡이 1", "손잡이 2"]);
  });
  it("옆 기울기: the slider is the side's lean in degrees - the opening's width said another way", () => {
    const lean = KITS.traptote.flatMap(k => k.fields).find(f => f.label === "옆 기울기")!, d = draft("traptote");
    expect(kitValue(d, lean)).toBe(Math.round(Math.atan((d.topA! - d.a!) / 2 / d.h!) * 180 / Math.PI));
    const wider = { ...d, ...lean.set!(d, kitValue(d, lean) + 6) } as Draft; expect(wider.topA!).toBeGreaterThan(d.topA!);
    expect(of(plan({ ...wider, object: "bag" } as PlanInput).rows, "body").at(-1)!.n).toBeGreaterThan(body.at(-1)!.n);
    const straight = { ...d, ...lean.set!(d, 0) } as Draft, sb = of(plan({ ...straight, object: "bag" } as PlanInput).rows, "body");
    expect(sb[0].n).toBe(sb[sb.length - 1].n);
  });
});

describe("링 손잡이백", () => {
  const p = starter("ringbag"), pp = plan(p), g = pp.g;
  it("no handle of yarn: the middle of the front and of the back is worked round a ring", () => {
    const rings = of(pp.rows, "handle"), W = ringWrap(p, g, pp.last);
    expect(rings.map(r => [r.label, r.n])).toEqual([["링 1", W.n], ["링 2", W.n]]);
    expect(W.n).toBeLessThanOrEqual(Math.floor(pp.last / 2)); expect(rings[0].how).toMatch(/링에 감싸며 짧은뜨기/);
    expect(of(pp.rows, "rim").length).toBe(1);
  });
  it("링 지름: the 3D's rings are as wide as the ring typed", () => {
    expect(yp(p).rings).toEqual({ cm: 12 });
    const big = starter("ringbag", { ringCm: 16 }); expect(yp(big).rings).toEqual({ cm: 16 });
    expect(of(plan(big).rows, "handle")[0].why).toMatch(/링 지름 16cm/);
  });
});

describe("미니 그물 버킷", () => {
  it("a round bottom, a net body, two short handles", () => {
    const p = starter("netbucket"), pp = plan(p), body = of(pp.rows, "body");
    expect(of(pp.rows, "bottom")[0].n).toBe(6);
    expect(body.some(r => r.wall)).toBe(true); expect(body.every(r => r.n === pp.last)).toBe(true);
    expect(of(pp.rows, "handle").map(r => r.label)).toEqual(["손잡이 1", "손잡이 2"]);
    expect(yp(p).shape.kind).toBe("round");
  });
});

describe("2WAY 조임 토트", () => {
  const p = starter("twoway"), pp = plan(p), g = pp.g, T = twoWay(p, g);
  it("two panels the same; one row of holes under the opening for the cord", () => {
    const panel = of(pp.rows, "panel"); expect(panel.length).toBe(2 * (T.R + 1)); expect(panel.every(r => r.n === T.W)).toBe(true);
    expect([T.W, T.R]).toEqual([rnd(T.a / g.w), rnd(T.h / g.h)]);
    const eyes = pp.rows.filter(r => r.eyelet); expect(eyes.length).toBe(2);
    expect(eyes.every(r => r.label.endsWith(` ${T.eye}단`))).toBe(true); expect(T.eye).toBeLessThan(T.R); expect(T.holes).toBe(Math.floor(T.W / 2));
  });
  it("joined round three sides, two handles and one cord", () => {
    expect(pp.rows.find(r => r.label === "판 잇기")!.n).toBe(T.J);
    expect(of(pp.rows, "handle").map(r => r.label)).toEqual(["손잡이 1", "손잡이 2", "조임끈"]);
    expect(pp.rows.find(r => r.label === "조임끈")!.n).toBe(T.C); expect(T.cordCm).toBe(Math.round(2 * T.a + 30));
    const edge = pp.rows.filter(r => r.border); expect(edge.at(-1)!.label).toBe("입구 가장자리"); expect(edge.at(-1)!.n).toBe(2 * T.W);
    expect(edge.every(r => /짧은뜨기/.test(r.how))).toBe(true);
  });
  it("조인 모습 / 편 모습: the same rows, the 3D drawn in at the cord's row or open", () => {
    const tied = starter("twoway", { cinched: true });
    expect(plan(tied).rows).toEqual(pp.rows);
    const open = courses(p), shut = courses(tied), widthAt = (cs: FormCourse[], j: number) => { const xs = cs[j].p.filter((_, i) => i % 3 === 0); return Math.max(...xs) - Math.min(...xs); };
    expect(shut.length).toBe(open.length + 2);                                    // (the cord's two ends, tied at the front)
    expect(widthAt(shut, T.eye - 1)).toBeLessThan(widthAt(open, T.eye - 1) * .6);
    const a = yp(p).shape, b = yp(tied).shape; expect(a.kind === "form" && b.kind === "form" && a.key !== b.key).toBe(true);
  });
});

describe("바라클라바", () => {
  const p = starter("balaclava"), pp = plan(p), g = pp.g, B = balaclava(p, g);
  it("from the neck: its round a little loose, then the head's round", () => {
    expect(B.N0).toBe(rnd(B.neck * BALA_NECK_EASE / g.w)); expect(B.N1).toBe(6 * rnd(B.circ / (6 * g.w)));
    expect(pp.rows[0].n).toBe(B.N0);
    const body = of(pp.rows, "body"); expect(body.slice(0, B.neckRows).every(r => r.n === B.N0)).toBe(true); expect(body[B.neckRows].n).toBe(B.N1);
  });
  it("the face: its stitches left out for its rows, then chains across them and the round is whole again", () => {
    const face = of(pp.rows, "panel"); expect(face.length).toBe(B.faceRows); expect(face.every(r => r.n === B.N1 - B.F)).toBe(true);
    expect([B.F, B.faceRows]).toEqual([rnd(B.fw / g.w), rnd(B.fh / g.h)]);
    const bridge = pp.rows.filter(r => r.bridge); expect(bridge.length).toBe(1); expect(bridge[0].n).toBe(B.N1);
    expect(pp.rows.indexOf(bridge[0])).toBe(pp.rows.indexOf(face.at(-1)!) + 1);
  });
  it("the crown: six fewer a round, down to six", () => {
    const crown = of(pp.rows, "rim"); expect(crown.map(r => r.n)).toEqual(Array.from({ length: B.R1 - 1 }, (_, i) => 6 * (B.R1 - 1 - i)));
  });
  it("a wider or taller face, a bigger head move the counts", () => {
    const wide = balaclava(starter("balaclava", { faceW: B.fw + 4, faceH: B.fh + 3 }), g); expect(wide.F).toBeGreaterThan(B.F); expect(wide.faceRows).toBeGreaterThan(B.faceRows);
    expect(balaclava(starter("balaclava", { circ: B.circ + 6 }), g).N1).toBeGreaterThan(B.N1);
  });
  it("귀 달기: two small rounds more, sewn on", () => {
    const eared = starter("balaclava", { ears: true }), pe = readsBack(eared);
    expect(pe.rows.length).toBeGreaterThan(pp.rows.length); expect(pe.rows.some(r => r.label === "귀 달기")).toBe(true);
    expect(pe.rows.slice(0, pp.rows.length).map(r => r.n)).toEqual(pp.rows.map(r => r.n));
    expect(courses(eared).length).toBeGreaterThan(courses(p).length);
  });
  it("the 3D: every round in its place on a head, the face's rows open", () => {
    const cs = courses(p); expect(yp(p).stand?.kind).toBe("head");
    expect(cs.length).toBe(pp.rows.length - 1);                                   // (the chain is the first round's own)
    expect(cs.filter(c => !c.closed).map(c => c.p.length / 3)).toEqual(Array(B.faceRows).fill(B.N1 - B.F));
  });
  it("the step cards say what each part is, the rounds over the face too", () => {
    const cards = stepCards(pp, undefined, "balaclava"), text = JSON.stringify(cards);
    expect(text).toContain("얼굴 구멍 위를 사슬로 건너"); expect(text).not.toMatch(/(\d+)코에서 \1코가 됩니다/);
  });
});

describe("모티프 머플러", () => {
  const p = starter("motifscarf"), pp = plan(p), g = pp.g, M = motifScarf(p, g);
  it("a motif as wide as the scarf, as many as its length takes", () => {
    expect(M.R).toBe(rnd(M.a / (2 * g.w))); expect(M.n).toBe(Math.round(M.b / (M.E * g.w)));
    const rounds = of(pp.rows, "panel"); expect(rounds.length).toBe(M.n * M.R);
    expect(rounds.slice(0, M.R).map(r => r.n)).toEqual(Array.from({ length: M.R }, (_, i) => 8 * (i + 1)));
    expect(new Set(rounds.map(r => r.motif!.name)).size).toBe(M.n);
  });
  it("joined in one line: a side's stitches for every seam", () => {
    expect(pp.rows.find(r => r.label === "모티프 잇기")!.n).toBe((M.n - 1) * M.E);
    const longer = motifScarf(starter("motifscarf", { b: M.b + 3 * M.sideCm }), g); expect(longer.n).toBe(M.n + 3);
  });
  it("색 배치: the same counts; the 3D in the yarn's colour and the second", () => {
    for (const c of ["alt", "ring"] as const) {
      const q = starter("motifscarf", { motifColors: c }), pq = readsBack(q);
      expect(pq.rows.map(r => r.n)).toEqual(pp.rows.map(r => r.n));
      expect(new Set(courses(q).map(k => k.ci)).size).toBe(2);
    }
    expect(new Set(courses(p).map(k => k.ci ?? 0)).size).toBe(1);
    expect(courses(starter("motifscarf", { motifColors: "alt" })).filter((_, i) => i % M.R === 0).map(k => k.ci)).toEqual(Array.from({ length: M.n }, (_, k) => k % 2));
  });
  it("the 3D: each motif's rounds, laid as one band", () => {
    const cs = courses(p); expect(cs.length).toBe(M.n * M.R); expect(cs.slice(0, M.R).map(c => c.p.length / 3)).toEqual(Array.from({ length: M.R }, (_, i) => 8 * (i + 1)));
    expect(cs.every(c => c.p.every(Number.isFinite))).toBe(true);
    // (bent or straight, a motif's middle is a motif's side from the next one's)
    const mids = (toYarnPattern(p as never, pp)!.shape as { courses: FormCourse[] }).courses.filter(c => c.ghost).map(c => c.p);
    expect(mids.length).toBe(M.n);
    for (let i = 1; i < mids.length; i++) expect(Math.hypot(mids[i][0] - mids[i - 1][0], mids[i][2] - mids[i - 1][2])).toBeLessThanOrEqual(M.sideCm + .01);
  });
});

describe("오버사이즈 양말", () => {
  const p = starter("bigsocks"), pp = plan(p), g = pp.g, B = bigSocks(p, g);
  it("from the toe: six more a round until the round is the ankle's and a little more", () => {
    expect(B.R).toBe(rnd(B.ankle * SOCK_EASE / (6 * g.w))); expect(B.N).toBe(6 * B.R);
    expect(of(pp.rows, "bottom").map(r => r.n)).toEqual(Array.from({ length: B.R }, (_, i) => 6 * (i + 1)));
    expect(B.N * g.w).toBeGreaterThan(B.ankle);
  });
  it("one tube for the foot and the leg, the heel's round said; then the fold and the cuff", () => {
    const body = of(pp.rows, "body"); expect(body.length).toBe(B.rows); expect(body.every(r => r.n === B.N && r.inc === 0)).toBe(true);
    expect(B.rows).toBe(rnd((B.foot + B.hgt - B.toeCm) / g.h));
    expect(body.findIndex(r => /뒤꿈치/.test(r.why ?? ""))).toBe(B.heel); expect(B.heel).toBe(rnd((B.foot - B.toeCm) / g.h));
    const cuff = of(pp.rows, "rim"); expect(cuff.length).toBe(B.cuffRows + 1); expect(cuff[0].how).toMatch(/^뒷고리에만/); expect(cuff.every(r => r.n === B.N)).toBe(true);
    expect(pp.rows.at(-1)!.label).toBe("한 짝 더");
  });
  it("a longer foot, a taller leg, a wider ankle move the counts; no cuff leaves the tube alone", () => {
    expect(bigSocks(starter("bigsocks", { footL: B.foot + 3 }), g).heel).toBeGreaterThan(B.heel);
    expect(bigSocks(starter("bigsocks", { h: B.hgt + 6 }), g).rows).toBeGreaterThan(B.rows);
    expect(bigSocks(starter("bigsocks", { ankleCm: B.ankle + 6 }), g).N).toBeGreaterThan(B.N);
    const bare = plan(starter("bigsocks", { cuffCm: 0 })); expect(of(bare.rows, "rim")).toEqual([]); expect(of(bare.rows, "body").length).toBe(B.rows);
  });
  it("a pair: the yarn of two", () => {
    expect(pp.pairs).toBe(2);
    const two = yarnUse(pp, p as never), one = yarnUse({ ...pp, pairs: undefined }, p as never);
    expect(two.m / one.m).toBeCloseTo(2, 1);
  });
  it("the 3D: two socks, every round of each", () => {
    const cs = courses(p); expect(cs.length).toBe(2 * (pp.rows.length - 1));
    expect(cs.every(c => c.closed && c.p.every(Number.isFinite))).toBe(true); expect(yp(p).stand ?? null).toBeNull();
    const half = cs.length / 2; expect(cs.slice(0, half).map(c => c.p.length / 3)).toEqual(pp.rows.slice(0, -1).map(r => r.n));
  });
});
