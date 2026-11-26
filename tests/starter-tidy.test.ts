import { describe, expect, it } from "vitest";
import { guessItem } from "@/lib/assemble";
import { ITEM } from "@/lib/items";
import { countToks, rowToks, withKorean } from "@/lib/koreanNotation";
import { gauge, plan, type PlanInput, type Row } from "@/lib/pattern";
import { PROTO_GROUPS, PROTOS, protoDraft } from "@/lib/prototypes";
import { readKorean } from "@/lib/stitchGrammar";
import { DEFAULT_DRAFT, type Draft } from "@/lib/types";
import { toYarnPattern } from "@/src/features/yarn3d/fromPattern";
import { yarnUse } from "@/lib/yarnUse";

// 기본형 정리 · 묶음 · 가장자리 짧은뜨기 (Kim). The list: look-alike starters as one card, groups picked by name.
// The edging: a round of 짧은뜨기 round every free edge of a bag, each count from the gauge.

const yarn = { hook: "5호", weight: "medium", yarnMode: "mm", yarnMm: 3 } as const;
const starter = (id: string): Draft => protoDraft({ ...DEFAULT_DRAFT, ...yarn }, PROTOS.find(p => p.id === id)!);
const planOf = (d: Draft) => plan({ ...d, object: "bag" } as PlanInput);
const borders = (rows: Row[]) => rows.filter(r => r.border);
const along = (rows: number, g: { h: number; w: number }) => Math.max(2, Math.round(+((rows * g.h) / g.w).toFixed(6)));

describe("기본형 목록", () => {
  it("look-alike starters are one card; their items stay, and the kept one's sliders reach their sizes", () => {
    const ids = PROTOS.map(p => p.id);
    for (const gone of ["trivet", "scrubber", "rug", "planter", "pencil", "cupholder", "blanket", "bookmark", "headband"]) { expect(ids).not.toContain(gone); expect(ITEM[gone as keyof typeof ITEM]).toBeTruthy(); }
    for (const kept of ["coaster", "placemat", "basket", "dishcloth", "neckwarmer"]) expect(ids).toContain(kept);
    expect(PROTOS.find(p => p.id === "coaster")!.note).toContain("냄비받침");
    const within = (id: keyof typeof ITEM, k: "a" | "b" | "h", from: keyof typeof ITEM) => { const r = ITEM[id].range[k]!, f = ITEM[from].range[k]!; expect(r[0]).toBeLessThanOrEqual(f[0]); expect(r[1]).toBeGreaterThanOrEqual(f[1]); };
    within("coaster", "a", "trivet"); within("coaster", "a", "scrubber"); within("placemat", "a", "rug"); within("placemat", "b", "rug");
    within("basket", "a", "cupholder"); within("basket", "a", "planter"); within("dishcloth", "a", "blanket"); within("dishcloth", "b", "bookmark");
    within("neckwarmer", "h", "headband"); within("neckwarmer", "a", "headband");
    expect(ITEM.placemat.shapes).toEqual(expect.arrayContaining(ITEM.rug.shapes!));
    // a typed word still finds its own item
    expect(guessItem("냄비 받침")).toBe("trivet");
  });
  it("the groups, in order; 호보백's card shows the grown-handle one", () => {
    expect(PROTO_GROUPS).toEqual(["가방", "파우치", "모자", "옷", "소품", "생활 소품"]);
    const hobo = PROTOS.filter(p => p.family === "호보백");
    expect(hobo.filter(p => p.cover).map(p => p.id)).toEqual(["hobo"]);
  });
});

describe("가장자리 짧은뜨기", () => {
  it("bags and pouches start with it on, other pieces without", () => {
    for (const p of PROTOS) expect(protoDraft({ ...DEFAULT_DRAFT }, p).edgeSc, p.id).toBe(p.group === "가방" || p.group === "파우치" ? true : undefined);
  });

  it("off: the plan is as it was", () => {
    for (const id of ["tote", "panelbag", "hobo1", "ribtote", "moonbag", "trapbag", "flapbag", "stepbag"]) {
      const d = starter(id), on = planOf(d), off = planOf({ ...d, edgeSc: undefined });
      expect(borders(off.rows), id).toEqual([]);
      expect(on.rows.filter(r => !r.border).map(r => [r.part, r.n]), id).toEqual(off.rows.map(r => [r.part, r.n]));
      on.rows.forEach((r, i) => expect(r.idx, id).toBe(i));
    }
  });

  it("a handle made apart: round it before it is sewn on - its two long sides and an end each", () => {
    const pp = planOf(starter("tote")), hs = pp.rows.filter(r => r.part === "handle");
    expect(hs.map(r => r.label)).toEqual(["손잡이 1", "손잡이 1 가장자리", "손잡이 2", "손잡이 2 가장자리"]);
    expect(hs[1].n).toBe(2 * hs[0].n + 2);
    expect(hs[0].how).toContain("가장자리를 두른 뒤");
    // its opening already ends in a round of 짧은뜨기: nothing more there
    expect(borders(pp.rows).every(r => r.part === "handle")).toBe(true);
  });

  it("a flap: its two sides and its end, the flap's own rows left as they are", () => {
    const d = starter("flapbag"), pp = planOf(d), flap = pp.rows.filter(r => r.part === "flap"), b = pp.rows.find(r => r.label === "덮개 가장자리")!;
    expect(b.part).toBe("rim");
    expect(b.n).toBe(2 * along(flap.length, pp.g) + flap[0].n);
    expect(flap).toEqual(planOf({ ...d, edgeSc: undefined }).rows.filter(r => r.part === "flap"));
    expect(toYarnPattern(d as never, pp)!.flap).toEqual(toYarnPattern({ ...d, edgeSc: undefined } as never, planOf({ ...d, edgeSc: undefined }))!.flap);
  });

  it("built bags: the opening's free edges, from each one's own pieces", () => {
    const g = (d: Draft) => gauge({ ...d, object: "bag" } as PlanInput);
    // panels + a strip that goes on as the handle: front and back, each a panel's top and a side of the handle
    let d = starter("panelbag"), pp = planOf(d), W = pp.rows.filter(r => r.part === "panel" && r.label.startsWith("앞판") && !/사슬/.test(r.label)).pop()!.n;
    expect(borders(pp.rows).map(r => [r.label, r.n])).toEqual(["앞쪽", "뒤쪽"].map(x => [`${x} 입구 가장자리`, W + along(Math.max(2, Math.round(70 / pp.g.h)), pp.g)]));
    // ... and without it: one round, the two tops and the strip's two ends
    d = { ...d, stripHandle: false }; pp = planOf(d);
    const S = pp.rows.find(r => r.part === "strip" && !/사슬/.test(r.label))!.n;
    expect(borders(pp.rows).filter(r => r.part === "rim").map(r => r.n)).toEqual([2 * W + 2 * S]);
    // a hobo panel: inside each arch the panel's middle and the posts' inner sides; outside, the posts' outer sides
    d = starter("hobo1"); pp = planOf(d);
    const post = pp.rows.find(r => r.post != null)!.n, PR = pp.rows.filter(r => r.post === 0 && r.label.startsWith("앞판")).length, Wh = pp.rows.filter(r => r.part === "panel" && r.label.startsWith("앞판") && !/사슬/.test(r.label)).pop()!.n;
    expect(borders(pp.rows).map(r => r.n)).toEqual([Wh - 2 * post + 2 * along(PR, pp.g), Wh - 2 * post + 2 * along(PR, pp.g), 4 * along(PR, pp.g)]);
    // ribbed, worked sideways: the tops are the rows' ends; each hand hole all round
    d = starter("ribtote"); pp = planOf(d);
    const R = pp.rows.filter(r => r.part === "panel" && r.label.startsWith("앞판") && !/사슬/.test(r.label)).length, hole = pp.rows.filter(r => r.gap && !r.gap[2] && r.label.startsWith("앞판"));
    expect(borders(pp.rows).map(r => r.n)).toEqual([2 * along(R, pp.g), 2 * hole[0].gap![1] + 2 * along(hole.length, pp.g), 2 * hole[0].gap![1] + 2 * along(hole.length, pp.g)]);
    void g;
  });

  it("the other bags made of pieces: circles, a band", () => {
    let pp = planOf(starter("moonbag"));
    const N = Math.max(...pp.rows.filter(r => r.part === "panel").map(r => r.n));
    expect(borders(pp.rows)[0].n).toBe(N);
    expect(borders(pp.rows).slice(1).every(r => r.label.includes("손잡이 구멍"))).toBe(true);
    pp = planOf(starter("trapbag"));
    const W = pp.rows.filter(r => r.part === "panel" && r.label.startsWith("앞판") && !/사슬/.test(r.label)).pop()!.n, band = pp.rows.filter(r => r.part === "handle" && r.grown && !r.border);
    expect(borders(pp.rows).map(r => r.n)).toEqual([W - band[0].n + along(band.length, pp.g), W - band[0].n + along(band.length, pp.g)]);
  });

  it("every edging round is 짧은뜨기 (whatever the bag is worked in), read back in the Korean notation, in the yarn", () => {
    for (const id of ["tote", "flapbag", "panelbag", "hobo1", "ribtote", "moonbag", "trapbag", "stepbag", "phonebag", "wristlet"]) {
      for (const st of [undefined, "dc"] as const) {
        const d = { ...starter(id), ...(st ? { crochetStitch: st } : {}) }, p = { ...d, object: "bag" } as PlanInput, raw = plan(p), ko = withKorean(raw, p);
        raw.rows.forEach((r, i) => {
          if (!r.border) return;
          expect(r.how, id).toContain(`짧은뜨기 ${r.n}코`);
          expect(r.how, id).not.toContain("한길긴뜨기");
          const read = readKorean(ko.rows[i].how), where = `${id} ${r.label}: ${ko.rows[i].how}`;
          expect(read, where).not.toBeNull(); expect(read!.ok, where).toBe(true); expect(read!.total!.n, where).toBe(r.n);
          expect(countToks(rowToks(raw, p, i).toks).st, where).toBe(r.n);
        });
      }
      const d = starter(id), on = yarnUse(planOf(d), { weight: "medium" }).m, off = yarnUse(planOf({ ...d, edgeSc: undefined }), { weight: "medium" }).m;
      expect(on, id).toBeGreaterThanOrEqual(off);
    }
  });
});

describe("가장자리 글", () => {
  it("을 / 를 follows the word before it", () => {
    const words = [planOf(starter("tote")), planOf(starter("panelbag")), planOf(starter("hobo1")), planOf(starter("moonbag")), planOf(starter("ribtote"))].flatMap(pp => borders(pp.rows).map(r => r.how));
    expect(words.some(w => w.includes("둘레를 따라"))).toBe(true);
    expect(words.some(w => w.includes("안쪽을 따라"))).toBe(true);
    for (const w of words) expect(w, w).not.toMatch(/둘레을|레을 |구을|(?:쪽|선|끝)를 따라/);
  });
});
