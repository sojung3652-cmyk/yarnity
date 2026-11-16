"use client";
// CSS 3D cloth hardcover: the fallback when WebGL is unavailable (see Book.tsx). Closed it matches the
// WebGL book: lavender book cloth, the same front cover art (coverArt.ts: spine-cloth band, hinge groove,
// bird picture, paper label), a cream page block and a gently rounded lavender spine. Open, it shows the
// same page content as the WebGL book (PageSpread.tsx).
// back board -> page block -> front board; the front board hinges on the spine.
import { useEffect, useRef, type CSSProperties } from "react";
import type { BookState } from "./useBookState";
import "./Book.css";
import { COVER_H, COVER_W, drawCover, loadCoverAssets } from "./coverArt";
import { LeftPage, RightPage } from "./PageSpread";

/** A 3mm board as a few stacked layers (CSS has no solid boxes); never coplanar with a face. */
const boardLayers = (n: number): CSSProperties[] => Array.from({ length: n }, (_, i) => {
  const t = n === 1 ? 0 : i / (n - 1);
  return { transform: `translateZ(calc(var(--C) * ${(.1 + .8 * t).toFixed(2)}))`, filter: `brightness(${(.9 + .1 * t).toFixed(2)})` };
});
const backLayers = boardLayers(3), coverLayers = boardLayers(3);

export function BookCSS({ open, setOpen }: BookState) {
  const coverRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let live = true;
    loadCoverAssets().then(a => { if (live && coverRef.current) drawCover(coverRef.current, a, { withLabel: true, weave: true }); }).catch(() => {});
    return () => { live = false; };
  }, []);

  return (
    <section className="bookstage" aria-label="소개">
      <div className="scene">
        <div className={"book" + (open ? " is-open" : "")} id="book" onClick={() => { if (!open) setOpen(true); }}>
          {backLayers.map((s, i) => <div key={i} className="bd" style={s} />)}
          <div className="spine" />
          <div className="pages-t" /><div className="pages-r" /><div className="pages-b" />
          <div className="pg pg-right" id="bookRight" inert={!open}>
            <RightPage onClose={() => setOpen(false)} />
          </div>
          <div className="cover" id="cover">
            {coverLayers.map((s, i) => <div key={i} className="bd" style={s} />)}
            <div className="face front">
              <canvas ref={coverRef} width={COVER_W} height={COVER_H} aria-hidden="true" />
            </div>
            <div className="face back">
              <div className="paper" inert={!open}><LeftPage /></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
