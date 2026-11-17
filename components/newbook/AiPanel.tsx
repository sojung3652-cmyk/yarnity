"use client";
// "AI와 상의하기" beside the book in 도안 만들기 (Kim's pick: a tab on the book's edge + per-step helpers).
// A lavender woven tab on the right edge of the screen opens a sheet of note paper: the conversation, the
// AI's quick answers as chips, a composer with a photo button. When a reply proposes values (lib/aiApply.ts
// checks them against what the app can make), a small card lists them with "책에 적용": nothing changes in
// the book until the user presses it. A step's "AI에게 물어보기" (AskAi) opens the sheet with its question.
// Fallback (Rule 6): without ANTHROPIC_API_KEY (GET /api/chat -> available: false) the sheet says so and
// the book's own fields keep working - the AI is never needed to make a pattern.
import { useEffect, useRef, useState } from "react";
import { useApp, type ChatMsg } from "@/components/AppProvider";
import { proposalFrom, type Proposal } from "@/lib/aiApply";
import type { ChatReply, ChatRequest } from "@/lib/chat";
import { ITEM, itemIdOf } from "@/lib/items";
import type { Draft } from "@/lib/types";
import { hookMmOf, yarnWeightText } from "@/lib/yarn";

const ERR: Record<string, string> = {
  not_configured: "AI 상담이 아직 연결되지 않았어요. 책의 칸만으로도 끝까지 만들 수 있어요.",
  not_granted: "AI 상담을 쓸 수 없는 상태예요. 책의 칸만으로도 끝까지 만들 수 있어요.",
  rate_limited: "잠시 뒤에 다시 보내 주세요.",
  image_rejected: "이 사진은 읽을 수 없어요. 다른 사진으로 해 볼까요?",
  invalid_json: "답을 정리하지 못했어요. 한 번만 다시 보내 주세요.",
  refused: "그 요청은 도와드리기 어려워요.",
};
const FATAL = ["not_configured", "not_granted"];
const STEP_KO = ["", "이름", "품목", "실과 크기", "확인"];

let availabilityRequested = false, msgId = 1000;
const nextId = () => msgId++;

/** Downscale to <=1568px on the long side (the API's useful max) and re-encode as JPEG. */
async function encodeImage(file: File): Promise<NonNullable<ChatRequest["image"]>> {
  const bmp = await createImageBitmap(file);
  const s = Math.min(1, 1568 / Math.max(bmp.width, bmp.height));
  const cv = document.createElement("canvas"); cv.width = Math.round(bmp.width * s); cv.height = Math.round(bmp.height * s);
  const ctx = cv.getContext("2d")!; ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.drawImage(bmp, 0, 0, cv.width, cv.height); bmp.close();
  return { data: cv.toDataURL("image/jpeg", 0.9).split(",")[1], mediaType: "image/jpeg" };
}
class ChatError extends Error { constructor(public code: string) { super(code); } }

/** What the book says now, appended to each message so the AI answers for this step and these values. */
function stateLine(d: Draft, step: number) {
  const it = ITEM[itemIdOf(d)];
  const parts = [`단계 ${step}(${STEP_KO[step]})`, d.name.trim() ? `이름 ${d.name.trim()}` : "",
    d.itemPicked ? `품목 ${it.id}(${it.name}) 모양 ${d.shape} a ${d.a}${d.shape !== "circle" ? ` b ${d.b}` : ""}${it.kind === "base-body" ? ` h ${d.h}` : ""}` : "품목 아직 안 고름",
    `실 ${yarnWeightText(d)}`, `바늘 ${hookMmOf(d)}mm`, d.colorName ? `색 ${d.colorName}` : "", d.materials?.length ? `재질 ${d.materials.join("·")}` : ""];
  return `(지금 상태: ${parts.filter(Boolean).join(", ")})`;
}

/** "AI에게 물어보기" for a step: opens the sheet and sends this question. */
export function AskAi({ q, children }: { q: string; children: React.ReactNode }) {
  const { setChat } = useApp();
  return (
    <button type="button" className="ai-ask" onClick={() => setChat(c => ({ ...c, open: true, ask: q }))}>
      <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5 9.2 6.8 14.5 8 9.2 9.2 8 14.5 6.8 9.2 1.5 8 6.8 6.8Z" fill="currentColor" /></svg>
      {children}
    </button>
  );
}

export function AiPanel({ draft, step, onApply }: { draft: Draft; step: number; onApply: (patch: Partial<Draft>) => void }) {
  const { chat, setChat, turns } = useApp();
  const [input, setInput] = useState(""), [pending, setPending] = useState<{ file: File; url: string } | null>(null), [busy, setBusy] = useState(false);
  const msgsRef = useRef<HTMLDivElement>(null), inputRef = useRef<HTMLTextAreaElement>(null);
  const open = !!chat.open;
  const setOpen = (o: boolean) => setChat(c => ({ ...c, open: o }));
  const offChat = (note?: string) => setChat(c => ({ ...c, off: true, checked: true, chips: [], msgs: note ? [...c.msgs, { id: nextId(), kind: "note", text: note }] : c.msgs }));

  // availability, once per page load
  useEffect(() => {
    if (chat.checked || availabilityRequested) return;
    availabilityRequested = true;
    fetch("/api/chat").then(r => r.json()).then((s: { available: boolean; images: boolean }) => {
      if (!s.available) offChat(ERR.not_configured);
      else setChat(c => ({ ...c, checked: true, images: !!s.images }));
    }).catch(() => offChat(ERR.not_configured));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const el = msgsRef.current; if (el) el.scrollTop = el.scrollHeight; }, [chat.msgs, open]);
  useEffect(() => { if (open) requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true })); }, [open]);

  async function send(text: string) {
    if (chat.off || !chat.checked || !text.trim() || busy) return;
    setInput(""); const img = pending; setPending(null);
    turns.current.push({ role: "user", content: `${text}\n\n${stateLine(draft, step)}${img ? " 사진 한 장이 첨부됐어." : ""}` });
    const thinkId = nextId();
    setChat(c => ({ ...c, chips: [], msgs: [...c.msgs, { id: nextId(), kind: "me", text, img: img?.url }, { id: thinkId, kind: "ai", text: "", thinking: true }] }));
    setBusy(true);
    try {
      let image: ChatRequest["image"];
      if (img) { try { image = await encodeImage(img.file); } catch { throw new ChatError("image_rejected"); } }
      const r = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: turns.current.slice(-12), image } satisfies ChatRequest) });
      const res = await r.json().catch(() => ({ error: "upstream" }));
      if (!r.ok || res.error) throw new ChatError(res.error || "upstream");
      const out = res as ChatReply, proposal = proposalFrom(out.set, draft) ?? undefined;
      turns.current.push({ role: "assistant", content: JSON.stringify(out) });
      setChat(c => ({ ...c, chips: out.chips || [], msgs: [...c.msgs.filter(m => m.id !== thinkId), { id: nextId(), kind: "ai", text: String(out.reply || "알겠어요."), proposal }] }));
    } catch (e) {
      turns.current.pop();
      const code = e instanceof ChatError ? e.code : "";
      setChat(c => ({ ...c, msgs: [...c.msgs.filter(m => m.id !== thinkId), { id: nextId(), kind: "note", text: ERR[code] || "연결이 잠깐 끊겼어요. 다시 보내 주세요." }] }));
      if (FATAL.includes(code)) offChat();
    } finally { setBusy(false); }
  }
  // a step's question, once the chat is ready
  useEffect(() => {
    if (!chat.ask || !chat.checked || busy) return;
    const q = chat.ask; setChat(c => ({ ...c, ask: null }));
    if (!chat.off) send(q);
  }, [chat.ask, chat.checked, chat.off, busy]); // eslint-disable-line react-hooks/exhaustive-deps

  const apply = (m: ChatMsg, p: Proposal) => { onApply(p.patch); setChat(c => ({ ...c, msgs: c.msgs.map(x => (x.id === m.id ? { ...x, done: true } : x)) })); };

  return (
    <>
      {!open && (
        <button type="button" className="ai-tab" aria-expanded={false} onClick={() => setOpen(true)}>
          <span>AI와 상의</span>
        </button>
      )}
      {open && (
        <aside className="ai-sheet" aria-label="AI와 상의하기" onKeyDown={e => { if (e.key === "Escape") { e.preventDefault(); setOpen(false); } }}>
          <span className="ai-tape" aria-hidden="true" />
          <div className="ai-head">
            <h2>AI와 상의하기</h2>
            <button type="button" className="ai-x" aria-label="닫기" onClick={() => setOpen(false)}>×</button>
          </div>
          <div className="ai-msgs" ref={msgsRef} aria-live="polite">
            {chat.msgs.map(m => (
              <div key={m.id} className={"ai-msg ai-" + m.kind}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {m.img && <img src={m.img} alt="올린 사진" />}
                <p>{m.thinking ? <span className="ai-thinking" aria-label="생각하는 중"><i /><i /><i /></span> : m.text}</p>
                {m.proposal && (
                  <div className="ai-prop">
                    <span className="ai-prop-title">제안</span>
                    <ul>{m.proposal.labels.map(l => <li key={l}>{l}</li>)}</ul>
                    <button type="button" disabled={m.done} onClick={() => apply(m, m.proposal!)}>{m.done ? "책에 적용했어요" : "책에 적용"}</button>
                  </div>
                )}
              </div>
            ))}
          </div>
          {!chat.off && chat.chips.length > 0 && (
            <div className="ai-chips">{chat.chips.slice(0, 4).map((c, i) => <button key={i} type="button" disabled={busy} onClick={() => send(c)}>{c}</button>)}</div>
          )}
          {!chat.off && (
            <form className="ai-compose" onSubmit={e => { e.preventDefault(); send(input); }}>
              {pending && <span className="ai-attached">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={pending.url} alt="" />사진을 붙였어요<button type="button" aria-label="사진 빼기" onClick={() => setPending(null)}>×</button></span>}
              <div className="ai-row">
                {chat.images && (
                  <label className="ai-photo" aria-label="사진 올리기" title="작품이나 실 라벨 사진">
                    <input type="file" accept="image/*" className="sr" onChange={e => { const f = e.target.files?.[0]; if (f) setPending({ file: f, url: URL.createObjectURL(f) }); e.target.value = ""; }} />
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3" /><circle cx="9" cy="11" r="2" /><path d="M21 16l-5-5-8 8" /></svg>
                  </label>
                )}
                <label htmlFor="aiInput" className="sr">메시지</label>
                <textarea id="aiInput" ref={inputRef} rows={2} value={input} placeholder="편하게 물어보세요" onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(input); } }} />
                <button type="submit" className="ai-send" disabled={busy || !input.trim()} aria-label="보내기">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </button>
              </div>
            </form>
          )}
        </aside>
      )}
    </>
  );
}
