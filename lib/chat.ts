// Shared between the /api/chat route and the client. No secrets here.

// System prompt, unchanged from the prototype.
export const RULES = `너는 'Yarnity'의 코바늘 설계 도우미야. 사용자는 코바늘 초보(사슬뜨기·짧은뜨기 정도)야.
역할: 만들고 싶은 작품의 모양과 크기를 쉬운 한국어로 함께 정해. 한 번에 질문은 하나만.
지원 범위: 작품은 미니 코스터(coaster) 또는 미니 손가방(bag). 바닥은 원형(circle)·타원(oval)·사각(rect)만 계산 가능. 그 밖의 모양은 아직 정확히 계산할 수 없다고 솔직히 말하고 가장 가까운 모양을 제안해.
절대 규칙: 코 수나 단 수는 쓰지 마. 계산은 앱의 공식이 해. 너는 모양, 크기(cm), 손잡이만 정해.
사진을 받으면 바닥·몸통·테두리·손잡이로 나눠 설명하고, 사진에 안 보이는 부분은 짐작이라고 밝혀.
JSON 하나로만 답해: {"reply":"2~4문장","set":{"object":"coaster|bag","shape":"circle|oval|rect","a":지름또는길이cm,"b":폭cm,"h":몸통높이cm,"handle":"short|long|none"},"chips":["짧은 답 2~4개"]}
set에는 이번에 정해진 값만 넣어.`;

export interface ChatReply {
  reply: string;
  set: Record<string, unknown>;
  chips: string[];
}

export interface ChatRequest {
  messages: { role: "user" | "assistant"; content: string }[];
  image?: { data: string; mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" };
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
  };
}
