"use client";
// The glossary over 도안 보기 / 따라 뜨기, opened by their 용어집 button (Kim). Phones: a sheet from the bottom,
// pulled down or ✕ to put away - the page under it is left as it was, on the row being knitted. Wide screens:
// a 400px window at the upper right like the AI's (no dim, the page stays usable); when the AI window is open
// too, this one stands to its left. Inside: the list (search, tabs, rows) and a term (‹ back to the list).
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { useMobile } from "@/components/mobile/useMobile";
import { TERMS, termById, type GlossTerm } from "@/lib/glossary";
import { GlossList, TermDetail } from "./Glossary";
import { closeGloss, openGloss, useGlossOpen } from "./glossFloat";

/** the small 용어집 button of a bar (left of ···) */
export const GlossButton = () => <button type="button" className="gl-open-btn" aria-haspopup="dialog" onClick={openGloss}>용어집</button>;
import "./glossary.css";

const X = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>;
const Back = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5.5 8 12l6.5 6.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;

export function GlossaryFloat() {
  const open = useGlossOpen(), m = useMobile(), { chat } = useApp();
  const [term, setTerm] = useState<GlossTerm | null>(null), [leaving, setLeaving] = useState(false);
  const [drag, setDrag] = useState(0), y0 = useRef<number | null>(null), body = useRef<HTMLDivElement>(null);
  useEffect(() => { if (open) { setTerm(null); setLeaving(false); setDrag(0); } }, [open]);
  useEffect(() => { body.current?.scrollTo({ top: 0 }); }, [term]);
  const close = () => {
    setLeaving(true);
    setTimeout(() => { setLeaving(false); closeGloss(); }, matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 200);
  };
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key !== "Escape") return; e.preventDefault(); e.stopPropagation(); if (term) setTerm(null); else close(); };
    addEventListener("keydown", k, true); return () => removeEventListener("keydown", k, true);
  });
  if (!open || m === null) return null;
  const phone = !!m, beside = !phone && !!chat.open;

  const inner = (
    <>
      <header className="glf-bar">
        {term
          ? <button type="button" className="glf-icon" aria-label="목록으로" onClick={() => setTerm(null)}><Back /></button>
          : <span className="glf-icon" aria-hidden="true" />}
        <b className="glf-title">뜨개 용어집</b>
        <button type="button" className="glf-icon" aria-label="닫기" onClick={close}><X /></button>
      </header>
      <div className="glf-body" ref={body}>
        {term ? <TermDetail term={term} onGo={t => setTerm(termById(t.id))} /> : <GlossList total={TERMS.length} onPick={setTerm} />}
      </div>
    </>
  );
  if (phone) {
    return (
      <div className={"gl glf is-phone" + (leaving ? " is-leaving" : "")}>
        <div className="glf-dim" onClick={close} />
        <div className="glf-panel" role="dialog" aria-modal="true" aria-label="뜨개 용어집"
          style={drag ? { transform: `translateY(${drag}px)`, transition: "none" } : undefined}
          onTouchStart={e => { const top = e.currentTarget.getBoundingClientRect().top; y0.current = e.touches[0].clientY - top < 56 ? e.touches[0].clientY : null; }}
          onTouchMove={e => { if (y0.current != null) setDrag(Math.max(0, e.touches[0].clientY - y0.current)); }}
          onTouchEnd={() => { if (y0.current != null && drag > 110) close(); else setDrag(0); y0.current = null; }}>
          <span className="glf-handle" aria-hidden="true" />
          {inner}
        </div>
      </div>
    );
  }
  return (
    <div className={"gl glf is-win" + (beside ? " is-beside" : "") + (leaving ? " is-leaving" : "")}>
      <div className="glf-panel" role="dialog" aria-label="뜨개 용어집">{inner}</div>
    </div>
  );
}
