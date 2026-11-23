import { describe, expect, it } from "vitest";
import { KNIT_STITCH, KNIT_STITCHES, knitRowText, shownPlan, withKnit } from "../lib/knit";
import { plan } from "../lib/pattern";

describe("knitting stitch patterns (lib/knit.ts)", () => {
  it("every chart repeats over its stitch multiple and row repeat", () => {
    for (const s of KNIT_STITCHES) for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) {
      expect(s.f(j, i), `${s.key} ${j},${i}`).toBe(s.f(j + s.rep * (s.rep % 2 ? 2 : 1), i + s.mult));
    }
  });
  it("writes a row as it is worked: the wrong side is the opposite of what the right side shows", () => {
    expect(knitRowText(KNIT_STITCH.stock, 0, 20)).toBe("겉면: 모두 겉뜨기 20코");
    expect(knitRowText(KNIT_STITCH.stock, 1, 20)).toBe("안면: 모두 안뜨기 20코");
    expect(knitRowText(KNIT_STITCH.garter, 1, 20)).toBe("안면: 모두 겉뜨기 20코"); // garter: knit every row
    expect(knitRowText(KNIT_STITCH.rib2, 0, 20)).toBe("겉면: 겉 2, 안 2를 끝까지 반복 (20코)");
    expect(knitRowText(KNIT_STITCH.rib2, 1, 20)).toBe("안면: 겉 2, 안 2를 끝까지 반복 (20코)");
    expect(knitRowText(KNIT_STITCH.rib2, 1, 22)).toBe("안면: 안 2, 겉 2를 끝까지 반복 (22코)"); // 22 = 4 x 5 + 2: the row ends on knit 2, so the way back starts with purl 2
    expect(knitRowText(KNIT_STITCH.seed, 0, 21)).toBe("겉면: 겉 1, 안 1을 끝까지 반복 (21코)");
  });
  it("a scarf's rows become knitting: cast on, the chart's rows, bind off; the counts stay the engine's", () => {
    const p = { object: "rows" as const, item: "scarf", stitch: "seed", weight: "medium" as const, hook: "5호", shape: "rect" as const, a: 18, b: 30, h: 0, handle: "none" as const };
    const base = plan(p), k = shownPlan(p);
    expect(k.rows.length).toBe(base.rows.length);
    expect(k.rows[0].how).toMatch(/^대바늘에 \d+코 잡기$/);
    expect(k.rows[1].how).toMatch(/^겉면: /);
    expect(k.rows[2].how).toMatch(/^안면: /);
    expect(k.rows[k.rows.length - 1].how).toMatch(/코막음$/);
    expect(k.rows.some(r => /짧은뜨기|사슬/.test(r.how))).toBe(false);
    expect(withKnit(base, {}).rows[1].how).toBe(`겉면: 모두 겉뜨기 ${base.last}코`); // no pattern picked: 메리야스
  });
  it("crochet items keep their crochet rows", () => {
    const p = { object: "rows" as const, item: "dishcloth", weight: "medium" as const, hook: "5호", shape: "rect" as const, a: 22, b: 22, h: 0, handle: "none" as const };
    expect(shownPlan(p).rows[1].how).toMatch(/짧은뜨기/);
  });
});
