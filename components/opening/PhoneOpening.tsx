"use client";
// The phone's opening, made the web's way (Kim): the same layered scene as the web's first screen
// (openingHomeScene.ts, its portrait layout) - the medallion, the gold logo stitched in writing order, the sentence
// and the flower rule, the starry linen with its twinkles. Once done, the sentence is the Start button. Start: the
// sentence fades, the medallion and the logo shrink a little and rise onto the home's own (0.75s, easing to rest)
// while the linen gives way to the home and its menu cards come up from below - as the web's NavBar comes down;
// then the home's medallion and logo take over. No home under it (the 도안 만들기 address) or reduced motion: a fade.
import { useEffect, useRef, useState } from "react";
import { makeOpeningHomeScene, OH_END, OH_SRC, type OHImages } from "./openingHomeScene";
import "./phoneOpening.css";

export const OPENING_SEEN = "yarnity.opening.seen";

export function PhoneOpening({ onDone }: { onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null), stage = useRef<HTMLDivElement>(null), cv = useRef<HTMLCanvasElement>(null), sv = useRef<HTMLCanvasElement>(null), btn = useRef<HTMLButtonElement>(null);
  const sceneRef = useRef<ReturnType<typeof makeOpeningHomeScene> | null>(null), fadeFrom = useRef(0);
  const [loaded, setLoaded] = useState(false), [shown, setShown] = useState(false), [phase, setPhase] = useState<"" | "rise" | "landed" | "out">("");

  useEffect(() => {
    try { sessionStorage.setItem(OPENING_SEEN, "1"); } catch {}
    const rm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const r = root.current!, b = btn.current!;
    let alive = true, raf = 0, t0 = 0, done = false;
    const img = {} as OHImages;
    const load = (k: keyof typeof OH_SRC) => new Promise<void>(res => { const i = new Image(); i.onload = i.onerror = () => res(); i.src = OH_SRC[k]; img[k] = i; });
    const size = () => {
      const sc = sceneRef.current; if (!sc) return;
      const rc = r.getBoundingClientRect(), z = sc.size(rc.width, rc.height, window.devicePixelRatio || 1);
      b.style.left = z.start.left + "px"; b.style.top = z.start.top + "px"; b.style.width = z.start.width + "px"; b.style.height = z.start.height + "px";
    };
    const tick = (now: number) => {
      const sc = sceneRef.current; if (!alive || !sc) return;
      const t = (now - t0) / 1000;
      // Start pressed: the sentence fades out in 0.3s
      if (fadeFrom.current) sc.setText(1 - (now - fadeFrom.current) / 300);
      sc.frame(t);
      if (t >= OH_END && !done) { done = true; setShown(true); }
      if (document.visibilityState === "visible") raf = requestAnimationFrame(tick);
    };
    const vis = () => { if (document.visibilityState === "visible" && sceneRef.current) { cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); } };
    document.addEventListener("visibilitychange", vis);
    const ro = new ResizeObserver(size); ro.observe(r);
    Promise.all((Object.keys(OH_SRC) as (keyof typeof OH_SRC)[]).map(load)).then(() => {
      if (!alive || !cv.current || !sv.current) return;
      sceneRef.current = makeOpeningHomeScene(cv.current, sv.current, img); size(); setLoaded(true);
      t0 = performance.now() - (rm ? OH_END * 1000 : 0);
      raf = requestAnimationFrame(tick);
    });
    return () => { alive = false; cancelAnimationFrame(raf); ro.disconnect(); document.removeEventListener("visibilitychange", vis); };
  }, []);

  const go = () => {
    if (phase) return;
    const sc = sceneRef.current, st = stage.current, lace = document.querySelector<HTMLElement>(".mfh-lace");
    const rm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (rm || !sc || !st || !lace) { setPhase("out"); setTimeout(onDone, rm ? 0 : 700); return; }
    // the medallion lands on the home's: same centre, same height (the logo comes along at the same scale)
    const m = sc.geom().med, lr = lace.getBoundingClientRect(), k = lr.height / m.h;
    const dx = lr.left + lr.width / 2 - m.cx * k, dy = lr.top + lr.height / 2 - m.cy * k;
    st.style.transformOrigin = "0 0";
    fadeFrom.current = performance.now();
    document.body.classList.add("m-intro-rise", "m-intro-cards");
    setPhase("rise");
    requestAnimationFrame(() => requestAnimationFrame(() => { st.style.transform = `translate(${dx}px, ${dy}px) scale(${k})`; }));
    // landed: the home's own medallion and logo switch on at once under the (identical, aligned) risen ones, then the
    // overlay fades - it stays "rising" so the linen and its twinkles never come back (that was the flash)
    setTimeout(() => { document.body.classList.remove("m-intro-rise"); setPhase("landed"); }, 820);
    setTimeout(onDone, 1080);
  };

  return (
    <div ref={root} className={"pho" + (loaded ? " is-on" : "") + (phase === "rise" || phase === "landed" ? " is-rising" : "") + (phase === "out" || phase === "landed" ? " is-out" : "")}>
      <div className="pho-bg" aria-hidden="true" />
      <canvas ref={sv} className="pho-sv" aria-hidden="true" />
      <div ref={stage} className="pho-stage">
        <canvas ref={cv} className="pho-cv" role="img" aria-label="Yarnity 오프닝: 파랑새 메달리온 아래로 금실 로고와 문구가 수놓아집니다." />
        <button ref={btn} type="button" className="pho-start" hidden={!shown} onClick={go}>Start making my own pattern book</button>
      </div>
    </div>
  );
}
