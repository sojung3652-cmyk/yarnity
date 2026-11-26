import { describe, expect, it } from "vitest";
import { guessItem } from "@/lib/assemble";
import { rowToks, countToks, withKorean } from "@/lib/koreanNotation";
import { gauge, grownHandle, openingN, plan, withChains, type PlanInput } from "@/lib/pattern";
import { PROTOS as PROTOTYPES, protoDraft } from "@/lib/prototypes";
import { readKorean } from "@/lib/stitchGrammar";
import { isChainRow, pieceLayout, pieceOf, ribbedPanel } from "@/lib/structure";
import { stepCards } from "@/lib/stepCards";
import { DEFAULT_DRAFT, type Draft } from "@/lib/types";
import { toYarnPattern } from "@/src/features/yarn3d/fromPattern";

// 가방 기본형 5종 (Kim): 슬라우치 토트, 호보백, 판 + 띠 숄더백, 네트백, 골지 토트. Each starter gives a plan
// whose words, symbol chart grid and 3D agree; every count is the gauge's.

const yarn = { hook: "5호", weight: "medium", yarnMode: "mm", yarnMm: 3 } as const;
const starter = (id: string): Draft => protoDraft({ ...DEFAULT_DRAFT, ...yarn }, PROTOTYPES.find(p => p.id === id)!);
const near = (a: number, b: number, tol = 1) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol);
/** every row with stitches, written in the Korean notation and read back: its pieces add up to its count */
function readsBack(p: PlanInput) {
  const raw = plan(p), ko = withKorean(raw, p), plain = withChains(raw);
  ko.rows.forEach((r, i) => {
    const src = raw.rows[i]; if (!src.n) return;
    const line = /^\d+단$/.test(r.label) ? `${r.label} ${r.how}` : r.how, read = readKorean(line), where = `${src.label}: ${r.how}`;
    expect(read, where).not.toBeNull(); expect(read!.ok, where).toBe(true);
    if (read!.total!.kind === "arch") expect(read!.total!.n * 4, where).toBe(src.n); else expect(read!.total!.n, where).toBe(plain.rows[i].n);
    const c = countToks(rowToks(raw, p, i).toks); expect([read!.stitches, read!.chains], where).toEqual([c.st, c.ch]);
  });
  return raw;
}

describe("기본형 목록", () => {
  it("the five bags are there, with their names and notes", () => {
    const bags = PROTOTYPES.filter(p => p.group === "가방").map(p => [p.name, p.note]);
    for (const b of [["슬라우치 토트", "납작 통 · 옆에서 이어지는 끈"], ["호보백", "판 하나 · 둥근 모서리 · 끈 기둥"], ["판 + 띠 숄더백", "판 두 장 · 옆판 겸 끈"], ["네트백", "그물 몸통 · 짧은뜨기 테두리"], ["골지 토트", "옆으로 떠서 세로 골"]]) expect(bags).toContainEqual(b);
    expect(new Set(PROTOTYPES.map(p => p.id)).size).toBe(PROTOTYPES.length);
    expect(new Set(PROTOTYPES.filter(p => p.group === "가방").map(p => p.name)).size).toBe(PROTOTYPES.filter(p => p.group === "가방").length);
  });

  it("each starter has a plan, a 3D and step cards at once; a starter leaves nothing of the one before", () => {
    for (const id of ["slouch", "hobo1", "panelbag", "netbag", "ribtote"]) {
      const d = starter(id), p = { ...d, object: "bag" } as PlanInput, pp = readsBack(p);
      expect(pp.rows.length, id).toBeGreaterThan(10);
      expect(pp.rows.every(r => Number.isInteger(r.n) && r.n >= 0), id).toBe(true);
      expect(toYarnPattern(p as never, pp), id).not.toBeNull();
      expect(stepCards(pp).length, id).toBeGreaterThanOrEqual(3);
    }
    const after = protoDraft(starter("netbag"), PROTOTYPES.find(p => p.id === "tote")!);
    expect([after.crochetChart, after.handleKind, after.drape, after.build, after.handleFar]).toEqual([undefined, undefined, undefined, undefined, undefined]);
  });

  it("호보백 is one card that opens into its two ways", () => {
    const fam = PROTOTYPES.filter(p => p.family === "호보백");
    expect(fam.map(p => p.id)).toEqual(["hobo1", "hobo"]);
    expect(fam.map(p => p.choice)).toEqual([["판 하나로", "둥근 모서리 판 · 양 끝 기둥이 끈"], ["몸통에서 이어 뜨기", "타원 바닥 · 입구에서 손잡이가 이어짐"]]);
    // (the only other card that opens: 옷 - tests/small-starters)
    expect([...new Set(PROTOTYPES.filter(p => p.family).map(p => p.family))]).toEqual(["호보백", "뷔스티에 · 홀터 탑"]);
  });

  it("the words a reader types find a bag", () => { for (const w of ["슬라우치 가방", "호보", "그물 가방", "네트백", "마켓백", "골지 토트", "플리츠"]) expect(guessItem(w), w).toBe("minibag"); });
});

describe("슬라우치 토트", () => {
  const p = { ...starter("slouch"), object: "bag" } as PlanInput, pp = plan(p), g = gauge(p);
  it("a flat tube straight up from a chain worked round both sides", () => {
    const bottom = pp.rows.filter(r => r.part === "bottom"), body = pp.rows.filter(r => r.part === "body");
    expect(bottom.length).toBe(1);                                   // the chain's two sides: that round is the bottom
    expect(body.every(r => r.n === body[0].n)).toBe(true);
    near(body.length, 26 / g.h, 2);
    expect(pp.rows.some(r => r.part === "rim" || r.part === "flap")).toBe(false);
  });
  it("the strap: the few stitches at one fold, worked to its length, joined at the other fold", () => {
    const N = openingN(pp), G = grownHandle(p, g, N), hs = pp.rows.filter(r => r.grown && r.grown.k !== "edge");
    near(G.strap, 4 / g.w); expect(G.base).toBe(G.strap); expect(G.dec).toBe(0);
    expect(hs.every(r => r.n === G.strap && r.grown!.side === 0)).toBe(true);     // one strap, from one side
    expect(hs.length).toBe(2 * G.rows); near(hs.length, 60 / g.h, 2);            // its length / a row's height
    expect(hs[hs.length - 1].how).toContain("반대쪽 옆선의 같은");
    expect(2 * G.strap + G.gapA + G.gapB).toBe(N);
  });
  it("the 3D hangs from it (its own weight)", () => { const yp = toYarnPattern(p as never, pp)!; expect(yp.gravity).toBe(true); expect(yp.strap).toBe("long"); expect(yp.strapGrown?.dec).toBe(0); });
  it("a magnet button is a step after the last stitch", () => {
    const m = plan({ ...p, closure: "magnet" }), last = m.rows[m.rows.length - 1];
    expect([last.part, last.n, last.label]).toEqual(["finish", 0, "자석 단추"]);
    expect(m.rows.slice(0, -1).map(r => [r.part, r.n])).toEqual(pp.rows.map(r => [r.part, r.n]));
  });
});

describe("호보백 · 판 + 띠 숄더백", () => {
  it("the hobo is one piece through the bottom, its posts the strap", () => {
    const d = starter("hobo1"), pp = plan({ ...d, object: "bag" } as PlanInput);
    expect([d.build, d.hoboFold]).toEqual(["hobo1", true]);
    expect(pp.rows.filter(isChainRow).length).toBe(1);
    expect(pp.rows.filter(r => r.post != null).length).toBeGreaterThan(0);
    expect(pp.rows.some(r => r.part === "flap")).toBe(false);
  });
  it("the panel bag's strip is the sides, the bottom and the handle", () => {
    const d = starter("panelbag"), pp = plan({ ...d, object: "bag" } as PlanInput), g = pp.g;
    const strip = pp.rows.filter(r => r.part === "strip" && !isChainRow(r)), panel = pp.rows.filter(r => pieceOf(r) === "앞판" && !isChainRow(r));
    near(panel.length, 20 / g.h); near(strip[0].n, 6 / g.w);
    expect(strip.length).toBeGreaterThan(Math.round(70 / g.h));       // the handle's length and the panel's edge together
    expect(pp.rows.find(r => r.part === "join")!.how).toContain("마커링");
    expect(pp.rows.filter(r => r.part === "join" && r.n).every(r => r.how.includes("되돌아짧은뜨기"))).toBe(true);
  });
});

describe("네트백", () => {
  const p = { ...starter("netbag"), object: "bag" } as PlanInput, pp = plan(p), g = gauge(p);
  it("a net body on the usual bottom, the round a whole number of arches", () => {
    const body = pp.rows.filter(r => r.part === "body");
    expect(body.filter(r => r.wall?.k === "net").length).toBeGreaterThan(4);
    expect(body[0].n % 4).toBe(0);
    expect(body.every(r => r.n === body[0].n)).toBe(true);
    expect(pp.rows.filter(r => r.part === "bottom").pop()!.n).toBe(body[0].n);
  });
  it("three rounds of 짧은뜨기 at the opening, the handles left standing in the second", () => {
    const rim = pp.rows.filter(r => r.part === "rim"), N = pp.rows.filter(r => r.part === "body").pop()!.n;
    expect(rim.length).toBe(3);
    expect(rim[0].n).toBe(N);
    const m = rim[1].how.match(/짧은뜨기 (\d+)코, 사슬 (\d+)코를 띄우고 (\d+)코 건너뛰기, 짧은뜨기 (\d+)코, 사슬 (\d+)코를 띄우고 (\d+)코 건너뛰기, 짧은뜨기 (\d+)코/)!.slice(1).map(Number);
    const [A, C, B, D, C2, B2, E] = m;
    expect([C2, B2]).toEqual([C, B]);
    expect(A + B + D + B + E).toBe(N);                                 // the round below is used up: worked or skipped
    expect(rim[1].n).toBe(A + C + D + C + E);                          // this round: stitches and the two chains
    expect(rim[2].n).toBe(rim[1].n);
    near(C, 40 / (g.w * .85));                                         // the handle's length / a chain's length
    expect(Math.abs(A - E)).toBeLessThanOrEqual(1);                    // the two handles sit alike, front and back
    expect(pp.rows.some(r => r.part === "handle")).toBe(false);        // nothing sewn on
  });
  it("the 3D: holes where the chains are, its rim as wide as its body, hanging", () => {
    const yp = toYarnPattern(p as never, pp)!;
    expect(yp.wall?.t.some(row => row.includes("ch"))).toBe(true);
    expect(yp.gravity).toBe(true);
    expect(yp.strap).toBe("two");
    if (yp.shape.kind === "rect") expect(Math.max(...yp.shape.body)).toBe(pp.rows.filter(r => r.part === "body").pop()!.n);
  });
});

describe("골지 토트", () => {
  const p = { ...starter("ribtote"), object: "bag" } as PlanInput, pp = plan(p), g = gauge({ ...p, crochetStitch: null }), P = ribbedPanel(p, g);
  it("a panel worked sideways in the back loop: a row is its height, the rows its width", () => {
    near(P.S, 26 / g.w); near(P.R, 28 / g.h);
    for (const name of ["앞판", "뒤판"]) {
      const rows = pp.rows.filter(r => pieceOf(r) === name && !isChainRow(r));
      expect(rows.length).toBe(P.R);
      expect(pp.rows.find(r => pieceOf(r) === name && isChainRow(r))!.n).toBe(P.S);
      expect(rows.every(r => r.how.includes("이랑뜨기"))).toBe(true);
    }
  });
  it("the hand's hole: as many rows as it is wide, as many stitches as it is tall, crossed by as many chains", () => {
    const rows = pp.rows.filter(r => pieceOf(r) === "앞판" && !isChainRow(r)), hole = rows.filter(r => r.gap && !r.gap[2]), bridge = rows.filter(r => r.gap && r.gap[2]);
    near(hole.length, 10 / g.h); near(P.hs, 3 / g.w);
    expect(hole.every(r => r.n === P.S - P.hs && r.gap![0] === P.lower && r.gap![1] === P.hs)).toBe(true);
    expect(bridge.length).toBe(1);
    expect(bridge[0].n).toBe(P.S);
    expect(rows.indexOf(bridge[0])).toBe(rows.indexOf(hole[hole.length - 1]) + 1);
    expect(rows.filter(r => !r.gap).every(r => r.n === P.S)).toBe(true);
    // the hole sits in the middle of the width, under the top
    expect(Math.abs(rows.indexOf(hole[0]) - (rows.length - rows.indexOf(hole[hole.length - 1]) - 1))).toBeLessThanOrEqual(1);
    expect(P.lower).toBeGreaterThan(P.S / 2);
  });
  it("the chart's grid and the 3D's grid are those rows; the 3D stands them upright", () => {
    const rows = pp.rows.filter(r => pieceOf(r) === "앞판" && !isChainRow(r)), lay = pieceLayout(rows), yp = toYarnPattern(p as never, pp)!;
    rows.forEach((r, i) => expect(lay.cells.slice(i * lay.W, (i + 1) * lay.W).filter(c => c >= 0).length).toBe(r.gap && !r.gap[2] ? r.n : P.S));
    expect(yp.shape.kind).toBe("grid");
    if (yp.shape.kind === "grid") { expect(yp.shape.cells).toEqual(lay.cells); expect([yp.shape.W, yp.shape.H, yp.shape.turn, yp.shape.pieces]).toEqual([P.S, P.R, true, 2]); }
    expect(yp.ridge).toBe(true);
    expect(yp.strap).toBe("none");
  });
  it("no hole asked: every row whole", () => { const q = plan({ ...p, holeW: 0 }); expect(q.rows.some(r => r.gap)).toBe(false); });
});
