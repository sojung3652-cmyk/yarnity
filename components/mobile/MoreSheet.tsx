"use client";
// The ··· menu of the phone's 완성 도안 and 따라 뜨기: a sheet from the bottom (a grip, a small title), rows with
// a gold line icon, a label and a side note; the first three go to the book's first page, a new pattern and
// 나의 도안집. A row with `confirm` asks first (the row turns into the question). Swipe down or tap the dim
// to close.
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNewDraft } from "./useNewDraft";
import { openGloss } from "@/components/glossary/glossFloat";

const G = { fill: "none", stroke: "url(#mtGold)", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" } as const;
export const ICONS: Record<string, ReactNode> = {
  home: <path d="M3.5 11 12 4l8.5 7M6 9.6V20h4.5v-5h3v5H18V9.6" {...G} />,
  plus: <><circle cx="12" cy="12" r="8.5" {...G} /><path d="M12 8v8M8 12h8" {...G} /></>,
  shelf: <><path d="M12 6.3C10 4.7 7 4.3 3.7 4.7v13.4c3.3-.4 6.3 0 8.3 1.6 2-1.6 5-2 8.3-1.6V4.7C17 4.3 14 4.7 12 6.3Z" {...G} /><path d="M12 6.3v13.4" {...G} /></>,
  pen: <><path d="m14.5 5.5 4 4L8 20H4v-4L14.5 5.5Z" {...G} /><path d="m12.5 7.5 4 4" {...G} /></>,
  tag: <><path d="M3.5 12.5V4h8.5l8.5 8.5-8.5 8.5-8.5-8.5Z" {...G} /><circle cx="8" cy="8.5" r="1.4" {...G} /></>,
  trash: <><path d="M5 7h14M9.5 7V4.5h5V7M7 7l1 13h8l1-13" {...G} /></>,
  sheet: <><rect x="5" y="3.5" width="14" height="17" rx="1.5" {...G} /><path d="M8.5 8h7M8.5 12h7M8.5 16h4" {...G} /></>,
  gloss: <><path d="M5 4.5h10.5a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3V4.5Z" {...G} /><path d="M5 17a3 3 0 0 1 3-3h10.5M9 8.5h6" {...G} /></>,
  again: <><path d="M5 12a7 7 0 1 0 2.2-5.1" {...G} /><path d="M5 4.5V8h3.5" {...G} /></>,
};

export interface MoreItem { key: string; icon: string; label: string; sub?: string; danger?: boolean; confirm?: string; onClick: () => void }

/** `skip`: common rows to leave out (나의 도안집 does not offer 나의 도안집) */
export function MoreSheet({ title, items, onClose, skip = [] }: { title: string; items: MoreItem[]; onClose: () => void; skip?: string[] }) {
  const router = useRouter(), newDraft = useNewDraft();
  const [asking, setAsking] = useState<string | null>(null), y0 = useRef<number | null>(null), [drag, setDrag] = useState(0);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; addEventListener("keydown", k); return () => removeEventListener("keydown", k); }, [onClose]);
  const common: MoreItem[] = [
    { key: "home", icon: "home", label: "처음으로", sub: "홈 화면", onClick: () => router.push("/") },
    { key: "new", icon: "plus", label: "새 도안 만들기", onClick: () => { onClose(); newDraft(); } },
    { key: "mine", icon: "shelf", label: "나의 도안집", onClick: () => router.push("/mine") },
    // the glossary floats over the screen (Kim: in ··· rather than its own button in the bar)
    { key: "gloss", icon: "gloss", label: "뜨개 사전", onClick: () => { onClose(); openGloss(); } },
  ];
  const row = (it: MoreItem) => asking === it.key ? (
    <div key={it.key} className="ms-ask" role="alert">
      <p>{it.confirm}</p>
      <button type="button" onClick={() => setAsking(null)}>취소</button>
      <button type="button" className="danger" onClick={() => { setAsking(null); it.onClick(); }}>{it.label}</button>
    </div>
  ) : (
    <button key={it.key} type="button" className={"ms-row" + (it.danger ? " danger" : "")} onClick={() => (it.confirm ? setAsking(it.key) : it.onClick())}>
      <svg viewBox="0 0 24 24" aria-hidden="true">{ICONS[it.icon]}</svg>
      <span className="ms-rlabel">{it.label}</span>
      {it.sub && <span className="ms-sub">{it.sub}</span>}
    </button>
  );
  return (
    <div className="ms-dim" onClick={onClose}>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true"><defs><linearGradient id="mtGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8A6E3A" /><stop offset=".5" stopColor="#C9AB6C" /><stop offset="1" stopColor="#8F7038" /></linearGradient></defs></svg>
      <div className="ms-sheet" role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()} style={drag ? { transform: `translateY(${drag}px)`, transition: "none" } : undefined}
        onTouchStart={e => { y0.current = e.touches[0].clientY; }} onTouchMove={e => { if (y0.current != null) setDrag(Math.max(0, e.touches[0].clientY - y0.current)); }}
        onTouchEnd={() => { if (drag > 80) onClose(); setDrag(0); y0.current = null; }}>
        <span className="ms-grip" aria-hidden="true" />
        <p className="ms-title">{title}</p>
        <div className="ms-group">{common.filter(c => !skip.includes(c.key)).map(row)}</div>
        {items.length > 0 && <div className="ms-group">{items.map(row)}</div>}
      </div>
    </div>
  );
}

/** "n단까지 저장했어요": the track screen leaves a note; the next screen shows it for 2 seconds */
export const SAVED_KEY = "m.savedToast";
export function SavedToast() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    let m: string | null = null; try { m = sessionStorage.getItem(SAVED_KEY); if (m) sessionStorage.removeItem(SAVED_KEY); } catch {}
    if (!m) return; setMsg(m); const t = setTimeout(() => setMsg(null), 2000); return () => clearTimeout(t);
  }, []);
  return msg ? <div className="m-toast" role="status">{msg}</div> : null;
}
