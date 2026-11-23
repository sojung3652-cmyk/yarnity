import { describe, expect, it } from "vitest";
import { CATEGORIES, TERMS, searchTerms, termById, termForWord, termRegex } from "@/lib/glossary";

describe("glossary", () => {
  it("has every term, sorted by category order then 가나다", () => {
    expect(TERMS).toHaveLength(97);
    const order = new Map(CATEGORIES.map(c => [c.id, c.order]));
    for (let i = 1; i < TERMS.length; i++) {
      const a = TERMS[i - 1], b = TERMS[i];
      const d = order.get(a.category)! - order.get(b.category)!;
      expect(d < 0 || (d === 0 && a.name.localeCompare(b.name, "ko") <= 0)).toBe(true);
    }
  });
  it("finds by name, alias and US / UK abbreviation", () => {
    expect(searchTerms("짧은").map(t => t.id)).toContain("sc");
    expect(searchTerms("보블뜨기").map(t => t.id)).toContain("bobble");
    expect(searchTerms("sc").map(t => t.id)).toContain("sc");
    expect(searchTerms("SLST").map(t => t.id)).toContain("slst");
  });
  it("links stitch words in a pattern line, not everyday ones", () => {
    const line = "매직링에 기둥사슬 1, 짧은뜨기 6코, 첫 코에 빼뜨기 (도안 1단)";
    const words = line.match(termRegex) ?? [];
    expect(words).toEqual(["매직링", "기둥사슬", "짧은뜨기", "빼뜨기"]);
    expect(termForWord("짧은뜨기")?.id).toBe("sc");
    expect(termForWord("기둥사슬")?.id).toBe(termById("chain_turn")?.id);
  });
});
