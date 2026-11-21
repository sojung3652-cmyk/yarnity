// The crochet glossary (뜨개 용어집): lib/data/yarnity-glossary.json, as given (63 terms in 7 categories). Shown
// sorted by the category's order, then by name in 가나다 order (the data's own note). Searched by name, other
// names (aliases) and the US / UK abbreviations. The pattern's text links the words it knows (termRegex).
import data from "./data/yarnity-glossary.json";

export type GlossColor = "babypink" | "apricot" | "lilac" | "ivory" | "sage" | "sky" | "sand";
export interface GlossCategory { id: string; name: string; color: GlossColor; order: number }
export interface GlossStep { text: string; image: string | null }
export interface GlossTerm {
  id: string; category: string; name: string; aliases: string[];
  en: { us: string | null; uk: string | null }; ja: string | null;
  symbol: string | null; summary: string; difficulty: number;
  steps: GlossStep[]; mistake: string | null; related: string[];
  verified: string; sources: string[]; note: string | null;
}

export const CATEGORIES = [...(data.categories as GlossCategory[])].sort((a, b) => a.order - b.order);
const CAT = new Map(CATEGORIES.map(c => [c.id, c]));
export const categoryOf = (t: GlossTerm) => CAT.get(t.category)!;
export const colorOf = (t: GlossTerm): GlossColor => categoryOf(t)?.color ?? "ivory";

const ko = new Intl.Collator("ko");
export const TERMS: GlossTerm[] = [...(data.terms as GlossTerm[])].sort((a, b) =>
  (CAT.get(a.category)?.order ?? 99) - (CAT.get(b.category)?.order ?? 99) || ko.compare(a.name, b.name));
const BY_ID = new Map(TERMS.map(t => [t.id, t]));
export const termById = (id: string) => BY_ID.get(id) ?? null;

export const DIFFICULTY = ["", "쉬움", "보통", "어려움"];

/** the first sentence of the summary: the line under the name */
export const shortLine = (t: GlossTerm) => (t.summary.match(/^.+?[.!?。요](?=\s|$)/)?.[0] ?? t.summary).trim();

/** search by name, aliases, US / UK abbreviations (spaces and case ignored) */
export function searchTerms(q: string, list: GlossTerm[] = TERMS) {
  const w = q.replace(/\s+/g, "").toLowerCase();
  if (!w) return list;
  const has = (s: string | null | undefined) => !!s && s.replace(/\s+/g, "").toLowerCase().includes(w);
  return list.filter(t => has(t.name) || t.aliases.some(has) || has(t.en.us) || has(t.en.uk));
}

/** Korean words in a pattern's text that name a term (its name or an alias), longest first so "짧은뜨기 2코
 *  늘려뜨기" is not cut at "짧은뜨기" when it is a term of its own. Only words of 2+ Hangul characters; the
 *  symbols-only aliases ("*…*") are left out. Only the stitches and how to start and finish (기본 뜨기,
 *  늘림·줄임, 시작·마무리): words like 도안 or 단 are in every pattern line and would underline everything. */
const LINKED = new Set(["basic", "incdec", "start"]);
const WORDS: [string, string][] = TERMS.filter(t => LINKED.has(t.category)).flatMap(t => [t.name, ...t.aliases].filter(w => /^[가-힣][가-힣 ]*[가-힣]$/.test(w)).map(w => [w, t.id] as [string, string]))
  .sort((a, b) => b[0].length - a[0].length);
const WORD_ID = new Map(WORDS);
export const termRegex = new RegExp(`(${WORDS.map(([w]) => w.replace(/ /g, "\\s?")).join("|")})`, "g");
export const termForWord = (w: string) => { const id = WORD_ID.get(w) ?? WORD_ID.get(w.replace(/\s/g, "")); return id ? termById(id) : null; };
