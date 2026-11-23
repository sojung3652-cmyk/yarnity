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
  /** how hairy the 3D draws the yarn (web: 털 양 / 털 길이 on the 실 page; 1 = the material's own). Only a look. */
  fuzzK?: number;
  hairK?: number;
  /** a shape drawn by the reader (web: 직접 그리기); the rounds follow it (lib/pattern.ts planFree) */
  free?: import("./pattern").FreeShape;
  /** 직접 그리기 · 자유롭게 (Kim): the painted picture, worked flat in rows (lib/pattern planPaint) */
  paint?: import("./pattern").PaintShape;
  /** web, the 3D only: strands in the handle (1-5; 3 when missing), and 단추 / 라벨 / 지퍼 tried on */
  handleW?: number;
  /** the handle as it is made (Kim): 평면 - a chain joining its two ends, then rows along it widen it (flat-chain),
   *  or single crochet as wide as it should be, then row after row to its other end (flat-rows) - or 원통형, worked
   *  round (tube). Missing: strands side by side (handleW). `handleWcm`: the flat one's width, the tube's thickness */
  handleStyle?: "flat-chain" | "flat-rows" | "tube";
  handleWcm?: number;
  /** 단추 / 라벨 / 지퍼 (the 3D only), where and how big: [across -1..1, up 0..1, size cm]; 지퍼 0 closed .. 1 open */
  extras?: { button?: boolean; label?: boolean; zipper?: boolean; buttonAt?: [number, number, number]; labelAt?: [number, number, number]; zipOpen?: number; buttonColor?: string; zipColor?: "gold" | "silver" | "brass"; tab?: boolean;
    /** Kim's button and label pictures (lib/extras), when one is picked */
    buttonPic?: string; labelPic?: string;
    /** more buttons and labels (Kim: 여러 개): a picture (lib/extras) at [across, up, size cm] */
    items?: { pic: string; at: [number, number, number] }[] };
  /** the crochet stitch (Kim: 코바늘 무늬; lib/pattern CROCHET) */
  crochetStitch?: import("./pattern").CrochetStitch;
  /** a crochet stitch pattern drawn as a chart (lib/crochetChart), and the named pattern picked (lib/stitchPatterns) */
  crochetChart?: import("./crochetChart").ChartKey;
  pattern?: string;
  /** a bag's flap outline below the front edge (3D) and how many handles: 1 across the top, or 2 */
  flapShape?: "half" | "square" | "triangle";
  /** how far a bag's top stays open, cm (Kim: with a flap the top closes to this; 0 shut as a zipper's) */
  topGapCm?: number | null;
  /** the draft holds a saved work opened with 고치기 (Kim: a made work is changed only that way) - never shown as
   *  something to go on with */
  editOf?: string;
  /** how the top closes (Kim): "spread" the sides go out; "tuck" the width kept, the sides folded in */
  topFold?: "spread" | "tuck";
  handleCount?: 1 | 2;
  /** a band handle (a chain, then this many rows of 짧은뜨기 along it); the 3D left to its own weight */
  handleRows?: number;
  drape?: boolean;
  /** a drawn body's silhouette (lib/pattern PlanInput.profile) and the colours of its parts when they differ */
  profile?: number[];
  /** a drawn bag's depth against its width at the same heights (its side view; none: a round handbag's) */
  depthProfile?: number[];
  /** 조립하기: the body's form as dragged (lib/assemble BodyForm); topA / profile are made from it */
  asm?: { top: number; belly: number; round: number };
  /** the needle (Kim: 바늘에 따라 무늬): 코바늘 or 대바늘; none = the item's own (목도리 knitted, the rest crocheted) */
  craft?: "crochet" | "knit";
  flapColor?: string;
  handleColor?: string;
  /** how the top is closed (Kim): open, a flap (flapCm), a drawstring through an eyelet round, a zipper,
   *  or a button (the whole piece is drawn in 그려서 만들기, not its opening alone - Kim) */
  closure?: "open" | "flap" | "drawstring" | "zipper" | "button";
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

export interface YarnColor { hex?: string; name?: string; no?: string; lot?: string;
  /** an added yarn (Kim: 실 추가): its material, and whether it is held together with the main yarn (합사) */
  material?: string; held?: boolean;
  /** the same as the main yarn's (Kim: 실 1이랑 똑같이) */
  yarnMm?: number | null; yarnMode?: "mm" | "level"; weight?: import("./pattern").Weight; materials?: string[]; blend?: string;
  fuzzK?: number; hairK?: number; yarn?: string; skeinG?: number | null; skeinM?: number | null; skeins?: number | null }

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
