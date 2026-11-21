"use client";
// One question to /api/chat, its answer read while it streams (app/api/chat/route.ts): `onText` gets the reply
// so far each time more comes; the end is parsed tolerantly (Rule 5: safeParseReply). Stopped (the signal) -
// what had come is returned with stopped: true.
import { partialReply, safeParseReply, STREAM_ERR, type ChatReply, type ChatRequest } from "@/lib/chat";
import { nicknameForAi } from "@/lib/profile";

export type AskResult =
  | { ok: true; reply: ChatReply; raw: string; stopped: false }
  | { ok: true; reply: ChatReply; raw: string; stopped: true }
  | { ok: false; error: string; partial: string };

export async function ask(body: ChatRequest, signal: AbortSignal, onText: (text: string) => void): Promise<AskResult> {
  let r: Response;
  try {
    // the profile's nickname goes with every question (Yarni calls the user by it)
    const nickname = nicknameForAi();
    r = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(nickname ? { ...body, nickname } : body), signal });
  } catch {
    if (signal.aborted) return { ok: true, reply: { reply: "", set: {}, chips: [] }, raw: "", stopped: true };
    return { ok: false, error: typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "upstream", partial: "" };
  }
  if (!r.ok || !r.body || (r.headers.get("content-type") ?? "").includes("application/json")) {
    const j = await r.json().catch(() => ({}));
    return { ok: false, error: (j as { error?: string }).error || "upstream", partial: "" };
  }
  const reader = r.body.getReader(), dec = new TextDecoder();
  let raw = "", shown = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      raw += dec.decode(value, { stream: true });
      const cut = raw.indexOf(STREAM_ERR);
      const now = partialReply(cut >= 0 ? raw.slice(0, cut) : raw);
      if (now !== shown) { shown = now; onText(now); }
    }
  } catch {
    if (!signal.aborted) return { ok: false, error: "upstream", partial: shown };
  }
  if (signal.aborted) return { ok: true, reply: { reply: shown, set: {}, chips: [] }, raw: JSON.stringify({ reply: shown }), stopped: true };
  const cut = raw.indexOf(STREAM_ERR);
  if (cut >= 0) return { ok: false, error: raw.slice(cut + STREAM_ERR.length).trim() || "upstream", partial: shown };
  const reply = safeParseReply(raw);
  if (!reply) return { ok: false, error: "invalid_json", partial: shown };
  return { ok: true, reply, raw: JSON.stringify(reply), stopped: false };
}
