// 기본형 (Kim: 파우치, 가방, 코스터 같은 걸 누르면 프로토타입을 먼저 주고 사용자가 고쳐 나가기) - an option beside
// writing it in words and drawing it: a ready piece comes up at once, every part then changed in 모양. Bags and
// pouches come in a few kinds; every other piece starts from its own defaults.
import { ENGINE, ITEM, ITEMS, isStarterOnly, type ItemId } from "./items";
import { bottleDims, phoneDims } from "./wear";
import type { Draft } from "./types";

/** `family`: starters shown as ONE card that opens into its members (Kim: 호보백을 누르면 둘 중에 선택) - `choice`
 *  is a member's own name and line there */
export type Proto = { id: string; group: string; name: string; note: string; item: ItemId; over?: Partial<Draft>; family?: string; choice?: [string, string] };

const KINDS: Proto[] = [
  { id: "tote", group: "가방", name: "토트백", note: "네모 · 손잡이 2개", item: "minibag", over: { shape: "rect", a: 26, b: 9, h: 22, handle: "short", handleCm: 50, handleCount: 2, gusset: "box" } },
  { id: "shoulder", group: "가방", name: "숄더백", note: "타원 · 어깨끈", item: "minibag", over: { shape: "oval", a: 24, b: 8, h: 18, handle: "long", handleCm: 100, handleCount: 1 } },
  // 가방 5종 (Kim: 실제 작품들에서 본 구조 원리 - lib/structure, lib/pattern): only how each is put together; every count is the gauge's
  { id: "slouch", group: "가방", name: "슬라우치 토트", note: "납작 통 · 옆에서 이어지는 끈", item: "minibag", over: { shape: "rect", gusset: "flat", a: 30, b: 2, h: 26, handle: "short", handleKind: "grown", handleFar: true, handleCount: 1, handleCm: 60, handleWcm: 4, handleBaseCm: 4, drape: true } },
  { id: "hobo1", group: "가방", name: "호보백", note: "판 하나 · 둥근 모서리 · 끈 기둥", family: "호보백", choice: ["판 하나로", "둥근 모서리 판 · 양 끝 기둥이 끈"], item: "minibag", over: { shape: "rect", build: "hobo1", hoboFold: true, a: 28, h: 18, corner: .6, postSt: 5, strapCm: 60, handle: "short" } },
  { id: "panelbag", group: "가방", name: "판 + 띠 숄더백", note: "판 두 장 · 옆판 겸 끈", item: "minibag", over: { shape: "rect", build: "panels", a: 24, h: 20, corner: .35, stripCm: 6, stripHandle: true, handle: "short", handleCm: 70 } },
  { id: "netbag", group: "가방", name: "네트백", note: "그물 몸통 · 짧은뜨기 테두리", item: "minibag", over: { shape: "rect", gusset: "box", a: 24, b: 8, h: 26, crochetChart: "net", handle: "short", handleKind: "rim", handleCount: 2, handleCm: 40, drape: true } },
  { id: "ribtote", group: "가방", name: "골지 토트", note: "옆으로 떠서 세로 골", item: "minibag", over: { shape: "rect", build: "ribbed", a: 28, h: 26, holeW: 10, holeH: 3, handle: "none" } },
  // (the handle is the body itself going on up - lib/pattern grownHandle; it was "호보백" before the one above took the name)
  { id: "hobo", group: "가방", name: "이어 뜨는 호보백", note: "타원 · 이어 뜨는 손잡이", family: "호보백", choice: ["몸통에서 이어 뜨기", "타원 바닥 · 입구에서 손잡이가 이어짐"], item: "minibag", over: { shape: "oval", a: 28, b: 10, h: 18, handle: "short", handleKind: "grown", handleCount: 1, handleCm: 56, handleWcm: 3 } },
  { id: "round", group: "가방", name: "둥근 손가방", note: "원 · 손잡이 1개", item: "minibag", over: { shape: "circle", a: 15, h: 15, handle: "short", handleCm: 50, handleCount: 1 } },
  { id: "flapbag", group: "가방", name: "덮개 크로스백", note: "네모 · 덮개 · 긴 끈", item: "minibag", over: { shape: "rect", a: 20, b: 6, h: 15, gusset: "box", closure: "flap", flapCm: 9, flapShape: "half", flapOver: "top", handle: "long", handleCm: 120, handleCount: 1 } },
  { id: "bucket", group: "가방", name: "버킷백", note: "원 · 끈 조이기", item: "bucket", over: { closure: "drawstring" } },
  { id: "flatpouch", group: "파우치", name: "납작 파우치", note: "면과 면 잇기", item: "pouch", over: { shape: "rect", a: 18, b: 4, h: 12, gusset: "flat" } },
  { id: "boxpouch", group: "파우치", name: "박스 파우치", note: "너비 · 윗면 덮는 덮개", item: "pouch", over: { shape: "rect", a: 18, b: 8, h: 10, gusset: "box", closure: "flap", flapCm: 7, flapShape: "square", flapOver: "top" } },
  { id: "card", group: "파우치", name: "카드지갑", note: "납작 · 세모 덮개", item: "pouch", over: { shape: "rect", a: 12, b: 4, h: 8, gusset: "flat", closure: "flap", flapCm: 5, flapShape: "triangle", extras: { button: true } } },
  { id: "wristlet", group: "파우치", name: "손목 파우치", note: "손목 고리", item: "pouch", over: { shape: "rect", a: 20, b: 5, h: 13, gusset: "box", handle: "short", handleKind: "wrist", handleCount: 1, handleCm: 25 } },
  // 모자 5종 · 소품 2종 (Kim: 실제 작품들에서 본 구조 원리 - lib/wear, lib/pattern): only how each is put together;
  // every count is the gauge's and the head's round (a bottle's width). A starter's id is its item's.
  { id: "buckethat", group: "모자", name: "버킷햇", note: "정수리 원형 · 곧은 옆 · 늘리는 챙", item: "buckethat", over: { circ: 56, h: 8, brimCm: 6 } },
  { id: "motifhat", group: "모자", name: "모티프 버킷햇", note: "사각 모티프 이어 붙이기", item: "motifhat", over: { circ: 56, motifN: 8, brimMore: 1 } },
  { id: "hoodscarf", group: "모자", name: "후드 스카프", note: "원형에서 시작하는 후드 · 긴 끈", item: "hoodscarf", over: { circ: 56, headH: 28, tieCm: 60, tieWcm: 8 } },
  { id: "earflap", group: "모자", name: "이어플랩 후드", note: "판을 접은 후드 · 긴 귀덮개", item: "earflap", over: { circ: 56, headH: 24, tieCm: 30, tieWcm: 8, ribRows: 3 } },
  { id: "kerchief", group: "모자", name: "삼각 헤드스카프", note: "한 꼭짓점에서 늘리는 삼각형 · 묶는 끈", item: "kerchief", over: { circ: 56, tieCm: 25 } },
  { id: "bottlebag", group: "소품", name: "보틀백", note: "원형 바닥 · 그물 몸통 · 크로스 끈", item: "bottlebag", over: { bottleD: 7, bottleH: 22, ...bottleDims(7, 22), crochetChart: "net", netCh: 5, handle: "long", handleCm: 110, handleCount: 1 } },
  { id: "backpack", group: "소품", name: "드로스트링 백팩", note: "원통 · 조이는 끈이 어깨끈", item: "backpack", over: { a: 22, h: 30, closure: "drawstring", handle: "none", tieCm: 70 } },
  // 작은 가방 4종 · 보닛 · 옷 2종 (Kim: 실제 작품들에서 본 구조 원리): 옷 is one card that opens into its two ways
  { id: "trapbag", group: "가방", name: "사다리꼴 주머니백", note: "바닥 없는 사다리꼴 두 장 · 띠 손잡이", item: "trapbag", over: { a: 12, topA: 26, h: 20, handle: "short", handleCm: 40, handleWcm: 4 } },
  { id: "moonbag", group: "가방", name: "반달 미니백", note: "원 두 장 · 아래 반원만 잇기", item: "moonbag", over: { a: 20, holeW: 8, handle: "none" } },
  { id: "stepbag", group: "가방", name: "계단 덮개 미니백", note: "직사각형 통 · 계단식 덮개 · 짧은 어깨끈", item: "stepbag", over: { shape: "rect", gusset: "flat", a: 18, b: 1.5, h: 12, closure: "flap", flapCm: 8, flapShape: "square", flapStepRows: 2, flapStepSt: 2, handle: "short", handleCm: 50, handleCount: 1 } },
  { id: "phonebag", group: "가방", name: "폰 크로스백", note: "휴대폰 크기 · 장식 테두리 · 긴 끈", item: "phonebag", over: { shape: "rect", gusset: "flat", phoneW: 7.5, phoneH: 16, ...phoneDims(7.5, 16), b: 1.5, rimChart: "shell", handle: "long", handleCm: 120, handleCount: 1 } },
  { id: "bonnet", group: "모자", name: "보닛", note: "원형 정수리 · 뒤통수 감싸기 · 턱끈", item: "bonnet", over: { circ: 56, headH: 20, tieCm: 30,
    // 옆 장식 (Kim: 지금 장식 붙이기 - 꽃 모티프): a flower at one side, moved or taken off in 장식
    extras: { items: [{ pic: "b-pearl-blossom", at: [.95, .8, 3] }] } } },
  { id: "bustier", group: "옷", name: "모티프 뷔스티에", note: "모티프 띠 · 삼각 컵 · 어깨끈", family: "뷔스티에 · 홀터 탑", choice: ["모티프 뷔스티에", "모티프 띠 · 삼각 컵 · 어깨끈"], item: "bustier", over: { bust: 84, h: 14, tieCm: 40 } },
  { id: "halter", group: "옷", name: "그물 홀터 탑", note: "그물 몸통 · V로 모으는 앞 · 목끈", family: "뷔스티에 · 홀터 탑", choice: ["그물 홀터 탑", "그물 몸통 · V로 모으는 앞 · 목끈"], item: "halter", over: { bust: 84, h: 30, tieCm: 45 } },
];
const BAGS = new Set<ItemId>(["minibag", "bucket", "pouch"]);

/** every 기본형, grouped as shown: the bag and pouch kinds, then every other piece once */
export const PROTOS: Proto[] = [
  ...KINDS,
  ...ITEMS.filter(i => !BAGS.has(i.id) && !isStarterOnly(i)).map(i => ({ id: i.id, group: i.id === "beanie" ? "모자" : i.group, name: i.name, note: "", item: i.id })),
];
export const PROTO_GROUPS = [...new Set(PROTOS.map(p => p.group))];

/** the draft as the 기본형: the item's own defaults (nothing of the piece before), then the kind's own parts */
export function protoDraft(d: Draft, p: Proto): Draft {
  const it = ITEM[p.item], dv = it.defaults;
  return {
    ...d, item: p.item, object: ENGINE[it.kind], shape: dv.shape ?? "rect", a: dv.a, b: dv.b ?? dv.a, h: dv.h ?? 0,
    handle: dv.handle ?? "none", handleCm: dv.handleCm ?? null, handleCount: undefined, handleKind: undefined, handleBaseCm: undefined, handleFar: undefined, build: undefined, taper: undefined, taperCord: undefined, crochetChart: undefined, drape: undefined, topA: null, flapCm: null, flapShape: undefined, flapOver: undefined,
    closure: "open", gusset: undefined, asm: undefined, profile: undefined, depthProfile: undefined, flapColor: undefined, handleColor: undefined, extras: {},
    circ: dv.circ, depth: dv.depth, itemPicked: true, free: undefined, paint: undefined,
    headH: undefined, brimCm: undefined, brimFold: undefined, motifN: undefined, brimMore: undefined, tieCm: undefined, tieWcm: undefined, ribRows: undefined, netCh: undefined, bottleD: undefined, bottleH: undefined, pattern: undefined, crochetStitch: undefined,
    bust: undefined, phoneW: undefined, phoneH: undefined, rimChart: undefined, flapStepRows: undefined, flapStepSt: undefined, holeW: undefined, holeH: undefined, handleWcm: undefined,
    ...p.over,
  };
}
