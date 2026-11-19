"use client";
// The phone's spring notebook: one sheet of paper (paper.png) inset 16px from the screen's sides, 34px from
// the top, 16px above the bottom bar. Three sheets show under it (2 / 5 / 8px lower, the last one the grey
// back board with the big shadow), twelve gold wires run through holes along its top edge, and the
// lavender cover and a sheet or two already turned over show at the very top of the screen. The page's
// content scrolls inside the sheet only.
// `turn`: when it changes, a blank sheet lies over the new page and lifts up off the spiral (0.55s; a
// fade with reduced motion) - the page turning over. Not on the first render.
import { useEffect, useRef, useState, type ReactNode } from "react";

export function Spiral({ n = 12, className = "" }: { n?: number; className?: string }) {
  return (
    <div className={"mn-spiral " + className} aria-hidden="true">
      {Array.from({ length: n }, (_, i) => <span key={i} className="mn-ring"><img src="/mobile/wire_gold.png" alt="" width={11} height={34} /></span>)}
    </div>
  );
}

export function MobileNotebook({ children, turn, className = "", label, scrollRef }: { children: ReactNode; turn?: string | number; className?: string; label?: string; scrollRef?: React.RefObject<HTMLDivElement | null> }) {
  const first = useRef(turn), [leaf, setLeaf] = useState(0);
  useEffect(() => { if (turn !== first.current) { first.current = turn; setLeaf(l => l + 1); } }, [turn]);
  return (
    <>
      <div className="mn-flipped" aria-hidden="true"><i /><i /></div>
      <section className={"mn " + className} aria-label={label}>
        <div className="mn-stack" aria-hidden="true"><i /><i /><i /></div>
        <div className="mn-paper">
          <div className="mn-scroll" ref={scrollRef}>{children}</div>
          {leaf > 0 && <div key={leaf} className="mn-leaf" aria-hidden="true" onAnimationEnd={() => setLeaf(0)} />}
        </div>
        <Spiral />
      </section>
    </>
  );
}
