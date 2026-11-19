"use client";
// The book's stage, mounted once in the root layout (see components/Book/BookProvider.tsx): the plain
// backdrop with the yarn photo, the logo / caption / text button on the left, and the one 3D book.
// Home (design comp legacy/pic/main_backgrond_refer.png): the book sits in the empty spot of the photo;
// the text button and the book open it. /new (wide screens): the same book, open on the wizard, with the
// photo and logo faded behind it. Other pages: the stage is hidden but stays mounted (no new canvas).
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Book } from "@/components/Book/Book";
import { AiHost } from "@/components/newbook/AiPanel";
import { FoilLogo } from "@/components/FoilLogo";
import { useBook, wizardInBook } from "@/components/Book/BookProvider";
import { useMobile } from "@/components/mobile/useMobile";
import { MobileStage } from "@/components/mobile/MobileStage";

export function Hero() {
  const b = useBook();
  // /new on phones or without WebGL: the one-page wizard of app/new draws itself; no stage
  const hidden = b.view === "hidden" || (b.view === "wizard" && !wizardInBook(b));
  const open = b.view === "home" || b.view === "wizard";
  // coming back to the home screen from another page: the logo, the copy and the book float in (as the
  // other pages do, globals.css .is-arriving); not on the very first load, not for the book opened over a page
  const prev = useRef(b.view), [arriving, setArriving] = useState(false);
  useEffect(() => {
    const was = prev.current; prev.current = b.view;
    if (was === "hidden" && (b.view === "closed" || b.view === "home") && !b.overlay) {
      setArriving(true); const t = setTimeout(() => setArriving(false), 1400); // longer than the slowest float-in (0.9s + 0.24s) return () => clearTimeout(t);
    }
  }, [b.view, b.overlay]);
  // phones: the splash and the desk with the same 3D book (components/mobile/MobileStage.tsx); three.js
  // loads only once the desk shows (Book3D is a dynamic import). Hidden on the phone's other screens.
  const m = useMobile();
  if (m) return <MobileStage hidden={b.view === "hidden" || b.view === "wizard"} />;
  return (
    <section className={"hero-desk book-stage" + (open ? " is-open" : "") + (b.view === "wizard" ? " is-wizard" : "") + (hidden ? " is-hidden" : "") + (b.floating ? " is-overlay" : "") + (b.sinking ? " is-sinking" : "") + (arriving ? " is-arriving" : "")}
      aria-label="소개" aria-hidden={hidden || undefined} inert={hidden}>
      {/* two stage layers with the same geometry: the photo below the 3D canvas, the copy above it */}
      <div className="hero-stage hero-stage-bg">
        <div className="hero-bg" aria-hidden="true">
          {/* unoptimized: the WebP is already encoded with care (q 0.92); a second re-encode by next/image
              softened the paper texture of the backdrop */}
          <Image src="/pic/hero-bg.webp" alt="" width={1870} height={841} priority unoptimized className="hero-bg-img" />
        </div>
      </div>
      <div className="hero-stage hero-stage-copy">
        <div className="hero-copy-desk" inert={open}>
          {/* one <h1> per page: on / it is the logo; the wizard has its own heading */}
          {b.view === "wizard" ? <p className="hero-logo"><FoilLogo className="hero-foil" /></p> : (
            <h1 className="hero-logo">
              <span className="sr">Yarnity</span>
              <FoilLogo className="hero-foil" shine />
            </h1>
          )}
          <p className="hero-caption">Intelligent Crochet</p>
          <button type="button" className="hero-start" onClick={b.open}>
            <span>Start making my own pattern book</span>
            {/* thin drawn arrow: the latin subset of the font has no → glyph */}
            <svg className="arrow" viewBox="0 0 24 12" aria-hidden="true"><path d="M1 6h21M17 1.5 22 6l-5 4.5" fill="none" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      </div>
      <Book />
      {/* the one AI sheet, beside the open book (menu or 도안 만들기) */}
      <AiHost />
    </section>
  );
}
