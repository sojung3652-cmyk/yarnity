// Shared between the /api/chat route and the client. No secrets here.

import { HANDLE_PRESETS, ITEMS, isStarterOnly } from "./items";

// System prompt for "AI와 상의하기" in 도안 만들기 (components/newbook/AiPanel.tsx). The item list and the
// ranges come from lib/items.ts, so the model knows exactly what the app can calculate. Every value it
// proposes is checked again on the client (lib/aiApply.ts) and only applied when the user presses 책에 적용.
const itemLines = ITEMS.filter(it => !isStarterOnly(it)).map(it => {
  const r = Object.entries(it.range).map(([k, v]) => `${k} ${v![0]}~${v![1]}`).join(", ");
  return `- ${it.id}: ${it.name} (${it.group}${it.shapes ? `, 모양 ${it.shapes.join("/")}` : ""}${it.handles ? ", 손잡이" : ""}; ${r})`;
}).join("\n");

export const RULES = `너는 'Yarnity'의 코바늘 도안 상담 도우미 'Yarni'(야니)야. 이름을 물으면 Yarni라고 답해. 사용자는 코바늘 초보(사슬뜨기·짧은뜨기 정도)야.
역할: 무엇을 뜰지, 모양·크기, 실과 바늘, 색을 쉬운 한국어로 함께 정해. 한 번에 질문은 하나만, 답은 2~4문장.
말투: reply는 항상 '~습니다/~입니다'로 끝나는 합니다체로 써. '~요'로 끝나는 해요체는 쓰지 마. 질문도 '~습니까?/~하시겠습니까?'로 해.
매 메시지 끝의 (지금 상태: ...)는 사용자가 책에 적어 둔 값과 지금 단계야. 그 단계에 맞는 도움을 먼저 줘.
앱이 계산할 수 있는 품목(id: 이름; 보통 뜨는 크기 cm, a=지름 또는 가로, b=세로, h=높이, circ=머리 둘레, depth=깊이). 크기에 제한은 없어: 사용자가 원하면 이 범위를 벗어난 크기(1~3000cm)도 그대로 제안해:
${itemLines}
가방(미니 손가방·버킷백·파우치)은 topA(입구가 넓어지는 몸통의 입구 cm, a보다 커야 함), flapCm(덮개 길이 cm)도 정할 수 있어.
손잡이가 있는 품목은 handleCm(길이 제한 없음; 추천 ${HANDLE_PRESETS.map(([n, v]) => `${n} ${v}`).join(", ")}) 또는 "handle":"none".
실 굵기 yarnMm(0.3~30, 실 가닥 폭 mm), 바늘 hookMm(0.4~25), 색 colorName과 color("#rrggbb").
목록에 없는 것은 아직 계산할 수 없다고 솔직히 말하고 가장 가까운 품목을 제안해.
절대 규칙: 코 수나 단 수는 쓰지 마. 계산은 앱의 공식이 해.
사진을 받으면: 작품 사진이면 품목·모양·대략의 크기를, 실 라벨 사진이면 실 굵기·권장 바늘·무게·길이·색 번호를 읽어 줘. 보이지 않는 부분은 짐작이라고 밝혀.
JSON 하나로만 답해: {"reply":"2~4문장","set":{"item":"id","shape":"circle|oval|rect","a":0,"b":0,"h":0,"circ":0,"depth":0,"topA":0,"flapCm":0,"handleCm":0,"yarnMm":0,"hookMm":0,"colorName":"","color":"#rrggbb","name":"작품 이름"},"chips":["사용자가 누를 짧은 답 2~4개"]}
set에는 이번에 새로 제안하는 값만 넣고, 나머지 키는 빼.`;

export interface ChatReply {
  reply: string;
  set: Record<string, unknown>;
  chips: string[];
  /** a short title for the conversation (asked for with the first answer only) */
  title?: string;
}

export interface ChatRequest {
  messages: { role: "user" | "assistant"; content: string }[];
  image?: { data: string; mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" };
  /** the first answer of a conversation also names it ("title") */
  wantTitle?: boolean;
  /** how Yarni calls the user (My Page's 나의 프로필) */
  nickname?: string;
}

/** added to RULES for the first answer: the conversation's title comes with it (no second call) */
export const TITLE_RULE = `\n이번 답의 JSON에는 "title":"이 대화의 제목(20자 이내, 명사형, 따옴표·마침표 없이)"도 넣어.`;

/** The stream's last line when something went wrong after the answer had started (the status is already 200). */
export const STREAM_ERR = "\u0000ERR:";

/**
 * The reply text so far, from a model answer still arriving (the JSON is cut anywhere): the "reply" string up
 * to where it has come, its escapes read; an escape cut in half waits for the next piece. "" before it starts.
 */
export function partialReply(raw: string): string {
  const m = /"reply"\s*:\s*"/.exec(raw);
  if (!m) return "";
  let out = "";
  for (let i = m.index + m[0].length; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === '"') break;
    if (ch !== "\\") { out += ch; continue; }
    const n = raw[i + 1];
    if (n === undefined) break;
    if (n === "u") { const hex = raw.slice(i + 2, i + 6); if (hex.length < 4) break; out += String.fromCharCode(parseInt(hex, 16)); i += 5; continue; }
    out += n === "n" ? "\n" : n === "t" ? "\t" : n === "r" ? "" : n; i++;
  }
  return out;
}

export type ChatErrorCode = "not_configured" | "not_granted" | "rate_limited" | "image_rejected" | "invalid_json" | "refused" | "bad_request" | "upstream";

/**
 * Tolerant JSON parsing of a model reply (Rule 5: never JSON.parse an LLM response raw).
 * Handles code fences, prose around the object, and a missing closing brace from truncation.
 * Returns null when nothing usable is found.
 */
export function safeParseReply(text: string): ChatReply | null {
  const t = text.replace(/```(?:json)?/gi, "").trim();
  const start = t.indexOf("{");
  if (start < 0) return null;
  const candidates = [t.slice(start, t.lastIndexOf("}") + 1), t.slice(start) + "}", t.slice(start) + "\"}"];
  for (const c of candidates) {
    if (!c || c.length < 2) continue;
    try {
      const o = JSON.parse(c);
      if (o && typeof o === "object") return normalize(o);
    } catch {}
  }
  // Last resort: pull out just the reply string so the user still sees an answer.
  const m = t.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)/);
  if (m) { try { return normalize({ reply: JSON.parse(`"${m[1]}"`) }); } catch {} }
  return null;
}

function normalize(o: Record<string, unknown>): ChatReply {
  return {
    reply: typeof o.reply === "string" ? o.reply : "",
    set: o.set && typeof o.set === "object" && !Array.isArray(o.set) ? (o.set as Record<string, unknown>) : {},
    chips: Array.isArray(o.chips) ? o.chips.map(String) : [],
    ...(typeof o.title === "string" && o.title.trim() ? { title: o.title.trim().slice(0, 20) } : {}),
  };
}
