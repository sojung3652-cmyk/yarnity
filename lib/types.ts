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
  /** yarn colour: hex (tints the preview and the stitch map) and its name */
  color?: string;
  colorName?: string;
  /** yarn details (stored, not used by the engine except yarnMm -> weight level) */
  materials?: string[];
  blend?: string;
  colorNo?: string;
  lot?: string;
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
  /** beanie inputs (converted to a / h by engineDims) */
  circ?: number;
  depth?: number;
}

export interface Project extends Draft {
  id: string;
  measuredH: number | null;
  /** stitch width from the 5-row measurement (rows / tube items) */
  measuredW?: number | null;
  current: number;
  created: number;
}

export const DEFAULT_DRAFT: Draft = { name: "", item: "minibag", yarnMode: "mm", yarnMm: null, object: "bag", yarn: "", weight: "medium", hook: "5호", shape: "circle", a: 15, b: 10, h: 15, handle: "short" };
