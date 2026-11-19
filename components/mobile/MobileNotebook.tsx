"use client";
// The phone's spring notebook: one sheet of paper (paper.png) inset 16px from the screen's sides, 34px from
// the top, 16px above the bottom bar. Three sheets show under it (2 / 5 / 8px lower, the last one the grey
// back board with the big shadow), twelve gold wires run through holes along its top edge, and the
// lavender cover and a sheet or two already turned over show at the very top of the screen. The page's
// content scrolls inside the sheet only.
// Turning a sheet (Kim: like the cover on the first screen, over the spring): when `turn` changes, going on
// (dir 1) the sheet you were reading - a copy of it, taken by the caller just before the change
// (`snapshot`) - lifts up over the spiral and is gone; going back (dir -1) the sheet you return to comes
// back down over the spiral onto the stack. 0.55s; a fade with reduced motion. Not on the first render.
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

export function Spiral({ n = 12, className = "" }: { n?: number; className?: string }) {
  return (
    <div className={"mn-spiral " + className} aria-hidden="true">
      {Array.from({ length: n }, (_, i) => <span key={i} className="mn-ring"><img src="/mobile/wire_gold.png" alt="" width={11} height={34} /></span>)}
    </div>
  );
}

/** A copy of the sheet's content as it looks now (scroll position kept), to lay on the turning sheet. */
export function takeSnapshot(scroll: HTMLElement | null): Snapshot | null {
  if (!scroll) return null;
  const el = scroll.cloneNode(true) as HTMLElement;
  el.querySelectorAll("[id]").forEach(n => n.removeAttribute("id"));
  return { el, top: scroll.scrollTop };
}
export interface Snapshot { el: HTMLElement; top: number }

export function MobileNotebook({ children, turn, dir = 1, snapshot, className = "", label, scrollRef }: {
  children: ReactNode; turn?: string | number; dir?: 1 | -1; snapshot?: React.RefObject<Snapshot | null>;
  className?: string; label?: string; scrollRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const own = useRef<HTMLDivElement>(null), scroll = scrollRef ?? own;
  const first = useRef(turn), leafRef = useRef<HTMLDivElement>(null);
  const [leaf, setLeaf] = useState<{ n: number; dir: 1 | -1 } | null>(null);
  // a new sheet: start the turn in the same frame as the new content, so nothing flashes
  useLayoutEffect(() => {
    if (turn === first.current) return;
    first.current = turn;
    setLeaf(l => ({ n: (l?.n ?? 0) + 1, dir }));
  }, [turn, dir]);
  // the turning sheet carries the page: the one left (going on) or the one arrived at (going back)
  useLayoutEffect(() => {
    const host = leafRef.current; if (!leaf || !host) return;
    // (a sheet arrived at is shown from its top)
    const snap = leaf.dir > 0 ? snapshot?.current ?? null : takeSnapshot(scroll.current);
    if (snap && leaf.dir < 0) snap.top = 0;
    if (snapshot) snapshot.current = null;
    host.replaceChildren();
    if (snap) { snap.el.setAttribute("inert", ""); host.appendChild(snap.el); snap.el.scrollTop = snap.top; }
    const t = setTimeout(() => setLeaf(null), 650); // gone even if animationend never arrives
    return () => clearTimeout(t);
  }, [leaf, snapshot, scroll]);
  return (
    <>
      <div className="mn-flipped" aria-hidden="true"><i /><i /></div>
      <section className={"mn " + className} aria-label={label}>
        <div className="mn-stack" aria-hidden="true"><i /><i /><i /></div>
        <div className="mn-paper">
          <div className="mn-scroll" ref={scroll}>{children}</div>
          {leaf && <div key={leaf.n} ref={leafRef} className={"mn-leaf " + (leaf.dir > 0 ? "is-up" : "is-down")} aria-hidden="true" onAnimationEnd={() => setLeaf(null)} />}
        </div>
        <Spiral />
      </section>
    </>
  );
}
