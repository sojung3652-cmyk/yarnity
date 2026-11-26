// 기본형 (Kim: 파우치, 가방, 코스터 같은 걸 누르면 프로토타입을 먼저 주고 사용자가 고쳐 나가기) - an option beside
// writing it in words and drawing it: a ready piece comes up at once, every part then changed in 모양. Bags and
// pouches come in a few kinds; every other piece starts from its own defaults.
import { ENGINE, ITEM, ITEMS, type ItemId } from "./items";
import type { Draft } from "./types";

export type Proto = { id: string; group: string; name: string; note: string; item: ItemId; over?: Partial<Draft> };

const KINDS: Proto[] = [
  { id: "tote", group: "가방", name: "토트백", note: "네모 · 손잡이 2개", item: "minibag", over: { shape: "rect", a: 26, b: 9, h: 22, handle: "short", handleCm: 50, handleCount: 2, gusset: "box" } },
  { id: "shoulder", group: "가방", name: "숄더백", note: "타원 · 어깨끈", item: "minibag", over: { shape: "oval", a: 24, b: 8, h: 18, handle: "long", handleCm: 100, handleCount: 1 } },
  // (Kim: 호보백 - its handle is the body itself going on up, lib/pattern grownHandle)
  { id: "hobo", group: "가방", name: "호보백", note: "타원 · 이어 뜨는 손잡이", item: "minibag", over: { shape: "oval", a: 28, b: 10, h: 18, handle: "short", handleKind: "grown", handleCount: 1, handleCm: 56, handleWcm: 3 } },
  // (Kim: 구조 원리 - lib/structure) two panels with a strip that is the sides, the bottom and the handle; a panel whose ends go on up as the strap
  { id: "panelbag", group: "가방", name: "판 + 띠 가방", note: "판 2장 · 띠가 옆과 바닥", item: "minibag", over: { shape: "rect", build: "panels", a: 24, h: 20, corner: .35, stripCm: 6, stripHandle: true, handle: "short", handleCm: 50 } },
  { id: "hobo1", group: "가방", name: "판 하나 호보백", note: "양 끝 기둥이 끈", item: "minibag", over: { shape: "rect", build: "hobo1", a: 28, h: 18, corner: .6, postSt: 5, strapCm: 60, handle: "short" } },
  { id: "round", group: "가방", name: "둥근 손가방", note: "원 · 손잡이 1개", item: "minibag", over: { shape: "circle", a: 15, h: 15, handle: "short", handleCm: 50, handleCount: 1 } },
  { id: "flapbag", group: "가방", name: "덮개 크로스백", note: "네모 · 덮개 · 긴 끈", item: "minibag", over: { shape: "rect", a: 20, b: 6, h: 15, gusset: "box", closure: "flap", flapCm: 9, flapShape: "half", flapOver: "top", handle: "long", handleCm: 120, handleCount: 1 } },
  { id: "bucket", group: "가방", name: "버킷백", note: "원 · 끈 조이기", item: "bucket", over: { closure: "drawstring" } },
  { id: "flatpouch", group: "파우치", name: "납작 파우치", note: "면과 면 잇기", item: "pouch", over: { shape: "rect", a: 18, b: 4, h: 12, gusset: "flat" } },
  { id: "boxpouch", group: "파우치", name: "박스 파우치", note: "너비 · 윗면 덮는 덮개", item: "pouch", over: { shape: "rect", a: 18, b: 8, h: 10, gusset: "box", closure: "flap", flapCm: 7, flapShape: "square", flapOver: "top" } },
  { id: "card", group: "파우치", name: "카드지갑", note: "납작 · 세모 덮개", item: "pouch", over: { shape: "rect", a: 12, b: 4, h: 8, gusset: "flat", closure: "flap", flapCm: 5, flapShape: "triangle", extras: { button: true } } },
  { id: "wristlet", group: "파우치", name: "손목 파우치", note: "손목 고리", item: "pouch", over: { shape: "rect", a: 20, b: 5, h: 13, gusset: "box", handle: "short", handleKind: "wrist", handleCount: 1, handleCm: 25 } },
];
const BAGS = new Set<ItemId>(["minibag", "bucket", "pouch"]);

/** every 기본형, grouped as shown: the bag and pouch kinds, then every other piece once */
export const PROTOS: Proto[] = [
  ...KINDS,
  ...ITEMS.filter(i => !BAGS.has(i.id)).map(i => ({ id: i.id, group: i.group, name: i.name, note: "", item: i.id })),
];
export const PROTO_GROUPS = [...new Set(PROTOS.map(p => p.group))];

/** the draft as the 기본형: the item's own defaults (nothing of the piece before), then the kind's own parts */
export function protoDraft(d: Draft, p: Proto): Draft {
  const it = ITEM[p.item], dv = it.defaults;
  return {
    ...d, item: p.item, object: ENGINE[it.kind], shape: dv.shape ?? "rect", a: dv.a, b: dv.b ?? dv.a, h: dv.h ?? 0,
    handle: dv.handle ?? "none", handleCm: dv.handleCm ?? null, handleCount: undefined, handleKind: undefined, handleBaseCm: undefined, build: undefined, taper: undefined, taperCord: undefined, topA: null, flapCm: null, flapShape: undefined, flapOver: undefined,
    closure: "open", gusset: undefined, asm: undefined, profile: undefined, depthProfile: undefined, flapColor: undefined, handleColor: undefined, extras: {},
    circ: dv.circ, depth: dv.depth, itemPicked: true, free: undefined, paint: undefined,
    ...p.over,
  };
}
