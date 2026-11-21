// 뜬 날 (My Page's 나의 기록, Kim): rows knitted per day, the time spent on 따라 뜨기 with the page visible, and
// when each work was finished. Kept in this browser (localStorage "iyarn.log"); written by 따라 뜨기 (app/track).
import { store } from "./store";

export interface KnitLog {
  /** "YYYY-MM-DD" (local) -> rows knitted that day (한 단 끝 adds one, 되돌리기 takes one back, never below 0) */
  days: Record<string, number>;
  /** milliseconds on 따라 뜨기 with the page visible */
  ms: number;
  /** project id -> when it was finished (its last row) */
  doneAt: Record<string, number>;
}
const KEY = "iyarn.log";
export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function readLog(): KnitLog {
  const l = store.get<Partial<KnitLog>>(KEY, {});
  return { days: { ...l.days }, ms: l.ms ?? 0, doneAt: { ...l.doneAt } };
}
const write = (l: KnitLog) => store.set(KEY, l);

/** 한 단 끝 (+1) / 되돌리기 (-1) on `projectId`; `finished`: that row was the last one */
export function logRow(projectId: string, d: number, finished: boolean) {
  const l = readLog(), k = dayKey(new Date());
  l.days[k] = Math.max(0, (l.days[k] ?? 0) + d);
  if (finished) l.doneAt[projectId] = Date.now();
  else if (d < 0) delete l.doneAt[projectId];
  write(l);
}

/** time on 따라 뜨기 (a stretch longer than 30 minutes counts as 30: the page left open, nobody knitting) */
export function logTime(ms: number) {
  if (ms <= 0) return;
  const l = readLog(); l.ms += Math.min(ms, 30 * 60_000); write(l);
}

/** days in a row with knitting up to today (today not knitted yet does not break it) */
export function streak(l: KnitLog, now = new Date()): number {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!(l.days[dayKey(d)] > 0)) d.setDate(d.getDate() - 1);
  let n = 0;
  while (l.days[dayKey(d)] > 0) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
