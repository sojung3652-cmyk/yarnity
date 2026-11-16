"use client";
// Home hero after the design comp (legacy/pic/main_backgrond_refer.png): a plain backdrop with yarn
// props across the first screen, the logo, caption and a text button on the left, and the 3D book set
// in the empty spot of the photo. The text button and the book both open it; Close on the first page
// and Esc close it.
import Image from "next/image";
import { Book } from "@/components/Book/Book";
import { useBookState } from "@/components/Book/useBookState";

export function Hero() {
  const state = useBookState();
  return (
    <section className={"hero-desk" + (state.open ? " is-open" : "")} aria-label="소개">
      <div className="hero-bg" aria-hidden="true">
        {/* unoptimized: the WebP is already encoded with care (q 0.92); a second re-encode by next/image
            softened the paper texture of the backdrop */}
        <Image src="/pic/hero-bg.webp" alt="" fill priority sizes="100vw" unoptimized className="hero-bg-img" />
      </div>
      <div className="hero-fade" aria-hidden="true" />
      <div className="hero-copy-desk" inert={state.open}>
        <h1 className="hero-logo">
          <span className="sr">Yarnity</span>
          <Image src="/pic/logo-mark.svg" alt="" width={1170} height={579} unoptimized priority />
        </h1>
        <p className="hero-caption">Intelligent Crochet</p>
        <button type="button" className="hero-start" onClick={() => state.setOpen(true)}>
          <span>Start Making My Own Pattern Book</span><span className="arrow" aria-hidden="true">→</span>
        </button>
      </div>
      <Book state={state} />
    </section>
  );
}
