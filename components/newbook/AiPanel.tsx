"use client";
// "AI와 상의": conversations that are kept (lib/conversations.ts, components/ai/useChats.ts) - carry one on,
// keep it in the 보관함, or delete it. Web and phone alike; the AI itself is unchanged: /api/chat with the same
// rules (the app's formulas count stitches and rows; the AI only proposes item, shape, size, handle, yarn and
// hook), the photo, the quick-answer chips, and the proposal that changes nothing until 이 값으로 바꾸기.
//   Phones: a full screen - the list (search, 대화 / 보관함, 오늘 · 이번 주 · 이전; a row slides left for 보관 /
//   삭제), a new conversation (three starters), the conversation (···: 이름 바꾸기, 작품에 연결, 보관하기, 삭제).
//   From 도안 만들기 (the AI tab or "AI와 상의해 보세요") it opens as a half sheet that knows the step;
//   "전체 화면 ↗" makes it the full screen.
//   Wide screens: a panel from the right (760px; the page dimmed): the list on the left, the conversation on
//   the right; a row's ··· on hover.
// Fallback (Rule 6): without ANTHROPIC_API_KEY (GET /api/chat -> available: false) it says the AI opens soon;
// the book's own fields make the whole pattern without it.
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useBook } from "@/components/Book/BookProvider";
import { useApp } from "@/components/AppProvider";
import { ClothPatch } from "@/components/diary/Diary";
import { chats, useChats } from "@/components/ai/useChats";
import { useMobile } from "@/components/mobile/useMobile";
import { proposalFrom, type Proposal } from "@/lib/aiApply";
import type { ChatReply, ChatRequest } from "@/lib/chat";
import { apiTurns, dayGroup, lastReply, whenText, type CMsg, type Conversation } from "@/lib/conversations";
import { ITEM, itemIdOf } from "@/lib/items";
import { plan, SHAPE_KO } from "@/lib/pattern";
import type { Draft, Project } from "@/lib/types";
import { hookMmOf, yarnWeightText } from "@/lib/yarn";
import "@/components/ai/ai.css";

const ERR: Record<string, string> = {
  not_configured: "AI 상담은 곧 열려요. 그동안 책의 칸만으로도 끝까지 만들 수 있어요.",
  not_granted: "AI 상담을 쓸 수 없는 상태예요. 책의 칸만으로도 끝까지 만들 수 있어요.",
  rate_limited: "잠시 뒤에 다시 보내 주세요.",
  image_rejected: "이 사진은 읽을 수 없어요. 다른 사진으로 해 볼까요?",
  invalid_json: "답을 정리하지 못했어요. 한 번만 다시 보내 주세요.",
  refused: "그 요청은 도와드리기 어려워요.",
};
const FATAL = ["not_configured", "not_granted"];
const STEP_KO = ["메뉴", "이름", "품목", "실과 크기", "확인"];
const STARTERS = ["여름에 들 작은 가방", "가진 실로 뭘 뜰까요?", "사진 올리고 비슷하게 뜨기"];
// the first answer when it is opened inside 도안 만들기: help for that step, and chips for it (no call yet)
const STEP_HELP: Record<number, { text: string; chips: string[] }> = {
  1: { text: "작품 이름은 나중에 바꿀 수 있어요. 누구에게 줄지, 어디에 쓸지 말해 주시면 이름을 같이 지어 볼게요.", chips: ["선물할 작품 이름 지어 줘", "짧고 예쁜 이름 추천"] },
  2: { text: "처음이라면 코스터나 수세미처럼 납작한 것부터가 쉬워요. 무엇에 쓰고 싶은지 말해 주세요.", chips: ["초보에게 쉬운 품목", "여름에 들 작은 가방", "선물하기 좋은 것"] },
  3: { text: "실 라벨 사진을 올리면 굵기와 맞는 바늘을 읽어 드려요. 원하는 크기를 말해 주시면 맞춰 볼게요.", chips: ["이 실에 맞는 바늘은?", "크기를 추천해 줘", "손잡이 길이는?"] },
  4: { text: "실이 넉넉한지, 크기가 괜찮은지 같이 볼까요? 바꾸고 싶은 곳을 말해 주세요.", chips: ["실이 충분할까?", "조금 더 크게 하고 싶어"] },
};

let availabilityRequested = false;
class ChatError extends Error { constructor(public code: string) { super(code); } }

/** Downscale to <=1568px on the long side (the API's useful max) and re-encode as JPEG. */
async function encodeImage(file: File): Promise<NonNullable<ChatRequest["image"]>> {
  const bmp = await createImageBitmap(file);
  const s = Math.min(1, 1568 / Math.max(bmp.width, bmp.height));
  const cv = document.createElement("canvas"); cv.width = Math.round(bmp.width * s); cv.height = Math.round(bmp.height * s);
  const ctx = cv.getContext("2d")!; ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.drawImage(bmp, 0, 0, cv.width, cv.height); bmp.close();
  return { data: cv.toDataURL("image/jpeg", 0.9).split(",")[1], mediaType: "image/jpeg" };
}
/** a small copy of the photo to keep with the conversation (localStorage) */
async function thumbOf(file: File) {
  const bmp = await createImageBitmap(file), s = Math.min(1, 280 / Math.max(bmp.width, bmp.height));
  const cv = document.createElement("canvas"); cv.width = Math.round(bmp.width * s); cv.height = Math.round(bmp.height * s);
  cv.getContext("2d")!.drawImage(bmp, 0, 0, cv.width, cv.height); bmp.close();
  return cv.toDataURL("image/jpeg", 0.72);
}

/** What the app says now, appended to each message: the work the conversation is about, or the wizard's step. */
function stateLine(d: Draft, where: string) {
  const it = ITEM[itemIdOf(d)];
  const parts = [where, d.name.trim() ? `이름 ${d.name.trim()}` : "",
    d.itemPicked !== false ? `품목 ${it.id}(${it.name}) 모양 ${d.shape} a ${d.a}${d.shape !== "circle" ? ` b ${d.b}` : ""}${it.kind === "base-body" ? ` h ${d.h}` : ""}${d.handle && d.handle !== "none" ? ` 손잡이 ${d.handleCm ?? ""}cm` : ""}` : "품목 아직 안 고름",
    `실 ${yarnWeightText(d)}`, `바늘 ${hookMmOf(d)}mm`, d.colorName ? `색 ${d.colorName}` : "", d.materials?.length ? `재질 ${d.materials.join("·")}` : ""];
  return `(지금 상태: ${parts.filter(Boolean).join(", ")})`;
}

/** the proposal as "before -> after" lines, against the work (or the pattern being made) */
function diffLines(base: Draft, p: Proposal): { k: string; from?: string; to: string }[] {
  const out: { k: string; from?: string; to: string }[] = [], q = p.patch, shape = q.shape ?? base.shape;
  const it0 = ITEM[itemIdOf(base)];
  if (q.item) out.push({ k: "품목", from: base.itemPicked === false ? undefined : it0.name, to: ITEM[itemIdOf({ ...base, ...q } as Draft)].name });
  if (q.shape) out.push({ k: "모양", from: SHAPE_KO[base.shape], to: SHAPE_KO[q.shape] });
  const F: Record<string, string> = { a: shape === "circle" ? "지름" : "가로", b: "세로", h: "높이", circ: "머리 둘레", depth: "깊이", topA: "입구", flapCm: "덮개" };
  for (const k of ["a", "b", "h", "circ", "depth", "topA", "flapCm"] as const) {
    const v = q[k]; if (v == null) continue;
    const was = base[k]; out.push({ k: F[k], from: was ? `${was}cm` : undefined, to: `${v}cm` });
  }
  if (q.handle === "none") out.push({ k: "손잡이", from: base.handle !== "none" && base.handleCm ? `${base.handleCm}cm` : undefined, to: "없음" });
  else if (q.handleCm) out.push({ k: "손잡이", from: base.handle === "none" ? "없음" : base.handleCm ? `${base.handleCm}cm` : undefined, to: `${q.handleCm}cm` });
  if (q.yarnMm) out.push({ k: "실 굵기", from: base.yarnMm ? `${base.yarnMm}mm` : undefined, to: `${q.yarnMm}mm` });
  if (q.hookMm) out.push({ k: "바늘", from: `${hookMmOf(base)}mm`, to: `${q.hookMm}mm` });
  if (q.colorName) out.push({ k: "색", from: base.colorName || undefined, to: q.colorName });
  if (q.name) out.push({ k: "이름", from: base.name || undefined, to: q.name });
  // a value already the same (applied, or proposed again) shows without the struck-out "before"
  for (const l of out) if (l.from === l.to) delete l.from;
  return out.length ? out : p.labels.map(l => ({ k: "", to: l }));
}

const Star = ({ size = 26 }: { size?: number }) => <img className="aic-star" src="/mobile/diary/star.webp" alt="" aria-hidden="true" style={{ width: size, height: size }} />; // eslint-disable-line @next/next/no-img-element
const I = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const Back = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5.5 8 12l6.5 6.5" {...I} /></svg>;
const Dots = () => <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5.5" cy="12" r="1.6" fill="currentColor" /><circle cx="12" cy="12" r="1.6" fill="currentColor" /><circle cx="18.5" cy="12" r="1.6" fill="currentColor" /></svg>;
const X = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" {...I} /></svg>;

/** The one AI sheet on the book's stage (wide screens): shown on the open book (menu, or the wizard's step). */
export function AiHost() {
  const b = useBook(), { draft, setDraft } = useApp();
  if (b.view !== "home" && b.view !== "wizard") return null;
  return <AiPanel draft={draft} step={b.view === "wizard" ? b.step : 0} onApply={p => setDraft({ ...draft, ...p })} />;
}

export function AiPanel({ draft, step, onApply }: { draft: Draft; step: number; onApply: (patch: Partial<Draft>) => void }) {
  const { chat, setChat, projects, updateProject } = useApp();
  const all = useChats(), phone = !!useMobile();
  const open = !!chat.open, convId = chat.conv ?? null, sheet = phone && !!chat.sheet;
  const conv = convId && convId !== "new" ? all.find(c => c.id === convId) ?? null : null;
  const [tab, setTab] = useState<"live" | "arch">("live"), [q, setQ] = useState("");
  const [input, setInput] = useState(""), [pending, setPending] = useState<{ file: File; url: string } | null>(null), [busy, setBusy] = useState<string | null>(null);
  const [menu, setMenu] = useState<null | "main" | "rename" | "link">(null), [ask, setAsk] = useState<string | null>(null), [name, setName] = useState("");
  const [slid, setSlid] = useState<string | null>(null), [rowMenu, setRowMenu] = useState<string | null>(null);
  const msgsRef = useRef<HTMLDivElement>(null), inputRef = useRef<HTMLTextAreaElement>(null), wasOpen = useRef(false);
  const setOpen = (o: boolean) => setChat(c => ({ ...c, open: o }));
  const go = (id: string | null) => { setMenu(null); setChat(c => ({ ...c, conv: id })); };
  const offChat = () => setChat(c => ({ ...c, off: true, checked: true }));

  // availability, once per page load
  useEffect(() => {
    if (chat.checked || availabilityRequested) return;
    availabilityRequested = true;
    fetch("/api/chat").then(r => r.json()).then((s: { available: boolean; images: boolean }) => {
      if (!s.available) offChat(); else setChat(c => ({ ...c, checked: true, images: !!s.images }));
    }).catch(() => offChat());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // opening: from 도안 만들기 a new conversation about that step (phones: the half sheet); elsewhere the list
  useEffect(() => {
    if (open && !wasOpen.current) setChat(c => ({ ...c, conv: step > 0 ? "new" : phone ? null : c.conv && c.conv !== "new" ? c.conv : "new", sheet: step > 0 }));
    wasOpen.current = open;
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const el = msgsRef.current; if (el) el.scrollTop = el.scrollHeight; }, [conv?.msgs.length, busy, convId, open]);
  // the box grows with what is typed (up to 120px; ai.css)
  useEffect(() => { const el = inputRef.current; if (el) { el.style.height = "auto"; el.style.height = Math.min(120, el.scrollHeight) + "px"; } }, [input, open, convId]);
  // a line's question goes into the box (the user sends it)
  useEffect(() => {
    if (!chat.prefill) return;
    const t = chat.prefill; setChat(c => ({ ...c, prefill: null })); setInput(t);
    requestAnimationFrame(() => { const el = inputRef.current; if (el) { el.focus({ preventScroll: true }); el.setSelectionRange(t.length, t.length); } });
  }, [chat.prefill]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) return;
    // caught first (capture) and marked handled, so the book behind does not close on the same Esc
    const k = (e: KeyboardEvent) => { if (e.key !== "Escape" || e.isComposing) return; e.preventDefault(); if (menu || ask || rowMenu) { setMenu(null); setAsk(null); setRowMenu(null); } else setOpen(false); };
    addEventListener("keydown", k, true); return () => removeEventListener("keydown", k, true);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const projectOf = (c: Conversation | null) => (c?.projectId ? projects.find(p => p.id === c.projectId) ?? null : null);
  const work = projectOf(conv);
  const tagOf = (p: Project | null) => { if (!p) return null; const total = plan(p).rows.length; return `${ITEM[itemIdOf(p)].name} · ${Math.min(p.current || 0, total)}/${total}단`; };
  const stepTag = step > 0 ? `지금 · ${step}/4 ${STEP_KO[step]}${draft.itemPicked ? ` · ${ITEM[itemIdOf(draft)].name}` : ""}` : null;

  async function send(text: string) {
    if (chat.off || !chat.checked || !text.trim() || busy) return;
    const img = pending; setInput(""); setPending(null);
    let c = conv;
    if (!c) {
      const help = step > 0 ? STEP_HELP[step] : null;
      c = chats.create(text, { intro: help ? { role: "assistant", text: help.text, at: Date.now() - 1 } : undefined });
      go(c.id);
    }
    const base: Draft = projectOf(c) ?? draft, where = projectOf(c) ? "연결된 작품" : step > 0 ? `도안 만들기 ${step}단계(${STEP_KO[step]})` : "도안 만들기 전";
    const thumb = img ? await thumbOf(img.file).catch(() => undefined) : undefined;
    chats.push(c.id, { role: "user", text, img: thumb, at: Date.now() }, { role: "user", content: `${text}\n\n${stateLine(base, where)}${img ? " 사진 한 장이 첨부됐어." : ""}` });
    setBusy(c.id);
    try {
      let image: ChatRequest["image"];
      if (img) { try { image = await encodeImage(img.file); } catch { throw new ChatError("image_rejected"); } }
      const r = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: apiTurns(chats.get(c.id)!.turns), image } satisfies ChatRequest) });
      const res = await r.json().catch(() => ({ error: "upstream" }));
      if (!r.ok || res.error) throw new ChatError(res.error || "upstream");
      const out = res as ChatReply, proposal = proposalFrom(out.set, base) ?? undefined;
      chats.push(c.id, { role: "assistant", text: String(out.reply || "알겠어요."), chips: (out.chips || []).slice(0, 4), proposal, at: Date.now() }, { role: "assistant", content: JSON.stringify(out) });
    } catch (e) {
      chats.popTurn(c.id);
      const code = e instanceof ChatError ? e.code : "";
      chats.push(c.id, { role: "note", text: ERR[code] || "연결이 잠깐 끊겼어요. 다시 보내 주세요.", at: Date.now() });
      if (FATAL.includes(code)) offChat();
    } finally { setBusy(null); }
  }
  const apply = (i: number, m: CMsg) => {
    if (!conv || !m.proposal) return;
    if (work) updateProject(work.id, m.proposal.patch as Partial<Project>); // the pattern is planned from these values: it recalculates
    else { onApply(m.proposal.patch); setChat(c => ({ ...c, applied: (c.applied ?? 0) + 1 })); }
    chats.setMsg(conv.id, i, { done: "applied" });
  };
  const del = (id: string) => { chats.remove(id); setAsk(null); setRowMenu(null); setSlid(null); if (convId === id) go(phone ? null : "new"); };

  // ---- the list ----
  const shown = useMemo(() => {
    const words = q.trim().toLowerCase();
    return all.filter(c => (tab === "arch" ? !!c.archived : !c.archived) && (!words || (c.title + " " + c.msgs.map(m => m.text).join(" ")).toLowerCase().includes(words)))
      .sort((a, b) => b.updated - a.updated);
  }, [all, q, tab]);
  const counts = { live: all.filter(c => !c.archived).length, arch: all.filter(c => c.archived).length };
  const groups = useMemo(() => { const g: [string, Conversation[]][] = []; for (const c of shown) { const k = dayGroup(c.updated); const last = g[g.length - 1]; if (last && last[0] === k) last[1].push(c); else g.push([k, [c]]); } return g; }, [shown]);
  const x0 = useRef<number | null>(null);
  const list = (
    <section className="aic-list" aria-label="대화 목록">
      <header className="aic-bar">
        {phone ? <button type="button" className="aic-icon" aria-label="닫기" onClick={() => setOpen(false)}><Back /></button> : <span />}
        <h2>AI와 상의</h2>
        <ClothPatch color="yellow" small className="aic-new" onClick={() => go("new")}>+ 새 대화</ClothPatch>
      </header>
      <label className="aic-search"><span className="sr">대화 찾기</span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6" {...I} /><path d="m16 16 4 4" {...I} /></svg>
        <input type="search" value={q} placeholder="대화 찾기" onChange={e => setQ(e.target.value)} />
      </label>
      <div className="aic-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "live"} onClick={() => setTab("live")}>대화 {counts.live}</button>
        <button type="button" role="tab" aria-selected={tab === "arch"} onClick={() => setTab("arch")}>보관함 {counts.arch}</button>
      </div>
      <div className="aic-rows">
        {groups.length === 0 && <p className="aic-empty">{q ? "찾는 대화가 없어요." : tab === "arch" ? "보관한 대화가 없어요." : "아직 대화가 없어요."}</p>}
        {groups.map(([g, cs]) => (
          <div key={g}>
            <h3 className="aic-day">{g}</h3>
            {cs.map(c => {
              const t = tagOf(projectOf(c));
              return (
                <div key={c.id} className={"aic-row" + (slid === c.id ? " is-slid" : "") + (convId === c.id ? " is-on" : "")}>
                  <div className="aic-row-acts">
                    <button type="button" className="is-arch" onClick={() => { chats.archive(c.id, !c.archived); setSlid(null); }}>{c.archived ? "꺼내기" : "보관"}</button>
                    <button type="button" className="is-del" onClick={() => setAsk(c.id)}>삭제</button>
                  </div>
                  <button type="button" className="aic-row-main" onClick={() => { if (slid) { setSlid(null); return; } go(c.id); }}
                    onTouchStart={e => { x0.current = e.touches[0].clientX; }} onTouchEnd={e => { if (x0.current == null) return; const dx = e.changedTouches[0].clientX - x0.current; x0.current = null; if (dx < -40) setSlid(c.id); else if (dx > 30) setSlid(null); }}>
                    <Star />
                    <span className="aic-row-text">
                      <span className="aic-row-top"><b>{c.title}</b><time>{whenText(c.updated)}</time></span>
                      <span className="aic-row-last">{lastReply(c) || "—"}</span>
                      {t && <span className="aic-tag">{t}</span>}
                    </span>
                  </button>
                  {!phone && <button type="button" className="aic-row-more" aria-label={`${c.title} 더 보기`} onClick={() => setRowMenu(rowMenu === c.id ? null : c.id)}><Dots /></button>}
                  {rowMenu === c.id && (
                    <div className="aic-pop" role="menu">
                      <button type="button" role="menuitem" onClick={() => { setRowMenu(null); go(c.id); setName(c.title); setMenu("rename"); }}>이름 바꾸기</button>
                      <button type="button" role="menuitem" onClick={() => { chats.archive(c.id, !c.archived); setRowMenu(null); }}>{c.archived ? "보관함에서 꺼내기" : "보관하기"}</button>
                      <button type="button" role="menuitem" className="danger" onClick={() => { setRowMenu(null); setAsk(c.id); }}>삭제</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );

  // ---- a new conversation ----
  const help = step > 0 ? STEP_HELP[step] : null;
  const fresh = (
    <div className="aic-fresh">
      {help ? (
        <div className="aic-ai"><Star /><div><p>{help.text}</p><div className="aic-chips">{help.chips.map(t => <button key={t} type="button" disabled={!!busy} onClick={() => send(t)}>{t}</button>)}</div></div></div>
      ) : (
        <>
          <Star size={48} />
          <h3>무엇이든 편하게 물어보세요</h3>
          <p>무엇을 만들고 싶은지, 어떤 실이 있는지 말해 주세요. 작품이나 실 라벨 사진도 괜찮아요.</p>
          <div className="aic-starters">{STARTERS.map(t => <button key={t} type="button" disabled={!!busy || chat.off} onClick={() => (t.startsWith("사진") ? (setInput(t), inputRef.current?.focus()) : send(t))}>{t}</button>)}</div>
          <p className="aic-note">코 수와 단 수는 AI가 아니라 앱의 공식이 계산해요. 대화는 자동으로 저장돼요.</p>
        </>
      )}
    </div>
  );

  // ---- a conversation ----
  const lastAi = conv ? conv.msgs.map(m => m.role).lastIndexOf("assistant") : -1;
  const thread = conv && (
    <>
      {conv.msgs.map((m, i) => m.role === "user" ? (
        <div key={i} className="aic-me">{/* eslint-disable-next-line @next/next/no-img-element */}{m.img && <img src={m.img} alt="올린 사진" />}<p>{m.text}</p></div>
      ) : m.role === "note" ? <p key={i} className="aic-notice">{m.text}</p> : (
        <div key={i} className="aic-ai"><Star /><div>
          <p>{m.text}</p>
          {m.proposal && <ProposalCard lines={diffLines(work ?? draft, m.proposal)} done={m.done} onApply={() => apply(i, m)} onKeep={() => chats.setMsg(conv.id, i, { done: "kept" })} />}
          {i === lastAi && !busy && !!m.chips?.length && <div className="aic-chips">{m.chips.map(t => <button key={t} type="button" disabled={chat.off} onClick={() => send(t)}>{t}</button>)}</div>}
        </div></div>
      ))}
      {busy === conv.id && <div className="aic-ai is-thinking"><Star /><p aria-live="polite">생각하는 중 <span className="aic-dots" aria-hidden="true"><i /><i /><i /></span></p></div>}
    </>
  );
  const composer = !chat.off && (
    <form className="aic-compose" onSubmit={e => { e.preventDefault(); send(input); }}>
      {pending && <span className="aic-attached">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={pending.url} alt="" />사진을 붙였어요<button type="button" aria-label="사진 빼기" onClick={() => setPending(null)}>×</button></span>}
      <div className="aic-row-in">
        {chat.images && (
          <label className="aic-photo" aria-label="사진 올리기" title="작품이나 실 라벨 사진">
            <input type="file" accept="image/*" className="sr" onChange={e => { const f = e.target.files?.[0]; if (f) setPending({ file: f, url: URL.createObjectURL(f) }); e.target.value = ""; }} />
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3" {...I} /><circle cx="9" cy="11" r="2" {...I} /><path d="M21 16l-5-5-8 8" {...I} /></svg>
          </label>
        )}
        <label htmlFor="aiInput" className="sr">메시지</label>
        <textarea id="aiInput" ref={inputRef} rows={1} value={input} placeholder="편하게 물어보세요" onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(input); } }} />
        <button type="submit" className="aic-send" disabled={!!busy || !input.trim()} aria-label="보내기"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" {...I} strokeWidth={2} /></svg></button>
      </div>
    </form>
  );
  const offNote = chat.off && <p className="aic-notice">{ERR.not_configured}</p>;
  const chatHead = (
    <header className="aic-bar aic-chat-bar">
      {sheet ? (
        <>
          <span className="aic-sheet-title"><Star size={22} /><b>AI와 상의</b></span>
          <button type="button" className="aic-full" onClick={() => setChat(c => ({ ...c, sheet: false }))}>전체 화면 ↗</button>
          <button type="button" className="aic-icon" aria-label="닫기" onClick={() => setOpen(false)}><X /></button>
        </>
      ) : (
        <>
          {phone ? <button type="button" className="aic-icon" aria-label="대화 목록" onClick={() => go(null)}><Back /></button> : <span />}
          <span className="aic-title"><b>{conv ? conv.title : "새 대화"}</b>{(tagOf(work) || (!conv || !work) && stepTag) && <span className="aic-tag">{tagOf(work) ?? stepTag}</span>}</span>
          {conv ? <button type="button" className="aic-icon" aria-label="더 보기" onClick={() => { setName(conv.title); setMenu("main"); }}><Dots /></button> : <span />}
        </>
      )}
    </header>
  );
  const chatPane = (
    <section className="aic-chat" aria-label={conv ? conv.title : "새 대화"}>
      {chatHead}
      {sheet && stepTag && <p className="aic-steptag"><span className="aic-tag">{stepTag}</span></p>}
      <div className="aic-msgs" ref={msgsRef} aria-live="polite">{offNote}{conv ? thread : fresh}</div>
      {composer}
    </section>
  );

  // ---- ··· on a conversation ----
  const menuSheet = menu && conv && (
    <div className="aic-dim aic-menu-dim" onClick={() => setMenu(null)}>
      <div className="aic-menu" role="dialog" aria-modal="true" aria-label="대화 메뉴" onClick={e => e.stopPropagation()}>
        <span className="aic-grip" aria-hidden="true" />
        {menu === "rename" ? (
          <form className="aic-rename" onSubmit={e => { e.preventDefault(); const t = name.trim().slice(0, 30); if (t) chats.patch(conv.id, { title: t }); setMenu(null); }}>
            <label htmlFor="aicName">대화 이름</label>
            <input id="aicName" autoFocus maxLength={30} value={name} onChange={e => setName(e.target.value)} />
            <ClothPatch color="yellow" type="submit">저장</ClothPatch>
          </form>
        ) : menu === "link" ? (
          <div className="aic-link">
            <p className="aic-menu-title">어떤 작품에 대한 대화인가요?</p>
            {projects.length === 0 && <p className="aic-empty">아직 작품이 없어요.</p>}
            {projects.map(p => <button key={p.id} type="button" aria-pressed={conv.projectId === p.id} onClick={() => { chats.patch(conv.id, { projectId: p.id }); setMenu(null); }}><b>{p.name}</b><span>{tagOf(p)}</span></button>)}
            {conv.projectId && <button type="button" onClick={() => { chats.patch(conv.id, { projectId: null }); setMenu(null); }}><b>연결 끊기</b></button>}
          </div>
        ) : (
          <>
            <button type="button" className="aic-mi" onClick={() => setMenu("rename")}>이름 바꾸기</button>
            <button type="button" className="aic-mi" onClick={() => setMenu("link")}>작품에 연결<span>{work ? work.name : "작품 고르기"}</span></button>
            <button type="button" className="aic-mi" onClick={() => { chats.archive(conv.id, !conv.archived); setMenu(null); if (!conv.archived) go(phone ? null : "new"); }}>{conv.archived ? "보관함에서 꺼내기" : "보관하기"}<span>{conv.archived ? "" : "목록에서 숨겨요"}</span></button>
            <button type="button" className="aic-mi danger" onClick={() => { setMenu(null); setAsk(conv.id); }}>삭제<span>되돌릴 수 없어요</span></button>
          </>
        )}
      </div>
    </div>
  );
  const confirm = ask && (
    <div className="aic-dim" onClick={() => setAsk(null)}>
      <div className="aic-ask" role="alertdialog" aria-modal="true" aria-labelledby="aicAsk" onClick={e => e.stopPropagation()}>
        <p id="aicAsk">이 대화를 삭제할까요? 되돌릴 수 없어요.</p>
        <div><button type="button" autoFocus onClick={() => setAsk(null)}>취소</button><button type="button" className="danger" onClick={() => del(ask)}>삭제</button></div>
      </div>
    </div>
  );

  if (!open) return null;
  const phoneScreen: ReactNode = convId === null ? (counts.live || counts.arch ? list : chatPane) : chatPane;
  return (
    <div className={"aic-root" + (phone ? " is-phone" : " is-wide") + (sheet ? " is-sheet" : "")}>
      <div className="aic-dim aic-back" onClick={() => setOpen(false)} />
      <div className="aic-panel" role="dialog" aria-modal="true" aria-label="AI와 상의">
        {phone ? phoneScreen : (
          <>
            {list}
            <div className="aic-right">
              <button type="button" className="aic-icon aic-close" aria-label="닫기" onClick={() => setOpen(false)}><X /></button>
              {chatPane}
            </div>
          </>
        )}
      </div>
      {menuSheet}{confirm}
    </div>
  );
}

function ProposalCard({ lines, done, onApply, onKeep }: { lines: { k: string; from?: string; to: string }[]; done?: CMsg["done"]; onApply: () => void; onKeep: () => void }) {
  return (
    <div className="aic-prop">
      <p className="aic-prop-kick">제안 · 도안에 반영</p>
      <ul>{lines.map((l, i) => <li key={i}>{l.k && <span>{l.k} </span>}{l.from && <><s>{l.from}</s> → </>}<b>{l.to}</b></li>)}</ul>
      <p className="aic-prop-note">코 수는 앱의 공식이 다시 계산해요.</p>
      {done ? <p className="aic-prop-done">{done === "applied" ? "이 값으로 바꿨어요" : "그대로 두었어요"}</p> : (
        <div className="aic-prop-btns">
          <ClothPatch color="yellow" small onClick={onApply}>이 값으로 바꾸기</ClothPatch>
          <ClothPatch color="cream" small onClick={onKeep}>그대로 둘게요</ClothPatch>
        </div>
      )}
    </div>
  );
}
