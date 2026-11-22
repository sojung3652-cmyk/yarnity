// A pattern (draft / saved work + its plan) -> the yarn engine's input. Light: no three.js here, so the
// "3D로 보기" button can decide whether to show without loading the engine.
// Only round pieces worked upward from the centre: coasters and bags with a round bottom. Oval / rect
// bottoms, flat rows and tubes have no 3D yet (the engine lays every round on a circle), so they get null.
import type { Plan, PlanInput } from "@/lib/pattern";
import { hookMmOf } from "@/lib/yarn";
import type { YarnMaterial, YarnPattern } from "./engine";

/** the pattern's own fields the engine reads (Draft and Project both have them) */
export interface YarnSource extends PlanInput {
  color?: string;
  yarnMm?: number | null;
  materials?: string[];
}

// no thickness typed (only thin / medium / thick picked): the middle of each level in lib/yarn.ts
// YARN_MM_LEVELS (thin < 2.5mm, thick > 4mm)
const LEVEL_MM: Record<string, number> = { thin: 2, medium: 3, thick: 5 };
// no colour picked: the prototype's ivory
const DEFAULT_COLOR = "#EFE6D4";
// the pattern's yarn material (lib/yarn.ts MATERIALS) -> the engine's look; anything else stays cotton
const MAT: Record<string, YarnMaterial> = { 울: "wool", 메리노: "wool", 캐시미어: "wool", 알파카: "wool", 아크릴: "wool", 모헤어: "mohair" };

export function yarn3dSupported(p: PlanInput): boolean {
  return (p.object === "coaster" || p.object === "bag") && p.shape === "circle";
}

export function toYarnPattern(p: YarnSource, pp: Plan): YarnPattern | null {
  if (!yarn3dSupported(p)) return null;
  // the rounds worked upward: bottom, body, rim (handles and a flap are worked separately)
  const color = /^#[0-9a-f]{6}$/i.test(p.color ?? "") ? p.color! : DEFAULT_COLOR;
  const rounds = pp.rows.filter(r => r.part === "bottom" || r.part === "body" || r.part === "rim").map(r => ({ count: r.n, color }));
  if (rounds.length < 2) return null;
  const handleCm = p.handleCm && p.handleCm > 0 ? p.handleCm : p.handle === "long" ? 90 : 25;
  const strap = p.object !== "bag" || p.handle === "none" ? "none" : handleCm >= 60 ? "long" : "two";
  const material = (p.materials ?? []).map(m => MAT[m]).find(Boolean) ?? "cotton";
  return { rounds, yarnMm: p.yarnMm || LEVEL_MM[p.weight] || 3, hookMm: hookMmOf(p), strap, material };
}
