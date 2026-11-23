// 그려서 만들기 (Kim: "the bag in my head" - draw the whole piece, the AI reads its shape, Yarnity makes the
// pattern and the 3D). What the AI returns (app/api/shape) and how it becomes a draft. The AI only describes;
// every number is checked and kept inside the item's own ranges here, so a strange answer cannot break a draft.
import { ITEM, ENGINE, type ItemId } from "./items";
import type { Draft } from "./types";
import type { Shape } from "./pattern";

export interface ShapeSpec {
  kind: "bag" | "pouch" | "basket" | "coaster" | "other";
  bottom: Shape;
  widthCm: number; depthCm: number; heightCm: number;
  body: "straight" | "wider" | "narrower"; topWidthCm?: number;
  flap: "none" | "half" | "square" | "triangle"; flapCm?: number;
  handles: 0 | 1 | 2; handleCm?: number;
  button: boolean; buttonX?: number; buttonY?: number; buttonSizeCm?: number; buttonColor?: string;
  zipper?: boolean; label?: boolean;
  bodyColor?: string; colorName?: string;
  summary?: string;
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
    zipper: x.zipper === true, label: x.label === true,
    bodyColor: typeof x.bodyColor === "string" && HEX.test(x.bodyColor) ? x.bodyColor.toUpperCase() : undefined,
    colorName: typeof x.colorName === "string" ? x.colorName.slice(0, 20) : undefined,
    summary: typeof x.summary === "string" ? x.summary.slice(0, 200) : undefined,
  };
}

/** the spec as a draft: which item, its bottom and sizes (inside the item's ranges), the body, flap, handles,
 *  what is sewn on, the colour */
export function specToDraft(d: Draft, s: ShapeSpec): Draft {
  const id: ItemId = s.kind === "pouch" ? "pouch" : s.kind === "basket" ? "basket" : s.kind === "coaster" ? (s.bottom === "oval" ? "placemat" : "coaster") : "minibag";
  const it = ITEM[id], r = it.range, shape = (it.shapes ?? ["circle"]).includes(s.bottom) ? s.bottom : (it.shapes ?? ["circle"])[0];
  const inR = (k: "a" | "b" | "h", v: number) => { const rr = r[k]; return rr ? clamp(Math.round(v), rr[0], rr[1]) : Math.round(v); };
  const a = inR("a", s.widthCm), b = shape === "circle" ? a : Math.min(inR("b", s.depthCm), Math.max(4, a - 2)), h = it.kind === "base-body" ? inR("h", s.heightCm) : 0;
  const bag = it.kind === "base-body";
  // the numbers decide the direction (the words and the numbers have disagreed): top edge against bottom edge
  const ratio = s.topWidthCm && s.widthCm ? s.topWidthCm / s.widthCm : s.body === "wider" ? 1.3 : s.body === "narrower" ? .7 : 1;
  const topA = !bag || Math.abs(ratio - 1) < .08 ? null : ratio > 1 ? clamp(Math.round(a * ratio), a + 1, a * 2) : clamp(Math.round(a * ratio), Math.ceil(a * .4), a - 1);
  const flapOn = bag && s.flap !== "none";
  const handles = it.handles ? s.handles : 0;
  const ex: NonNullable<Draft["extras"]> = {};
  if (s.button) {
    ex.button = true;
    // on a flap the button sits on its tip unless the drawing put it elsewhere
    if (!flapOn && s.buttonX != null && s.buttonY != null) ex.buttonAt = [clamp(s.buttonX, -1, 1), clamp(s.buttonY, 0, 1), clamp(s.buttonSizeCm ?? 1.9, .8, 5)];
    if (s.buttonColor) ex.buttonColor = /gold|금/i.test(s.buttonColor) ? "gold" : HEX.test(s.buttonColor) ? s.buttonColor : undefined;
  }
  if (s.zipper) ex.zipper = true;
  if (s.label) ex.label = true;
  return {
    ...d, item: id, object: ENGINE[it.kind], itemPicked: true, free: undefined, paint: undefined,
    shape, a, b, h, topA,
    flapCm: flapOn ? clamp(Math.round(s.flapCm ?? h * .45), 3, 40) : null, closure: flapOn ? "flap" : s.zipper ? "zipper" : "open", flapShape: flapOn ? (s.flap as "half" | "square" | "triangle") : undefined,
    handle: handles ? "short" : "none", handleCm: handles ? clamp(Math.round(s.handleCm ?? (handles === 1 ? 40 : 45)), 10, 150) : null, handleCount: handles ? (handles as 1 | 2) : undefined,
    extras: ex,
    ...(s.bodyColor ? { color: s.bodyColor, colorName: s.colorName } : {}),
  };
}
