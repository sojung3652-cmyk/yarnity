"use client";
// Home hero after the design comp (legacy/pic/main_backgrond_refer.png): a plain paper-coloured floor
// with yarn objects (object-noback.webp) and sunlight from a window at the upper left, the logo, caption
// and a text button on the left, and the 3D book next to the objects. The text button and the book both open it; Close on the first page
// and Esc close it.
import Image from "next/image";
import { Book } from "@/components/Book/Book";
import { FoilLogo } from "@/components/FoilLogo";
import { useBookState } from "@/components/Book/useBookState";

export function Hero() {
  const state = useBookState();
  return (
    <section className={"hero-desk" + (state.open ? " is-open" : "")} aria-label="소개">
      {/* two stage layers with the same geometry: the scene (floor light, objects, their shadows) below the
          3D canvas, the copy above it */}
      <div className="hero-stage hero-stage-bg">
        <div className="hero-scene" aria-hidden="true">
          <div className="hero-objects">
            {/* shadows from the objects' own silhouette (mask-image), light from the upper left */}
            <div className="obj-shadow obj-long" />
            <div className="obj-shadow obj-contact" />
            <Image src="/pic/object-noback.webp" alt="" width={1600} height={1232} priority unoptimized className="obj-img" />
          </div>
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
