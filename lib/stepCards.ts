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
  if (rows.some(r => r.disc)) {
    const sheets = new Set(rows.map(r => r.disc!.name)).size, rounds = Math.max(...rows.map(r => r.disc!.r)), hole = rows.find(r => r.disc!.hole);
    return [`${rounds}단짜리 원을 ${sheets}장 뜹니다. 마지막 단은 ${6 * rounds}코입니다.`, hole ? `${hole.disc!.r}단에서 사슬 ${hole.disc!.hole}코로 손잡이 구멍을 냅니다.` : "단마다 6코씩 늘립니다."];
  }
  if (part === "join" && (item === "motifhat" || item === "earflap" || item === "bustier")) { const n = rows.filter(r => r.n > 0).map(r => r.n); return [n.length ? `두 겹을 함께 떠서 짧은뜨기 ${n.join("코, ")}코로 잇습니다.` : "조각을 맞대어 잇습니다.", item === "earflap" ? "접힌 선이 뒤통수 가운데로 갑니다." : "겉이 밖으로 오게 맞대어, 이은 선이 겉에서 보입니다."]; }
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
    case "knotbag:panel": return [`사슬 ${first.n}코로 ${rows.length - 1}단을 뜹니다.`, "반 접을 판입니다. 가운데 단이 바닥이 됩니다."];
    case "knotbag:strap": return [`양 끝 ${last.n}코씩을 ${rows.filter(r => r.post === 0).length}단과 ${rows.filter(r => r.post === 1).length}단으로 이어 뜹니다.`, "짧은 쪽이 고리, 긴 쪽이 끈입니다."];
    case "twoway:panel": { const body = rows.filter(r => !/시작 사슬$/.test(r.label)), eye = body.find(r => r.eyelet); return [`${last.n}코로 ${body.length / 2}단을 뜹니다. 같은 판을 2장 뜹니다.`, eye ? `${eye.label.replace(/^\S+ /, "")}이 끈 구멍 단입니다.` : "늘림 없이 곧게 뜹니다."]; }
    case "twoway:handle": return ["손잡이 2개와 조임끈을 뜹니다.", "조임끈은 끈 구멍 단에 한 바퀴 꿰어 묶습니다."];
    // (the rounds over the face are the same part again: they begin with the round that crosses the hole)
    case "balaclava:body": return rows.some(r => r.bridge) ? [`얼굴 구멍 위를 사슬로 건너 다시 ${R}단을 둘레로 뜹니다.`, `한 바퀴는 ${last.n}코 그대로입니다.`] : [`목에서 시작해 ${R}단을 둘레로 올립니다.`, `한 바퀴는 ${first.n}코에서 ${top}코가 됩니다.`];
    case "balaclava:panel": return [`얼굴 자리를 남기고 ${last.n}코로 ${R}단을 왕복합니다.`, "다음 단에서 사슬로 구멍 위를 건넙니다."];
    case "balaclava:rim": return [`정수리를 ${R}단 동안 줄여 닫습니다.`, "단마다 6코씩 줄입니다."];
    case "balaclava:join": return ["작은 원 두 장을 정수리 양옆에 답니다.", "코 수는 바뀌지 않습니다."];
    case "motifscarf:join": { const n = rows.find(r => r.n > 0)?.n; return [n ? `두 겹을 함께 떠서 짧은뜨기 ${n}코로 잇습니다.` : "모티프를 맞대어 잇습니다.", "겉이 밖으로 오게 맞대어, 이은 선이 겉에서 보입니다."]; }
    case "bigsocks:bottom": return [`발끝을 ${R}단 동안 늘려 한 바퀴가 ${last.n}코가 됩니다.`, "단마다 첫 코에 단수링을 걸어 시작을 표시합니다."];
    case "bigsocks:body": return [`늘림 없이 ${R}단을 통으로 뜹니다.`, `한 바퀴는 ${last.n}코, 발과 목이 한 통입니다.`];
    case "bigsocks:rim": return [`접는 선 한 단과 접는 단 ${R - 1}단을 뜹니다.`, "다 뜬 뒤 밖으로 접어 내립니다."];
    case "ringbag:handle": return [`앞뒤 가운데 ${last.n}코씩을 링에 감싸 붙입니다.`, "링을 코 안에 넣고 짧은뜨기로 감쌉니다."];
    case "trapbag:panel": { const body = rows.filter(r => !/시작 사슬$/.test(r.label)); return [`${first.n}코에서 ${top}코까지 ${body.length / 2}단을 뜹니다. 같은 판을 2장 뜹니다.`, "양 끝에서 고르게 늘려 사다리꼴을 만듭니다."]; }
    case "trapbag:handle": return [`입구에서 이어 ${last.n}코로 ${R}단을 뜹니다.`, "끝을 반대쪽 옆선에 맞대고 감침질로 잇습니다."];
    case "bonnet:bottom": return [`${R}단 동안 늘려 한 바퀴가 ${last.n}코가 됩니다.`, "이 둘레가 머리둘레입니다. 단마다 첫 코에 단수링을 겁니다."];
    case "bonnet:panel": return [`${last.n}코로 ${R}단을 왕복해 내려 뜹니다.`, "뜨지 않고 남긴 코가 얼굴 자리입니다."];
    case "bonnet:handle": return [`사슬 ${last.n}코로 턱끈을 ${R}개 뜹니다.`, "아래 양 끝에 하나씩 답니다."];
    case "bustier:flap": return [`${first.n}코에서 ${last.n}코까지 줄여 컵을 ${rows.filter(r => r.n === first.n).length}개 뜹니다.`, "단마다 양 끝에서 한 코씩 줄입니다."];
    case "bustier:handle": return [`사슬 ${last.n}코로 어깨끈을 ${R}개 뜹니다.`, "컵 꼭대기에서 이어 뜹니다."];
    case "halter:flap": return [`앞쪽만 ${R}단을 왕복해 뜹니다.`, "단마다 아치 하나씩 줄여 V로 모읍니다."];
    case "halter:handle": return [`사슬 ${last.n}코로 목끈을 ${R}개 뜹니다.`, "V 꼭대기 양쪽에 하나씩 답니다."];
    case "stepbag:flap": return [`뒤판에서 이어 ${R}단을 뜹니다.`, `${first.n}코에서 ${last.n}코까지 계단처럼 줄입니다.`];
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
