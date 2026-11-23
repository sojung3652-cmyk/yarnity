import type { ItemId } from "./items";
import type { Handle, ObjectKind, Shape, Weight } from "./pattern";

export interface Draft {
  name: string;
  /** what is being made (lib/items.ts); older saves have none -> itemIdOf() */
  item?: ItemId;
  /** engine path for the item (coaster / bag / rows / tube) */
  object: ObjectKind;
  yarn: string;
  weight: Weight;
  hook: string;
  shape: Shape;
  a: number;
  b: number;
  h: number;
  handle: Handle;
  /** the item was picked on step 2 (a new draft starts with none shown; the mini bag is only its default) */
  itemPicked?: boolean;
  /** bags: handle length (cm; unset = the old 25 / 90 of `handle`), a wider opening (like `a`), a flap (cm) */
  handleCm?: number | null;
  topA?: number | null;
  flapCm?: number | null;
  /** yarn colour: hex (tints the preview and the stitch map) and its name */
  color?: string;
  colorName?: string;
  /** yarn details (stored, not used by the engine except yarnMm -> weight level) */
  materials?: string[];
  blend?: string;
  colorNo?: string;
  lot?: string;
  /** more yarns / colours beyond the first (the first stays in color / colorName / colorNo / lot) */
  moreColors?: YarnColor[];
  /** a knitted item's stitch pattern (lib/knit.ts KNIT_STITCHES key); none = 메리야스 */
  stitch?: string;
  /** yarn thickness in mm as typed; weight is derived from it (lib/yarn.ts); "level" = picked thin/medium/thick */
  yarnMm?: number | null;
  yarnMode?: "mm" | "level";
  skeinG?: number | null;
  skeinM?: number | null;
  skeins?: number | null;
  shop?: string;
  memo?: string;
  /** hook size in mm (the size name stays in `hook` for display) and its material */
  hookMm?: number | null;
  hookMaterial?: string;
  /** the Girl's Diary book cover (lib/covers.ts id), picked on 도안 만들기's last step (Kim); none: a random one
   *  when the work is saved (AppProvider addProject, coverAuto) */
  cover?: string;
  /** the cover was given at random (Kim: none picked) - the picker shows nothing chosen yet */
  coverAuto?: boolean;
  /** beanie inputs (converted to a / h by engineDims) */
  circ?: number;
  depth?: number;
}

export interface YarnColor { hex?: string; name?: string; no?: string; lot?: string }

export interface Project extends Draft {
  id: string;
  measuredH: number | null;
  /** 뜨는 중 / 중단 / 완성; when it was paused; when it last changed (knitting progress included) */
  status?: "knitting" | "paused" | "done";
  pausedAt?: number | null;
  updatedAt?: number;
  /** stitch width from the 5-row measurement (rows / tube items) */
  measuredW?: number | null;
  current: number;
  created: number;
}

export const DEFAULT_DRAFT: Draft = { name: "", item: "minibag", yarnMode: "mm", yarnMm: null, object: "bag", yarn: "", weight: "medium", hook: "5호", shape: "circle", a: 15, b: 10, h: 15, handle: "short" };
