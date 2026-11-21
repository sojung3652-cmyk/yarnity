// "AI와 상의" conversations, kept like the works (localStorage via lib/store, key iyarn.chats). Every message is
// saved as soon as it is sent; an answer when it has fully come (or, stopped, as far as it came). Resuming a
// conversation sends its earlier turns again (the last 20, the ones before folded into a short summary).
// Each message keeps what went to the AI for it (`turn`), so editing a question, answering again or trying again
// only cuts the list of messages: the turns follow from it.
import type { Proposal } from "./aiApply";

export const CHATS_KEY = "iyarn.chats";

export interface CMsg {
  role: "user" | "assistant" | "note";
  text: string;
  /** what was sent to the AI for this message: the user's words with the app's state line; the AI's JSON */
  turn?: string;
  /** a small JPEG of the photo sent with it (data URL) */
  img?: string;
  /** what the AI proposes (only applied with 이 값으로 바꾸기); `done` once applied or declined */
  proposal?: Proposal; done?: "applied" | "kept";
  /** quick answers under an AI reply */
  chips?: string[];
  /** an answer stopped before its end (what had come is kept) */
  stopped?: boolean;
  /** a note that an answer did not come: its error code, and whether 다시 시도 can be offered */
  err?: string; retry?: boolean;
  at: number;
}
/** what is sent to the API */
export interface CTurn { role: "user" | "assistant"; content: string }

export interface Conversation {
  id: string;
  title: string;
  /** named by the AI with its first answer (until then: the first question) */
  titled?: boolean;
  starred?: boolean;
  /** the work it is about (나의 도안집), if any */
  projectId?: string | null;
  created: number;
  updated: number;
  archived?: boolean;
  msgs: CMsg[];
  /** older saves only: the turns kept apart from the messages (moved onto them by migrate) */
  turns?: CTurn[];
}

/** a title from the first question: its first line, at most 20 characters */
export function titleFrom(text: string) {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > 20 ? t.slice(0, 19).trimEnd() + "…" : t || "새 대화";
}

/** Older saves kept the turns in their own list: each goes onto its message (an answer that failed - a
 *  question followed by a note - had its turn taken back; the help shown first had none). */
export function migrate(c: Conversation): Conversation {
  if (!c.turns) return c;
  const turns = c.turns; let j = 0;
  const msgs = c.msgs.map((m, i) => {
    if (m.role === "note" || m.turn != null) return m;
    if (m.role === "user" && c.msgs[i + 1]?.role === "note") return m;
    const t = turns[j];
    if (t && t.role === m.role) { j++; return { ...m, turn: t.content }; }
    return m;
  });
  const { turns: _drop, ...rest } = c; void _drop;
  return { ...rest, msgs };
}

/** The turns of a conversation, from its messages: a question whose answer did not come (a note follows it)
 *  is left out, so two questions never stand together. */
export function turnsOf(msgs: CMsg[]): CTurn[] {
  const out: CTurn[] = [];
  msgs.forEach((m, i) => {
    if (m.role === "note" || m.turn == null) return;
    if (m.role === "user" && msgs[i + 1]?.role === "note") return;
    out.push({ role: m.role, content: m.turn });
  });
  return out;
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

/** the list's sections: 오늘 / 어제 / 지난 7일 / 이전 */
export function dayGroup(t: number, now = Date.now()) {
  const d0 = new Date(now); d0.setHours(0, 0, 0, 0);
  const t0 = d0.getTime();
  if (t >= t0) return "오늘";
  if (t >= t0 - 864e5) return "어제";
  if (t >= t0 - 7 * 864e5) return "지난 7일";
  return "이전";
}
/** the small line between messages when the day changes: 11월 20일 (목), with the year when it is not this one */
export function dateLine(t: number, now = Date.now()) {
  const d = new Date(t), n = new Date(now), wd = "일월화수목금토"[d.getDay()];
  return `${d.getFullYear() !== n.getFullYear() ? `${d.getFullYear()}년 ` : ""}${d.getMonth() + 1}월 ${d.getDate()}일 (${wd})`;
}
export const sameDay = (a: number, b: number) => new Date(a).toDateString() === new Date(b).toDateString();
