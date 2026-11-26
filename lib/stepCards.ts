// 단계 카드 (Kim: 도안 보기와 뜨는 중 화면에 "단계 카드" 보기): the pattern as a few steps instead of every row -
// a big number, a short title, two lines of what happens, one picture. A step is a part of the plan as it is
// worked (시작 사슬 / 바닥 / 몸통 / 잇기 / 마무리 ...); its two lines are made from that part's own rows, so every
// number on a card is the plan's. The picture is the step's symbol chart where stitches are counted, the 3D
// where the shape has to be seen (joining, the finished piece) - at most two 3D pictures, the last two.
import { PART_KO, type Part, type Plan, type Row } from "./pattern";

export interface StepCard {
  no: string;
  part: Part | "end";
  title: string;
  lines: [string, string];
  pic: "chart" | "3d" | "none";
  /** the step's rows in the plan: first and last index; the chart is drawn as at its last row */
  from: number; to: number;
}

const CHARTED: Part[] = ["start", "bottom", "body", "rim", "flap", "rows", "rounds", "panel", "strip", "strap"];

function linesOf(part: Part, rows: Row[], next: Part | undefined): [string, string] {
  const first = rows[0], last = rows[rows.length - 1], R = rows.length, grew = rows.some(r => r.inc > 0), shrank = rows.some(r => r.inc < 0);
  switch (part) {
    case "start": return [`사슬 ${last.n}코를 만듭니다.`, next === "rounds" ? "꼬이지 않게 고리로 이어 둘레로 뜹니다." : "이 사슬에서 첫 단을 시작합니다."];
    case "bottom": return [`${R}단 동안 늘려 한 바퀴가 ${last.n}코가 됩니다.`, "단마다 첫 코에 단수링을 걸어 시작을 표시합니다."];
    case "body": return [grew || shrank ? `${R}단을 올려 한 바퀴가 ${last.n}코가 됩니다.` : `늘림 없이 ${R}단을 올립니다.`, rows.some(r => r.wall) ? "무늬 단은 몸통 한 바퀴에 꼭 맞게 들어갑니다." : `한 바퀴는 ${last.n}코입니다.`];
    case "rim": return [`입구를 ${R}단으로 마무리합니다.`, "입구가 늘어지지 않게 단단하게 뜹니다."];
    case "flap": return [`뒤판에서 이어 ${R}단을 뜹니다.`, shrank ? `${first.n}코에서 ${last.n}코까지 줄입니다.` : `${last.n}코 그대로 뜹니다.`];
    case "handle": return rows.some(r => r.grown) ? [`입구에서 그대로 이어 ${R}단을 뜹니다.`, "두 끝을 맞대고 감침질로 잇습니다."] : [`사슬 ${first.n}코로 ${R}개를 뜹니다.`, "입구 양쪽에 단단히 연결합니다."];
    case "rows": return [`${R}단을 왕복으로 뜹니다.`, shrank ? `${first.n}코에서 ${last.n}코까지 줄입니다.` : `${last.n}코 그대로 뜹니다.`];
    case "rounds": return [`${R}단을 둘레로 뜹니다.`, `${last.n}코 그대로 뜹니다.`];
    case "panel": { const body = rows.filter(r => !/시작 사슬$/.test(r.label)); return [`${first.n}코에서 시작해 ${last.n}코까지 ${body.length}단을 뜹니다.`, grew ? "양 끝 모서리에서만 늘려 모서리를 둥글립니다." : "늘림 없이 곧게 뜹니다."]; }
    case "strip": return [`${last.n}코 너비로 ${rows.filter(r => !/시작 사슬$/.test(r.label)).length}단을 뜹니다.`, "옆과 바닥을 한 번에 맡는 띠입니다."];
    case "strap": return [`${last.n}코만 ${R}단을 뜹니다.`, "끝을 이어 끈으로 씁니다."];
    case "join": { const n = rows.find(r => r.n > 0)?.n; return [n ? `되돌아짧은뜨기 ${n}코로 잇습니다.` : "조각을 맞대어 잇습니다.", "잇기 전에 마커링으로 자리를 먼저 맞춥니다."]; }
    case "finish": return [last.how.endsWith(".") ? last.how : `${last.how}.`, "코 수는 바뀌지 않습니다."];
  }
}

/** The plan as step cards. `startName`: what a knitted piece calls its first step (코잡기). */
export function stepCards(pp: Plan, startName?: string): StepCard[] {
  const out: StepCard[] = []; let i = 0;
  while (i < pp.rows.length) {
    const part = pp.rows[i].part; let j = i; while (j + 1 < pp.rows.length && pp.rows[j + 1].part === part) j++;
    const rows = pp.rows.slice(i, j + 1);
    out.push({ no: "", part, title: part === "start" && startName ? startName : PART_KO[part], lines: linesOf(part, rows, pp.rows[j + 1]?.part), pic: CHARTED.includes(part) ? "chart" : "3d", from: i, to: j });
    i = j + 1;
  }
  // the last card is the finished piece: the plan's own last step (브러싱) when it has one
  if (!out.length || out[out.length - 1].part !== "finish") out.push({ no: "", part: "end", title: "마무리", lines: ["실을 자르고 돗바늘로 실 끝을 정리합니다.", "다 뜬 모습을 확인합니다."], pic: "3d", from: pp.rows.length, to: pp.rows.length });
  // two 3D pictures at most (each is a whole 3D of its own): the last two that ask for one
  const threeD = out.filter(c => c.pic === "3d"); threeD.slice(0, Math.max(0, threeD.length - 2)).forEach(c => { c.pic = "none"; });
  out.forEach((c, k) => { c.no = String(k + 1).padStart(2, "0"); });
  return out;
}
