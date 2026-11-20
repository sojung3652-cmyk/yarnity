"use client";
// The phone's first screens (767px and narrower), around the web's own 3D book (components/Book):
//   ① splash: the leaf-shadow wall (bg_shadow.webp), the hero's gold foil logo with its shine, INTELLIGENT
//      CROCHET, a hairline, MAKE · TRACK · SHARE. Tapping the logo cross-fades (0.6s) to the desk.
//   ② the desk (bg_desk.webp) with the closed book lying on it at a slant, as on the web, "tap the book"
//      bobbing under it. A tap brings it closer and opens it (Book3D.tsx); it grows to the screen's height.
//   ③ the open book: its right page (the web menu) fills the screen; the left page shows at the left edge.
// The splash is shown on every fresh load of the home and 도안 만들기 addresses.
// 새 도안 from a screen outside the book (나의 도안집, 완성 도안, 따라 뜨기): the page dims a little and the open
// book (도안 만들기, step 1) rises from the bottom (0.5s), then the desk photo fades in (0.25s). Leaving
// 도안 만들기 for such a screen (완성 · 최종 도안 보기, Back): the new screen is drawn behind, the desk fades out
// and the book sinks (0.4s). Reduced motion: a 0.2s fade. The book is the CSS 3D book (MobileCssBook.tsx).
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useBook } from "@/components/Book/BookProvider";
import { FoilLogo } from "@/components/FoilLogo";
import { DeskButtons } from "./DeskButtons";
import { MobileCssBook } from "./MobileCssBook";


export function MobileStage({ hidden, home }: { hidden: boolean; home: boolean }) {
  const b = useBook();
  // decided in the first render (this only renders in the browser, once the phone layout is known), so the
  // desk never shows before the splash
  // every fresh load (a refresh, a typed address) of the book's addresses starts on the splash (Kim); moving
  // between screens inside the app never shows it again (the stage stays mounted)
  const path = usePathname();
  const [splash, setSplash] = useState<"on" | "fading" | "off">(() => (home || path === "/new" ? "on" : "off"));
  const leave = () => {
    setSplash("fading"); setTimeout(() => setSplash("off"), matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 600);
  };
  const closed = b.view === "closed";
  // into / out of 도안 만들기 from a screen outside the book: decided while rendering, so no frame is missed
  const [seen, setSeen] = useState(b.view), [motion, setMotion] = useState<null | "rise" | "sink">(null);
  if (seen !== b.view) {
    setSeen(b.view);
    if (seen === "hidden" && b.view === "wizard") setMotion("rise");
    else if (seen === "wizard" && b.view === "hidden") setMotion("sink");
    else setMotion(null);
  }
  useEffect(() => {
    if (!motion) return;
    const t = setTimeout(() => setMotion(null), matchMedia("(prefers-reduced-motion: reduce)").matches ? 220 : motion === "rise" ? 800 : 430);
    return () => clearTimeout(t);
  }, [motion]);
  const gone = hidden && motion !== "sink";
  return (
    <section className={"hero-desk m-stage" + (gone ? " is-hidden" : "") + (b.view === "home" ? " is-open" : "") + (motion ? " is-" + motion : "")} aria-label="책상" aria-hidden={hidden || undefined} inert={hidden}>
      {/* the desk photo */}
      <div className="m-desk" aria-hidden="true"><img className="m-desk-bg" src="/mobile/bg_desk.webp" alt="" /></div>
      {/* the CSS 3D book (no three.js on phones; MobileCssBook.tsx) */}
      <MobileCssBook />
      {/* 도안 만들기: 처음으로 / 나의 도안집 lying on the desk under the book */}
      {b.view === "wizard" && !hidden && motion !== "rise" && <DeskButtons />}
      {closed && splash === "off" && <p className="m-tap" lang="en" aria-hidden="true">tap the book</p>}
      {splash !== "off" && (
        <div className={"m-splash" + (splash === "fading" ? " is-fading" : "")}>
          <button type="button" className="m-splash-logo" aria-label="Yarnity, 책상으로" onClick={leave}>
            <FoilLogo className="m-splash-foil" shine />
          </button>
          <p className="m-splash-cap" lang="en">Intelligent Crochet</p>
          <span className="m-splash-rule" aria-hidden="true" />
          <p className="m-splash-tag" lang="en">Make · Track · Share</p>
        </div>
      )}
    </section>
  );
}
