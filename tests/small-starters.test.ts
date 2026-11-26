import { describe, expect, it } from "vitest";
import { guessItem, partLines } from "@/lib/assemble";
import { ENGINE, GROUPS, ITEM, ITEMS } from "@/lib/items";
import { countToks, rowToks, withKorean } from "@/lib/koreanNotation";
import { gauge, NET, partKo, plan, withChains, type PlanInput } from "@/lib/pattern";
import { PROTOS, protoDraft } from "@/lib/prototypes";
import { readKorean } from "@/lib/stitchGrammar";
import { isChainRow, pieceLayout, pieceOf } from "@/lib/structure";
import { stepCards } from "@/lib/stepCards";
import { DEFAULT_DRAFT, type Draft } from "@/lib/types";
import { BONNET_SHARE, BUST_EASE, bonnet, bustier, halter, KITS, kitSize, kitValue, moonBag, phoneDims, trapBag, wearNote } from "@/lib/wear";
import { toYarnPattern } from "@/src/features/yarn3d/fromPattern";
import type { FormCourse } from "@/src/features/yarn3d/engine";

// 작은 가방 4종 · 보닛 · 옷 2종 (Kim: 실제 작품들에서 본 구조 원리): 사다리꼴 주머니백, 반달 미니백, 계단 덮개 미니백,
// 폰 크로스백, 보닛, 모티프 뷔스티에 / 그물 홀터 탑. Every count is the gauge's and the sizes typed; the words, the
// chart grid and the 3D are the same rows.

const yarn = { hook: "5호", weight: "medium", yarnMode: "mm", yarnMm: 3 } as const;
const IDS = ["trapbag", "moonbag", "stepbag", "phonebag", "bonnet", "bustier", "halter"];
const starter = (id: string, over: Partial<Draft> = {}): PlanInput => { const d = { ...protoDraft({ ...DEFAULT_DRAFT, ...yarn }, PROTOS.find(p => p.id === id)!), ...over }; return { ...d, object: ENGINE[ITEM[d.item!].kind] } as PlanInput; };
const near = (a: number, b: number, tol = 1) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol);
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
const courses = (p: PlanInput): FormCourse[] => { const yp = toYarnPattern(p as never, plan(p))!; expect(yp.shape.kind).toBe("form"); return yp.shape.kind === "form" ? yp.shape.courses.filter(c => !c.ghost) : []; };
const sizes = (cs: FormCourse[]) => cs.map(c => c.p.length / 3);

describe("기본형 목록: 작은 가방 · 보닛 · 옷", () => {
  it("four more bags at the end of 가방, 보닛 among the hats, 옷 as one card that opens into two", () => {
    // (after them: 10종 더, tests/more-starters)
    const bags = PROTOS.filter(p => p.group === "가방"), at = bags.findIndex(p => p.id === "trapbag");
    expect(bags.slice(at, at + 4).map(p => [p.name, p.note])).toEqual([["사다리꼴 주머니백", "바닥 없는 사다리꼴 두 장 · 띠 손잡이"], ["반달 미니백", "원 두 장 · 아래 반원만 잇기"], ["계단 덮개 미니백", "직사각형 통 · 계단식 덮개 · 짧은 어깨끈"], ["폰 크로스백", "휴대폰 크기 · 장식 테두리 · 긴 끈"]]);
    expect(PROTOS.filter(p => p.group === "모자").map(p => p.name)).toEqual(["버킷햇", "모티프 버킷햇", "후드 스카프", "이어플랩 후드", "삼각 헤드스카프", "바라클라바", "보닛", "비니"]);
    expect(PROTOS.find(p => p.id === "bonnet")!.note).toBe("원형 정수리 · 뒤통수 감싸기 · 턱끈");
    const tops = PROTOS.filter(p => p.group === "옷");
    expect(tops.map(p => [p.id, p.family, p.choice?.[0]])).toEqual([["bustier", "뷔스티에 · 홀터 탑", "모티프 뷔스티에"], ["halter", "뷔스티에 · 홀터 탑", "그물 홀터 탑"]]);
    expect(new Set(PROTOS.map(p => p.id)).size).toBe(PROTOS.length);
    // starters only: the lists of things to pick are as they were
    for (const id of IDS) expect((GROUPS as readonly string[]).includes(ITEM[id as keyof typeof ITEM].group), id).toBe(false);
    expect(ITEMS.filter(i => (GROUPS as readonly string[]).includes(i.group)).length).toBe(19);
  });
  it("each has a plan that reads back, a 3D and step cards at once", () => {
    for (const id of IDS) {
      const p = starter(id), pp = readsBack(p);
      expect(pp.rows.length, id).toBeGreaterThan(10);
      expect(pp.rows.every(r => Number.isInteger(r.n) && r.n >= 0 && r.idx === pp.rows.indexOf(r)), id).toBe(true);
      expect(toYarnPattern(p as never, pp), id).not.toBeNull();
      expect(stepCards(pp, undefined, id).length, id).toBeGreaterThanOrEqual(3);
      expect(wearNote(p, gauge(p)) || id === "stepbag" || id === "phonebag", id).toBeTruthy();
    }
  });
  it("the words a reader types find them", () => {
    const words: [string, string][] = [["복주머니형 가방", "trapbag"], ["사다리꼴 주머니백", "trapbag"], ["반달 가방", "moonbag"], ["덤플링백", "moonbag"], ["휴대폰 가방", "phonebag"], ["폰 크로스백", "phonebag"], ["보닛", "bonnet"], ["뷔스티에", "bustier"], ["여름 탑", "bustier"], ["홀터 탑", "halter"]];
    for (const [w, id] of words) expect(guessItem(w), w).toBe(id);
    expect([guessItem("복주머니"), guessItem("버킷햇"), guessItem("후드 스카프"), guessItem("토트백")]).toEqual(["bucket", "buckethat", "hoodscarf", "minibag"]);
  });
  it("조립하기: their own parts, each slider inside its range on the starter's own size", () => {
    for (const id of IDS) {
      const d = protoDraft({ ...DEFAULT_DRAFT, ...yarn }, PROTOS.find(p => p.id === id)!);
      expect(KITS[id], id).toBeTruthy(); expect(new Set(KITS[id].map(p => p.key)).size, id).toBe(KITS[id].length);
      for (const part of KITS[id]) {
        for (const f of part.fields) { const v = kitValue(d, f); expect(v >= f.min && v <= f.max, `${id} ${f.label}`).toBe(true); expect(v, `${id} ${f.label}`).toBe(typeof d[f.key] === "number" ? d[f.key] : f.def); }
        for (const k of part.picks ?? []) expect(k.options.map(o => o[0]), id + k.label).toContain(k.value(d));
      }
      expect(partLines(d).map(l => l[0]).slice(0, KITS[id].length), id).toEqual(KITS[id].map(p => p.title));
      expect(kitSize(d), id).toMatch(/cm/);
    }
    // (no part's key is one of the bag panel's own: both would show)
    for (const parts of Object.values(KITS)) for (const part of parts) expect(["shape", "hole", "strip", "strap", "size", "bottom", "body", "handle", "top", "stitch", "extra"]).not.toContain(part.key);
    const d = protoDraft({ ...DEFAULT_DRAFT, ...yarn }, PROTOS.find(p => p.id === "phonebag")!);
    expect(KITS.phonebag[0].fields[0].set!(d, 8)).toEqual({ phoneW: 8, a: 9, h: 17 });
    expect([partKo("flap", "bustier"), partKo("panel", "bonnet"), partKo("flap", "halter"), partKo("flap", "stepbag"), partKo("flap", "minibag")]).toEqual(["컵", "뒤통수", "앞 V", "계단 덮개", "덮개"]);
  });
});

describe("사다리꼴 주머니백", () => {
  const p = starter("trapbag"), pp = plan(p), g = gauge(p), B = trapBag(p, g);
  it("two panels the same, from the narrow edge to the wide one, the gain spread evenly at both ends", () => {
    near(B.n0, 12 / g.w); near(B.W, 26 / g.w, 1.5); near(B.R, 20 / g.h); expect((B.W - B.n0) % 2).toBe(0);
    for (const name of ["앞판", "뒤판"]) {
      const rows = pp.rows.filter(r => pieceOf(r) === name && !isChainRow(r));
      expect(rows.map(r => r.n)).toEqual(B.counts); expect(rows[0].n).toBe(B.n0); expect(rows[rows.length - 1].n).toBe(B.W);
      expect(rows.every((r, i) => !i || (r.n - rows[i - 1].n) % 2 === 0 && r.n - rows[i - 1].n <= 2 && r.edge![0] === r.edge![1])).toBe(true);   // never more than a stitch an end a row here
      expect(pp.rows.find(r => pieceOf(r) === name && isChainRow(r))!.n).toBe(B.n0);
    }
    expect(trapBag({ ...p, topA: 34 }, g).W).toBeGreaterThan(B.W); expect(trapBag({ ...p, h: 28 }, g).R).toBeGreaterThan(B.R);
  });
  it("the narrow edges joined, then the sides; the band worked on from one side and joined at the other", () => {
    expect(pp.rows.filter(r => r.part === "join").map(r => [r.label, r.n])).toEqual([["잇기 준비", 0], ["바닥 잇기", B.n0], ["옆선 잇기", 2 * B.sideJ]]);
    near(B.sideJ, Math.hypot(20, 7) / g.w);
    const band = pp.rows.filter(r => r.part === "handle");
    expect(band.length).toBe(B.HR); near(B.HR, 40 / g.h); near(band[0].n, 4 / g.w); expect(band.every(r => r.n === B.T && r.grown)).toBe(true);
    expect(band[band.length - 1].how).toContain("반대쪽 옆선");
  });
  it("the chart's grid and the 3D are those rows: a pouch that swells from a seam", () => {
    const rows = pp.rows.filter(r => pieceOf(r) === "앞판" && !isChainRow(r)), lay = pieceLayout(rows), cs = courses(p);
    expect(lay.W).toBe(B.W); rows.forEach((r, i) => expect(lay.cells.slice(i * lay.W, (i + 1) * lay.W).filter(c => c >= 0).length).toBe(r.n));
    expect(sizes(cs)).toEqual([...B.counts, ...B.counts, ...Array(B.HR).fill(B.T)]);
    const deep = (c: FormCourse) => Math.max(...c.p.filter((_, i) => i % 3 === 2).map(Math.abs));
    expect(deep(cs[0])).toBeLessThan(1); expect(deep(cs[Math.floor(B.R * .55)])).toBeGreaterThan(3);      // gathered at the bottom, round in the middle
    expect(toYarnPattern(p as never, pp)!.stand).toBeUndefined();
  });
});

describe("반달 미니백", () => {
  const p = starter("moonbag"), pp = plan(p), g = gauge(p), M = moonBag(p, g);
  it("two circles, six stitches more a round; only the lower half joined", () => {
    near(M.R, 10 / g.h);
    for (const name of ["앞판", "뒤판"]) expect(pp.rows.filter(r => r.disc?.name === name).map(r => r.n)).toEqual(Array.from({ length: M.R }, (_, i) => 6 * (i + 1)));
    expect(pp.rows.filter(r => r.part === "join").map(r => r.n)).toEqual([0, M.N / 2]);
    expect(moonBag({ ...p, a: 26 }, g).R).toBeGreaterThan(M.R);
  });
  it("the hand's slot: chains over as many skipped stitches in one round of each circle", () => {
    const holes = pp.rows.filter(r => r.disc?.hole);
    expect(holes.length).toBe(2); near(M.hs, 8 / g.w); expect(holes[0].disc!.r).toBe(M.rh); expect(M.rh).toBeGreaterThan(M.R / 2);
    expect(holes[0].how).toContain(`사슬 ${M.hs}코를 띄우고 ${M.hs}코 건너뛰기`); expect(holes[0].n).toBe(6 * M.rh);
    expect(plan({ ...p, holeW: 0 }).rows.some(r => r.disc?.hole)).toBe(false);
  });
  it("the 3D: the two circles face to face, the slot's chains at the top", () => {
    const cs = courses(p);
    expect(sizes(cs)).toEqual([...Array.from({ length: M.R }, (_, i) => 6 * (i + 1)), ...Array.from({ length: M.R }, (_, i) => 6 * (i + 1))]);
    const slot = cs[M.rh - 1]; expect(Array.isArray(slot.ty) && slot.ty.filter(s => s === "ch").length).toBe(M.hs);
    const i0 = (slot.ty as string[]).indexOf("ch"), mid = (i0 + Math.floor(M.hs / 2)) * 3, cy = cs[0].p.reduce((s, v, i) => (i % 3 === 1 ? s + v / 6 : s), 0);
    near(slot.p[mid], 0, 1); expect(slot.p[mid + 1]).toBeGreaterThan(cy);                                // over the middle: the top
    const z = (c: FormCourse, k: number) => c.p[k * 3 + 2], last = cs[M.R - 1], n = last.p.length / 3, bottomK = last.p.reduce((b, v, i) => (i % 3 === 1 && v < last.p[b * 3 + 1] ? (i - 1) / 3 : b), 0);
    expect(Math.abs(z(last, bottomK))).toBeLessThan(.6); expect(Math.max(...Array.from({ length: n }, (_, k) => Math.abs(z(last, k))))).toBeGreaterThan(1.5);   // together below, apart above
  });
});

describe("계단 덮개 미니백", () => {
  const p = starter("stepbag"), pp = plan(p), g = gauge(p), flap = pp.rows.filter(r => r.part === "flap");
  it("a flat tube from a chain worked round both sides", () => {
    expect(pp.rows.filter(r => r.part === "bottom").length).toBe(1);
    const body = pp.rows.filter(r => r.part === "body"); expect(body.every(r => r.n === body[0].n)).toBe(true); near(body.length, 12 / g.h);
  });
  it("the flap steps in: every 2 rows, 2 stitches at each end", () => {
    near(flap.length, 8 / g.h); expect(flap[0].n).toBe(Math.round(pp.last / 2));
    flap.forEach((r, i) => { if (!i) return; const down = i % 2 === 0 && flap[i - 1].n - 4 >= 2; expect(r.n, r.label).toBe(flap[i - 1].n - (down ? 4 : 0)); expect(r.step, r.label).toBe(down ? 2 : undefined); expect(r.edge, r.label).toEqual(down ? [-2, -2] : [0, 0]); });
    expect(flap.filter(r => r.step)[0].how).toContain("첫 2코는 빼뜨기로 건너가고");
    const q = plan({ ...p, flapStepRows: 3, flapStepSt: 1 }).rows.filter(r => r.part === "flap");
    expect(q.filter(r => r.step).every(r => r.step === 1)).toBe(true); expect(q.filter(r => r.step).length).toBe(Math.floor((q.length - 1) / 3));
  });
  it("the chart's grid is the stairs; the 3D's flap steps as often", () => {
    const lay = pieceLayout(flap); expect(lay.W).toBe(flap[0].n);
    flap.forEach((r, i) => { expect(lay.at[i][1]).toBe(r.n); expect(lay.at[i][0]).toBe((flap[0].n - r.n) / 2); });
    const yp = toYarnPattern(p as never, pp)!;
    expect(yp.flap?.steps).toBe(flap.filter(r => r.step).length); near(yp.flap!.tip!, flap[flap.length - 1].n / flap[0].n, .001); expect(yp.strap).toBe("long");
  });
  it("a flap with no steps asked is the flap it was", () => {
    const q = plan({ ...p, flapStepRows: undefined, flapStepSt: undefined }).rows.filter(r => r.part === "flap");
    expect(q.every(r => r.n === q[0].n && !r.step && !r.edge)).toBe(true);
  });
});

describe("폰 크로스백", () => {
  const p = starter("phonebag"), pp = plan(p), g = gauge(p);
  it("the bag's sizes are the phone's with a centimetre to spare", () => {
    expect(phoneDims(7.5, 16)).toEqual({ a: 8.5, h: 17 }); expect([p.a, p.h]).toEqual([8.5, 17]);
    near(pp.rows.filter(r => r.part === "body").length, 17 / g.h);
    const big = plan({ ...p, ...phoneDims(9, 18) }); expect(big.last).toBeGreaterThan(pp.last);
  });
  it("the edging: a round of 짧은뜨기, then one round of the pattern - the opening's round is its multiple", () => {
    const rim = pp.rows.filter(r => r.part === "rim");
    expect(rim.length).toBe(2); expect(rim[1].wall).toEqual({ k: "shell", i: 0, reps: pp.last / 6 }); expect(pp.last % 6).toBe(0); expect(rim[1].how).toContain("한길긴뜨기 5");
    for (const k of ["net", "moss"] as const) { const q = readsBack({ ...p, rimChart: k }), r2 = q.rows.filter(r => r.part === "rim"); expect(r2[1].wall?.k).toBe(k); expect(q.last % (k === "net" ? 4 : 2)).toBe(0); }
    const none = plan({ ...p, rimChart: undefined }).rows.filter(r => r.part === "rim"); expect(none.length).toBe(2); expect(none[1].how).toMatch(/^빼뜨기/);
  });
  it("the 3D: that round in its own stitches, one long strap", () => {
    const yp = toYarnPattern(p as never, pp)!;
    expect(yp.wall?.t[yp.wall.t.length - 1]).toContain("dc"); expect(yp.wall!.t.slice(0, -3).every(row => row.every(s => s === "sc"))).toBe(true); expect(yp.strap).toBe("long");
  });
});

describe("보닛", () => {
  const p = starter("bonnet"), pp = plan(p), g = gauge(p), B = bonnet(p, g);
  it("the crown's round, rows on three quarters of it for the back of the head, a cord at each lower end", () => {
    expect(pp.rows.filter(r => r.part === "bottom").pop()!.n).toBe(B.N); near(B.N * g.w, 56, 3 * g.w);
    expect(B.W).toBe(Math.round(B.N * BONNET_SHARE));
    const rows = pp.rows.filter(r => r.part === "panel"); expect(rows.every(r => r.n === B.W)).toBe(true); near(rows.length, (20 - B.R * g.h) / g.h);
    const ties = pp.rows.filter(r => r.part === "handle"); expect(ties.map(r => r.label)).toEqual(["턱끈 1", "턱끈 2"]); near(ties[0].n, 30 / (g.w * .85));
    expect(bonnet({ ...p, headH: 26 }, g).H).toBeGreaterThan(B.H);
  });
  it("the 3D: on a head, the flower sewn on its side", () => {
    const yp = toYarnPattern(p as never, pp)!, cs = courses(p);
    expect(sizes(cs.filter(c => c.on >= 0))).toEqual([...Array.from({ length: B.R }, (_, i) => 6 * (i + 1)), ...Array(B.H).fill(B.W)]);
    expect(cs.filter(c => c.on < 0).length).toBe(2); expect(yp.stand?.kind).toBe("head");
    expect(yp.extras?.items?.length).toBe(1);
  });
});

describe("모티프 뷔스티에", () => {
  const p = starter("bustier"), pp = plan(p), g = gauge(p), B = bustier(p, g);
  it("a band of motifs sized by the gauge round the chest", () => {
    near(B.R, 14 / (2 * g.w), .5); expect(B.E).toBe(2 * B.R); near(B.n, 84 * BUST_EASE / (B.E * g.w), .5);
    const names = [...new Set(pp.rows.filter(r => r.motif).map(r => r.motif!.name))]; expect(names.length).toBe(B.n);
    expect(pp.rows.filter(r => r.motif?.name === names[0]).map(r => r.n)).toEqual(Array.from({ length: B.R }, (_, i) => 8 * (i + 1)));
    expect(pp.rows.filter(r => r.part === "join").map(r => r.n)).toEqual([0, B.ring]);
    expect(bustier({ ...p, bust: 100 }, g).n).toBeGreaterThan(B.n); expect(bustier({ ...p, h: 10 }, g).R).toBeLessThan(B.R);
  });
  it("two cups on it, a stitch fewer at each end every row down to three; a cord from each tip", () => {
    expect(B.Cb % 2).toBe(1); near(B.Cb, 84 * .2 / g.w, 1.5);
    for (const name of ["컵1", "컵2"]) {
      const rows = pp.rows.filter(r => pieceOf(r) === name);
      expect(rows.map(r => r.n)).toEqual(Array.from({ length: B.CR }, (_, i) => B.Cb - 2 * i)); expect(rows[rows.length - 1].n).toBe(3);
      const lay = pieceLayout(rows); expect(lay.W).toBe(B.Cb); expect(lay.at[rows.length - 1]).toEqual([(B.Cb - 3) / 2, 3]);
    }
    expect(pp.rows.filter(r => r.part === "handle").map(r => r.label)).toEqual(["어깨끈 1", "어깨끈 2"]);
    expect(stepCards(pp, undefined, "bustier").map(c => c.title)).toEqual(["모티프", "띠 잇기", "컵", "어깨끈", "마무리"]);
  });
  it("the 3D: the band and the cups on a torso, the seams in another colour", () => {
    const yp = toYarnPattern(p as never, pp)!, cs = courses(p);
    expect(sizes(cs.filter(c => c.on >= 0))).toEqual([...Array(B.E).fill(B.ring), ...Array.from({ length: B.CR }, (_, i) => B.Cb - 2 * i), ...Array.from({ length: B.CR }, (_, i) => B.Cb - 2 * i)]);
    expect(yp.stand?.kind).toBe("torso"); expect(yp.colors.length).toBe(2); expect(cs[1].cols!.filter(c => c === 1).length).toBe(B.n);
  });
});

describe("그물 홀터 탑", () => {
  const p = starter("halter"), pp = plan(p), g = gauge(p), H = halter(p, g);
  it("a net round the chest: an even number of arches", () => {
    expect(H.A % 2).toBe(0); near(H.N * g.w, 84 * BUST_EASE, 4 * g.w); expect(pp.rows[0].n).toBe(H.N);
    const net = pp.rows.filter(r => r.wall); expect(net.every(r => r.wall!.k === "net" && r.wall!.reps === H.A && r.n === H.N)).toBe(true);
    near(net.length * 1.45 * g.h + g.h, H.tubeCm, 1.45 * g.h);
    expect(halter({ ...p, bust: 100 }, g).A).toBeGreaterThan(H.A);
  });
  it("the front alone, an arch fewer a row, to a point; a cord each side of it", () => {
    const v = pp.rows.filter(r => r.vnet);
    expect(v.map(r => r.vnet)).toEqual(Array.from({ length: H.F - 1 }, (_, i) => H.F - 1 - i)); expect(v[v.length - 1].vnet).toBe(1); expect(v.every(r => r.n === 4 * r.vnet!)).toBe(true);
    near(v.length * 1.45 * g.h + H.tubeCm, 30, 1.5);
    expect(pp.rows.filter(r => r.part === "handle").map(r => r.label)).toEqual(["목끈 1", "목끈 2"]);
    expect(halter({ ...p, h: 40 }, g).tubeCm).toBeGreaterThan(H.tubeCm);
  });
  it("the 3D: the rounds and the point on a torso, the net's chains as holes", () => {
    const yp = toYarnPattern(p as never, pp)!, cs = courses(p).filter(c => c.on >= 0), body = pp.rows.filter(r => r.part === "body");
    expect(sizes(cs)).toEqual([...body.map(() => H.N), ...Array.from({ length: H.V }, (_, i) => 4 * (H.F - 1 - i) + 1)]);
    expect(cs.filter(c => Array.isArray(c.ty) && c.ty.includes("ch")).length).toBe(body.filter(r => r.wall).length + H.V);
    expect(yp.stand?.kind).toBe("torso");
  });
});
