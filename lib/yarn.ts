// Yarn and hook details for the 실과 바늘 step: constants, conversions and checks. The engine (lib/pattern
// gauge) keeps taking the yarn as three levels; a thickness typed in mm is converted with YARN_MM_LEVELS.
import { HOOK_MM, YARN_KO, type Weight } from "./pattern";

/** Yarn thickness (mm) -> engine level: below `thinBelow` = 가는 실, above `thickAbove` = 굵은 실, else 보통. */
export const YARN_MM_LEVELS = { thinBelow: 2.5, thickAbove: 4 };
export const YARN_MM_RANGE: [number, number] = [0.3, 30];
export const HOOK_MM_RANGE: [number, number] = [0.4, 25];
/** Hook vs yarn: below 0.6x or above 2.5x the yarn's thickness we warn (never block). */
export const HOOK_YARN_RATIO: [number, number] = [0.6, 2.5];
export const MAX_TEXT = 40;

export const MATERIALS = ["코튼", "울", "메리노", "캐시미어", "알파카", "모헤어", "아크릴", "나일론", "폴리에스터", "리넨", "실크", "대나무", "벨벳(셔닐)", "라피아", "코드사", "페이크퍼", "메탈릭", "혼방"];
/** The web's list (도안 만들기, 3D): the yarns above and more that the 3D draws each in its own way (Kim: as
 *  many to tell apart as can be). Phones keep MATERIALS. */
export const MATERIALS_WEB = [...MATERIALS.filter(m => m !== "혼방"), "앙고라", "수면사", "부클레", "수세미실", "패브릭얀", "리본얀", "황마", "혼방"];
export const HOOK_MATERIALS = ["알루미늄", "스틸", "대나무", "나무", "플라스틱"];
/** Common hook sizes shown as chips (the engine's own HOOKS table is unchanged; 7.5호 is display only). */
export const HOOK_CHIPS: [string, number][] = [["2호", 2.0], ["3호", 2.3], ["4호", 2.5], ["5호", 3.0], ["6호", 3.5], ["7호", 4.0], ["7.5호", 4.5], ["8호", 5.0], ["10호", 6.0]];

/** "3.2mm (보통)" when typed in mm, else the level ("보통"). */
export const yarnWeightText = (d: { yarnMode?: string; yarnMm?: number | null; weight: Weight }) =>
  d.yarnMode !== "level" && d.yarnMm ? `${d.yarnMm}mm (${YARN_KO[d.weight]})` : d.yarnMode === "mm" ? "—" : YARN_KO[d.weight];

export function weightFromMm(mm: number): Weight {
  return mm < YARN_MM_LEVELS.thinBelow ? "thin" : mm > YARN_MM_LEVELS.thickAbove ? "thick" : "medium";
}
/** Typed text: trimmed, at most 40 characters. */
export const clean = (s: string, max = MAX_TEXT) => s.trim().slice(0, max);
/** "3,2" and "3.2" both read as 3.2; anything else is NaN. */
export function parseNum(s: string): number {
  const t = s.trim().replace(",", ".");
  return /^\d*\.?\d+$/.test(t) ? Number(t) : NaN;
}
/** The hook in mm for a draft: hookMm, else the size name's mm, else 3. */
export const hookMmOf = (d: { hook: string; hookMm?: number | null }) => d.hookMm || HOOK_MM[d.hook] || HOOK_CHIPS.find(([k]) => k === d.hook)?.[1] || 3;
/** "5호 · 3.0mm" for a common size, else "1.25mm". */
export function hookLabel(mm: number) {
  const c = HOOK_CHIPS.find(([, v]) => v === mm);
  return c ? `${c[0]} · ${mm.toFixed(1)}mm` : `${mm}mm`;
}
/** Hook too thin / too thick for the yarn, or null. Only when both are known in mm. */
export function hookYarnMismatch(hookMm: number, yarnMm?: number | null): "thin" | "thick" | null {
  if (!yarnMm) return null;
  const r = hookMm / yarnMm;
  return r < HOOK_YARN_RATIO[0] ? "thin" : r > HOOK_YARN_RATIO[1] ? "thick" : null;
}
