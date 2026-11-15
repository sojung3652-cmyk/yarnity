"use client";
// 3D hardcover book in a thin crochet sleeve:
// back cover (sleeve + board) -> page block -> front cover (board + sleeve); the front cover hinges on the spine.
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import "./Book.css";
import { HeroDots, heroCaption } from "./HeroDots";
import { sleeveSlices } from "./sleeve";
import { Yarn } from "./yarnTexture";

const COVER_SRC = "/pic/bird.png";
const bookSlices = sleeveSlices(3, "sl-top");
const coverSlices = sleeveSlices(3);

export function Book() {
  const [open, setOpen] = useState(false);
  const [tex, setTex] = useState<{ inside: string; spine: string } | null>(null);
  const bookRef = useRef<HTMLDivElement>(null), frontRef = useRef<HTMLDivElement>(null), spineRef = useRef<HTMLDivElement>(null);
  const bakedW = useRef(0);

  const bake = useCallback(async (img: HTMLImageElement) => {
    const book = bookRef.current, front = frontRef.current, spine = spineRef.current;
    if (!book || !front || !spine) return;
    const W = book.offsetWidth, H = book.offsetHeight; if (!W || W === bakedW.current) return;
    try {
      await img.decode();
      const dpr = 2;
      const cv = Yarn.cover(W, H, img, dpr); cv.className = "front-tex"; cv.setAttribute("aria-hidden", "true");
      // the baked canvas is added outside React (as in the prototype); .front's React children never re-order
      front.querySelector(".front-tex")?.remove(); front.prepend(cv);
      const inside = Yarn.fabric(W, H, 2, false, false, 21).toDataURL();
      const spineTex = Yarn.fabric(spine.offsetWidth, spine.offsetHeight, 2, true, true, 5).toDataURL();
      setTex({ inside, spine: spineTex }); bakedW.current = W;
    } catch { setTex(null); }
  }, []);

  useEffect(() => {
    const img = new Image(); img.src = COVER_SRC;
    bake(img);
    let t: ReturnType<typeof setTimeout>;
    const onResize = () => { clearTimeout(t); t = setTimeout(() => bake(img), 250); };
    addEventListener("resize", onResize);
    return () => { clearTimeout(t); removeEventListener("resize", onResize); };
  }, [bake]);

  const bg = (url?: string) => (url ? { backgroundImage: `url(${url})` } : undefined);

  return (
    <section className={"bookstage" + (tex ? " baked" : "")} aria-label="소개">
      <div className="scene">
        <div className={"book" + (open ? " is-open" : "")} id="book" ref={bookRef} onClick={() => { if (!open) setOpen(true); }}>
          {bookSlices.map((s, i) => <div key={i} className={s.className} style={i === bookSlices.length - 1 ? { ...s.style, ...bg(tex?.inside) } : s.style} />)}
          <div className="spine" ref={spineRef} style={bg(tex?.spine)} />
          <div className="pages-t" /><div className="pages-r" /><div className="pages-b" />
          <div className="pg pg-right hero-copy" id="bookRight" lang="en" inert={!open}>
            <span className="eyebrow">Yarnity / Intelligent Crochet</span>
            <h1><span>Your creativity.</span> <span>Our intelligence.</span> <span>Every stitch, together.</span></h1>
            <p>Generate your patterns with AI. Track every stitch. Bring your ideas to life.</p>
            <div className="hero-cta"><Link className="btn btn-primary" href="/new">Start Creating</Link></div>
          </div>
          <div className="cover" id="cover">
            {coverSlices.map((s, i) => <div key={i} className={s.className} style={s.style} />)}
            <div className="face front knit" ref={frontRef}>
              <div className="panel">
                {/* 표지 사진/영상 자리: 다른 이미지나 <video autoPlay muted loop playsInline src="..."></video>로 바꿔도 돼요 */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={COVER_SRC} alt="" />
              </div>
              <div className="label"><b>Yarnity.</b><span>Intelligent crochet</span></div>
            </div>
            <div className="face back knit" style={bg(tex?.inside)}>
              <div className="flap knit" style={bg(tex?.inside)} />
              <div className="paper">
                <HeroDots />
                <span className="cap" id="heroCap">{heroCaption}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <button className="open-btn" id="openBook" type="button" aria-expanded={open} aria-controls="book" onClick={() => setOpen(o => !o)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5m0-13c2-1.5 5-2 8.5-1.5v13c-3.5-.5-6.5 0-8.5 1.5m0-13v13" /></svg>
        <span>{open ? "Close book" : "Open book"}</span>
      </button>
    </section>
  );
}
