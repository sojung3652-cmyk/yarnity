// "AI와 상의하기": the values an AI reply proposes ("set") checked against what the app can make, and turned
// into a draft patch with a short Korean label per value. Nothing from the model is trusted as is: an
// unknown item, a shape the item does not offer, a size outside the item's range, a yarn / hook outside the
// ranges, a colour that is not plain hex - each is dropped. The user applies the result with "책에 적용"
// (never applied by itself).
import { ITEM, itemIdOf, type FieldKey, type ItemId } from "./items";
import { ENGINE } from "./items";
import { SHAPE_KO, type Handle, type Shape } from "./pattern";
import type { Draft } from "./types";
import { HOOK_CHIPS, HOOK_MM_RANGE, weightFromMm, YARN_MM_RANGE } from "./yarn";

export interface Proposal { patch: Partial<Draft>; labels: string[] }

const num = (v: unknown) => (typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN);
const round1 = (v: number) => Math.round(v * 10) / 10;
const FIELD_KO: Record<FieldKey, string> = { a: "가로", b: "세로", h: "높이", circ: "머리 둘레", depth: "깊이" };

/** The proposal in an AI reply's "set", checked against the draft's item (or the one it proposes). */
export function proposalFrom(set: Record<string, unknown> | undefined, draft: Draft): Proposal | null {
  if (!set || typeof set !== "object") return null;
  const patch: Partial<Draft> = {}, labels: string[] = [];

  // the item first: a new item starts from its own defaults, as picking it on step 2 does
  let itemId = itemIdOf(draft);
  if (typeof set.item === "string" && set.item in ITEM && set.item !== draft.item) {
    itemId = set.item as ItemId;
    const it = ITEM[itemId], dv = it.defaults;
    Object.assign(patch, { item: itemId, itemPicked: true, object: ENGINE[it.kind], shape: dv.shape ?? "rect", a: dv.a, b: dv.b ?? dv.a, h: dv.h ?? 0,
      handle: dv.handle ?? "none", handleCm: dv.handleCm ?? null, topA: null, flapCm: null, circ: dv.circ, depth: dv.depth });
    labels.push(`품목 ${it.name}`);
  } else if (typeof set.item === "string" && set.item === draft.item && !draft.itemPicked) {
    patch.itemPicked = true; labels.push(`품목 ${ITEM[itemId].name}`);
  }
  const it = ITEM[itemId], cur = { ...draft, ...patch };

  if (typeof set.shape === "string" && (it.shapes ?? []).includes(set.shape as Shape) && set.shape !== cur.shape) {
    patch.shape = set.shape as Shape; labels.push(`모양 ${SHAPE_KO[set.shape as Shape]}`);
  }
  const shape = (patch.shape ?? cur.shape) as Shape;
  for (const k of ["a", "b", "h", "circ", "depth"] as FieldKey[]) {
    const v = num(set[k]), r = it.range[k];
    if (!r || !Number.isFinite(v) || v < r[0] || v > r[1]) continue;
    if (k === "b" && shape === "circle") continue;
    (patch as Record<string, number>)[k] = round1(v);
    labels.push(`${k === "a" && shape === "circle" ? "지름" : FIELD_KO[k]} ${round1(v)}cm`);
  }

  // bags: a wider opening, a flap, the handle
  if (it.group === "가방") {
    const a = (patch.a ?? cur.a) as number, top = num(set.topA), flap = num(set.flapCm);
    if (Number.isFinite(top) && top > a && top <= a * 2) { patch.topA = round1(top); labels.push(`입구 ${round1(top)}cm`); }
    if (Number.isFinite(flap) && flap >= 3 && flap <= 40) { patch.flapCm = round1(flap); labels.push(`덮개 ${round1(flap)}cm`); }
  }
  if (it.handles) {
    const hc = num(set.handleCm);
    if (set.handle === "none") { patch.handle = "none" as Handle; labels.push("손잡이 없음"); }
    else if (Number.isFinite(hc) && hc >= 10 && hc <= 200) { patch.handle = "short"; patch.handleCm = Math.round(hc); labels.push(`손잡이 ${Math.round(hc)}cm`); }
  }

  // yarn and hook
  const ym = num(set.yarnMm);
  if (Number.isFinite(ym) && ym >= YARN_MM_RANGE[0] && ym <= YARN_MM_RANGE[1]) {
    const r = round1(ym); Object.assign(patch, { yarnMm: r, yarnMode: "mm", weight: weightFromMm(r) }); labels.push(`실 굵기 ${r}mm`);
  }
  const hm = num(set.hookMm);
  if (Number.isFinite(hm) && hm >= HOOK_MM_RANGE[0] && hm <= HOOK_MM_RANGE[1]) {
    const r = Math.round(hm * 100) / 100, chip = HOOK_CHIPS.find(([, v]) => v === r);
    Object.assign(patch, { hook: chip ? chip[0] : `${r}mm`, hookMm: r }); labels.push(`바늘 ${chip ? `${chip[0]} · ` : ""}${r}mm`);
  }
  if (typeof set.color === "string" && /^#[0-9a-f]{6}$/i.test(set.color)) patch.color = set.color;
  if (typeof set.colorName === "string" && set.colorName.trim()) patch.colorName = set.colorName.trim().slice(0, 40);
  if (patch.color || patch.colorName) labels.push(`색 ${patch.colorName ?? "고른 색"}`);
  if (typeof set.name === "string" && set.name.trim()) { patch.name = set.name.trim().slice(0, 30); labels.push(`이름 ‘${patch.name}’`); }

  return labels.length ? { patch, labels } : null;
}
