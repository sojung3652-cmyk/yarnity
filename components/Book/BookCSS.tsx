"use client";
// CSS 3D cloth hardcover: the fallback when WebGL is unavailable (see Book.tsx). Closed it matches the
// WebGL book: lavender book cloth, the same front cover art (coverArt.ts: spine-cloth band, hinge groove,
// bird picture, paper label), a cream page block and a gently rounded lavender spine.
// back board -> page block -> front board; the front board hinges on the spine.
import Link from "next/link";
import { useEffect, useRef, type CSSProperties } from "react";
import type { BookState } from "./useBookState";
import "./Book.css";
import { COVER_H, COVER_W, drawCover, loadCoverAssets } from "./coverArt";
import { HeroDots, heroCaption } from "./HeroDots";

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
          <div className="pg pg-right hero-copy" id="bookRight" lang="en" inert={!open}>
            <span className="eyebrow">Yarnity / Intelligent Crochet</span>
            <h1><span>Your creativity.</span> <span>Our intelligence.</span> <span>Every stitch, together.</span></h1>
            <p>Generate your patterns with AI. Track every stitch. Bring your ideas to life.</p>
            <div className="hero-cta"><Link className="btn btn-primary" href="/new">도안 만들기</Link><Link className="page-link" href="/mine">내 작품 →</Link></div>
          </div>
          <div className="cover" id="cover">
            {coverLayers.map((s, i) => <div key={i} className="bd" style={s} />)}
            <div className="face front">
              <canvas ref={coverRef} width={COVER_W} height={COVER_H} aria-hidden="true" />
            </div>
            <div className="face back">
              <div className="paper">
                <button type="button" className="page-close" tabIndex={open ? 0 : -1} aria-label="Close the book" onClick={e => { e.stopPropagation(); setOpen(false); }}>‹</button>
                <HeroDots />
                <span className="cap" id="heroCap">{heroCaption}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
