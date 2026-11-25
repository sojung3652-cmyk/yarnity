"use client";
// The web's first screen and home in one (Kim): the embroidered opening plays (the stage canvas over the starry linen,
// openingHomeScene.ts); once done, its sentence is the Start button. Start makes it the home: the scene stays where it
// is (lowered a little to sit under the NavBar), the NavBar slides down and the AI badge fades in; the glints go on.
// At home the sentence raises the book onto 도안 만들기 step 1. A load or reload at / always plays the opening; coming
// to / inside the site shows the home at once. Reduced motion: the home at once. A press anywhere (or Enter, Space,
// Esc) while it plays goes to the home at once, by Start's own change (Kim).
import { useEffect, useRef, useState } from "react";
import { useBook } from "@/components/Book/BookProvider";
import { makeOpeningHomeScene, OH_END, OH_SRC, type OHImages } from "./openingHomeScene";
import { setHomeState } from "@/lib/homeState";
import "./openingHome.css";

// the opening plays once per page load: the first showing of this screen; later ones (inside the site) are the home
let playedThisLoad = false;

export function OpeningHome() {
  const book = useBook();
  const root = useRef<HTMLDivElement>(null), stage = useRef<HTMLDivElement>(null), cv = useRef<HTMLCanvasElement>(null), sv = useRef<HTMLCanvasElement>(null);
  const startBtn = useRef<HTMLButtonElement>(null);
  const [home, setHome] = useState(false), [instant, setInstant] = useState(false), [shown, setShown] = useState(false), [loaded, setLoaded] = useState(false), [narrow, setNarrow] = useState(false);
  const firstRef = useRef<boolean | null>(null);
  const ctl = useRef<{ skip: () => void; again: () => void; home: (instant: boolean) => void; now: () => void }>({ skip: () => {}, again: () => {}, home: () => {}, now: () => {} });

  useEffect(() => {
    // the opening only when this page load itself was at / (a reload of the home); a reload elsewhere stays there,
    // and coming to / inside the site is the home at once (Kim)
    const loadUrl = (performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined)?.name ?? location.href;
    // decided once per showing: React's second effect run in development must not read the mark the first run wrote
    if (firstRef.current === null) { firstRef.current = !playedThisLoad && new URL(loadUrl).pathname === "/"; playedThisLoad = true; }
    const first = firstRef.current;
    const rm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const r = root.current!, st = stage.current!, b = startBtn.current!;
    let alive = true, raf = 0, t0 = 0, manual = false, manualT = 0, isHome = false, done = false;
    let scene: ReturnType<typeof makeOpeningHomeScene> | null = null;
    const img = {} as OHImages;
    const load = (k: keyof typeof OH_SRC) => new Promise<void>(res => { const i = new Image(); i.onload = i.onerror = () => res(); i.src = OH_SRC[k]; img[k] = i; });
    const size = () => {
      if (!scene) return;
      const rc = r.getBoundingClientRect(), z = scene.size(rc.width, rc.height, window.devicePixelRatio || 1, 56); // 56: the NavBar over the home
      b.style.left = z.start.left + "px"; b.style.top = z.start.top + "px"; b.style.width = z.start.width + "px"; b.style.height = z.start.height + "px";
      st.style.transformOrigin = z.origin; r.style.setProperty("--home-t", z.homeT); setNarrow(z.narrow); // a class React keeps
    };
    const tick = (now: number) => {
      if (!alive || manual || !scene) return;
      const t = (now - t0) / 1000; scene.frame(t);
      if (t >= OH_END && !done && !isHome) { done = true; setShown(true); }
      if (document.visibilityState === "visible") raf = requestAnimationFrame(tick);
    };
    // the canvas waits while the tab is hidden
    const vis = () => { if (document.visibilityState === "visible" && !manual && scene) { cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); } };
    document.addEventListener("visibilitychange", vis);
    const goHome = (inst: boolean) => {
      isHome = true; done = true; setInstant(inst); setHome(true); setHomeState({ home: true, instant: inst });
      if (inst) t0 = Math.min(t0, performance.now() - OH_END * 1000);
    };
    ctl.current = {
      skip: () => { t0 = performance.now() - OH_END * 1000; },
      again: () => { isHome = false; done = false; setHome(false); setInstant(false); setShown(false); setHomeState({ home: false, instant: false }); t0 = performance.now(); },
      home: goHome,
      // 바로 넘기기 (Kim): the scene to its end and Start's own change to the home; only once (a second press,
      // or the Start button's own click under the same press, finds the home already on its way)
      now: () => { if (isHome || !scene) return; t0 = performance.now() - OH_END * 1000; goHome(false); },
    };
    const key = (e: KeyboardEvent) => { if (isHome || !scene) return; if (e.key === "Enter" || e.key === " " || e.key === "Escape") { e.preventDefault(); ctl.current.now(); } };
    window.addEventListener("keydown", key);
    const ro = new ResizeObserver(() => { size(); if (manual) scene?.frame(manualT); }); ro.observe(r);
    Promise.all((Object.keys(OH_SRC) as (keyof typeof OH_SRC)[]).map(load)).then(() => {
      if (!alive || !cv.current || !sv.current) return;
      scene = makeOpeningHomeScene(cv.current, sv.current, img); size(); setLoaded(true);
      if (process.env.NODE_ENV !== "production") {
        // development only: draw a given second (screenshots), as the reference's __seek
        (window as unknown as { __ohSeek?: (t: number) => void }).__ohSeek = (t: number) => { manual = true; manualT = t; cancelAnimationFrame(raf); scene!.frame(t); };
      }
      const straightHome = !first || rm;
      t0 = performance.now() - (straightHome ? OH_END * 1000 : 0);
      if (straightHome) goHome(true);
      raf = requestAnimationFrame(tick);
    });
    return () => { alive = false; cancelAnimationFrame(raf); window.removeEventListener("keydown", key); ro.disconnect(); document.removeEventListener("visibilitychange", vis); setHomeState({ home: false, instant: false }); };
  }, []);

  return (
    <div ref={root} className={"oh" + (home ? " home" : "") + (instant ? " instant" : "") + (narrow ? " narrow" : "")} id="view-home" onClick={() => { if (!home) ctl.current.now(); }}>
      <div className="oh-bgf" aria-hidden="true" />
      <canvas ref={sv} className="oh-sv" aria-hidden="true" />
      <div className="oh-veil" aria-hidden="true" />
      <div ref={stage} className="oh-stage">
        <canvas ref={cv} className="oh-cv" role="img" aria-label="Yarnity 오프닝: 파랑새 메달리온 아래로 금실 로고와 문구가 수놓아집니다." />
        {/* the opening: Start turns it into the home; at home the same words raise the book onto step 1 (Kim) */}
        <button ref={startBtn} type="button" className="oh-start" hidden={!shown && !home} onClick={e => { e.stopPropagation(); if (home) book.newPattern(); else ctl.current.now(); }}>Start making my own pattern book</button>
      </div>
    </div>
  );
}
