// Phones: which sheet of a 도안 만들기 step the book's right page shows. A step the web lays over two pages is
// two sheets on a phone (MobileBookWizard), and moving between them turns the 3D book's page like moving
// between steps (Book3D reads this into its spread). Kept per step, so coming back to a step lands where you
// left it (the 이전 from the next step's first sheet sets it to the last sheet first).
import { useSyncExternalStore } from "react";

/** sheets per step on a phone: 1 이름, 2 품목 (고르기 / 소개), 3 실과 크기 (실 / 바늘과 크기), 4 확인 (준비물 / 미리 보기) */
export const SHEETS: Record<number, number> = { 1: 1, 2: 2, 3: 2, 4: 2 };

let state: Record<number, number> = {};
const subs = new Set<() => void>();
/** the web's 3D book: step 3 is up to three spreads (실 / 바늘과 크기 / 가방 모양 for a bag) */
export const WEB_SHEETS3 = 3;
/** `max`: sheets of that step to allow (default: the phone's SHEETS) */
export const sheetOf = (step: number, max = SHEETS[step] ?? 1) => Math.min(state[step] ?? 0, max - 1);
export function setSheet(step: number, sheet: number) {
  if (state[step] === sheet) return;
  state = { ...state, [step]: sheet }; subs.forEach(f => f());
}
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
export function useSheet(step: number, max?: number) {
  return useSyncExternalStore(subscribe, () => sheetOf(step, max), () => 0);
}
