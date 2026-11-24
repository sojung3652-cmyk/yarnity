"use client";
// "AI와 상의", made to work like a chat app (Kim: Claude's structure, Yarnity's look). Web and phone alike.
//   Web: the AI tab opens a panel from the right (760px): the conversations on the left (260px, folds to 56px
//   icons), the chat on the right; no full screen on the web (Kim: /ai there goes back to the small window).
//   Phones: straight into the chat (the last conversation, or a new one): ☰ the conversations (a drawer from
//   the left), the title (tap to rename), ✎ a new one. A sheet from the bottom, pulled down to put it away;
//   from 도안 만들기 a half sheet, pulled up or ⤢ for the whole screen.
//   The list: + 새 대화, search, ★ 즐겨찾기 / 오늘 / 어제 / 지난 7일 / 이전; a row's ··· (hover; a long press on
//   phones): ★ 즐겨찾기, 이름 바꾸기, 작품에 연결, 보관하기, 삭제. 보관함 n at the foot.
//   A new conversation: the star, the question, the box in the middle, three starters. The answer streams in
//   (■ stops it, what came is kept); 복사 / ↻ 다시 답하기 under it; a question can be edited (what came after it
//   goes and it is asked again). The AI is unchanged: /api/chat with the same rules (the app's formulas count
//   stitches and rows; the AI only proposes item, shape, size, handle, yarn and hook), the photo, the chips,
//   and the proposal that changes nothing until 이 값으로 바꾸기.
// Fallback (Rule 6): without ANTHROPIC_API_KEY (GET /api/chat -> available: false) it says the AI opens soon;
// the book's own fields make the whole pattern without it.
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useBook } from "@/components/Book/BookProvider";
import { useApp } from "@/components/AppProvider";
import { ClothPatch } from "@/components/diary/Diary";
import { FoilLogo } from "@/components/FoilLogo";
import { ask } from "@/components/ai/ask";
import { Markdown } from "@/components/ai/Markdown";
import { chats, useChats } from "@/components/ai/useChats";
import { useMobile } from "@/components/mobile/useMobile";
import { proposalFrom, type Proposal } from "@/lib/aiApply";
import type { ChatRequest } from "@/lib/chat";
import { apiTurns, dateLine, dayGroup, sameDay, turnsOf, type CMsg, type Conversation } from "@/lib/conversations";
import { ITEM, itemIdOf } from "@/lib/items";
import { plan, SHAPE_KO } from "@/lib/pattern";
import { store } from "@/lib/store";
import type { Draft, Project } from "@/lib/types";
import { hookMmOf, yarnWeightText } from "@/lib/yarn";
import "@/components/ai/ai.css";
import { GoldX } from "@/components/GoldX";

const ERR: Record<string, string> = {
  not_configured: "Yarni 상담은 곧 열립니다. 그동안 책의 칸만으로도 끝까지 만들 수 있습니다.",
  not_granted: "Yarni 상담을 쓸 수 없는 상태입니다. 책의 칸만으로도 끝까지 만들 수 있습니다.",
  rate_limited: "잠시 뒤에 다시 보내 주십시오.",
  image_rejected: "이 사진은 읽을 수 없습니다. 다른 사진으로 해 보시겠습니까?",
  invalid_json: "답을 정리하지 못했습니다. 한 번만 다시 보내 주십시오.",
  refused: "그 요청은 도와드리기 어렵습니다.",
  offline: "인터넷 연결을 확인해 주십시오.",
  stopped: "답을 멈췄습니다.",
};
const FALLBACK = "연결이 잠깐 끊겼습니다. 다시 보내 주십시오.";
const FATAL = ["not_configured", "not_granted"];
const STEP_KO = ["메뉴", "이름", "품목", "실과 크기", "확인"];
const STARTERS = ["여름에 들 작은 가방", "가진 실로 무엇을 뜰 수 있습니까?", "사진 올리고 비슷하게 뜨기"];
// opened inside 도안 만들기: the starters are that step's questions
const STEP_CHIPS: Record<number, string[]> = {
  1: ["선물할 작품 이름 지어 줘", "짧고 예쁜 이름 추천"],
  2: ["초보에게 쉬운 품목", "여름에 들 작은 가방", "선물하기 좋은 것"],
  3: ["이 실에 맞는 바늘은?", "크기를 추천해 줘", "손잡이 길이는?"],
  4: ["실이 충분할까?", "조금 더 크게 하고 싶어"],
};
const SIDE_KEY = "iyarn.aiSide";

let availabilityRequested = false;

/** Downscale to <=1568px on the long side (the API's useful max) and re-encode as JPEG. */
async function encodeImage(file: File): Promise<NonNullable<ChatRequest["image"]>> {
  const bmp = await createImageBitmap(file);
  const s = Math.min(1, 1568 / Math.max(bmp.width, bmp.height));
  const cv = document.createElement("canvas"); cv.width = Math.round(bmp.width * s); cv.height = Math.round(bmp.height * s);
  const ctx = cv.getContext("2d")!; ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.drawImage(bmp, 0, 0, cv.width, cv.height); bmp.close();
  return { data: cv.toDataURL("image/jpeg", 0.9).split(",")[1], mediaType: "image/jpeg" };
}
/** a small copy of the photo to keep with the conversation (localStorage); sent again when a question with a
 *  photo is asked again (edited, 다시 답하기, 다시 시도) */
async function thumbOf(file: File) {
  const bmp = await createImageBitmap(file), s = Math.min(1, 480 / Math.max(bmp.width, bmp.height));
  const cv = document.createElement("canvas"); cv.width = Math.round(bmp.width * s); cv.height = Math.round(bmp.height * s);
  const ctx = cv.getContext("2d")!; ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.drawImage(bmp, 0, 0, cv.width, cv.height); bmp.close();
  return cv.toDataURL("image/jpeg", 0.75);
}
const fromThumb = (url: string): NonNullable<ChatRequest["image"]> => ({ data: url.split(",")[1], mediaType: "image/jpeg" });

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

const Star = ({ size = 22 }: { size?: number }) => <img className="aic-star" src="/mobile/diary/star.webp" alt="" aria-hidden="true" style={{ width: size, height: size }} />; // eslint-disable-line @next/next/no-img-element
const I = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const Ic = {
  dots: <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5.5" cy="12" r="1.6" fill="currentColor" /><circle cx="12" cy="12" r="1.6" fill="currentColor" /><circle cx="18.5" cy="12" r="1.6" fill="currentColor" /></svg>,
  x: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" {...I} /></svg>,
  menu: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" {...I} /></svg>,
  pen: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z" {...I} /><path d="M13.5 6.5l4 4" {...I} /></svg>,
  plus: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" {...I} strokeWidth={1.8} /></svg>,
  up: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V6M6 11.5 12 5.5l6 6" {...I} strokeWidth={2} /></svg>,
  stop: <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7.5" y="7.5" width="9" height="9" rx="1.5" fill="currentColor" /></svg>,
  down: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v13M6 12.5l6 6 6-6" {...I} strokeWidth={1.8} /></svg>,
  copy: <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8.5" y="8.5" width="11" height="11" rx="2" {...I} /><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5" {...I} /></svg>,
  again: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4" {...I} /></svg>,
  side: <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="15" rx="2.5" {...I} /><path d="M9.5 4.5v15" {...I} /></svg>,
  search: <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6" {...I} /><path d="m16 16 4 4" {...I} /></svg>,
  box: <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="4" rx="1" {...I} /><path d="M5 9v9.5h14V9M10 13h4" {...I} /></svg>,
  expand: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4.5h5.5V10M10 19.5H4.5V14M19.5 4.5 13.5 10.5M4.5 19.5l6-6" {...I} /></svg>,
  trash: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 7h15M9.5 7V5.2c0-.4.3-.7.7-.7h3.6c.4 0 .7.3.7.7V7M6.5 7l.8 11.6c.1.8.7 1.4 1.5 1.4h6.4c.8 0 1.4-.6 1.5-1.4L17.5 7M10.3 10.5v6M13.7 10.5v6" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" /></svg>,
  fold: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5v14M19 12H9M13 8l-4 4 4 4" {...I} /></svg>,
  unfold: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 5v14M5 12h10M11 8l4 4-4 4" {...I} /></svg>,
  back: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5.5 8 12l6.5 6.5" {...I} /></svg>,
  // a ball of yarn: the work a conversation is about
  yarn: <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="12" r="7" {...I} /><path d="M5.5 8.5c3 0 7.5 2 9.5 7M7 16.5c1-3.5 4-7.5 8.5-9.5M10 5.2c1.5 2.5 2 7 1 13.6" {...I} strokeWidth={1.2} /><path d="M18 12c1.5.5 2.5 2 2.5 4" {...I} strokeWidth={1.2} /></svg>,
};

/** The one AI sheet on the book's stage (wide screens): shown on the open book (menu, or the wizard's step). */
export function AiHost() {
  const b = useBook(), { draft, setDraft } = useApp(), m = useMobile();
  // phones have their own sheet (MobileChrome). The small window does not need the book open: coming back
  // from /ai (the book has closed by then) it is still there, on the same conversation (Kim)
  if (m !== false) return null;
  return <AiPanel draft={draft} step={b.view === "wizard" ? b.step : 0} onApply={p => setDraft({ ...draft, ...p })} />;
}

type Busy = { id: string; text: string; ctl: AbortController };

export function AiPanel({ draft, step: stepProp, onApply, page = false }: { draft: Draft; step: number; onApply: (patch: Partial<Draft>) => void; page?: boolean }) {
  const { chat, setChat, projects, updateProject, active } = useApp();
  const all = useChats(), m = useMobile(), phone = !!m, router = useRouter(), path = usePathname();
  const open = page || !!chat.open, convId = chat.conv && chat.conv !== "new" ? chat.conv : null, sheet = !page && phone && !!chat.sheet;
  const conv = convId ? all.find(c => c.id === convId) ?? null : null;
  // wide screens, not /ai: a small floating window (Kim) with the phone's chat inside - ☰ the list as a drawer,
  // ✎ a new one, ✕ (no full screen on the web: Kim); the page behind is not dimmed and stays clickable
  const win = !phone && !page;
  const key = conv ? conv.id : "new";
  // the step of 도안 만들기 it was opened in: the book's (web), or the phone's screens' (/new?step=N)
  const [urlStep, setUrlStep] = useState(0), step = stepProp || urlStep;

  // the list
  const [q, setQ] = useState(""), [arch, setArch] = useState(false), [drawer, setDrawer] = useState(false);
  const [side, setSide] = useState(true);
  useEffect(() => { setSide(store.get(SIDE_KEY, true)); }, []);
  const fold = (on: boolean) => { setSide(on); store.set(SIDE_KEY, on); };
  const [rowMenu, setRowMenu] = useState<string | null>(null), [acts, setActs] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null), [name, setName] = useState("");
  // where the name is being changed: the title bar, or the row in the list (never both: two inputs would
  // take the focus from each other, and the first one would save on losing it)
  const [inBar, setInBar] = useState(false);
  const [linking, setLinking] = useState<string | null>(null), [askDel, setAskDel] = useState<string | null>(null);
  // the chat
  const [input, setInputState] = useState(""), [pending, setPending] = useState<{ file: File; url: string } | null>(null);
  const [busy, setBusy] = useState<Busy | null>(null), [editing, setEditing] = useState<{ i: number; text: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null), [msgActs, setMsgActs] = useState<number | null>(null);
  const [newLink, setNewLink] = useState<string | null>(null), [stepOff, setStepOff] = useState(false), [landing, setLanding] = useState(false);
  const [stick, setStick] = useState(true), [far, setFar] = useState(false), [online, setOnline] = useState(true);
  const msgsRef = useRef<HTMLDivElement>(null), inputRef = useRef<HTMLTextAreaElement>(null), wasOpen = useRef(false), searchRef = useRef<HTMLInputElement>(null);
  // phones: the sheet is pulled by its top: down past 110px puts it away; a half sheet pulled up goes full
  const [drag, setDrag] = useState(0), [sinking, setSinking] = useState(false), y0 = useRef<number | null>(null);
  const press = useRef<ReturnType<typeof setTimeout> | null>(null), pressed = useRef(false);
  // phones: a row of the list swiped left shows 보관 / 삭제 under it (Kim: delete right from the list)
  const [slid, setSlid] = useState<string | null>(null), x0 = useRef<number | null>(null);

  const setInput = (t: string) => { setInputState(t); chats.setDraft(key, t); };
  const go = (id: string | null) => { setRowMenu(null); setActs(null); setDrawer(false); setEditing(null); setMsgActs(null); setChat(c => ({ ...c, conv: id ?? "new" })); };
  const offChat = () => setChat(c => ({ ...c, off: true, checked: true }));
  const close = () => {
    // /ai: back to the book, where the small window is open again on the same conversation
    if (page) { if (!phone) setChat(c => ({ ...c, open: true })); if (history.length > 1) router.back(); else router.push("/"); return; }
    if (!phone) {
      // the small window sinks 12px and fades (0.2s), then it is gone
      setSinking(true);
      setTimeout(() => { setSinking(false); setChat(c => ({ ...c, open: false, shape: false })); }, matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 200);
      return;
    }
    // phones: the sheet goes back down first (0.22s), then it is gone
    setSinking(true);
    setTimeout(() => { setSinking(false); setDrag(0); setChat(c => ({ ...c, open: false })); }, matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 220);
  };

  // /ai (wide): leaving it by the browser's back also comes back to the small window, on this conversation
  // and the web has no full-screen chat any more (Kim): /ai opened there goes home with the small window open
  useEffect(() => { if (page && m === false) { setChat(c => ({ ...c, open: true })); router.replace("/"); } }, [page, m]); // eslint-disable-line react-hooks/exhaustive-deps

  // availability, once per page load
  useEffect(() => {
    if (chat.checked || availabilityRequested) return;
    availabilityRequested = true;
    fetch("/api/chat").then(r => r.json()).then((s: { available: boolean; images: boolean }) => {
      if (!s.available) offChat(); else setChat(c => ({ ...c, checked: true, images: !!s.images }));
    }).catch(() => offChat());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // opening: from 도안 만들기 a new conversation about that step (phones: a half sheet); from a work's page the
  // conversation about that work (or a new one linked to it); else the last conversation (web: the one shown)
  useEffect(() => {
    if (open && !wasOpen.current) {
      setStepOff(false); setNewLink(null);
      const s = stepProp || (path === "/new" ? Number(new URLSearchParams(location.search).get("step")) || 0 : 0);
      setUrlStep(stepProp ? 0 : s);
      const onWork = phone && active && (path === "/pattern" || path === "/track");
      const live = all.filter(c => !c.archived).sort((a, b) => b.updated - a.updated);
      let next: string = "new";
      if (s > 0) next = "new";
      else if (onWork) { const c = live.find(c => c.projectId === active!.id); if (c) next = c.id; else setNewLink(active!.id); }
      else if (chat.conv && chat.conv !== "new" && all.some(c => c.id === chat.conv)) next = chat.conv;
      else if (phone && live[0]) next = live[0].id;
      setChat(c => ({ ...c, conv: next, sheet: !page && s > 0 }));
    }
    wasOpen.current = open;
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  // the words typed for this conversation come back with it
  useEffect(() => { setInputState(chats.draft(key)); setPending(null); setStick(true); }, [key]);
  // a line's question goes into the box (the user sends it)
  useEffect(() => {
    if (!chat.prefill) return;
    const t = chat.prefill; setChat(c => ({ ...c, prefill: null })); setInput(t);
    requestAnimationFrame(() => { const el = inputRef.current; if (el) { el.focus({ preventScroll: true }); el.setSelectionRange(t.length, t.length); } });
  }, [chat.prefill]); // eslint-disable-line react-hooks/exhaustive-deps
  // the box grows with what is typed: 1 to 8 lines, then it scrolls inside
  useEffect(() => { const el = inputRef.current; if (el) { el.style.height = "auto"; el.style.height = Math.min(8 * 24 + 4, el.scrollHeight) + "px"; } }, [input, open, key, conv == null]);
  useEffect(() => {
    const on = () => setOnline(navigator.onLine);
    on(); addEventListener("online", on); addEventListener("offline", on);
    return () => { removeEventListener("online", on); removeEventListener("offline", on); };
  }, []);
  // following the answer down while it comes, unless the user has scrolled up
  useLayoutEffect(() => { const el = msgsRef.current; if (el && stick) el.scrollTop = el.scrollHeight; }, [conv?.msgs.length, busy?.text, key, open, stick]);
  // the box growing or the screen getting shorter (a phone's keyboard) keeps the last words in view
  const stickRef = useRef(stick); stickRef.current = stick;
  useEffect(() => {
    const el = msgsRef.current; if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => { if (stickRef.current) el.scrollTop = el.scrollHeight; });
    ro.observe(el); return () => ro.disconnect();
  }, [open, key, m]);
  const onScroll = () => {
    const el = msgsRef.current; if (!el) return;
    const gap = el.scrollHeight - el.scrollTop - el.clientHeight;
    setStick(gap < 48); setFar(gap > 240);
  };
  const toBottom = () => { const el = msgsRef.current; if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" }); setStick(true); };
  useEffect(() => {
    if (!open) return;
    // caught first (capture) and marked handled, so the book behind does not close on the same Esc
    const k = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.isComposing) return;
      e.preventDefault();
      if (rowMenu || acts || linking || askDel || renaming || drawer || editing || msgActs != null) { setRowMenu(null); setActs(null); setLinking(null); setAskDel(null); setRenaming(null); setDrawer(false); setEditing(null); setMsgActs(null); }
      else if (busy) busy.ctl.abort();
      else if (!page) close();
    };
    addEventListener("keydown", k, true); return () => removeEventListener("keydown", k, true);
  }); // eslint-disable-line react-hooks/exhaustive-deps
  // a click anywhere closes a row's ··· menu
  useEffect(() => { if (!rowMenu) return; const f = () => setRowMenu(null); addEventListener("click", f); return () => removeEventListener("click", f); }, [rowMenu]);

  const projectOf = (c: Conversation | null) => (c?.projectId ? projects.find(p => p.id === c.projectId) ?? null : null);
  const work = conv ? projectOf(conv) : newLink ? projects.find(p => p.id === newLink) ?? null : null;
  const workTag = (p: Project | null) => { if (!p) return null; const total = plan(p).rows.length; return `${p.name} · ${Math.min(p.current || 0, total)}/${total}단`; };
  const stepTag = step > 0 && !stepOff && !work && !conv ? `지금 · ${step}/4 ${STEP_KO[step]}${draft.itemPicked ? ` · ${ITEM[itemIdOf(draft)].name}` : ""}` : null;

  // ---- asking ----
  /** the answer to the conversation's last question; streams into `busy`, then is saved */
  // 모양's Yarni (chat.shape): read when the answer comes back, after the send that started it
  const shapeRef = useRef(!!chat.shape); shapeRef.current = !!chat.shape;
  async function run(id: string, image?: ChatRequest["image"]) {
    const c0 = chats.get(id); if (!c0) return;
    const ctl = new AbortController(); setBusy({ id, text: "", ctl }); setStick(true);
    const wantTitle = !c0.titled && c0.msgs.filter(x => x.role === "assistant").length === 0;
    const res = await ask({ messages: apiTurns(turnsOf(c0.msgs)), image, wantTitle }, ctl.signal, t => setBusy(b => (b && b.id === id ? { ...b, text: t } : b)));
    const c = chats.get(id);
    if (c) {
      const base: Draft = projectOf(c) ?? draft;
      if (!res.ok) {
        chats.push(id, { role: "note", text: ERR[res.error] || FALLBACK, err: res.error, retry: !FATAL.includes(res.error), at: Date.now() });
        if (FATAL.includes(res.error)) offChat();
      } else if (res.stopped && !res.reply.reply.trim()) {
        chats.push(id, { role: "note", text: ERR.stopped, err: "stopped", retry: true, at: Date.now() });
      } else {
        const r = res.reply;
        chats.push(id, { role: "assistant", text: r.reply || "알겠습니다.", turn: res.raw, at: Date.now(),
          ...(res.stopped ? { stopped: true } : { chips: r.chips.slice(0, 4), proposal: proposalFrom(r.set, base) ?? undefined }) });
        if (r.title && !c.titled) chats.patch(id, { title: r.title, titled: true });
      }
    }
    setBusy(b => (b && b.id === id ? null : b));
  }
  /** a question, said now: in this conversation, or the first of a new one */
  async function send(text: string, file?: File) {
    if (chat.off || !chat.checked || !text.trim() || busy) return;
    let c = conv;
    if (!c) {
      c = chats.create(text, { projectId: newLink });
      chats.setDraft("new", "");
      setLanding(true); setTimeout(() => setLanding(false), 300);
      setChat(x => ({ ...x, conv: c!.id }));
    }
    const base: Draft = projectOf(c) ?? draft;
    const where = projectOf(c) ? "연결된 작품" : step > 0 && !stepOff ? `도안 만들기 ${step}단계(${STEP_KO[step]})` : "도안 만들기 전";
    const img = file ?? pending?.file;
    setInputState(""); chats.setDraft(c.id, ""); setPending(null);
    const thumb = img ? await thumbOf(img).catch(() => undefined) : undefined;
    // 모양's Yarni: ask only what is needed (one short question at a time), then settle the piece in set
    const shapeHint = chat.shape && !projectOf(c) ? " 지금 모양 화면에서 무엇을 뜰지 정하는 중이야. 품목·크기·손잡이·입구 중 꼭 필요한 것만 한 번에 하나씩 짧게 물어보고, 정해지면 바로 set에 품목과 크기를 넣어 제안해." : "";
    chats.push(c.id, { role: "user", text, img: thumb, at: Date.now(), turn: `${text}\n\n${stateLine(base, where)}${shapeHint}${img ? " 사진 한 장이 첨부됐어." : ""}` });
    let image: ChatRequest["image"];
    if (img) { try { image = await encodeImage(img); } catch { chats.push(c.id, { role: "note", text: ERR.image_rejected, err: "image_rejected", at: Date.now() }); return; } }
    await run(c.id, image);
  }
  /** the question before message i, asked again (its photo too, from the kept copy) */
  const again = (i: number) => {
    if (!conv || busy) return;
    chats.cut(conv.id, i);
    const before = chats.get(conv.id)!.msgs, lastQ = [...before].reverse().find(x => x.role === "user");
    void run(conv.id, lastQ?.img ? fromThumb(lastQ.img) : undefined);
  };
  /** a question edited: it and what came after go, the new words are asked */
  const editAt = (i: number, text: string) => {
    if (!conv || busy || !text.trim()) return;
    const old = conv.msgs[i]; chats.cut(conv.id, i); setEditing(null);
    const base: Draft = projectOf(conv) ?? draft;
    const where = projectOf(conv) ? "연결된 작품" : step > 0 && !stepOff ? `도안 만들기 ${step}단계(${STEP_KO[step]})` : "도안 만들기 전";
    chats.push(conv.id, { role: "user", text, img: old.img, at: Date.now(), turn: `${text}\n\n${stateLine(base, where)}${old.img ? " 사진 한 장이 첨부됐어." : ""}` });
    void run(conv.id, old.img ? fromThumb(old.img) : undefined);
  };
  const apply = (i: number, msg: CMsg) => {
    if (!conv || !msg.proposal) return;
    if (work) updateProject(work.id, msg.proposal.patch as Partial<Project>); // the pattern is planned from these values: it recalculates
    // 모양 (Kim: 이대로 적용하고 다음 단계로): the piece made at once, the window closes, the parts open
    else if (shapeRef.current) { onApply({ ...msg.proposal.patch, itemPicked: true }); setChat(c => ({ ...c, applied: (c.applied ?? 0) + 1, shape: false, open: false })); }
    else { onApply(msg.proposal.patch); setChat(c => ({ ...c, applied: (c.applied ?? 0) + 1 })); }
    chats.setMsg(conv.id, i, { done: "applied" });
  };
  const copy = async (k: string, text: string) => {
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; }
    catch {
      // the clipboard API is refused when the page is not focused or not secure: the older way
      const ta = document.createElement("textarea"); ta.value = text; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;left:-9999px;top:0";
      document.body.appendChild(ta); ta.select();
      try { ok = document.execCommand("copy"); } catch {}
      ta.remove();
    }
    if (ok) { setCopied(k); setTimeout(() => setCopied(x => (x === k ? null : x)), 1500); }
  };
  const del = (id: string) => { chats.remove(id); setAskDel(null); if (convId === id) go(null); };
  const rename = (id: string) => { const t = name.trim().slice(0, 30); if (t) chats.patch(id, { title: t, titled: true }); setRenaming(null); };
  const startRename = (c: Conversation, bar = false) => { setRowMenu(null); setActs(null); setName(c.title); setInBar(bar); setRenaming(c.id); };
  // a long press (phones): a row's menu, a question's 수정 / 복사
  const hold = (f: () => void) => ({
    onTouchStart: () => { pressed.current = false; press.current = setTimeout(() => { pressed.current = true; navigator.vibrate?.(8); f(); }, 450); },
    onTouchMove: () => { if (press.current) clearTimeout(press.current); },
    onTouchEnd: () => { if (press.current) clearTimeout(press.current); },
    onContextMenu: phone ? (e: React.MouseEvent) => e.preventDefault() : undefined,
  });

  const swipeHold = (id: string) => {
    const h = hold(() => setActs(id));
    return {
      ...h,
      onTouchStart: (e: React.TouchEvent) => { x0.current = e.touches[0].clientX; h.onTouchStart(); },
      onTouchEnd: (e: React.TouchEvent) => {
        h.onTouchEnd();
        if (x0.current == null) return;
        const dx = e.changedTouches[0].clientX - x0.current; x0.current = null;
        if (dx < -40) { pressed.current = true; setSlid(id); } else if (dx > 30 && slid) { pressed.current = true; setSlid(null); }
      },
    };
  };

  // ---- the list ----
  const shown = useMemo(() => {
    const w = q.trim().toLowerCase();
    return all.filter(c => (arch ? !!c.archived : !c.archived) && (!w || (c.title + " " + c.msgs.map(x => x.text).join(" ")).toLowerCase().includes(w)))
      .sort((a, b) => b.updated - a.updated);
  }, [all, q, arch]);
  const archN = all.filter(c => c.archived).length;
  const groups = useMemo(() => {
    const g: [string, Conversation[]][] = [];
    const starred = arch ? [] : shown.filter(c => c.starred);
    if (starred.length) g.push(["★ 즐겨찾기", starred]);
    for (const c of shown) {
      if (c.starred && !arch) continue;
      const k = dayGroup(c.updated), last = g[g.length - 1];
      if (last && last[0] === k) last[1].push(c); else g.push([k, [c]]);
    }
    return g;
  }, [shown, arch]);
  const rowItems = (c: Conversation): [string, () => void, boolean?][] => c.archived
    ? [["보관함에서 꺼내기", () => { chats.archive(c.id, false); setRowMenu(null); setActs(null); }], ["삭제", () => { setRowMenu(null); setActs(null); setAskDel(c.id); }, true]]
    : [[c.starred ? "★ 즐겨찾기 해제" : "★ 즐겨찾기", () => { chats.star(c.id, !c.starred); setRowMenu(null); setActs(null); }],
      ["이름 바꾸기", () => startRename(c)],
      ["작품에 연결", () => { setRowMenu(null); setActs(null); setLinking(c.id); }],
      ["보관하기", () => { chats.archive(c.id, true); setRowMenu(null); setActs(null); if (convId === c.id) go(null); }],
      ["삭제", () => { setRowMenu(null); setActs(null); setAskDel(c.id); }, true]];
  // the /ai page's sidebar (wide): it folds to 56px icons; the drawer (phones, the small window) never folds
  const sideBar = page && !phone, folded = sideBar && !side;
  const listPane = (
    <aside className={"aic-side" + (folded ? " is-folded" : "") + (sideBar ? " is-page" : "")} aria-label="대화 목록">
      <div className="aic-side-top">
        {sideBar
          ? !folded && <span className="aic-side-logo" aria-label="Yarnity"><FoilLogo className="aic-side-foil" /></span>
          : <b className="aic-side-name">Yarni와 상의</b>}
        {sideBar
          ? <button type="button" className="aic-icon" aria-label={folded ? "목록 펴기" : "목록 접기"} title={folded ? "목록 펴기" : "목록 접기"} aria-expanded={!folded} onClick={() => fold(folded)}>{folded ? Ic.unfold : Ic.fold}</button>
          : <button type="button" className="aic-icon" aria-label="목록 닫기" onClick={() => setDrawer(false)}><GoldX /></button>}
      </div>
      {folded ? (
        <div className="aic-side-icons">
          <button type="button" className="aic-icon" aria-label="새 대화" title="새 대화" onClick={() => go(null)}>{Ic.pen}</button>
          <button type="button" className="aic-icon" aria-label="대화 찾기" title="대화 찾기" onClick={() => { fold(true); setTimeout(() => searchRef.current?.focus(), 50); }}>{Ic.search}</button>
          <span className="aic-grow" />
          <button type="button" className="aic-icon" aria-label={`보관함 ${archN}`} title={`보관함 ${archN}`} onClick={() => { fold(true); setArch(true); }}>{Ic.box}</button>
          <button type="button" className="aic-icon" aria-label="책으로 돌아가기" title="책으로 돌아가기" onClick={close}>{Ic.back}</button>
        </div>
      ) : (
        <>
          {arch ? (
            <button type="button" className="aic-arch-head" onClick={() => setArch(false)}>{Ic.back}<b>보관함</b><span>{archN}</span></button>
          ) : phone
            ? <ClothPatch color="yellow" small className="aic-new" onClick={() => go(null)}>+ 새 대화</ClothPatch>
            // wide screens: a quiet row in place of the big yellow patch (Kim)
            : <button type="button" className="aic-newrow" onClick={() => go(null)}>{Ic.pen}<span>새 대화</span></button>}
          <label className="aic-search"><span className="sr">대화 찾기</span>{Ic.search}
            <input ref={searchRef} type="search" value={q} placeholder="대화 찾기" onChange={e => setQ(e.target.value)} />
          </label>
          <div className="aic-rows">
            {groups.length === 0 && <p className="aic-empty">{q ? "찾는 대화가 없습니다" : arch ? "보관한 대화가 없습니다" : "아직 대화가 없습니다"}</p>}
            {groups.map(([g, cs]) => (
              <div key={g}>
                <h3 className="aic-day">{g}</h3>
                {cs.map(c => (
                  <div key={c.id} className={"aic-row" + (convId === c.id ? " is-on" : "") + (rowMenu === c.id ? " is-menu" : "") + (slid === c.id ? " is-slid" : "")}>
                    {renaming === c.id && !inBar ? (
                      <form className="aic-row-rename" onSubmit={e => { e.preventDefault(); rename(c.id); }}>
                        <label className="sr" htmlFor={`rn-${c.id}`}>대화 이름</label>
                        <input id={`rn-${c.id}`} autoFocus maxLength={30} value={name} onChange={e => setName(e.target.value)} onBlur={() => rename(c.id)} />
                      </form>
                    ) : (
                      <button type="button" className="aic-row-main" onClick={() => { if (pressed.current) { pressed.current = false; return; } if (slid) { setSlid(null); return; } go(c.id); }} {...swipeHold(c.id)}>
                        <span className="aic-row-title">{c.title}</span>
                        {c.projectId && <i className="aic-linkdot" title="작품에 연결됨" />}
                      </button>
                    )}
                    {phone && (
                      <div className="aic-row-acts" aria-hidden={slid !== c.id}>
                        <button type="button" className="is-arch" tabIndex={slid === c.id ? 0 : -1} onClick={() => { chats.archive(c.id, !c.archived); setSlid(null); if (!c.archived && convId === c.id) go(null); }}>{c.archived ? "꺼내기" : "보관"}</button>
                        <button type="button" className="is-del" tabIndex={slid === c.id ? 0 : -1} onClick={() => { setSlid(null); setAskDel(c.id); }}>삭제</button>
                      </div>
                    )}
                    {!phone && !(renaming === c.id && !inBar) && <button type="button" className="aic-row-del" aria-label={`${c.title} 삭제`} title="삭제" onClick={e => { e.stopPropagation(); setRowMenu(null); setAskDel(c.id); }}>{Ic.trash}</button>}
                    {!phone && !(renaming === c.id && !inBar) && <button type="button" className="aic-row-more" aria-label={`${c.title} 메뉴`} aria-expanded={rowMenu === c.id} onClick={e => { e.stopPropagation(); setRowMenu(rowMenu === c.id ? null : c.id); }}>{Ic.dots}</button>}
                    {rowMenu === c.id && (
                      <div className="aic-pop" role="menu" onClick={e => e.stopPropagation()}>
                        {rowItems(c).map(([t, f, danger]) => <button key={t} type="button" role="menuitem" className={danger ? "danger" : undefined} onClick={f}>{t}</button>)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
          {!arch && <button type="button" className="aic-archbtn" onClick={() => setArch(true)}>{Ic.box}보관함 {archN}</button>}
          {sideBar && <button type="button" className="aic-archbtn aic-tobook" onClick={close}>{Ic.back}책으로 돌아가기</button>}
        </>
      )}
    </aside>
  );

  // ---- the box ----
  const tag = workTag(work) ?? stepTag;
  const unlink = () => { if (conv && conv.projectId) chats.patch(conv.id, { projectId: null }); else if (newLink) setNewLink(null); else setStepOff(true); };
  const composer = !chat.off && (
    <form className={"aic-compose" + (landing ? " is-landing" : "")} onSubmit={e => { e.preventDefault(); void send(input); }}>
      <div className="aic-box">
        {pending && (
          <div className="aic-thumbs">
            <span>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={pending.url} alt="붙인 사진" /><button type="button" aria-label="사진 빼기" onClick={() => setPending(null)}>{Ic.x}</button></span>
          </div>
        )}
        <label htmlFor="aiInput" className="sr">메시지</label>
        <textarea id="aiInput" ref={inputRef} rows={1} value={input} placeholder="무엇이든 물어보십시오" onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (!phone && e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(input); } }} />
        <div className="aic-box-row">
          {chat.images && (
            <label className="aic-plus" aria-label="사진 붙이기" title="작품이나 실 라벨 사진">
              <input type="file" accept="image/*" className="sr" onChange={e => { const f = e.target.files?.[0]; if (f) setPending({ file: f, url: URL.createObjectURL(f) }); e.target.value = ""; }} />
              {Ic.plus}
            </label>
          )}
          {tag && <span className="aic-ctag">{Ic.yarn}<span>{tag}</span><button type="button" aria-label="연결 풀기" onClick={unlink}>{Ic.x}</button></span>}
          <span className="aic-grow" />
          {busy && busy.id === key
            ? <button type="button" className="aic-send is-stop" aria-label="답 멈추기" onClick={() => busy.ctl.abort()}>{Ic.stop}</button>
            : <button type="submit" className="aic-send" aria-label="보내기" disabled={!input.trim() || !!busy || !chat.checked}>{Ic.up}</button>}
        </div>
      </div>
    </form>
  );

  // ---- the chat ----
  const lastAi = conv ? conv.msgs.map(x => x.role).lastIndexOf("assistant") : -1;
  const thread = conv && (
    <>
      {conv.msgs.map((x, i) => (
        <div key={i} className="aic-item">
          {i > 0 && !sameDay(conv.msgs[i - 1].at, x.at) && <p className="aic-date"><span>{dateLine(x.at)}</span></p>}
          {x.role === "user" ? (
            editing?.i === i ? (
              <form className="aic-edit" onSubmit={e => { e.preventDefault(); editAt(i, editing.text); }}>
                <label className="sr" htmlFor="aicEdit">질문 고치기</label>
                <textarea id="aicEdit" autoFocus value={editing.text} onChange={e => setEditing({ i, text: e.target.value })} rows={3}
                  onKeyDown={e => { if (!phone && e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); editAt(i, editing.text); } }} />
                <div><button type="button" onClick={() => setEditing(null)}>취소</button><button type="submit" className="is-go" disabled={!editing.text.trim()}>보내기</button></div>
              </form>
            ) : (
              <div className={"aic-me" + (msgActs === i ? " is-acts" : "")}>
                <div className="aic-me-bubble" {...hold(() => setMsgActs(msgActs === i ? null : i))}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {x.img && <img src={x.img} alt="올린 사진" />}<p>{x.text}</p>
                </div>
                <div className="aic-acts aic-me-acts">
                  <button type="button" disabled={!!busy} onClick={() => { setMsgActs(null); setEditing({ i, text: x.text }); }}>{Ic.pen}<span>수정</span></button>
                  <button type="button" onClick={() => { copy(`m${i}`, x.text); setMsgActs(null); }}>{Ic.copy}<span>{copied === `m${i}` ? "복사했습니다" : "복사"}</span></button>
                </div>
              </div>
            )
          ) : x.role === "note" ? (
            <p className="aic-notice">{x.err && x.err !== "stopped" ? "답을 받지 못했습니다 · " : ""}{x.text}
              {x.retry && i === conv.msgs.length - 1 && <button type="button" disabled={!!busy} onClick={() => again(i)}>다시 시도</button>}</p>
          ) : (
            <div className="aic-ai">
              <Star />
              <div className="aic-ai-body">
                <Markdown text={x.text} />
                {x.stopped && <p className="aic-stopped">여기서 멈췄습니다</p>}
                {x.proposal && <ProposalCard lines={diffLines(work ?? draft, x.proposal)} done={x.done} shape={!!chat.shape && !work} onApply={() => apply(i, x)} onKeep={() => { chats.setMsg(conv.id, i, { done: "kept" }); if (chat.shape) inputRef.current?.focus(); }} />}
                <div className="aic-acts aic-ai-acts">
                  <button type="button" onClick={() => copy(`a${i}`, x.text)}>{Ic.copy}<span>{copied === `a${i}` ? "복사했습니다" : "복사"}</span></button>
                  {i === lastAi && i === conv.msgs.length - 1 && <button type="button" disabled={!!busy || chat.off} onClick={() => again(i)}>{Ic.again}<span>다시 답하기</span></button>}
                </div>
                {i === lastAi && !busy && !!x.chips?.length && <div className="aic-chips">{x.chips.map(t => <button key={t} type="button" disabled={chat.off} onClick={() => send(t)}>{t}</button>)}</div>}
              </div>
            </div>
          )}
        </div>
      ))}
      {busy && busy.id === conv.id && (
        <div className="aic-item">
          <div className="aic-ai is-live">
            <Star />
            <div className="aic-ai-body" aria-live="polite">
              {busy.text ? <Markdown text={busy.text} /> : <p className="aic-thinking">생각하는 중 <span className="aic-dots" aria-hidden="true"><i /><i /><i /></span></p>}
            </div>
          </div>
        </div>
      )}
    </>
  );
  const starters = step > 0 && !stepOff ? STEP_CHIPS[step] ?? STARTERS : STARTERS;
  const fresh = (
    <div className={"aic-fresh" + (sheet ? " is-sheet" : "")}>
      {/* the gold star breathes (Kim): a touch brighter and back every 2.4s; three tiny glints around it wink in turn */}
      <span className="aic-glint" aria-hidden="true">
        <Star size={40} />
        {[0, 1, 2].map(i => <svg key={i} className={"aic-wink w" + i} viewBox="0 0 10 10"><path d="M5 0 5.9 4.1 10 5 5.9 5.9 5 10 4.1 5.9 0 5 4.1 4.1Z" /></svg>)}
      </span>
      <h2>오늘은 무엇을 떠 보시겠습니까?</h2>
      {composer}
      <div className="aic-starters">
        {starters.map(t => <button key={t} type="button" disabled={!!busy || chat.off || !chat.checked} onClick={() => (t.startsWith("사진") ? (setInput(t + " "), inputRef.current?.focus()) : send(t))}>{t}</button>)}
      </div>
      <p className="aic-note">코 수와 단 수는 Yarni가 아니라 앱의 공식이 계산합니다.</p>
    </div>
  );
  const offNote = chat.off && <p className="aic-notice">{ERR.not_configured}</p>;
  const title = conv ? conv.title : "새 대화";
  const titleEl = inBar && conv && renaming === conv.id ? (
    <form className="aic-title-rename" onSubmit={e => { e.preventDefault(); rename(conv.id); }}>
      <label className="sr" htmlFor="aicTitle">대화 이름</label>
      <input id="aicTitle" autoFocus maxLength={30} value={name} onChange={e => setName(e.target.value)} onBlur={() => rename(conv.id)} />
    </form>
  ) : <button type="button" className="aic-title" disabled={!conv} title={conv ? "이름 바꾸기" : undefined} onClick={() => conv && startRename(conv, true)}>{title}</button>;
  const chatPane = (
    <section className="aic-chat" aria-label={title}>
      <header className="aic-bar">
        {phone ? (
          <>
            <button type="button" className="aic-icon" aria-label="대화 목록" aria-expanded={drawer} onClick={() => setDrawer(true)}>{Ic.menu}</button>
            {titleEl}
            <span className="aic-bar-end">
              {sheet && <button type="button" className="aic-icon" aria-label="전체 화면" onClick={() => setChat(c => ({ ...c, sheet: false }))}>{Ic.expand}</button>}
              <button type="button" className="aic-icon" aria-label="새 대화" onClick={() => go(null)}>{Ic.pen}</button>
            </span>
          </>
        ) : win ? (
          <>
            <button type="button" className="aic-icon" aria-label="대화 목록" title="대화 목록" aria-expanded={drawer} onClick={() => setDrawer(true)}>{Ic.menu}</button>
            {titleEl}
            <span className="aic-bar-end">
              <button type="button" className="aic-icon" aria-label="새 대화" title="새 대화" onClick={() => go(null)}>{Ic.pen}</button>
              <button type="button" className="aic-icon" aria-label="닫기" title="닫기" onClick={close}><GoldX /></button>
            </span>
          </>
        ) : (
          // /ai: the title and the work it is about, over the 680px column
          <div className="aic-col aic-page-head">
            {titleEl}
            {tag && <span className="aic-ptag">{Ic.yarn}<span>{tag}</span></span>}
          </div>
        )}
      </header>
      <div className="aic-msgs" ref={msgsRef} onScroll={onScroll}>
        <div className="aic-col">{offNote}{conv ? thread : fresh}</div>
      </div>
      {conv && (
        <div className="aic-foot">
          {far && <button type="button" className="aic-down" aria-label="맨 아래로" onClick={toBottom}>{Ic.down}</button>}
          {!online && <p className="aic-offline" role="status">인터넷 연결을 확인해 주십시오</p>}
          <div className="aic-col">{composer}</div>
          {sideBar && <p className="aic-note aic-foot-note">코 수와 단 수는 Yarni가 아니라 앱의 공식이 계산합니다.</p>}
        </div>
      )}
      {!conv && !online && <p className="aic-offline is-float" role="status">인터넷 연결을 확인해 주십시오</p>}
    </section>
  );

  // ---- sheets over it: a row's menu (phones), linking a work, the delete question ----
  const actsConv = acts ? all.find(c => c.id === acts) ?? null : null;
  const actsSheet = actsConv && (
    <div className="aic-dim aic-menu-dim" onClick={() => setActs(null)}>
      <div className="aic-menu" role="dialog" aria-modal="true" aria-label={`${actsConv.title} 메뉴`} onClick={e => e.stopPropagation()}>
        <span className="aic-grip" aria-hidden="true" />
        <p className="aic-menu-title">{actsConv.title}</p>
        {rowItems(actsConv).map(([t, f, danger]) => <button key={t} type="button" className={"aic-mi" + (danger ? " danger" : "")} onClick={f}>{t}</button>)}
      </div>
    </div>
  );
  const linkConv = linking ? all.find(c => c.id === linking) ?? null : null;
  const linkSheet = linkConv && (
    <div className="aic-dim aic-menu-dim" onClick={() => setLinking(null)}>
      <div className="aic-menu aic-link" role="dialog" aria-modal="true" aria-label="작품에 연결" onClick={e => e.stopPropagation()}>
        <span className="aic-grip" aria-hidden="true" />
        <p className="aic-menu-title">어떤 작품에 대한 대화입니까?</p>
        {projects.length === 0 && <p className="aic-empty">아직 작품이 없습니다</p>}
        {projects.map(p => <button key={p.id} type="button" aria-pressed={linkConv.projectId === p.id} onClick={() => { chats.patch(linkConv.id, { projectId: p.id }); setLinking(null); }}><b>{p.name}</b><span>{workTag(p)}</span></button>)}
        {linkConv.projectId && <button type="button" onClick={() => { chats.patch(linkConv.id, { projectId: null }); setLinking(null); }}><b>연결 풀기</b></button>}
      </div>
    </div>
  );
  const confirm = askDel && (
    <div className="aic-dim aic-ask-dim" onClick={() => setAskDel(null)}>
      <div className="aic-ask" role="alertdialog" aria-modal="true" aria-labelledby="aicAsk" onClick={e => e.stopPropagation()}>
        <p id="aicAsk">이 대화를 삭제하시겠습니까? 되돌릴 수 없습니다.</p>
        <div><button type="button" autoFocus onClick={() => setAskDel(null)}>취소</button><button type="button" className="danger" onClick={() => del(askDel)}>삭제</button></div>
      </div>
    </div>
  );

  // nothing until the screen's size is known (a phone would show the wide panel for a moment)
  if (!open || m === null) return null;
  // on /ai the page is the chat: the window (and the phone sheet) stay away there
  if (!page && path === "/ai") return null;
  const overlays: ReactNode = <>{actsSheet}{linkSheet}{confirm}</>;
  if (phone) {
    return (
      <div className={"aic-root is-phone" + (page ? " is-page" : "") + (sheet ? " is-sheet" : "") + (sinking ? " is-sinking" : "")}>
        {!page && <div className="aic-dim aic-back" onClick={close} />}
        <div className="aic-panel" role="dialog" aria-modal="true" aria-label="Yarni와 상의"
          style={drag ? { transform: `translateY(${Math.max(0, drag)}px)`, transition: "none" } : undefined}
          onTouchStart={page ? undefined : e => { const top = e.currentTarget.getBoundingClientRect().top; y0.current = e.touches[0].clientY - top < 60 ? e.touches[0].clientY : null; }}
          onTouchMove={page ? undefined : e => { if (y0.current != null) setDrag(e.touches[0].clientY - y0.current); }}
          onTouchEnd={page ? undefined : () => {
            if (y0.current != null) { if (drag > 110) close(); else if (sheet && drag < -50) setChat(c => ({ ...c, sheet: false })); }
            setDrag(0); y0.current = null;
          }}>
          {!page && <span className="aic-handle" aria-hidden="true" />}
          {chatPane}
          {drawer && (
            <div className="aic-drawer-dim" onClick={() => setDrawer(false)}>
              <div className="aic-drawer" onClick={e => e.stopPropagation()}>{listPane}</div>
            </div>
          )}
        </div>
        {overlays}
      </div>
    );
  }
  if (win) {
    return (
      <div className={"aic-root is-wide is-win" + (sinking ? " is-sinking" : "")}>
        <div className="aic-panel" role="dialog" aria-label="Yarni와 상의">
          {chatPane}
          {drawer && (
            <div className="aic-drawer-dim" onClick={() => setDrawer(false)}>
              <div className="aic-drawer" onClick={e => e.stopPropagation()}>{listPane}</div>
            </div>
          )}
        </div>
        {overlays}
      </div>
    );
  }
  return (
    <div className="aic-root is-wide is-page">
      <div className="aic-panel" aria-label="Yarni와 상의">
        {listPane}
        <div className="aic-right">{chatPane}</div>
      </div>
      {overlays}
    </div>
  );
}

function ProposalCard({ lines, done, shape, onApply, onKeep }: { lines: { k: string; from?: string; to: string }[]; done?: CMsg["done"]; shape?: boolean; onApply: () => void; onKeep: () => void }) {
  return (
    <div className="aic-prop">
      <p className="aic-prop-kick">제안 · 도안에 반영</p>
      <ul>{lines.map((l, i) => <li key={i}>{l.k && <span>{l.k} </span>}{l.from && <><s>{l.from}</s> → </>}<b>{l.to}</b></li>)}</ul>
      <p className="aic-prop-note">코 수는 앱의 공식이 다시 계산합니다.</p>
      {done ? <p className="aic-prop-done">{done === "applied" ? "✓ 도안에 반영했습니다" : shape ? "이야기를 이어 갑니다" : "그대로 두었습니다"}</p> : shape ? <>
        {/* 모양 (Kim): asked, not taken by itself - on to the next step as it is, or more talk first */}
        <p className="aic-prop-ask">이대로 적용하고 다음 단계로 넘어가시겠습니까, 아니면 더 이야기를 나누시겠습니까?</p>
        <div className="aic-prop-btns">
          <ClothPatch color="yellow" small onClick={onApply}>이대로 적용하고 다음 단계로</ClothPatch>
          <ClothPatch color="cream" small onClick={onKeep}>더 이야기하기</ClothPatch>
        </div>
      </> : (
        <div className="aic-prop-btns">
          <ClothPatch color="yellow" small onClick={onApply}>이 값으로 바꾸기</ClothPatch>
          <ClothPatch color="cream" small onClick={onKeep}>그대로 두겠습니다</ClothPatch>
        </div>
      )}
    </div>
  );
}
