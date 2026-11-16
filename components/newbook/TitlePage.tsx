"use client";
// Step ① of 도안 만들기 as a book's title page (the right page; the left page stays blank paper):
// gold-foil wordmark, caption, the work's name between two short gold rules, an italic line, the month.
// The name starts empty ("작품 이름" placeholder only), shrinks from 24px to 18px when long, then wraps
// to two lines; at most 30 characters; Enter goes on to the next step.
import { useLayoutEffect, useRef, useState } from "react";
import { FoilLogo } from "@/components/FoilLogo";

const MAX = 30, BIG = 24, SMALL = 18;

export function TitlePage({ name, onName, onEnter, month, progress }: { name: string; onName: (v: string) => void; onEnter: () => void; month: string; progress: React.ReactNode }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [fit, setFit] = useState({ size: BIG, rows: 1 });
  // fit the name: shrink to 18px first, then allow a second line
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const cs = getComputedStyle(el), ctx = document.createElement("canvas").getContext("2d")!;
    const avail = el.clientWidth - 8;
    ctx.font = `500 ${BIG}px ${cs.fontFamily}`;
    const w = ctx.measureText(name || "").width;
    const size = w <= avail ? BIG : Math.max(SMALL, Math.floor((BIG * avail) / w));
    ctx.font = `500 ${size}px ${cs.fontFamily}`;
    setFit({ size, rows: ctx.measureText(name || "").width > avail ? 2 : 1 });
  }, [name]);
  useLayoutEffect(() => { requestAnimationFrame(() => ref.current?.focus({ preventScroll: true })); }, []);

  return (
    <div className="tp">
      <div className="tp-progress">{progress}</div>
      <div className="tp-head">
        <FoilLogo className="tp-logo" />
        <p className="tp-cap">Intelligent Crochet</p>
      </div>
      <div className="tp-name">
        <span className="tp-rule" aria-hidden="true" />
        <label htmlFor="nbName" className="sr">작품 이름</label>
        <textarea id="nbName" ref={ref} className="tp-input" rows={fit.rows} maxLength={MAX} placeholder="작품 이름" autoComplete="off" spellCheck={false}
          style={{ fontSize: fit.size }} value={name}
          onChange={e => onName(e.target.value.replace(/\n/g, ""))}
          onKeyDown={e => { if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); onEnter(); } }} />
        <span className="tp-rule" aria-hidden="true" />
        <p className="tp-sub" lang="en">a crochet pattern book</p>
      </div>
      <p className="tp-month" lang="en">{month}</p>
    </div>
  );
}
