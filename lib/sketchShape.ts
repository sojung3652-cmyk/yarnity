// 그려서 만들기 (Kim: "the bag in my head" - draw the whole piece, the AI reads its shape, Yarnity makes the
// pattern and the 3D). What the AI returns (app/api/shape) and how it becomes a draft. The AI only describes;
// every number is checked and kept inside the item's own ranges here, so a strange answer cannot break a draft.
import { ITEM, ENGINE, isStarterOnly, type ItemId } from "./items";
import { PROTOS, protoDraft } from "./prototypes";
import type { Draft } from "./types";
import type { Shape } from "./pattern";

export interface ShapeSpec {
  kind: "bag" | "pouch" | "basket" | "coaster" | "other";
  bottom: Shape;
  widthCm: number; depthCm: number; heightCm: number;
  body: "straight" | "wider" | "narrower"; topWidthCm?: number;
  flap: "none" | "half" | "square" | "triangle"; flapCm?: number;
  handles: 0 | 1 | 2; handleCm?: number;
  /** a short strap over the rim holding the button (a tab closure) */
  tab?: boolean;
  button: boolean; buttonX?: number; buttonY?: number; buttonSizeCm?: number; buttonColor?: string;
  zipper?: boolean; label?: boolean;
  bodyColor?: string; colorName?: string;
  profile?: number[]; rounded?: boolean; flapColor?: string; handleColor?: string;
  /** measured, not from the AI: depth against width, bottom to top (measured from a side-view drawing) */
  depthProfile?: number[];
  summary?: string;
  /** from words (조립하기, app/api/shape with `text`): the app's own item, and how the handle is made */
  item?: ItemId;
  handleStyle?: "cord" | "flat" | "tube";
}

const HEX = /^#[0-9a-f]{6}$/i;
const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const pick = <T extends string>(v: unknown, ok: readonly T[], d: T): T => (ok.includes(v as T) ? (v as T) : d);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** a loose object from the AI -> a checked spec (Rule 5: never trust its shape), or null */
export function readSpec(o: unknown): ShapeSpec | null {
  if (!o || typeof o !== "object") return null;
  const x = o as Record<string, unknown>;
  return {
    kind: pick(x.kind, ["bag", "pouch", "basket", "coaster", "other"] as const, "bag"),
    bottom: pick(x.bottom, ["circle", "oval", "rect"] as const, "rect"),
    widthCm: num(x.widthCm, 22), depthCm: num(x.depthCm, 9), heightCm: num(x.heightCm, 16),
    body: pick(x.body, ["straight", "wider", "narrower"] as const, "straight"), topWidthCm: typeof x.topWidthCm === "number" ? x.topWidthCm : undefined,
    flap: pick(x.flap, ["none", "half", "square", "triangle"] as const, "none"), flapCm: typeof x.flapCm === "number" ? x.flapCm : undefined,
    handles: ([0, 1, 2] as const).includes(x.handles as 0) ? (x.handles as 0 | 1 | 2) : 0, handleCm: typeof x.handleCm === "number" ? x.handleCm : undefined,
    button: x.button === true, buttonX: typeof x.buttonX === "number" ? x.buttonX : undefined, buttonY: typeof x.buttonY === "number" ? x.buttonY : undefined,
    buttonSizeCm: typeof x.buttonSizeCm === "number" ? x.buttonSizeCm : undefined, buttonColor: typeof x.buttonColor === "string" ? x.buttonColor : undefined,
    zipper: x.zipper === true, label: x.label === true, tab: x.tab === true,
    bodyColor: typeof x.bodyColor === "string" && HEX.test(x.bodyColor) ? x.bodyColor.toUpperCase() : undefined,
    colorName: typeof x.colorName === "string" ? x.colorName.slice(0, 20) : undefined,
    summary: typeof x.summary === "string" ? x.summary.slice(0, 200) : undefined,
    profile: Array.isArray(x.profile) && x.profile.length >= 3 && x.profile.every(v => typeof v === "number" && v > 0 && v < 3) ? (x.profile as number[]).slice(0, 12) : undefined,
    rounded: x.rounded === true,
    item: typeof x.item === "string" && x.item in ITEM ? (x.item as ItemId) : undefined,
    handleStyle: x.handleStyle === "flat" || x.handleStyle === "tube" || x.handleStyle === "cord" ? x.handleStyle : undefined,
    flapColor: typeof x.flapColor === "string" && HEX.test(x.flapColor) ? x.flapColor.toUpperCase() : undefined,
    handleColor: typeof x.handleColor === "string" && HEX.test(x.handleColor) ? x.handleColor.toUpperCase() : undefined,
  };
}

/** the spec as a draft: which item, its bottom and sizes (inside the item's ranges), the body, flap, handles,
 *  what is sewn on, the colour */
export function specToDraft(d: Draft, s: ShapeSpec): Draft {
  // 모자·소품 기본형 (Kim): the words name a starter - it comes up as its 기본형 does
  const starter = s.item && isStarterOnly(ITEM[s.item]) ? PROTOS.find(p => p.id === s.item) : undefined;
  if (starter) return protoDraft(d, starter);
  if (s.item && ITEM[s.item].kind !== "base-body" && ITEM[s.item].kind !== "flat-round") return wordsToFlat(d, s);
  // no handle drawn: never the handbag (Kim: a card wallet came out as 미니 손가방) - a closed piece is a pouch
  const id: ItemId = s.item ?? (s.kind === "pouch" || (s.kind === "bag" && !s.handles) ? "pouch" : s.kind === "basket" ? "basket" : s.kind === "coaster" ? (s.bottom === "oval" ? "placemat" : "coaster") : "minibag");
  // a soft, rounded piece has no square corners (Kim: a crocheted hobo is no box): a rect bottom becomes an oval
  const want: Shape = s.rounded && s.bottom === "rect" ? "oval" : s.bottom;
  const it = ITEM[id], r = it.range, shape = (it.shapes ?? ["circle"]).includes(want) ? want : (it.shapes ?? ["circle"])[0];
  const inR = (k: "a" | "b" | "h", v: number) => { const rr = r[k]; return rr ? clamp(Math.round(v), rr[0], rr[1]) : Math.round(v); };
  const bag = it.kind === "base-body";
  // a drawn silhouette (widths up the height, the widest 1): the bottom is as wide as its first width, and the
  // rows follow the curve; a silhouette that is about straight is no silhouette
  const pmax = s.profile ? Math.max(...s.profile) : 0, prof = bag && s.profile && pmax > 0 ? s.profile.map(v => Math.round(v / pmax * 1000) / 1000) : null;
  const curved = !!prof && (Math.max(...prof) - Math.min(...prof) > .12);
  const k0 = curved ? Math.max(.25, prof![0]) : 1;
  const a = inR("a", s.widthCm * k0), b = shape === "circle" ? a : Math.min(inR("b", s.depthCm * (curved ? Math.max(.5, k0) : 1)), Math.max(4, a - 2)), h = bag ? inR("h", s.heightCm) : 0;
  // the numbers decide the direction (the words and the numbers have disagreed): top edge against bottom edge
  const ratio = s.topWidthCm && s.widthCm ? s.topWidthCm / s.widthCm : s.body === "wider" ? 1.3 : s.body === "narrower" ? .7 : 1;
  const topA = !bag || curved || Math.abs(ratio - 1) < .08 ? null : ratio > 1 ? clamp(Math.round(a * ratio), a + 1, a * 2) : clamp(Math.round(a * ratio), Math.ceil(a * .4), a - 1);
  // a short "flap" (a tab with a button over the rim, as on Kim's test photo) is no flap: the 3D's flap is as wide as
  // the opening and reads as a lid. It becomes the button, high on the front
  const tab = bag && (s.tab === true || (s.flap !== "none" && (s.flapCm ?? 99) < s.heightCm * .3));
  if (tab) s = { ...s, flap: "none", button: true, buttonX: undefined, buttonY: undefined };
  const flapOn = bag && s.flap !== "none";
  const handles = it.handles ? s.handles : 0;
  const ex: NonNullable<Draft["extras"]> = {};
  if (s.button) {
    ex.button = true;
    // on a flap the button sits on its tip unless the drawing put it elsewhere
    if (!flapOn && s.buttonX != null && s.buttonY != null) ex.buttonAt = [clamp(s.buttonX, -1, 1), clamp(s.buttonY, 0, 1), clamp(s.buttonSizeCm ?? 1.9, .8, 5)];
    if (s.buttonColor) ex.buttonColor = /gold|금/i.test(s.buttonColor) ? "gold" : HEX.test(s.buttonColor) ? s.buttonColor : undefined;
  }
  if (tab) ex.tab = true; // the button then sits on its end
  if (s.zipper) ex.zipper = true;
  if (s.label) ex.label = true;
  return {
    ...d, item: id, object: ENGINE[it.kind], itemPicked: true, free: undefined, paint: undefined,
    shape, a, b, h, topA, profile: curved ? prof! : undefined, depthProfile: curved ? s.depthProfile : undefined,
    flapColor: flapOn ? s.flapColor : undefined, handleColor: handles ? s.handleColor : undefined,
    flapCm: flapOn ? clamp(Math.round(s.flapCm ?? h * .45), 3, 40) : null, closure: flapOn ? "flap" : s.zipper ? "zipper" : "open", flapShape: flapOn ? (s.flap as "half" | "square" | "triangle") : undefined,
    handle: handles ? "short" : "none", // one handle across the top has to clear the opening (an AI guess of 16cm over a 15cm opening hid it): at least 1.8 times the opening's width
    handleCm: handles ? clamp(Math.round(Math.max(s.handleCm ?? (handles === 1 ? 40 : 45), handles === 1 ? (curved ? (a / k0) * prof![prof!.length - 1] : topA ?? a) * 1.8 : 0)), 10, 150) : null, handleCount: handles ? (handles as 1 | 2) : undefined,
    extras: ex, asm: undefined,
    ...(handles && s.handleStyle ? { handleStyle: s.handleStyle === "flat" ? "flat-chain" as const : s.handleStyle === "tube" ? "tube" as const : undefined, handleWcm: s.handleStyle === "flat" ? 3 : 2 } : {}),
    ...(s.bodyColor ? { color: s.bodyColor, colorName: s.colorName } : {}),
  };
}

/** a piece worked flat or as a tube, from words (a scarf, a blanket, a headband): the item's own sizes, the
 *  ones said taken where they fit its ranges */
function wordsToFlat(d: Draft, s: ShapeSpec): Draft {
  const it = ITEM[s.item!], dv = it.defaults, inR = (k: "a" | "b" | "h", v: number | undefined, def: number) => { const r = it.range[k]; return r && v && v >= r[0] && v <= r[1] ? Math.round(v) : def; };
  const ex: NonNullable<Draft["extras"]> = {}; if (s.button) ex.button = true; if (s.label) ex.label = true;
  return { ...d, item: it.id, object: ENGINE[it.kind], itemPicked: true, free: undefined, paint: undefined, asm: undefined, profile: undefined, depthProfile: undefined,
    shape: dv.shape ?? "rect", a: inR("a", s.widthCm, dv.a), b: inR("b", s.heightCm, dv.b ?? dv.a), h: inR("h", s.heightCm, dv.h ?? 0),
    handle: "none", handleCm: null, topA: null, flapCm: null, closure: "open", circ: dv.circ, depth: dv.depth, extras: ex,
    ...(s.bodyColor ? { color: s.bodyColor, colorName: s.colorName } : {}) };
}
