// 단계 카드 (Kim: 도안 보기와 뜨는 중 화면에 "단계 카드" 보기): the pattern as a few steps instead of every row -
// a big number, a short title, two lines of what happens, one picture. A step is a part of the plan as it is
// worked (시작 사슬 / 바닥 / 몸통 / 잇기 / 마무리 ...); its two lines are made from that part's own rows, so every
// number on a card is the plan's. The picture is the step's symbol chart where stitches are counted, the 3D
// where the shape has to be seen (joining, the finished piece) - at most two 3D pictures, the last two.
import { partKo, type Part, type Plan, type Row } from "./pattern";

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

/** 모자·소품 기본형 (lib/wear): the steps that are not a bag's say what they are themselves */
function wearLines(item: string, part: Part, rows: Row[]): [string, string] | null {
  const first = rows[0], last = rows[rows.length - 1], R = rows.length, top = Math.max(...rows.map(r => r.n)), posts = rows.filter(r => r.post === 0).length;
  if (rows.some(r => r.motif)) {
    const names = new Set(rows.map(r => r.motif!.name)), rounds = Math.max(...rows.map(r => r.motif!.r));
    return [names.size > 1 ? `${rounds}단짜리 사각 모티프를 ${names.size}장 뜹니다.` : `사각 모티프 1장을 ${rounds}단까지 뜹니다.`, `마지막 단은 한 변 ${2 * rounds}코, 한 바퀴 ${8 * rounds}코입니다.`];
  }
  if (part === "join" && (item === "motifhat" || item === "earflap")) { const n = rows.filter(r => r.n > 0).map(r => r.n); return [n.length ? `두 겹을 함께 떠서 짧은뜨기 ${n.join("코, ")}코로 잇습니다.` : "조각을 맞대어 잇습니다.", item === "earflap" ? "접힌 선이 뒤통수 가운데로 갑니다." : "겉이 밖으로 오게 맞대어, 이은 선이 겉에서 보입니다."]; }
  switch (item + ":" + part) {
    case "buckethat:bottom": case "hoodscarf:bottom": return [`${R}단 동안 늘려 한 바퀴가 ${last.n}코가 됩니다.`, "이 둘레가 머리둘레입니다. 단마다 첫 코에 단수링을 겁니다."];
    case "buckethat:body": return [`늘림 없이 ${R}단을 내려 뜹니다.`, `한 바퀴는 ${last.n}코입니다.`];
    case "buckethat:rim": return [`챙을 ${R}단 뜹니다.`, `단마다 조금씩 늘려 ${top}코까지 넓힙니다.`];
    case "buckethat:join": return ["챙을 접는 선에서 안으로 접어 감침질로 잇습니다.", "두 겹 챙이 됩니다."];
    case "hoodscarf:panel": return [`${last.n}코로 ${R}단을 왕복해 내려 뜹니다.`, "뜨지 않고 남긴 코가 얼굴 자리입니다."];
    case "hoodscarf:strap": return [`양 끝 ${last.n}코씩 ${posts}단을 뜹니다.`, "두 줄이 스카프 끈이 됩니다."];
    case "earflap:panel": return [`사슬 ${first.n}코에서 ${rows.filter(r => !/시작 사슬$/.test(r.label)).length}단을 내려 뜹니다.`, "시작 사슬이 정수리 선입니다."];
    case "earflap:strap": return [`양 끝 ${last.n}코씩 ${posts}단을 뜹니다.`, "두 줄이 귀덮개가 됩니다."];
    case "earflap:rim": return [`얼굴선을 따라 ${last.n}코로 ${R}단을 뜹니다.`, "앞걸어와 뒤걸어를 번갈아 세로 골을 만듭니다."];
    case "kerchief:rows": return [`${R}단을 왕복으로 뜹니다.`, `${first.n}코에서 ${last.n}코까지 단마다 늘립니다.`];
    case "kerchief:handle": return [`사슬 ${last.n}코로 묶는 끈을 ${R}개 뜹니다.`, "긴 변의 양 끝에 하나씩 답니다."];
    case "backpack:handle": return [`아래 고리 ${R - 1}개와 조임끈을 뜹니다.`, "끈은 입구를 한 바퀴 지나 양쪽 아래 고리에 묶습니다."];
  }
  return null;
}

function linesOf(part: Part, rows: Row[], next: Part | undefined, item?: string | null): [string, string] {
  const first = rows[0], last = rows[rows.length - 1], R = rows.length, grew = rows.some(r => r.inc > 0), shrank = rows.some(r => r.inc < 0);
  const own = item ? wearLines(item, part, rows) : null; if (own) return own;
  switch (part) {
    case "start": return [`사슬 ${last.n}코를 만듭니다.`, next === "rounds" ? "꼬이지 않게 고리로 이어 둘레로 뜹니다." : "이 사슬에서 첫 단을 시작합니다."];
    case "bottom": return [`${R}단 동안 늘려 한 바퀴가 ${last.n}코가 됩니다.`, "단마다 첫 코에 단수링을 걸어 시작을 표시합니다."];
    case "body": return [grew || shrank ? `${R}단을 올려 한 바퀴가 ${last.n}코가 됩니다.` : `늘림 없이 ${R}단을 올립니다.`, rows.some(r => r.wall) ? "무늬 단은 몸통 한 바퀴에 꼭 맞게 들어갑니다." : `한 바퀴는 ${last.n}코입니다.`];
    case "rim": return [`입구를 ${R}단으로 마무리합니다.`, "입구가 늘어지지 않게 단단하게 뜹니다."];
    case "flap": return [`뒤판에서 이어 ${R}단을 뜹니다.`, shrank ? `${first.n}코에서 ${last.n}코까지 줄입니다.` : `${last.n}코 그대로 뜹니다.`];
    case "handle": return rows.some(r => r.grown) ? [`입구에서 그대로 이어 ${R}단을 뜹니다.`, "두 끝을 맞대고 감침질로 잇습니다."] : [`사슬 ${first.n}코로 ${R}개를 뜹니다.`, "입구 양쪽에 단단히 연결합니다."];
    case "rows": return [`${R}단을 왕복으로 뜹니다.`, shrank ? `${first.n}코에서 ${last.n}코까지 줄입니다.` : `${last.n}코 그대로 뜹니다.`];
    case "rounds": return [`${R}단을 둘레로 뜹니다.`, `${last.n}코 그대로 뜹니다.`];
    case "panel": { const body = rows.filter(r => !/시작 사슬$/.test(r.label)), sheets = new Set(body.map(r => r.label.slice(0, 2))).size || 1; return [`${first.n}코에서 시작해 ${last.n}코까지 ${body.length / sheets}단을 뜹니다${sheets > 1 ? `. 같은 판을 ${sheets}장 뜹니다` : ""}.`, grew ? "양 끝 모서리에서만 늘려 모서리를 둥글립니다." : "늘림 없이 곧게 뜹니다."]; }
    case "strip": return [`${last.n}코 너비로 ${rows.filter(r => !/시작 사슬$/.test(r.label)).length}단을 뜹니다.`, "옆과 바닥을 한 번에 맡는 띠입니다."];
    case "strap": return [`${last.n}코만 ${R}단을 뜹니다.`, "끝을 이어 끈으로 씁니다."];
    case "join": { const n = rows.find(r => r.n > 0)?.n; return [n ? `되돌아짧은뜨기 ${n}코로 잇습니다.` : "조각을 맞대어 잇습니다.", "잇기 전에 마커링으로 자리를 먼저 맞춥니다."]; }
    case "finish": return [last.how.endsWith(".") ? last.how : `${last.how}.`, "코 수는 바뀌지 않습니다."];
  }
}

/** The plan as step cards. `startName`: what a knitted piece calls its first step (코잡기). */
export function stepCards(pp: Plan, startName?: string, item?: string | null): StepCard[] {
  const out: StepCard[] = []; let i = 0;
  while (i < pp.rows.length) {
    const part = pp.rows[i].part; let j = i; while (j + 1 < pp.rows.length && pp.rows[j + 1].part === part) j++;
    const rows = pp.rows.slice(i, j + 1);
    out.push({ no: "", part, title: part === "start" && startName ? startName : partKo(part, item), lines: linesOf(part, rows, pp.rows[j + 1]?.part, item), pic: CHARTED.includes(part) ? "chart" : "3d", from: i, to: j });
    i = j + 1;
  }
  // the last card is the finished piece: the plan's own last step (브러싱) when it has one
  if (!out.length || out[out.length - 1].part !== "finish") out.push({ no: "", part: "end", title: "마무리", lines: ["실을 자르고 돗바늘로 실 끝을 정리합니다.", "다 뜬 모습을 확인합니다."], pic: "3d", from: pp.rows.length, to: pp.rows.length });
  // two 3D pictures at most (each is a whole 3D of its own): the last two that ask for one
  const threeD = out.filter(c => c.pic === "3d"); threeD.slice(0, Math.max(0, threeD.length - 2)).forEach(c => { c.pic = "none"; });
  out.forEach((c, k) => { c.no = String(k + 1).padStart(2, "0"); });
  return out;
}
