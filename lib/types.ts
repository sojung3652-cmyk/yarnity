import type { Handle, ObjectKind, Shape, Weight } from "./pattern";

export interface Draft {
  name: string;
  object: ObjectKind;
  yarn: string;
  weight: Weight;
  hook: string;
  shape: Shape;
  a: number;
  b: number;
  h: number;
  handle: Handle;
}

export interface Project extends Draft {
  id: string;
  measuredH: number | null;
  current: number;
  created: number;
}

export const DEFAULT_DRAFT: Draft = { name: "연핑크 미니 손가방", object: "bag", yarn: "면 혼방 합사", weight: "medium", hook: "5호", shape: "circle", a: 15, b: 10, h: 15, handle: "short" };
