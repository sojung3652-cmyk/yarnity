"use client";
// Home hero after the design comp (legacy/pic/main_background_refer.png): a desk photo across the
// first screen, the logo and a text button on the left, and the knit-covered 3D book placed on the
// desk. The text button and the book both open the book; Close on the first page and Esc close it.
import Image from "next/image";
import { Book } from "@/components/Book/Book";
import { useBookState } from "@/components/Book/useBookState";

// 1808px (q0.97) up to ~1920 device px, 3616px (q0.94) above. The ?w= keeps next/image's loader check happy.
const bgLoader = ({ width }: { width: number }) => (width <= 1920 ? "/pic/home-bg-1808.webp" : "/pic/home-bg-3616.webp") + `?w=${width}`;

export function Hero() {
  const state = useBookState();
  return (
    <section className={"hero-desk" + (state.open ? " is-open" : "")} aria-label="소개">
      <div className="hero-bg" aria-hidden="true">
        {/* Two pre-encoded sizes of the desk photo; the browser picks by screen width x pixel ratio.
            The loader serves them as they are: letting next/image re-encode at its default quality
            compressed the photo a second time and left blocky steps in the soft light. */}
        <Image src="/pic/home-bg-3616.webp" loader={bgLoader} alt="" fill priority sizes="100vw" className="hero-bg-img" />
      </div>
      <div className="hero-fade" aria-hidden="true" />
      <div className="hero-copy-desk" inert={state.open}>
        <h1 className="hero-logo">
          <span className="sr">Yarnity</span>
          <Image src="/pic/logo.svg" alt="" width={1170} height={647} unoptimized priority />
        </h1>
        <button type="button" className="hero-start" onClick={() => state.setOpen(true)}>
          Start Making My Own Pattern Book <span className="arrow" aria-hidden="true">→</span>
        </button>
      </div>
      <Book state={state} />
    </section>
  );
}
