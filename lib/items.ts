// The things you can make, as data. Each item maps onto one engine path (lib/pattern ObjectKind):
//   flat-round -> "coaster" (round / oval / rect bottom only)
//   base-body  -> "bag"     (bottom + body + rim, handle only where the item has one)
//   flat-rows  -> "rows"    (flat piece back and forth)       a = width, b = length
//   tube       -> "tube"    (ring in the round, no bottom)    a = circumference, h = height
// Inputs: "a" / "b" / "h" go to the engine as they are; the beanie's "circ" / "depth" are converted
// (crown = round bottom, diameter = circumference / pi x 0.95; body = depth - crown radius).
import type { Handle, ObjectKind, Shape } from "./pattern";
import { DEFAULT_DRAFT, type Draft } from "./types";

export type ItemKind = "flat-round" | "base-body" | "flat-rows" | "tube";
export type ItemId =
  | "coaster" | "scrubber" | "trivet" | "placemat" | "rug"
  | "basket" | "planter" | "pencil" | "cupholder"
  | "minibag" | "bucket" | "pouch"
  | "scarf" | "neckwarmer" | "headband"
  | "dishcloth" | "bookmark" | "blanket" | "beanie";
export type FieldKey = "a" | "b" | "h" | "circ" | "depth";
export interface Field { key: FieldKey; label: string; min: number; max: number }

export interface Item {
  id: ItemId; name: string; group: string; kind: ItemKind;
  shapes?: Shape[];          // flat-round / base-body
  square?: boolean;          // a rect bottom is a square: one size field (a = b)
  handles?: boolean;         // offers the handle chips (and the bag options: wider opening, flap)
  defaults: { shape?: Shape; a: number; b?: number; h?: number; handle?: Handle; handleCm?: number; circ?: number; depth?: number };
  ovalDefault?: { a: number; b: number }; // a second size when switching a round item to oval
  range: Partial<Record<FieldKey, [number, number]>>;
  desc: string; level: "쉬움" | "보통"; time: string; method: string;
  note?: string; beta?: boolean;
}

export const GROUPS = ["납작한 것", "담는 것", "가방", "두르는 것", "그 밖에"] as const;

export const ITEMS: Item[] = [
  // ---- 납작한 것 (flat-round) ----
  { id: "coaster", name: "코스터", group: "납작한 것", kind: "flat-round", shapes: ["circle", "rect"], square: true, defaults: { shape: "circle", a: 10 }, range: { a: [6, 15] },
    desc: "컵 아래 두는 작은 받침", level: "쉬움", time: "1~2시간", method: "바닥만 둥글게" },
  { id: "scrubber", name: "수세미", group: "납작한 것", kind: "flat-round", shapes: ["circle", "rect"], square: true, defaults: { shape: "circle", a: 11 }, range: { a: [8, 15] },
    desc: "설거지할 때 쓰는 도톰한 수세미", level: "쉬움", time: "1~2시간", method: "바닥만 둥글게" },
  { id: "trivet", name: "냄비받침", group: "납작한 것", kind: "flat-round", shapes: ["circle", "rect"], square: true, defaults: { shape: "circle", a: 18 }, range: { a: [14, 25] },
    desc: "뜨거운 냄비를 올려 두는 받침", level: "쉬움", time: "2~3시간", method: "바닥만 둥글게" },
  { id: "placemat", name: "테이블 매트", group: "납작한 것", kind: "flat-round", shapes: ["oval", "rect"], defaults: { shape: "oval", a: 40, b: 30 }, range: { a: [25, 60], b: [20, 45] },
    desc: "접시 아래 까는 식탁 매트", level: "보통", time: "반나절", method: "가운데 사슬에서 바깥으로" },
  { id: "rug", name: "러그", group: "납작한 것", kind: "flat-round", shapes: ["circle", "oval"], defaults: { shape: "circle", a: 60 }, ovalDefault: { a: 90, b: 60 }, range: { a: [40, 120], b: [30, 90] },
    desc: "바닥에 까는 작은 러그", level: "보통", time: "주말 이틀", method: "바닥만 크게", note: "굵은 실을 추천합니다." },
  // ---- 담는 것 (base-body, no handle) ----
  { id: "basket", name: "바구니", group: "담는 것", kind: "base-body", shapes: ["circle", "oval", "rect"], defaults: { shape: "circle", a: 18, b: 12, h: 12, handle: "none" }, range: { a: [10, 35], b: [8, 30], h: [5, 30] },
    desc: "자잘한 물건을 담는 바구니", level: "보통", time: "하루", method: "바닥 → 몸통" },
  { id: "planter", name: "화분 커버", group: "담는 것", kind: "base-body", shapes: ["circle"], defaults: { shape: "circle", a: 14, h: 13, handle: "none" }, range: { a: [8, 25], h: [8, 25] },
    desc: "화분을 감싸는 커버", level: "쉬움", time: "반나절", method: "원형 바닥 → 몸통" },
  { id: "pencil", name: "연필꽂이", group: "담는 것", kind: "base-body", shapes: ["circle"], defaults: { shape: "circle", a: 8, h: 10, handle: "none" }, range: { a: [6, 12], h: [8, 15] },
    desc: "책상 위 연필꽂이", level: "쉬움", time: "두세 시간", method: "원형 바닥 → 몸통" },
  { id: "cupholder", name: "컵 홀더", group: "담는 것", kind: "base-body", shapes: ["circle"], defaults: { shape: "circle", a: 7.5, h: 9, handle: "none" }, range: { a: [6, 10], h: [6, 12] },
    desc: "컵을 감싸는 홀더", level: "쉬움", time: "한두 시간", method: "원형 바닥 → 몸통" },
  // ---- 가방 (base-body) ----
  { id: "minibag", name: "미니 손가방", group: "가방", kind: "base-body", shapes: ["circle", "oval", "rect"], handles: true, defaults: { shape: "circle", a: 15, b: 10, h: 15, handle: "short", handleCm: 50 }, range: { a: [4, 40], b: [4, 30], h: [2, 40] },
    desc: "주말 하루면 완성하는 작은 손가방", level: "보통", time: "주말 하루", method: "바닥 → 몸통 → 손잡이" },
  { id: "bucket", name: "버킷백", group: "가방", kind: "base-body", shapes: ["circle"], handles: true, defaults: { shape: "circle", a: 16, h: 20, handle: "long", handleCm: 70 }, range: { a: [12, 25], h: [12, 30] },
    desc: "깊고 둥근 어깨 가방", level: "보통", time: "주말 하루", method: "원형 바닥 → 몸통 → 손잡이" },
  { id: "pouch", name: "파우치", group: "가방", kind: "base-body", shapes: ["oval", "rect"], defaults: { shape: "oval", a: 18, b: 6, h: 12, handle: "none" }, range: { a: [12, 25], b: [4, 10], h: [8, 20] },
    desc: "작은 물건을 넣는 납작한 파우치", level: "보통", time: "반나절", method: "타원 바닥 → 몸통" },
  // ---- 두르는 것 ----
  { id: "scarf", name: "목도리", group: "두르는 것", kind: "flat-rows", defaults: { a: 18, b: 150 }, range: { a: [10, 40], b: [80, 220] },
    desc: "길게 왕복으로 뜨는 목도리", level: "쉬움", time: "일주일", method: "사슬 → 왕복뜨기" },
  { id: "neckwarmer", name: "넥워머", group: "두르는 것", kind: "tube", defaults: { a: 60, h: 25 }, range: { a: [45, 80], h: [15, 35] },
    desc: "목에 쏙 끼우는 통 모양 워머", level: "쉬움", time: "하루", method: "사슬 고리 → 둘레뜨기" },
  { id: "headband", name: "헤어밴드", group: "두르는 것", kind: "tube", defaults: { a: 52, h: 8 }, range: { a: [44, 60], h: [4, 12] },
    desc: "머리 둘레의 약 93%로 뜨는 밴드", level: "쉬움", time: "두세 시간", method: "사슬 고리 → 둘레뜨기" },
  // ---- 그 밖에 ----
  { id: "dishcloth", name: "행주", group: "그 밖에", kind: "flat-rows", defaults: { a: 22, b: 22 }, range: { a: [15, 35], b: [15, 35] },
    desc: "도톰한 면사 행주", level: "쉬움", time: "두세 시간", method: "사슬 → 왕복뜨기" },
  { id: "bookmark", name: "책갈피", group: "그 밖에", kind: "flat-rows", defaults: { a: 4, b: 16 }, range: { a: [3, 8], b: [10, 25] },
    desc: "책 사이에 끼우는 얇은 책갈피", level: "쉬움", time: "한 시간", method: "사슬 → 왕복뜨기" },
  { id: "blanket", name: "담요", group: "그 밖에", kind: "flat-rows", defaults: { a: 80, b: 100 }, range: { a: [50, 150], b: [60, 200] },
    desc: "무릎에 덮는 담요", level: "보통", time: "한 달", method: "사슬 → 왕복뜨기" },
  { id: "beanie", name: "비니", group: "그 밖에", kind: "base-body", shapes: ["circle"], beta: true, defaults: { shape: "circle", a: 0, h: 0, handle: "none", circ: 56, depth: 20 }, range: { circ: [44, 62], depth: [15, 26] },
    desc: "정수리부터 둥글게 뜨는 모자", level: "보통", time: "주말 하루", method: "정수리(원형) → 몸통", note: "베타: 정수리가 평평하게 나올 수 있습니다." },
];

/** Handle lengths offered for bags (cm): carried in the hand, on the shoulder, across the body. */
export const HANDLE_PRESETS: [string, number][] = [["토트", 50], ["숄더", 70], ["크로스", 120]];

export const ITEM: Record<ItemId, Item> = Object.fromEntries(ITEMS.map(i => [i.id, i])) as Record<ItemId, Item>;
export const ENGINE: Record<ItemKind, ObjectKind> = { "flat-round": "coaster", "base-body": "bag", "flat-rows": "rows", tube: "tube" };

/** A new, empty draft (the mini bag with its tote handle): 새 도안 만들기, or leaving without saving. */
export const freshDraft = (): Draft => ({ ...DEFAULT_DRAFT, item: "minibag", handleCm: ITEM.minibag.defaults.handleCm ?? null });

/** Old saved works have no item: a bag was the mini bag, a coaster the coaster. */
export const itemIdOf = (p: { item?: string; object: ObjectKind }): ItemId =>
  p.item && p.item in ITEM ? (p.item as ItemId) : p.object === "bag" ? "minibag" : "coaster";

/** The input fields of an item for a bottom shape, with their labels and ranges. */
export function fieldsFor(item: Item, shape: Shape): Field[] {
  const r = (k: FieldKey): [number, number] => item.range[k] as [number, number];
  const f = (key: FieldKey, label: string): Field => ({ key, label, min: r(key)[0], max: r(key)[1] });
  switch (item.kind) {
    case "flat-rows": return [f("a", "폭 (cm)"), f("b", "길이 (cm)")];
    case "tube": return [f("a", "둘레 (cm)"), f("h", item.id === "headband" ? "폭 (cm)" : "높이 (cm)")];
    case "flat-round":
      if (shape === "circle") return [f("a", "지름 (cm)")];
      if (item.square) return [f("a", "한 변 (cm)")];
      return [f("a", "가로 (cm)"), f("b", "세로 (cm)")];
    case "base-body":
      if (item.id === "beanie") return [f("circ", "머리 둘레 (cm)"), f("depth", "깊이 (cm)")];
      return [...(shape === "circle" ? [f("a", "바닥 지름 (cm)")] : [f("a", "바닥 가로 (cm)"), f("b", "바닥 세로 (cm)")]), f("h", "높이 (cm)")];
  }
}

/** Engine dimensions from the item's inputs. */
export function engineDims(item: Item, v: { shape: Shape; a: number; b: number; h: number; circ?: number; depth?: number }) {
  if (item.id === "beanie") {
    const circ = v.circ ?? 56, depth = v.depth ?? 20, a = Math.round((circ / Math.PI) * 0.95 * 10) / 10;
    return { shape: "circle" as Shape, a, b: a, h: Math.max(2, Math.round((depth - a / 2) * 10) / 10) };
  }
  if (item.kind === "flat-round" && item.square && v.shape === "rect") return { shape: v.shape, a: v.a, b: v.a, h: v.h };
  return { shape: v.shape, a: v.a, b: v.b, h: v.h };
}
