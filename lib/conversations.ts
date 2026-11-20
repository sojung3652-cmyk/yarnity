// "AI와 상의" conversations, kept like the works (localStorage via lib/store, key iyarn.chats). Every message is
// saved as soon as it is sent; resuming a conversation sends its earlier turns again (the last 20, the ones
// before folded into a short summary), so the AI keeps the thread.
import type { Proposal } from "./aiApply";

export const CHATS_KEY = "iyarn.chats";

export interface CMsg {
  role: "user" | "assistant" | "note";
  text: string;
  /** a small JPEG of the photo sent with it (data URL) */
  img?: string;
  /** what the AI proposes (only applied with 이 값으로 바꾸기); `done` once applied or declined */
  proposal?: Proposal; done?: "applied" | "kept";
  /** quick answers under an AI reply */
  chips?: string[];
  at: number;
}
/** what is sent to the API: the user's words with the app's state line; the AI's JSON as it came */
export interface CTurn { role: "user" | "assistant"; content: string }

export interface Conversation {
  id: string;
  title: string;
  /** the work it is about (나의 도안집), if any */
  projectId?: string | null;
  created: number;
  updated: number;
  archived?: boolean;
  msgs: CMsg[];
  turns: CTurn[];
}

/** a title from the first question: its first line, at most 20 characters */
export function titleFrom(text: string) {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > 20 ? t.slice(0, 19).trimEnd() + "…" : t || "새 대화";
}

/** the turns to send: the last 20; the ones before become one short summary at the head of the first */
export function apiTurns(turns: CTurn[]): CTurn[] {
  const keep = 20;
  if (turns.length <= keep) return trimHead(turns);
  const old = turns.slice(0, turns.length - keep), recent = trimHead(turns.slice(-keep));
  const asked = old.filter(t => t.role === "user").map(t => t.content.split("\n")[0].slice(0, 60));
  const answered = old.filter(t => t.role === "assistant").map(t => replyText(t.content).slice(0, 80));
  const summary = `(앞의 대화 요약: 물은 것 - ${asked.join(" / ")}${answered.length ? ` · 답한 것 - ${answered.slice(-3).join(" / ")}` : ""})`;
  if (recent.length && recent[0].role === "user") recent[0] = { ...recent[0], content: `${summary}\n\n${recent[0].content}` };
  return recent;
}
// the API needs the first message to be the user's
function trimHead(t: CTurn[]) { const out = [...t]; while (out.length && out[0].role !== "user") out.shift(); return out; }
/** the reply text inside an assistant turn (stored as the model's JSON) */
export function replyText(content: string) { try { const o = JSON.parse(content); return typeof o.reply === "string" ? o.reply : content; } catch { return content; } }

/** 오늘 / 이번 주 / 이전 */
export function dayGroup(t: number, now = Date.now()) {
  const d0 = new Date(now); d0.setHours(0, 0, 0, 0);
  if (t >= d0.getTime()) return "오늘";
  if (t >= d0.getTime() - 6 * 864e5) return "이번 주";
  return "이전";
}
/** 오후 3:20 today, else 11월 20일 */
export function whenText(t: number, now = Date.now()) {
  const d = new Date(t), n = new Date(now);
  if (d.toDateString() === n.toDateString()) return d.toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" });
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}
/** the last thing the AI said, for the list */
export function lastReply(c: Conversation) {
  for (let i = c.msgs.length - 1; i >= 0; i--) if (c.msgs[i].role === "assistant" && c.msgs[i].text) return c.msgs[i].text;
  return c.msgs[c.msgs.length - 1]?.text ?? "";
}
