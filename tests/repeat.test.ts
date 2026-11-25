import { describe, expect, it } from "vitest";
import { CHART_MULT, type ChartKey } from "@/lib/crochetChart";
import { KNIT_STITCH } from "@/lib/knit";
import { dots, fitCount, fitNote, gauge, HOOKS, plan, pliedMm, pliesOf, repOf, snapSize, withChains, type PlanInput } from "@/lib/pattern";
import { MATERIALS, yarnWeightText } from "@/lib/yarn";
import { PATTERN_BY_ID, STITCH_PATTERNS } from "@/lib/stitchPatterns";

// A stitch pattern's repeat as numbers (Kim: `mult` in words, `rep` to reckon with), and the counts fitted to it.

describe("rep says what mult says", () => {
  it("the multiple, the edge stitches and the row repeat written in words are the numbers", () => {
    for (const p of STITCH_PATTERNS) {
      const n = p.mult.match(/(\d+)코 배수/), plus = p.mult.match(/\+\s*(\d+)/), rows = p.mult.match(/· (\d+)단(?: 반복)?$/);
      if (n) expect(p.rep?.n, p.id).toBe(Number(n[1]));
      if (plus) expect(p.rep?.plus, p.id).toBe(Number(plus[1]));
      if (rows && p.rep) expect(p.rep.rows, p.id).toBe(Number(rows[1]));
      if (/^아무 코 수/.test(p.mult)) expect(p.rep?.n, p.id).toBe(1);
      // no fixed multiple in the words: none in the numbers
      if (/^(—|도안마다 다름|무늬마다 다름|차트대로)/.test(p.mult) && !p.draw?.startsWith("ch:")) expect(p.rep, p.id).toBeUndefined();
    }
  });
  it("a pattern written from a chart repeats as its chart does", () => {
    for (const p of STITCH_PATTERNS) {
      const [k, v] = (p.draw ?? ":").split(":");
      if (k === "kn" && p.rep) { expect(p.rep.n, p.id).toBe(KNIT_STITCH[v].mult); expect(p.rep.rows % KNIT_STITCH[v].rep, p.id).toBe(0); }
      if (k === "ch") expect([p.rep?.n, p.rep?.plus], p.id).toEqual(CHART_MULT[v as ChartKey]);
    }
  });
  it("every rep is whole numbers, the edge stitches fewer than a repeat", () => {
    for (const p of STITCH_PATTERNS) if (p.rep) {
      expect(Number.isInteger(p.rep.n) && p.rep.n >= 1 && Number.isInteger(p.rep.rows) && p.rep.rows >= 1, p.id).toBe(true);
      expect(p.rep.plus >= 0 && (p.rep.plus < p.rep.n || p.rep.n === 1 && p.rep.plus === 0), p.id).toBe(true);
    }
  });
});

describe("fitCount", () => {
  it("the nearest count the repeat allows: n x k in the round, n x k + plus back and forth", () => {
    const shell = PATTERN_BY_ID.c43.rep!; // 6 + 1
    expect(fitCount(78, shell, false)).toBe(78);
    expect(fitCount(80, shell, false)).toBe(78);
    expect(fitCount(82, shell, false)).toBe(84);
    expect(fitCount(40, shell, true)).toBe(43);   // 6 x 7 + 1
    expect(fitCount(38, shell, true)).toBe(37);   // 6 x 6 + 1
    expect(fitCount(2, shell, true)).toBe(7);     // never less than one repeat
    expect(fitCount(41, null, true)).toBe(41);
    expect(fitCount(41, { n: 1, plus: 0, rows: 2 }, true)).toBe(41);
  });
  it("kept within what the round before allows", () => {
    expect(fitCount(18, { n: 14, plus: 0, rows: 1 }, false, 12, 24)).toBe(14);
    expect(fitCount(18, { n: 14, plus: 0, rows: 1 }, false, 15, 30)).toBe(28);
  });
});

const base = { hook: "5호", weight: "medium", handle: "none" as const };
const PICKS: Partial<PlanInput>[] = [
  { pattern: "c12", crochetChart: "moss" }, { pattern: "c44", crochetChart: "shell" }, { pattern: "c45", crochetChart: "vst" }, { pattern: "c48", crochetChart: "net" },
  { crochetChart: "mesh" }, { pattern: "c43" }, { pattern: "c13" }, { pattern: "c17" }, { pattern: "c31" }, { pattern: "c32" }, { pattern: "c34" }, { pattern: "c53" },
];
const sizes: [number, number][] = [[6, 4], [10, 6], [15, 10], [18, 6], [22.5, 14.5], [31, 12]];

describe("a bag's body in a stitch pattern", () => {
  const cases: PlanInput[] = [];
  for (const shape of ["circle", "oval", "rect"] as const) for (const [hook] of HOOKS) for (const [a, b] of sizes) for (const h of [3, 12, 25]) for (const pick of PICKS)
    for (const gusset of shape === "circle" ? [undefined] : [undefined, "flat" as const])
      cases.push({ ...base, shape, hook, a, b, h, object: "bag", ...pick, ...(gusset ? { gusset } : {}) });

  it(`one round is a whole number of repeats, fitted in the bottom's last round, for ${cases.length} bags`, () => {
    for (const c of cases) {
      const pp = plan(c), rep = repOf(c)!, tag = JSON.stringify(c), bottom = pp.rows.filter(r => r.part === "bottom"), body = pp.rows.filter(r => r.part === "body");
      expect(rep.n > 1, tag).toBe(true);
      expect(pp.last % rep.n, tag).toBe(0);
      // the body never increases (Kim): every round is the bottom's last round
      for (const r of body) { expect(r.n, tag).toBe(pp.last); expect(r.inc, tag).toBe(0); }
      // the bottom only grows, and only its last round was changed
      for (let i = 1; i < bottom.length; i++) expect(bottom[i].n >= bottom[i - 1].n, tag).toBe(true);
      const plain = plan({ ...c, pattern: null, crochetChart: null });
      if (c.gusset !== "flat") expect(bottom.slice(0, -1).map(r => r.n), tag).toEqual(plain.rows.filter(r => r.part === "bottom").slice(0, -1).map(r => r.n));
      expect(bottom[bottom.length - 1].n, tag).toBe(pp.last);
      for (const r of pp.rows.filter(x => x.part === "rim")) expect(r.n, tag).toBe(pp.last);
      // the note: there when the count moved, and it says the count the plan has
      const moved = plain.last !== pp.last;
      expect(!!pp.fit, tag).toBe(moved);
      if (pp.fit) { expect([pp.fit.from, pp.fit.to], tag).toEqual([plain.last, pp.last]); expect(fitNote(pp.fit), tag).toContain(`한 바퀴를 ${pp.last}코로 맞췄습니다`); }
      else expect(fitNote(pp.fit)).toBeNull();
    }
  }, 30_000);

  it("the nearest multiple: a fitted round is never further than half a repeat from the size's own (a square bottom's corners aside)", () => {
    for (const c of cases.filter(x => x.shape === "circle")) { const pp = plan(c), rep = repOf(c)!; if (pp.fit) expect(Math.abs(pp.fit.to - pp.fit.from) <= rep.n / 2, JSON.stringify(c)).toBe(true); }
  });

  it("circle 15cm, 그물뜨기 (4코): 78 -> 80, the last round takes 8 increases instead of 6", () => {
    const pp = plan({ ...base, shape: "circle", a: 15, h: 15, object: "bag", pattern: "c48", crochetChart: "net" });
    const bottom = pp.rows.filter(r => r.part === "bottom"), lastRow = bottom[bottom.length - 1];
    expect([bottom.length, lastRow.n, lastRow.inc, pp.last]).toEqual([13, 80, 8, 80]);
    expect(pp.fit).toMatchObject({ n: 4, from: 78, to: 80, of: "width", flat: false });
    expect(fitNote(pp.fit)).toBe("무늬가 맞도록 한 바퀴를 80코로 맞췄습니다. 너비가 약 0.4cm 달라집니다.");
    // the stitch map marks as many increases as the round has
    const ds = dots(pp, "circle", 13);
    expect(ds[12].pts.length).toBe(80); expect(ds[12].pts.filter(d => d.inc).length).toBe(8);
    expect(ds[11].pts.filter(d => d.inc).length).toBe(6);
  });

  it("조개 무늬 (c43): 6코 단위, written as shell rounds, the staggered rounds begin with half a shell", () => {
    const pp = withChains(plan({ ...base, shape: "circle", a: 16, h: 12, object: "bag", pattern: "c43" }));
    const wall = pp.rows.filter(r => r.wall);
    expect(pp.last % 6).toBe(0); expect(wall.length).toBeGreaterThan(2);
    expect(wall[0].how.startsWith("기둥사슬 1, (짧은뜨기 1, 2코 건너뛰고 한 코에 한길긴뜨기 5")).toBe(true);
    expect(wall[1].how.startsWith("사슬 3(한길긴뜨기 1코로 셉니다), 같은 코에 한길긴뜨기 2")).toBe(true);
    expect(wall[1].how.endsWith("처음 코에 한길긴뜨기 2, 사슬 3의 3번째 코에 빼뜨기")).toBe(true);
    expect(wall[2].how.startsWith("기둥사슬 1, (부채 가운데에 짧은뜨기 1")).toBe(true);
    // no round walks the seam sideways any more, and none says its chain or its closing twice
    for (const r of pp.rows) { expect(r.how).not.toMatch(/옮겨 기둥사슬/); expect(r.how).not.toMatch(/기둥사슬 \d, 기둥사슬/); expect(r.how).not.toMatch(/빼뜨기, 첫 코에 빼뜨기/); }
  });

  it("a shaped body in a pattern widens by whole repeats", () => {
    const pp = plan({ ...base, shape: "circle", a: 14, h: 16, object: "bag", pattern: "c17", topA: 20 });
    for (const r of pp.rows.filter(x => x.part === "body")) expect(r.n % 3).toBe(0);
  });

  it("a knit pattern does not move a crocheted bag, nor a pattern left behind by another stitch", () => {
    const bag = { ...base, shape: "circle" as const, a: 15, h: 15, object: "bag" as const };
    expect(plan({ ...bag, pattern: "k95", craft: "knit" })).toEqual(plan(bag));
    expect(plan({ ...bag, pattern: "c43", crochetStitch: "dc" }).fit).toBeUndefined();
    expect(repOf({ ...bag, pattern: "c2" })).toBeNull();
  });
});

describe("flat pieces and tubes in a stitch pattern", () => {
  it("back and forth: n x k + plus; in the round: n x k", () => {
    for (const [hook] of HOOKS) for (const a of [9, 18, 22, 33.5, 80]) for (const id of ["c13", "c31", "c34", "c43", "c47", "c53", "c12"]) {
      const rep = PATTERN_BY_ID[id].rep!, pick = PATTERN_BY_ID[id].draw!.startsWith("ch:") ? { pattern: id, crochetChart: PATTERN_BY_ID[id].draw!.slice(3) as ChartKey } : { pattern: id };
      const rows = plan({ ...base, hook, shape: "rect", a, b: 20, object: "rows", item: "dishcloth", ...pick }), plain = plan({ ...base, hook, shape: "rect", a, b: 20, object: "rows", item: "dishcloth" });
      expect((rows.last - rep.plus) % rep.n, `${id} ${hook} ${a}`).toBe(0);
      expect(Math.abs(rows.last - plain.last) <= rep.n / 2 || plain.last < rep.n + rep.plus, `${id} ${hook} ${a}`).toBe(true);
      expect(rows.rows[0].n).toBe(rows.last + 1);
      expect(rows.rows.length).toBe(plain.rows.length); // the rows are the length's, not the pattern's
      const tube = plan({ ...base, hook, shape: "circle", a: a + 30, h: 20, object: "tube", item: "neckwarmer", ...pick });
      expect(tube.last % rep.n, `${id} ${hook} ${a}`).toBe(0);
      for (const r of tube.rows) expect(r.n).toBe(tube.last);
    }
  });
  it("a knitted scarf: 2×2 고무 on a multiple of 4, 멍석 on an odd count, the note says a row", () => {
    const scarf = { ...base, shape: "rect" as const, a: 18.4, b: 150, object: "rows" as const, item: "scarf" };
    expect(plan({ ...scarf, stitch: "rib2", pattern: "k91" }).last % 4).toBe(0);
    expect(plan({ ...scarf, stitch: "seed" }).last % 2).toBe(1);
    const pp = plan({ ...scarf, stitch: "basket" }), plain = plan({ ...scarf, stitch: "stock" });
    expect(pp.last % 8).toBe(0);
    if (pp.fit) { expect(pp.fit.flat).toBe(true); expect(fitNote(pp.fit)).toBe(`무늬가 맞도록 한 단을 ${pp.last}코로 맞췄습니다. 너비가 약 ${Math.abs(pp.fit.cm)}cm 달라집니다.`); }
    expect(plain.fit).toBeUndefined();
    // the knit chart in use decides, not a pattern picked before it
    expect(plan({ ...scarf, stitch: "rib1", pattern: "k95" }).last % 2).toBe(0);
  });
  it("a tube's note speaks of its circumference", () => {
    const pp = plan({ ...base, shape: "circle", a: 61, h: 25, object: "tube", item: "neckwarmer", pattern: "c32" });
    expect(pp.last % 8).toBe(0);
    if (pp.fit) expect(fitNote(pp.fit)).toMatch(/^무늬가 맞도록 한 바퀴를 \d+코로 맞췄습니다\. 둘레가 약 [\d.]+cm 달라집니다\.$/);
  });
});

describe("held strands (메탈사 합사)", () => {
  const p: PlanInput = { ...base, shape: "circle", a: 15, object: "coaster", materials: ["메탈사"] };
  it("one strand, or none said: the gauge as it was; two and three thicken it", () => {
    expect(gauge({ ...p, plies: 1 }).h).toBe(gauge(p).h);
    expect(gauge({ ...p, plies: null }).h).toBe(gauge(p).h);
    expect(gauge({ ...p, plies: 2 }).h).toBeCloseTo(gauge(p).h * 1.1, 10);
    expect(gauge({ ...p, plies: 3 }).h).toBeCloseTo(gauge(p).h * 1.16, 10);
    expect(plan({ ...p, plies: 3 }).rows.length).toBeLessThan(plan(p).rows.length);
  });
  it("the strands are 메탈사's: a number left behind by another yarn does nothing (메탈릭 was its name before)", () => {
    expect(gauge({ ...p, materials: ["코튼"], plies: 3 }).h).toBe(gauge(p).h);
    expect(gauge({ ...p, materials: undefined, plies: 3 }).h).toBe(gauge(p).h);
    expect(gauge({ ...p, materials: ["울", "메탈릭"], plies: 2 }).h).toBeCloseTo(gauge(p).h * 1.1, 10);
    expect([pliesOf({ materials: ["메탈사"], plies: 3 }), pliesOf({ materials: ["메탈사"] }), pliesOf({ materials: ["코튼"], plies: 3 })]).toEqual([3, 1, 1]);
    expect(MATERIALS).toContain("메탈사"); expect(MATERIALS).not.toContain("메탈릭");
    expect(yarnWeightText({ yarnMm: 1, weight: "thin", materials: ["메탈사"], plies: 2 })).toBe("1mm (가는 실) · 2줄 합사");
    expect(yarnWeightText({ yarnMm: 1, weight: "thin", materials: ["코튼"], plies: 2 })).toBe("1mm (가는 실)");
  });
  it("a measured gauge is the hand's own, whatever the strands", () => {
    expect(gauge({ ...p, plies: 3, measuredH: .6 }).h).toBe(.6);
  });
  it("strands held together are a yarn sqrt(strands) as thick", () => {
    expect([pliedMm(1, 1), pliedMm(1, 2), pliedMm(1, 3), pliedMm(2.5, 2)]).toEqual([1, 1.4, 1.7, 3.5]);
  });
});

describe("sizes that hold whole repeats (the sliders and the size frame)", () => {
  it("a flat piece: the width a repeat at a time, the length a set of the pattern's rows at a time", () => {
    for (const [hook] of HOOKS) for (const id of ["c13", "c31", "c34", "c43", "c30", "c32"]) {
      const rep = PATTERN_BY_ID[id].rep!, p: PlanInput = { ...base, hook, shape: "rect", a: 20, b: 30, object: "rows", item: "dishcloth", pattern: id };
      let prevN = 0, prevR = 0;
      for (let v = 8; v <= 60; v += .5) {
        const a = snapSize(p, "a", v)!, pp = plan({ ...p, a });
        expect(pp.fit, `${id} ${hook} ${v} -> ${a}`).toBeUndefined();          // the size's own count is the pattern's
        expect((pp.last - rep.plus) % rep.n).toBe(0);
        expect(snapSize(p, "a", a)).toBe(a);                                    // a stop is a stop
        if (prevN && pp.last !== prevN) expect(pp.last - prevN, `${id} ${hook} ${v}`).toBe(rep.n);   // one repeat at a time
        prevN = pp.last;
        if (rep.rows > 1) {
          const b = snapSize(p, "b", v)!, rows = plan({ ...p, b }).bodyRows;
          expect(rows % rep.rows, `${id} ${hook} ${v} -> ${b}`).toBe(0);
          if (prevR && rows !== prevR) expect(rows - prevR).toBe(rep.rows);
          prevR = rows;
        } else expect(snapSize(p, "b", v)).toBeNull();
      }
    }
  });
  it("plain stitches stay free, and so do a drawn piece and a pattern with no fixed repeat", () => {
    const p: PlanInput = { ...base, shape: "rect", a: 20, b: 30, object: "rows", item: "dishcloth" };
    for (const key of ["a", "b", "h"] as const) {
      expect(snapSize(p, key, 17.5)).toBeNull();
      expect(snapSize({ ...p, crochetStitch: "dc", pattern: "c4" }, key, 17.5)).toBeNull();
      expect(snapSize({ ...p, pattern: "c57" }, key, 17.5)).toBeNull();
      expect(snapSize({ ...base, shape: "circle", a: 15, h: 15, object: "bag" }, key, 17.5)).toBeNull();
    }
    expect(snapSize({ ...base, shape: "circle", a: 15, object: "coaster", pattern: "c43" }, "a", 17.5)).toBeNull();
  });
  it("a tube: the circumference a repeat at a time", () => {
    const p: PlanInput = { ...base, shape: "circle", a: 60, h: 25, object: "tube", item: "neckwarmer", pattern: "c32" };
    let prev = 0;
    for (let v = 40; v <= 90; v += .5) { const a = snapSize(p, "a", v)!, pp = plan({ ...p, a }); expect(pp.fit).toBeUndefined(); expect(pp.last % 8).toBe(0); if (prev && pp.last !== prev) expect(pp.last - prev).toBe(8); prev = pp.last; }
    expect(plan({ ...p, h: snapSize(p, "h", 23.3)! }).bodyRows % 8).toBe(0);
  });
  it("a bag: the bottom a round (or a repeat) at a time, the body whole sets of the pattern's rounds", () => {
    for (const [hook] of HOOKS) for (const pick of PICKS) {
      const circle: PlanInput = { ...base, hook, shape: "circle", a: 15, h: 15, object: "bag", ...pick }, rep = repOf(circle)!;
      for (let v = 6; v <= 40; v += .5) {
        const a = snapSize(circle, "a", v)!, pp = plan({ ...circle, a });
        expect(pp.last % rep.n).toBe(0); expect(snapSize(circle, "a", a), `${JSON.stringify(pick)} ${hook} ${v}`).toBe(a);
        const h = snapSize(circle, "h", v), walls = h == null ? [] : plan({ ...circle, h }).rows.filter(r => r.wall);
        if (pick.crochetChart || pick.pattern === "c43") { expect(h).not.toBeNull(); expect(walls.length % rep.rows, `${JSON.stringify(pick)} ${hook} ${v} -> ${h}`).toBe(0); }
      }
      for (const shape of ["oval", "rect"] as const) for (const gusset of [undefined, "flat" as const]) {
        const p: PlanInput = { ...base, hook, shape, a: 20, b: gusset ? 1.5 : 8, h: 12, object: "bag", ...pick, ...(gusset ? { gusset } : {}) };
        let prev = 0;
        for (let v = 12; v <= 40; v += .5) {
          const a = snapSize(p, "a", v)!, pp = plan({ ...p, a }), tag = `${shape} ${gusset} ${JSON.stringify(pick)} ${hook} ${v} -> ${a}`;
          // the bottom ends on the multiple by itself - or, its round being always even, one stitch off an odd one
          // (an odd repeat's odd multiple), which its last round takes up
          expect(Math.abs((pp.fit?.to ?? 0) - (pp.fit?.from ?? 0)) <= (rep.n % 2 && !gusset ? 1 : 0), tag).toBe(true);
          expect(pp.last % rep.n, tag).toBe(0);
          // (whole repeats at a time: one, or with a small stitch two when the slider's own half-centimetre step passes a stop)
          if (prev && pp.last !== prev) { const unit = gusset && rep.n % 2 ? rep.n * 2 : rep.n; expect((pp.last - prev) % unit, tag).toBe(0); expect(pp.last - prev <= unit * 2, tag).toBe(true); }
          prev = pp.last;
        }
      }
    }
  });
});
