import { describe, expect, it } from "vitest";
import { guessItem, guessSpec, partLines } from "@/lib/assemble";
import { ENGINE, GROUPS, ITEM, ITEMS } from "@/lib/items";
import { countToks, rowToks, withKorean } from "@/lib/koreanNotation";
import { gauge, NET, openingN, packCord, partKo, plan, withChains, type PlanInput } from "@/lib/pattern";
import { PROTOS, protoDraft } from "@/lib/prototypes";
import { specToDraft } from "@/lib/sketchShape";
import { readKorean } from "@/lib/stitchGrammar";
import { isChainRow, pieceLayout, pieceOf } from "@/lib/structure";
import { stepCards } from "@/lib/stepCards";
import { DEFAULT_DRAFT, type Draft } from "@/lib/types";
import { BRIM_RATE, bottleDims, bucketHat, earflap, hoodScarf, kerchief, KITS, kitValue, motifHat, wearNote } from "@/lib/wear";
import { toYarnPattern } from "@/src/features/yarn3d/fromPattern";
import type { FormCourse } from "@/src/features/yarn3d/engine";

// 모자 5종 · 소품 2종 (Kim: 실제 작품들에서 본 구조 원리): 버킷햇, 모티프 버킷햇, 후드 스카프, 이어플랩 후드, 삼각
// 헤드스카프, 보틀백, 드로스트링 백팩. Each starter's counts come from the gauge and the sizes typed (the head's
// round, a bottle's width); its words, its chart grid and its 3D are the same rows.

const yarn = { hook: "5호", weight: "medium", yarnMode: "mm", yarnMm: 3 } as const;
const IDS = ["buckethat", "motifhat", "hoodscarf", "earflap", "kerchief", "bottlebag", "backpack"];
const starter = (id: string, over: Partial<Draft> = {}): PlanInput => { const d = { ...protoDraft({ ...DEFAULT_DRAFT, ...yarn }, PROTOS.find(p => p.id === id)!), ...over }; return { ...d, object: ENGINE[ITEM[d.item!].kind] } as PlanInput; };
const near = (a: number, b: number, tol = 1) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol);
/** every row with stitches, written in the Korean notation and read back: its pieces add up to its count */
function readsBack(p: PlanInput) {
  const raw = plan(p), ko = withKorean(raw, p), plain = withChains(raw);
  ko.rows.forEach((r, i) => {
    const src = raw.rows[i]; if (!src.n) return;
    const line = /^\d+단$/.test(r.label) ? `${r.label} ${r.how}` : r.how, read = readKorean(line), where = `${src.label}: ${r.how}`;
    expect(read, where).not.toBeNull(); expect(read!.ok, where).toBe(true);
    // (a net counts its arches: each as many stitches wide as its own net is)
    if (read!.total!.kind === "arch") expect(read!.total!.n * (src.wall?.ch ? NET[src.wall.ch].m : 4), where).toBe(src.n); else expect(read!.total!.n, where).toBe(plain.rows[i].n);
    const c = countToks(rowToks(raw, p, i).toks); expect([read!.stitches, read!.chains], where).toEqual([c.st, c.ch]);
  });
  return raw;
}
/** the 3D's courses that are drawn (the stitches of each) */
const courses = (p: PlanInput): FormCourse[] => { const yp = toYarnPattern(p as never, plan(p))!; expect(yp.shape.kind).toBe("form"); return yp.shape.kind === "form" ? yp.shape.courses.filter(c => !c.ghost) : []; };
const sizes = (cs: FormCourse[]) => cs.map(c => c.p.length / 3);

describe("기본형 목록: 모자 · 소품", () => {
  it("the seven are there, in their groups, with their names and notes", () => {
    const list = PROTOS.filter(p => p.group === "모자" || p.group === "소품").map(p => [p.group, p.name, p.note]);
    expect(list).toEqual([
      ["모자", "버킷햇", "정수리 원형 · 곧은 옆 · 늘리는 챙"], ["모자", "모티프 버킷햇", "사각 모티프 이어 붙이기"], ["모자", "후드 스카프", "원형에서 시작하는 후드 · 긴 끈"],
      ["모자", "이어플랩 후드", "판을 접은 후드 · 긴 귀덮개"], ["모자", "삼각 헤드스카프", "한 꼭짓점에서 늘리는 삼각형 · 묶는 끈"],
      ["소품", "보틀백", "원형 바닥 · 그물 몸통 · 크로스 끈"], ["소품", "드로스트링 백팩", "원통 · 조이는 끈이 어깨끈"],
      ["모자", "비니", ""]]);                                                // 목록 B (Kim): 비니도 모자 그룹으로 - in this list only
    expect(ITEM.beanie.group).toBe("그 밖에");
    expect(new Set(PROTOS.map(p => p.id)).size).toBe(PROTOS.length);
    // they are starters only: not in the lists of things to pick (their groups are no item group)
    for (const id of IDS) expect((GROUPS as readonly string[]).includes(ITEM[id as keyof typeof ITEM].group), id).toBe(false);
    expect(ITEMS.filter(i => (GROUPS as readonly string[]).includes(i.group)).length).toBe(19);
  });

  it("each has a plan that reads back, a 3D and step cards at once; a starter leaves nothing of the one before", () => {
    for (const id of IDS) {
      const p = starter(id), pp = readsBack(p);
      expect(pp.rows.length, id).toBeGreaterThan(10);
      expect(pp.rows.every(r => Number.isInteger(r.n) && r.n >= 0 && r.idx === pp.rows.indexOf(r)), id).toBe(true);
      expect(toYarnPattern(p as never, pp), id).not.toBeNull();
      expect(stepCards(pp, undefined, id).length, id).toBeGreaterThanOrEqual(3);
    }
    const after = protoDraft(protoDraft({ ...DEFAULT_DRAFT, ...yarn }, PROTOS.find(p => p.id === "bottlebag")!), PROTOS.find(p => p.id === "tote")!);
    expect([after.crochetChart, after.netCh, after.bottleD, after.tieCm, after.brimCm, after.headH]).toEqual([undefined, undefined, undefined, undefined, undefined, undefined]);
  });

  it("the words a reader types find them, and come up as the starter", () => {
    const words: [string, string][] = [["버킷햇", "buckethat"], ["벙거지 모자", "buckethat"], ["후드", "hoodscarf"], ["후드 스카프", "hoodscarf"], ["이어플랩", "earflap"], ["귀달이 모자", "earflap"], ["헤드스카프", "kerchief"], ["두건", "kerchief"], ["반다나", "kerchief"],
      ["보틀백", "bottlebag"], ["물병 가방", "bottlebag"], ["텀블러백", "bottlebag"], ["백팩", "backpack"], ["배낭", "backpack"]];
    for (const [w, id] of words) expect(guessItem(w), w).toBe(id);
    // (the words before them still mean what they meant)
    expect([guessItem("버킷백"), guessItem("텀블러 홀더"), guessItem("목도리"), guessItem("비니")]).toEqual(["bucket", "cupholder", "scarf", "beanie"]);
    const d = specToDraft({ ...DEFAULT_DRAFT, ...yarn }, guessSpec("보틀백")!);
    expect([d.item, d.crochetChart, d.bottleD, d.a, d.handleCm]).toEqual(["bottlebag", "net", 7, 8, 110]);
  });

  it("a part is called what it is on the piece", () => {
    expect([partKo("bottom", "buckethat"), partKo("rim", "buckethat"), partKo("panel", "motifhat"), partKo("strap", "earflap"), partKo("bottom", "minibag"), partKo("bottom")]).toEqual(["정수리", "챙", "모티프", "귀덮개", "바닥", "바닥"]);
    expect(stepCards(plan(starter("buckethat")), undefined, "buckethat").map(c => c.title)).toEqual(["정수리", "옆", "챙", "마무리"]);
    expect(stepCards(plan(starter("hoodscarf")), undefined, "hoodscarf").map(c => c.title)).toEqual(["정수리", "후드", "스카프 끈", "마무리"]);
  });
});

describe("버킷햇", () => {
  const p = starter("buckethat"), pp = plan(p), g = gauge(p), H = bucketHat(p, g);
  const crown = pp.rows.filter(r => r.part === "bottom"), side = pp.rows.filter(r => r.part === "body"), brim = pp.rows.filter(r => r.part === "rim");
  it("the crown grows six a round until its round is the head's, then the side goes down without a stitch more", () => {
    expect(crown.map(r => r.n)).toEqual(crown.map((_, i) => 6 * (i + 1)));
    near(crown[crown.length - 1].n * g.w, 56, 3 * g.w);                     // the round nearest the head's that six stitches a round give
    expect(side.every(r => r.n === H.N && r.inc === 0)).toBe(true);
    near(side.length, 8 / g.h);
  });
  it("the brim: as many rounds as it is wide, each a twentieth more than the one before", () => {
    near(brim.length, 6 / g.h);
    let prev = H.N; for (const r of brim) { expect(r.n).toBe(prev + Math.max(1, Math.round(prev * BRIM_RATE))); expect(r.inc).toBe(r.n - prev); prev = r.n; }
  });
  it("the head's round, the side and the brim move the counts", () => {
    const big = bucketHat({ ...p, circ: 60 }, g), wide = plan({ ...p, brimCm: 9 }), tall = plan({ ...p, h: 11 });
    expect(big.N).toBeGreaterThan(H.N); near(big.N * g.w, 60, 3 * g.w);
    near(wide.rows.filter(r => r.part === "rim").length, 9 / g.h);
    near(tall.rows.filter(r => r.part === "body").length, 11 / g.h);
    expect(plan({ ...p, brimCm: 0 }).rows.some(r => r.part === "rim")).toBe(false);
  });
  it("두 겹 챙: worked back in again round for round, then joined inside", () => {
    const q = { ...p, brimFold: true }, dd = readsBack(q), rim = dd.rows.filter(r => r.part === "rim"), B = brim.length;
    expect(rim.length).toBe(2 * B);
    expect(rim[B].n).toBe(rim[B - 1].n); expect(rim[B].how).toContain("뒷고리");               // the fold
    expect(rim.slice(B + 1).map(r => r.n)).toEqual(rim.slice(0, B - 1).map(r => r.n).reverse());   // the same counts, backwards
    const last = dd.rows[dd.rows.length - 1]; expect([last.part, last.n, last.label]).toEqual(["join", 0, "챙 잇기"]);
    expect(sizes(courses(q)).slice(-B)).toEqual(rim.slice(B).map(r => r.n));
  });
  it("the 3D: every round of the plan in its place, on a head", () => {
    const yp = toYarnPattern(p as never, pp)!, cs = courses(p);
    expect(sizes(cs)).toEqual([...crown, ...side, ...brim].map(r => r.n));
    expect(cs.every(c => c.closed)).toBe(true);
    expect(yp.stand?.kind).toBe("head"); expect(yp.strap).toBe("none");
    const y = (c: FormCourse) => c.p[1], rad = (c: FormCourse) => Math.hypot(c.p[0], c.p[2]);
    expect(y(cs[0])).toBeGreaterThan(y(cs[crown.length]));                                     // the crown is on top
    near(rad(cs[crown.length + 2]), H.N * g.w / (2 * Math.PI), .05);                            // the side stands as wide as its round
    expect(rad(cs[cs.length - 1])).toBeGreaterThan(rad(cs[crown.length + side.length]));        // the brim goes out
    expect(Math.max(...yp.stand!.prof.map(q => q[0]))).toBeLessThan(rad(cs[crown.length + 2])); // the head is inside it
  });
});

describe("모티프 버킷햇", () => {
  const p = starter("motifhat"), pp = plan(p), g = gauge(p), M = motifHat(p, g);
  it("a motif's size is the gauge's: round r has 8 r stitches, a side 2 r, and the motifs round the head are the head's round", () => {
    near(M.R, 56 / M.n / (2 * g.w), .5); expect(M.E).toBe(2 * M.R); expect(M.ring).toBe(M.n * M.E);
    near(M.roundCm, 56, M.n * g.w);
    const one = pp.rows.filter(r => r.motif?.name === "옆 모티프 1");
    expect(one.map(r => r.n)).toEqual(Array.from({ length: M.R }, (_, i) => 8 * (i + 1)));
    expect(one[1].how).toContain("모서리 코에");
  });
  it("one for the crown, n for the side, n for the brim - and the order they are joined in", () => {
    const names = [...new Set(pp.rows.filter(r => r.motif).map(r => r.motif!.name))];
    expect(names.filter(n => n.startsWith("옆 모티프")).length).toBe(M.n);
    expect(names.filter(n => n.startsWith("챙 모티프")).length).toBe(M.n);
    expect(names.filter(n => n === "정수리 모티프").length).toBe(1);
    expect(pp.rows.filter(r => r.motif?.name === "정수리 모티프").pop()!.n).toBe(8 * M.Rc);
    near(8 * M.Rc, M.ring, 4);                                                                  // the crown's round is the ring's
    expect(pp.rows.filter(r => r.motif?.name === "챙 모티프 1").length).toBe(M.Rb);
    expect(M.Rb).toBe(M.R + 1);
    expect(pp.rows.filter(r => r.part === "join").map(r => [r.label, r.n])).toEqual([["옆 잇기 준비", 0], ["옆 잇기", M.ring], ["정수리 잇기", M.ring], ["챙 잇기", M.n * M.Eb], ["챙 달기", M.ring]]);
    const order = pp.rows.filter(r => r.part === "join" || r.motif?.r === 1).map(r => r.label.replace(/ \d+ 1단$| 1단$/, ""));
    expect(order.indexOf("옆 잇기")).toBeLessThan(order.indexOf("정수리 모티프")); expect(order.indexOf("정수리 잇기")).toBeLessThan(order.indexOf("챙 모티프")); expect(order[order.length - 1]).toBe("챙 달기");
  });
  it("more or fewer motifs, a bigger head: the motif's rounds follow", () => {
    expect(motifHat({ ...p, motifN: 4 }, g).R).toBeGreaterThan(M.R);
    expect(motifHat({ ...p, motifN: 4 }, g).Rc).toBe(motifHat({ ...p, motifN: 4 }, g).R);       // four motifs: the crown is the same motif
    expect(motifHat({ ...p, circ: 64 }, g).ring).toBeGreaterThan(M.ring);
    expect(motifHat({ ...p, brimMore: 3 }, g).Eb).toBe(2 * (M.R + 3));
  });
  it("the 3D: the motifs' rounds as crown, ring and brim, their seams in another colour", () => {
    const yp = toYarnPattern(p as never, pp)!, cs = courses(p);
    expect(sizes(cs)).toEqual([...Array.from({ length: M.Rc }, (_, i) => 8 * (i + 1)), ...Array(M.E).fill(M.ring), ...Array(M.Eb).fill(M.n * M.Eb)]);
    expect(yp.colors.length).toBe(2); expect(yp.colors[1]).not.toBe(yp.colors[0]);
    const sideRow = cs[M.Rc + 2];
    expect(sideRow.cols!.filter(c => c === 1).length).toBe(M.n);                                // a seam between every two motifs
    expect(sideRow.cols!.every((c, i) => (c === 1) === (i % M.E === 0))).toBe(true);
    expect(cs[M.Rc].cols!.every(c => c === 1)).toBe(true);                                      // and where the ring meets the crown
    expect(yp.stand?.kind).toBe("head");
  });
});

describe("후드 스카프", () => {
  const p = starter("hoodscarf"), pp = plan(p), g = gauge(p), H = hoodScarf(p, g);
  it("the crown's round, then rows back and forth on two thirds of it down to the neck", () => {
    const crown = pp.rows.filter(r => r.part === "bottom"), hood = pp.rows.filter(r => r.part === "panel");
    expect(crown[crown.length - 1].n).toBe(H.N); near(H.N * g.w, 56, 3 * g.w);
    expect(H.W).toBe(Math.round(H.N * 2 / 3)); expect(hood.every(r => r.n === H.W)).toBe(true);
    near(hood.length, (28 - crown.length * g.h) / g.h);
    expect(hood[0].how).toContain(`남은 ${H.N - H.W}코`);
  });
  it("the few stitches at each end go on as the scarf", () => {
    const posts = pp.rows.filter(r => r.post != null);
    near(posts[0].n, 8 / g.w); expect(posts.every(r => r.n === H.T)).toBe(true);
    expect(posts.filter(r => r.post === 0).length).toBe(H.PR); expect(posts.filter(r => r.post === 1).length).toBe(H.PR);
    near(H.PR, 60 / g.h);
    expect(plan({ ...p, tieCm: 90 }).rows.filter(r => r.post === 0).length).toBeGreaterThan(H.PR);
    expect(hoodScarf({ ...p, headH: 34 }, g).H).toBeGreaterThan(H.H);
  });
  it("the chart's grid: the hood's rows, the two strips on its two ends", () => {
    const rows = pp.rows.filter(r => pieceOf(r) === "후드" && !isChainRow(r)), lay = pieceLayout(rows);
    expect(lay.W).toBe(H.W);
    expect(lay.at[H.H]).toEqual([H.W - H.T, H.T]); expect(lay.at[H.H + H.PR]).toEqual([0, H.T]);
  });
  it("the 3D: the crown, the hood's rows open at the face, two strips from its ends, on a head", () => {
    const yp = toYarnPattern(p as never, pp)!, cs = courses(p);
    expect(sizes(cs)).toEqual([...Array.from({ length: H.R }, (_, i) => 6 * (i + 1)), ...Array(H.H).fill(H.W), ...Array(2 * H.PR).fill(H.T)]);
    expect(cs.slice(0, H.R).every(c => c.closed)).toBe(true); expect(cs.slice(H.R).some(c => c.closed)).toBe(false);
    const row = cs[H.R + 3]; expect(Math.max(...row.p.filter((_, i) => i % 3 === 2))).toBeLessThan(H.N * g.w / (2 * Math.PI));   // nothing at the very front: the face
    expect(yp.stand?.kind).toBe("head");
  });
});

describe("이어플랩 후드", () => {
  const p = starter("earflap"), pp = plan(p), g = gauge(p), H = earflap(p, g);
  it("a panel half the head round and as tall as the head, folded and joined along its chain", () => {
    near(H.W, 28 / g.w, 1.5); expect(H.W % 2).toBe(0); near(H.R, 24 / g.h);
    expect(pp.rows.filter(isChainRow).map(r => r.n)).toEqual([H.W]);
    expect(pp.rows.filter(r => r.part === "panel" && !isChainRow(r)).length).toBe(H.R);
    expect(pp.rows.filter(r => r.part === "join").map(r => r.n)).toEqual([0, H.W / 2]);
  });
  it("the ear flaps: the few stitches at each lower end, worked on down", () => {
    const posts = pp.rows.filter(r => r.post != null);
    near(posts[0].n, 8 / g.w); expect(posts.length).toBe(2 * H.PR); near(H.PR, 30 / g.h);
    const lay = pieceLayout(pp.rows.filter(r => pieceOf(r) === "후드" && !isChainRow(r)));
    expect(lay.W).toBe(H.W); expect(lay.at[H.R]).toEqual([H.W - H.T, H.T]);
  });
  it("앞선 무늬: rows along the face edge, front and back post stitches turn about - or none", () => {
    const rib = pp.rows.filter(r => r.rib);
    expect(rib.map(r => r.rib)).toEqual(["base", "fb", "bf"]); expect(rib.every(r => r.n === H.F)).toBe(true);
    near(H.F, 2 * 24 / g.w, 2); expect(H.F % 2).toBe(0);
    expect(rib[1].how).toContain("앞걸어"); expect(rib[1].how).toContain("뒤걸어");
    expect(plan({ ...p, ribRows: 0 }).rows.some(r => r.rib)).toBe(false);
  });
  it("the 3D: the panel's rows round the back of the head, the flaps down from its ends, the face edge's rows", () => {
    const yp = toYarnPattern(p as never, pp)!, cs = courses(p);
    expect(sizes(cs)).toEqual([...Array(H.R).fill(H.W), ...Array(2 * H.PR).fill(H.T), ...Array(H.rib).fill(H.F)]);
    expect(cs.slice(-H.rib).every(c => c.ty === "dc")).toBe(true);
    expect(yp.stand?.kind).toBe("head");
  });
});

describe("삼각 헤드스카프", () => {
  const p = starter("kerchief"), pp = plan(p), g = gauge(p), K = kerchief(p, g, g);
  it("from one point, a stitch more at each end every row, until the long edge", () => {
    const rows = pp.rows.filter(r => r.part === "rows");
    expect(rows.map(r => r.n)).toEqual(rows.map((_, i) => 3 + 2 * i));
    near(rows[rows.length - 1].n * g.w, 56 * .9, g.w);
    expect(rows.slice(1).every(r => r.edge![0] === 1 && r.edge![1] === 1)).toBe(true);
    expect(kerchief({ ...p, circ: 60 }, g, g).W).toBeGreaterThan(K.W);
  });
  it("a cord at each end of the long edge", () => {
    const cords = pp.rows.filter(r => r.part === "handle");
    expect(cords.length).toBe(2); near(cords[0].n, 25 / (g.w * .85)); expect(cords[0].how).toContain("빼뜨기로 되돌아");
  });
  it("그물 / 레이스: an arch or a V more every row", () => {
    const net = readsBack({ ...p, crochetChart: "net" }).rows.filter(r => r.lace), vst = readsBack({ ...p, crochetChart: "vst" }).rows.filter(r => r.lace);
    expect(net.map(r => r.n)).toEqual(net.map((_, i) => 4 * (i + 1))); near(net.length * 4 * g.w, 56 * .9, 2 * g.w);
    expect(vst.map(r => r.n)).toEqual(vst.map((_, i) => 3 * (i + 1))); near(vst.length * 3 * g.w, 56 * .9, 1.5 * g.w);
    expect(net[3].how).toContain("같은 아치에"); expect(vst[3].how).toContain("V의 사슬 사이에");
  });
  it("the chart's grid and the 3D's rows are the plan's rows", () => {
    const rows = pp.rows.filter(r => r.part === "rows"), lay = pieceLayout(rows);
    expect(lay.W).toBe(K.W);
    rows.forEach((r, i) => expect(lay.cells.slice(i * lay.W, (i + 1) * lay.W).filter(c => c >= 0).length).toBe(r.n));
    const yp = toYarnPattern(p as never, pp)!, cs = courses(p);
    expect(sizes(cs.filter(c => c.on >= 0))).toEqual(rows.map(r => r.n));
    expect(cs.filter(c => c.on < 0).length).toBe(2);                                           // the two cords
    expect(yp.stand?.kind).toBe("head");
    const q = { ...p, crochetChart: "net" as const }; expect(courses(q).some(c => Array.isArray(c.ty) && c.ty.includes("ch"))).toBe(true);
  });
  it("the cloth keeps its size where it lies on the head", () => {
    const cs = courses(p).filter(c => c.on >= 0); let sum = 0, n = 0;
    for (const c of cs) for (let i = 3; i < c.p.length; i += 3) { sum += Math.hypot(c.p[i] - c.p[i - 3], c.p[i + 1] - c.p[i - 2], c.p[i + 2] - c.p[i - 1]); n++; }
    near(sum / n, g.w, g.w * .08);
  });
});

describe("보틀백", () => {
  const p = starter("bottlebag"), pp = plan(p), g = gauge(p);
  it("the bag's sizes are the bottle's: a little wider, up to its shoulder", () => {
    expect(bottleDims(7, 22)).toEqual({ a: 8, h: 16.5 }); expect([p.a, p.h]).toEqual([8, 16.5]);
    const big = plan({ ...p, ...bottleDims(9, 26), bottleD: 9, bottleH: 26 });
    expect(big.rows.filter(r => r.part === "bottom").length).toBeGreaterThan(pp.rows.filter(r => r.part === "bottom").length);
    expect(big.rows.filter(r => r.part === "body").length).toBeGreaterThan(pp.rows.filter(r => r.part === "body").length);
  });
  it("a round bottom, a net body, 짧은뜨기 at the opening, one long strap", () => {
    const body = pp.rows.filter(r => r.part === "body"), rim = pp.rows.filter(r => r.part === "rim"), strap = pp.rows.filter(r => r.part === "handle");
    expect(body.filter(r => r.wall?.k === "net").length).toBeGreaterThan(4); expect(body[0].n % 4).toBe(0);
    expect(rim[0].how).toContain("짧은뜨기"); expect(strap.length).toBe(2); near(strap[0].n, 110 / (g.w * .85));
  });
  it("구멍 크기: an arch of 3, 5 or 7 chains - the round is that net's own multiple, the body as tall", () => {
    for (const ch of [3, 5, 7] as const) {
      const q = { ...p, netCh: ch }, qq = readsBack(q), body = qq.rows.filter(r => r.wall), N = NET[ch];
      expect(body[0].n % N.m, String(ch)).toBe(0); expect(body[0].how, String(ch)).toContain(`사슬 ${ch}`);
      near(body.length * N.ht * g.h + g.h, 16.5, N.ht * g.h);
      expect(qq.rows.filter(r => r.part === "bottom").pop()!.n).toBe(body[0].n);
      const yp = toYarnPattern(q as never, qq)!; expect(yp.wall!.W).toBe(N.m); expect(yp.wall!.t.filter(row => row.includes("ch")).every(row => row.filter(s => s === "sc").length === 1)).toBe(true);   // a net's round: one 짧은뜨기 an arch, the rest chains
    }
    expect(plan({ ...p, netCh: 3 }).rows.filter(r => r.wall).length).toBeGreaterThan(plan({ ...p, netCh: 7 }).rows.filter(r => r.wall).length);
  });
  it("the 3D: on its bottle, held in shape by it", () => {
    const yp = toYarnPattern(p as never, pp)!;
    expect(yp.stand?.kind).toBe("bottle"); expect(yp.stand!.fitTo).toBe(7); expect(Math.max(...yp.stand!.prof.map(q => q[1]))).toBe(22);
    expect(yp.firm).toBe(true); expect(yp.strap).toBe("long"); expect(yp.wall?.t.some(row => row.includes("ch"))).toBe(true);
  });
});

describe("드로스트링 백팩", () => {
  const p = starter("backpack"), pp = plan(p), g = gauge(p), N = openingN(pp), P = packCord(p, g, N);
  it("a tube on a round bottom, an eyelet round under its rim", () => {
    const body = pp.rows.filter(r => r.part === "body"), rim = pp.rows.filter(r => r.part === "rim");
    expect(body.every(r => r.n === body[0].n)).toBe(true); near(body.length, 30 / g.h);
    expect(rim[0].how).toContain("끈 구멍 단"); expect(rim[0].why).toContain("어깨끈");
  });
  it("two loops at the bottom, and one cord: round the opening and a strap down each side", () => {
    const extra = pp.rows.filter(r => r.part === "handle");
    expect(extra.map(r => r.label)).toEqual(["아래 고리 1", "아래 고리 2", "조임끈"]);
    expect(extra[2].n).toBe(P.cord); near(P.cm, N * g.w + 2 * 70, 1); near(P.cord, P.cm / (g.w * .85));
    expect(extra[0].n).toBe(P.loop); near(P.loop, 5 / (g.w * .85));
    expect(plan({ ...p, tieCm: 90 }).rows.filter(r => r.part === "handle")[2].n).toBeGreaterThan(P.cord);
  });
  it("the 3D: gathered at the top, the cord drawn as the straps", () => {
    const yp = toYarnPattern(p as never, pp)!;
    expect([yp.strap, yp.top, yp.strapCm]).toEqual(["pack", "cinch", 70]);
  });
});

describe("조립하기의 부품 (입력 A: 슬라이더 한 줄)", () => {
  it("each starter has its own parts; a slider starts inside its range, on the starter's own size", () => {
    expect(Object.keys(KITS).sort()).toEqual([...IDS].sort());
    for (const id of IDS) {
      const d = protoDraft({ ...DEFAULT_DRAFT, ...yarn }, PROTOS.find(p => p.id === id)!);
      expect(new Set(KITS[id].map(p => p.key)).size, id).toBe(KITS[id].length);
      for (const part of KITS[id]) {
        expect(part.sum(d), id + part.key).toBeTruthy();
        for (const f of part.fields) { const v = kitValue(d, f); expect(v >= f.min && v <= f.max, `${id} ${f.label}`).toBe(true); expect(v, `${id} ${f.label}`).toBe(typeof d[f.key] === "number" ? d[f.key] : f.def); }
        for (const k of part.picks ?? []) expect(k.options.map(o => o[0]), id + k.label).toContain(k.value(d));
      }
      expect(partLines(d).map(l => l[0]), id).toEqual(KITS[id].map(p => p.title));
    }
  });
  it("a bottle's width and height move the bag's bottom and body; a choice sets its own field", () => {
    const d = protoDraft({ ...DEFAULT_DRAFT, ...yarn }, PROTOS.find(p => p.id === "bottlebag")!), [dia, hgt] = KITS.bottlebag[0].fields;
    expect(dia.set!(d, 9)).toEqual({ bottleD: 9, a: 10, h: 16.5 }); expect(hgt.set!(d, 30)).toEqual({ bottleH: 30, a: 8, h: 22.5 });
    expect(KITS.bottlebag[1].picks![0].set("7")).toEqual({ netCh: 7, crochetChart: "net" });
    expect(KITS.buckethat[1].picks![0].set("2")).toEqual({ brimFold: true });
    expect(KITS.kerchief[1].picks![0].set("net").crochetChart).toBe("net"); expect(KITS.kerchief[1].picks![0].set("sc").crochetChart).toBeUndefined();
    expect(KITS.earflap[2].picks![0].set("off")).toEqual({ ribRows: 0 });
  });
});

describe("the line under the sizes", () => {
  it("says each piece's own counts", () => {
    for (const id of ["buckethat", "motifhat", "hoodscarf", "earflap", "kerchief"]) { const p = starter(id), g = gauge(p); expect(wearNote(p, g), id).toMatch(/\d+(코|단)/); expect(wearNote(p, g), id).toMatch(/(습니다|입니다)\.$/); }
  });
});
