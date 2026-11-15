"use client";
// "AI와 모양 정하기". Same UI and turn format as the prototype; transport is now POST /api/chat.
import { useEffect, useRef, useState } from "react";
import { useApp, type ChatMsg } from "./AppProvider";
import type { ChatReply, ChatRequest } from "@/lib/chat";
import { YARN_KO, type Weight } from "@/lib/pattern";
import type { Draft } from "@/lib/types";

const ERR: Record<string, string> = {
  not_configured: "AI 대화를 지금 쓸 수 없어요. 왼쪽 칸만으로도 만들 수 있어요.",
  not_granted: "AI 사용이 허용되지 않았어요. 왼쪽 칸만으로도 만들 수 있어요.",
  rate_limited: "잠시 뒤에 다시 보내 주세요.",
  image_rejected: "이 사진은 읽을 수 없어요. 다른 사진으로 해 볼까요?",
  invalid_json: "답을 정리하지 못했어요. 한 번만 다시 보내 주세요.",
  refused: "그 요청은 도와드리기 어려워요.",
};
// errors after which the chat is switched off and the form-only flow remains (prototype offChat)
const FATAL = ["not_configured", "not_granted"];
const PLACEHOLDER = "만들고 싶은 작품을 말해 주세요";

let availabilityRequested = false;
let msgId = 1;
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

export function Chat({ draft, applySet }: { draft: Draft; applySet: (s: unknown) => string[] }) {
  const { chat, setChat, turns } = useApp();
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<{ file: File; url: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const msgsRef = useRef<HTMLDivElement>(null), inputRef = useRef<HTMLInputElement>(null);

  const offChat = (note?: string) => setChat(c => ({ ...c, off: true, checked: true, chips: [], msgs: note ? [...c.msgs, { id: nextId(), kind: "note", text: note }] : c.msgs }));

  useEffect(() => {
    // module-level flag: the availability check runs once per page load (Strict Mode runs effects twice)
    if (chat.checked || availabilityRequested) return;
    availabilityRequested = true;
    fetch("/api/chat").then(r => r.json()).then((s: { available: boolean; images: boolean }) => {
      if (!s.available) offChat(ERR.not_configured);
      else setChat(c => ({ ...c, checked: true, images: !!s.images }));
    }).catch(() => offChat());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { const el = msgsRef.current; if (el) el.scrollTop = el.scrollHeight; }, [chat.msgs]);

  async function send(text: string) {
    if (chat.off || !chat.checked || !text.trim() || busy) return;
    setInput(""); const img = pending; setPending(null);
    const state = JSON.stringify({ object: draft.object, shape: draft.shape, a: draft.a, b: draft.b, h: draft.h, handle: draft.handle, yarn: draft.yarn, 굵기: YARN_KO[draft.weight as Weight], hook: draft.hook });
    turns.current.push({ role: "user", content: `${text}\n\n(현재 입력: ${state}${img ? ". 사진 한 장이 첨부됐어." : ""})` });
    const thinkId = nextId();
    setChat(c => ({ ...c, chips: [], msgs: [...c.msgs, { id: nextId(), kind: "me", text, img: img?.url }, { id: thinkId, kind: "ai", text: "", thinking: true }] }));
    setBusy(true);
    try {
      let image: ChatRequest["image"];
      if (img) { try { image = await encodeImage(img.file); } catch { throw new ChatError("image_rejected"); } }
      const body: ChatRequest = { messages: turns.current.slice(-12), image };
      const r = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const res = await r.json().catch(() => ({ error: "upstream" }));
      if (!r.ok || res.error) throw new ChatError(res.error || "upstream");
      const out = res as ChatReply;
      const applied = applySet(out.set);
      turns.current.push({ role: "assistant", content: JSON.stringify(out) });
      setChat(c => ({ ...c, chips: out.chips || [], msgs: [...c.msgs.filter(m => m.id !== thinkId), { id: nextId(), kind: "ai", text: String(out.reply || "알겠어요."), applied }] }));
    } catch (e) {
      turns.current.pop();
      const code = e instanceof ChatError ? e.code : "";
      setChat(c => ({ ...c, msgs: [...c.msgs.filter(m => m.id !== thinkId), { id: nextId(), kind: "note", text: ERR[code] || "연결이 잠깐 끊겼어요. 다시 보내 주세요." }] }));
      if (FATAL.includes(code)) offChat();
    } finally { setBusy(false); }
  }

  return (
    <section className="card chat" aria-label="AI와 모양 정하기">
      <div className="chat-head"><h2>AI와 모양 정하기</h2><span className="small muted" id="chatStatus">{chat.off ? "왼쪽 칸으로 만들 수 있어요" : ""}</span></div>
      <div className="msgs" id="msgs" aria-live="polite" ref={msgsRef}>
        {chat.msgs.map((m: ChatMsg) => (
          <div key={m.id} className={"msg " + m.kind}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {m.img && <img src={m.img} alt="올린 참고 사진" />}
            <span>{m.thinking ? <span className="thinking" aria-label="생각하는 중"><i /><i /><i /></span> : m.text}</span>
            {m.applied && m.applied.length > 0 && <div className="applied">{m.applied.map((a, i) => <span key={i}>{a}</span>)}</div>}
          </div>
        ))}
      </div>
      <div className="chips" id="chips">
        {chat.chips.slice(0, 4).map((c, i) => <button key={i} type="button" onClick={() => send(c)}>{c}</button>)}
      </div>
      <form className="composer" id="composer" hidden={chat.off} onSubmit={e => { e.preventDefault(); send(input); }}>
        <input type="file" id="photo" accept="image/*" className="sr" aria-label="참고 사진 올리기" onChange={e => {
          const f = e.target.files && e.target.files[0]; if (!f) return;
          setPending({ file: f, url: URL.createObjectURL(f) }); inputRef.current?.focus();
        }} />
        <label htmlFor="photo" className="icon-btn" id="photoBtn" aria-label="사진 올리기" hidden={!chat.images}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3" /><circle cx="9" cy="11" r="2" /><path d="M21 16l-5-5-8 8" /></svg>
        </label>
        <label htmlFor="chatInput" className="sr">메시지</label>
        <input id="chatInput" ref={inputRef} className="txt" placeholder={pending ? "사진을 붙였어요. 무엇을 만들고 싶나요?" : PLACEHOLDER} autoComplete="off" value={input} onChange={e => setInput(e.target.value)} />
        <button className="icon-btn fill" id="sendBtn" type="submit" aria-label="보내기" disabled={busy}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </button>
      </form>
    </section>
  );
}
