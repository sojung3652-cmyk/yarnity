// 도안 글 규칙 (Kim: 실제 도안들에서 배운 원리 - 문장은 우리 말로): what the pattern says beside each row, put on
// the rows as they are shown (lib/knit shownPlan) - the plan's own counts are not touched.
//   반복 문구   a run of the same row: its first says "이 단을 총 n번 반복합니다" (itself included), the next "위와
//               같은 단을 n번 더 반복합니다" (only the ones after it) - so 총 n = 1 + n번 더, always. The first time
//               the words come, one line says which is which.
//   마커 이유   a row that hangs a marker says why
import { gauge, type Plan, type PlanInput, type Row } from "./pattern";
import { HOOK_CHIPS, hookMmOf } from "./yarn";

export const REPEAT_NOTE = "총 n번은 이 단을 포함한 횟수이고, n번 더는 이 단 다음부터 더 뜨는 횟수입니다";
export const MARKER_WHY = "마커는 부분별 코 수와 단의 시작을 확인하려는 것입니다";
/** a run this long or longer is said as a repeat */
export const REPEAT_MIN = 3;

/** two rows that are the same row: the same part, stitches, words, nothing gained or lost, nothing special */
const same = (a: Row, b: Row) => a.part === b.part && a.n === b.n && !a.inc && !b.inc && a.how === b.how && !a.border && !b.border && !a.wall && !b.wall && !a.grown && !b.grown && a.part !== "join" && a.part !== "finish" && a.part !== "start";

/** the runs of the same row: [first index, how many] */
export function repeatRuns(rows: Row[]): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < rows.length;) { let j = i; while (j + 1 < rows.length && same(rows[i], rows[j + 1])) j++; if (j - i + 1 >= REPEAT_MIN) out.push([i, j - i + 1]); i = j + 1; }
  return out;
}

export function phrased(pp: Plan): Plan {
  const rows = pp.rows.map(r => ({ ...r }));
  repeatRuns(rows).forEach(([i, k], q) => {
    rows[i].why = `${rows[i].why} · 이 단을 총 ${k}번 반복합니다${q === 0 ? ` (${REPEAT_NOTE})` : ""}`;
    rows[i + 1].why = `${rows[i + 1].why} · 위와 같은 단을 ${k - 1}번 더 반복합니다`;
  });
  for (const r of rows) if (/마커|단수링/.test(r.how) && !/확인|않게|위해|려는|표시/.test(r.why)) r.why = `${r.why} · ${MARKER_WHY}`;
  return { ...pp, rows };
}

// ---------------------------------------------------------------- 게이지 안내 · 바늘 추천 (Kim)
export const GAUGE_NOTE = "내 게이지 코 수가 도안보다 많으면 한 치수 굵은 바늘, 적으면 한 치수 가는 바늘로 바꿉니다.";
/** the pattern's own gauge: stitches and rows in 10cm, as its counts are worked out (before any measuring) */
export function patternGauge(p: PlanInput): { st10: number; rows10: number } {
  const g = gauge({ ...p, measuredH: null });
  return { st10: Math.round(100 / g.w) / 10, rows10: Math.round(100 / g.h) / 10 };
}
/** The reader's gauge against the pattern's: more stitches in 10cm than the pattern - the hand is tighter, a size
 *  bigger hook; fewer - a size smaller. Within half a stitch: the same. `to`: the size advised (null: keep it). */
export function needleAdvice(p: PlanInput, mySt10: number): { text: string; to: string | null } {
  const { st10 } = patternGauge(p), d = Math.round((mySt10 - st10) * 10) / 10, mm = hookMmOf(p);
  let i = 0; HOOK_CHIPS.forEach(([, m], k) => { if (Math.abs(m - mm) < Math.abs(HOOK_CHIPS[i][1] - mm)) i = k; });
  const cur = HOOK_CHIPS[i][0], base = `도안 기준은 10cm에 ${st10}코입니다.`;
  if (Math.abs(d) < .5) return { text: `${base} 내 게이지와 같으니 이 바늘 그대로 뜹니다.`, to: null };
  const j = d > 0 ? i + 1 : i - 1, to = HOOK_CHIPS[j]?.[0] ?? null;
  if (!to) return { text: `${base} 내 코가 ${Math.abs(d)}코 ${d > 0 ? "많지만" : "적지만"} 더 ${d > 0 ? "굵은" : "가는"} 바늘이 목록에 없습니다. 실을 바꾸거나 손땀을 ${d > 0 ? "느슨하게" : "촘촘하게"} 해 보십시오.`, to: null };
  return { text: `${base} 내 코가 ${Math.abs(d)}코 ${d > 0 ? "많으니 한 치수 굵은" : "적으니 한 치수 가는"} 바늘(${cur} → ${to})을 권합니다.`, to };
}
