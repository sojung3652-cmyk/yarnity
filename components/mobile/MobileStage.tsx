"use client";
// The phone's first screens (767px and narrower), around the web's own 3D book (components/Book):
//   ① splash: the leaf-shadow wall (bg_shadow.webp), the hero's gold foil logo with its shine, INTELLIGENT
//      CROCHET, a hairline, MAKE · TRACK · SHARE. Tapping the logo cross-fades (0.6s) to the desk.
//   ② the desk (bg_desk.webp) with the closed book lying on it at a slant, as on the web, "tap the book"
//      bobbing under it. A tap brings it closer and opens it (Book3D.tsx); it grows to the screen's height.
//   ③ the open book: its right page (the web menu) fills the screen; the left page shows at the left edge.
// The splash is shown once per visit, on the home address only. The 3D canvas, its camera, light and shadows are Book3D's (phone branch).
import { useState } from "react";
import { Book } from "@/components/Book/Book";
import { useBook } from "@/components/Book/BookProvider";
import { FoilLogo } from "@/components/FoilLogo";

const SPLASH_KEY = "m.splash";

export function MobileStage({ hidden, home }: { hidden: boolean; home: boolean }) {
  const b = useBook();
  // decided in the first render (this only renders in the browser, once the phone layout is known), so the
  // desk never shows before the splash
  const [splash, setSplash] = useState<"on" | "fading" | "off">(() => { if (!home) return "off"; try { return sessionStorage.getItem(SPLASH_KEY) ? "off" : "on"; } catch { return "on"; } });
  const leave = () => {
    try { sessionStorage.setItem(SPLASH_KEY, "1"); } catch {}
    setSplash("fading"); setTimeout(() => setSplash("off"), matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 600);
  };
  const closed = b.view === "closed";
  return (
    <section className={"hero-desk m-stage" + (hidden ? " is-hidden" : "") + (b.view === "home" ? " is-open" : "")} aria-label="책상" aria-hidden={hidden || undefined} inert={hidden}>
      {/* the desk photo */}
      <div className="m-desk" aria-hidden="true"><img className="m-desk-bg" src="/mobile/bg_desk.webp" alt="" /></div>
      <Book />
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
