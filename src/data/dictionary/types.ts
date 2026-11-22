// 뜨개 사전 (web, Kim): the dictionary's content types. Each screen reads its file here (knowhow / yarns / projects /
// trouble / tables); adding an entry to a file is all it takes for it to show (the menu's counts are the lengths).
// Entries without their full text show "준비 중" where it would be.

export type Craft = "crochet" | "knit" | "both";
export type Season = "spring" | "summer" | "autumn" | "winter";
export const SEASON_KO: Record<Season, string> = { spring: "봄", summer: "여름", autumn: "가을", winter: "겨울" };
export const CRAFT_KO: Record<Exclude<Craft, "both">, string> = { crochet: "코바늘", knit: "대바늘" };
/** the crafts as tags, in the order 코바늘 · 대바늘 */
export const craftTags = (c: Craft) => (c === "both" ? ["코바늘", "대바늘"] : [CRAFT_KO[c]]);

/** 뜨개 상식: an article */
export type KnowhowTopic = "kinds" | "tools" | "gauge" | "reading" | "finishing";
export interface Knowhow {
  id: string;
  topic: KnowhowTopic;
  /** its place in its topic (1, 2, ...) */
  order: number;
  title: string;
  summary: string;
  /** under lace subheads; none yet: "준비 중" */
  sections: { heading: string; body: string }[];
  /** a comparison: the column heads, then rows of [what, ...one cell per column] */
  table?: { cols: string[]; rows: string[][] };
  /** the next article's id (default: the next one in its topic) */
  next?: string;
}

/** 실 도감 */
export interface Yarn {
  id: string;
  name: string;
  nameEn: string;
  group: "animal" | "plant" | "synthetic" | "special";
  short: string;
  seasons: Season[];
  /** 1 to 5: 보온성, 신축성, 부드러움, 세탁 편함, 가격 */
  traits?: { warmth: number; stretch: number; softness: number; care: number; price: number };
  about?: string;
  caution?: string;
  /** a picture under /public (none: the striped empty square) */
  image?: string;
}

/** 작품별 가이드 */
export interface ProjectGuide {
  id: string;
  name: string;
  craft: Craft;
  level: "쉬움" | "보통" | "어려움";
  yarns: string;
  tip: string;
  /** the line drawing in its round badge (components/dictionary/DictArt.tsx) */
  icon: string;
  hook?: string;
  firstProject?: boolean;
  /** the longer text in its pop-up (none yet: "준비 중") */
  more?: string;
}

/** 막힐 때 */
export interface Trouble {
  id: string;
  title: string;
  craft: Craft;
  cause: string;
  /** the gold-thread drawing on its card (DictArt) */
  illustration: string;
  /** three drawings side by side in the pop-up, the one that is this trouble marked */
  compare?: { art: string; label: string; note: string; on?: boolean }[];
  why?: string;
  fixes?: string[];
}

/** 한눈에 보는 표 */
export interface DictTable {
  id: string;
  title: string;
  short: string;
  cols?: string[];
  rows?: string[][];
}
