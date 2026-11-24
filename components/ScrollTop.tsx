"use client";
// 위로 가기 (Kim: every place that scrolls, once it is scrolled, a small arrow at its lower left). One button for
// the whole site: it follows whatever was scrolled last - the page itself or a scrolling box inside it (the 3D
// screen's right column, a list) - and sits at that box's lower left corner. Back at the top, it goes.
import { useEffect, useRef, useState } from "react";

const MIN = 160; // scrolled this far (px) before the arrow shows

export function ScrollTop() {
  const target = useRef<Element | Window | null>(null);
  const [at, setAt] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    const place = () => {
      const t = target.current; if (!t) { setAt(null); return; }
      if (t === window) { setAt(window.scrollY > MIN ? { left: 14, top: window.innerHeight - 50 } : null); return; }
      const el = t as HTMLElement;
      if (!el.isConnected || el.scrollTop <= MIN) { setAt(null); return; }
      const r = el.getBoundingClientRect();
      setAt(r.height > 200 ? { left: Math.max(6, r.left + 10), top: Math.min(window.innerHeight - 44, r.bottom - 42) } : null);
    };
    const onScroll = (e: Event) => {
      const t = e.target === document || e.target === document.documentElement ? window : e.target as Element;
      if (t !== window && !((t as HTMLElement).clientHeight > 200)) return; // small lists, inputs: no arrow
      target.current = t; place();
    };
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("resize", place);
    return () => { document.removeEventListener("scroll", onScroll, { capture: true }); window.removeEventListener("resize", place); };
  }, []);

  if (!at) return null;
  const up = () => { const t = target.current; if (t === window) window.scrollTo({ top: 0, behavior: "smooth" }); else (t as HTMLElement | null)?.scrollTo({ top: 0, behavior: "smooth" }); };
  return (
    <button type="button" className="scroll-top" style={{ left: at.left, top: at.top }} aria-label="맨 위로" title="맨 위로" onClick={up}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6" /></svg>
    </button>
  );
}
