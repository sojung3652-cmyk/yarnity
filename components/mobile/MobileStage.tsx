"use client";
// The phone's first screens (767px and narrower), around the web's own 3D book (components/Book):
//   ① splash: the leaf-shadow wall (bg_shadow.webp), the hero's gold foil logo with its shine, INTELLIGENT
//      CROCHET, a hairline, MAKE · TRACK · SHARE. Tapping the logo cross-fades (0.6s) to the desk.
//   ② the desk (bg_desk.webp) with the closed book lying on it, "tap the book" bobbing under it. The first tap
//      brings the camera close (1.2s; the photo scales with it, Book3D.tsx), the second opens the book.
//   ③ the open book: its right page (the web menu) fills the screen; the left page shows at the left edge.
// The splash is shown once per visit. The 3D canvas, its camera, light and shadows are Book3D's (phone branch).
import { useEffect, useState } from "react";
import { Book } from "@/components/Book/Book";
import { useBook } from "@/components/Book/BookProvider";
import { FoilLogo } from "@/components/FoilLogo";

const SPLASH_KEY = "m.splash";

export function MobileStage({ hidden }: { hidden: boolean }) {
  const b = useBook();
  const [splash, setSplash] = useState<null | "on" | "fading" | "off">(null);
  useEffect(() => { try { setSplash(sessionStorage.getItem(SPLASH_KEY) ? "off" : "on"); } catch { setSplash("on"); } }, []);
  const leave = () => {
    try { sessionStorage.setItem(SPLASH_KEY, "1"); } catch {}
    setSplash("fading"); setTimeout(() => setSplash("off"), matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 600);
  };
  const closed = b.view === "closed";
  return (
    <section className={"hero-desk m-stage" + (hidden ? " is-hidden" : "") + (b.view === "home" ? " is-open" : "")} aria-label="책상" aria-hidden={hidden || undefined} inert={hidden}>
      {/* the desk photo, scaled together with the camera's zoom (transform set by Book3D) */}
      <div className="m-desk" aria-hidden="true"><img className="m-desk-bg" src="/mobile/bg_desk.webp" alt="" /></div>
      <Book />
      {closed && splash === "off" && <p className="m-tap" lang="en" aria-hidden="true">tap the book</p>}
      {splash !== null && splash !== "off" && (
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
