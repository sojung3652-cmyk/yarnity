// 여러 사이즈 한 번에 (Kim: S/M/L을 고를 수 있으면 도안 글에 "70 (78) 90코"처럼 S (M) L 순서로 함께): the starters
// that come in sizes, and the pattern written for the three at once - each number of a row as S (M) L, taken from
// each size's own plan (its rows, its counts: the formula worked out three times), never made up between them.
// A row is written for three only where the three plans have it - the same part, the same place in it, the same
// words but for their numbers; else it is the size picked alone.
import type { Plan, PlanInput, Row } from "./pattern";

export type SizeKey = "S" | "M" | "L";
export const SIZE_KEYS: SizeKey[] = ["S", "M", "L"];
export interface SizeSet { key: "bust" | "circ"; label: string; v: [number, number, number] }
/** the starters with sizes: which size it is set by, what it is called, S, M and L (cm) */
export const SIZES: Partial<Record<string, SizeSet>> = {
  knittop: { key: "bust", label: "가슴", v: [84, 92, 100] },
  bustier: { key: "bust", label: "가슴", v: [76, 84, 92] },
  halter: { key: "bust", label: "가슴", v: [76, 84, 92] },
  buckethat: { key: "circ", label: "머리", v: [54, 56, 58] },
  bonnet: { key: "circ", label: "머리", v: [54, 56, 58] },
};
export const SIZE_NOTE = "내 사이즈의 숫자에 미리 표시해 두면 편합니다.";
/** the size the piece is at (null: a size of its own, or none) */
export function sizeOf(d: { item?: string | null } & Partial<Record<"bust" | "circ", number | null>>): 0 | 1 | 2 | null {
  const s = d.item ? SIZES[d.item] : undefined; if (!s) return null;
  const i = s.v.indexOf(Number(d[s.key])); return i < 0 ? null : (i as 0 | 1 | 2);
}
const NUM = /\d+(?:\.\d+)?/g;
const mask = (s: string) => s.replace(NUM, "#");
/** a row's place: its part, and which of that part's rows it is */
const places = (rows: Row[]) => { const k: Record<string, number> = {}; return rows.map(r => `${r.part}:${(k[r.part] = (k[r.part] ?? -1) + 1)}`); };

/** The pattern for the three sizes at once (S (M) L). `shown`: the plan as the pattern shows it, for a piece at a
 *  size. Each row of the size picked: its numbers as S (M) L where the three plans have that row; `nSizes` the
 *  three counts beside it. Null: the piece has no sizes, or is at a size of its own. */
export function multiSized(p: PlanInput, shown: (q: PlanInput) => Plan): { plan: Plan; chosen: 0 | 1 | 2 } | null {
  const s = p.item ? SIZES[p.item] : undefined, chosen = sizeOf(p as never); if (!s || chosen == null) return null;
  const plans = s.v.map(v => shown({ ...p, [s.key]: v } as PlanInput)), at = plans.map(pl => new Map(places(pl.rows).map((k, i) => [k, pl.rows[i]])));
  const mine = plans[chosen], keys = places(mine.rows);
  const rows = mine.rows.map((r, i) => {
    const three = at.map(m => m.get(keys[i]));
    if (three.some(x => !x) || three.some(x => mask(x!.how) !== mask(r.how))) return r;
    const nums = three.map(x => x!.how.match(NUM) ?? []);
    let k = 0; const how = r.how.replace(NUM, () => { const j = k++; const [a, b, c] = nums.map(v => v[j]); return a === b && b === c ? a : `${a} (${b}) ${c}`; });
    return { ...r, how, ...(three.some(x => x!.n !== r.n) ? { nSizes: three.map(x => x!.n) as [number, number, number] } : {}) };
  });
  return { plan: { ...mine, rows }, chosen };
}
