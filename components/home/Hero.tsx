"use client";
// Home hero after the design comp (legacy/pic/main_backgrond_refer.png): a plain backdrop with yarn
// props across the first screen, the logo, caption and a text button on the left, and the 3D book set
// in the empty spot of the photo. The text button and the book both open it; Close on the first page
// and Esc close it.
import Image from "next/image";
import { Book } from "@/components/Book/Book";
import { FoilLogo } from "@/components/FoilLogo";
import { useBookState } from "@/components/Book/useBookState";

export function Hero() {
  const state = useBookState();
  return (
    <section className={"hero-desk" + (state.open ? " is-open" : "")} aria-label="소개">
      {/* two stage layers with the same geometry: the photo below the 3D canvas, the copy above it */}
      <div className="hero-stage hero-stage-bg">
        <div className="hero-bg" aria-hidden="true">
          {/* unoptimized: the WebP is already encoded with care (q 0.92); a second re-encode by next/image
              softened the paper texture of the backdrop */}
          <Image src="/pic/hero-bg.webp" alt="" width={1870} height={841} priority unoptimized className="hero-bg-img" />
        </div>
      </div>
      <div className="hero-stage hero-stage-copy">
        <div className="hero-copy-desk" inert={state.open}>
          <h1 className="hero-logo">
            <span className="sr">Yarnity</span>
            <FoilLogo className="hero-foil" />
          </h1>
          <p className="hero-caption">Intelligent Crochet</p>
          <button type="button" className="hero-start" onClick={() => state.setOpen(true)}>
            <span>Start making my own pattern book</span>
            {/* thin drawn arrow: the latin subset of the font has no → glyph */}
            <svg className="arrow" viewBox="0 0 24 12" aria-hidden="true"><path d="M1 6h21M17 1.5 22 6l-5 4.5" fill="none" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      </div>
      <Book state={state} />
    </section>
  );
}
