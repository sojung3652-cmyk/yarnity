"use client";
// The phone's opening (Kim's "자수 오프닝"): one canvas drawing reference.html's scene (openingScene.ts) - the
// photo at once, the gold logo stitched in writing order, the sentence left to right, the divider opening from
// the middle, the light band and twinkles going on after, a very slow zoom. The 941 x 1672 picture is
// contained in the screen, the rest filled with the same photo blurred (28px). Done at about 4.8s, it waits on
// that scene: the sentence is the start button (0.9s fade, then the home); 건너뛰기 jumps to the finished scene.
// Reduced motion: the finished scene, still. The four images load before anything plays (until then only
// #F3E7DC shows); the drawing stops while the page is hidden and resumes where it was.
import { useEffect, useRef, useState } from "react";
import { END, IH, IW, makeFrame, SRC, type OpeningImages } from "./openingScene";
import "./opening.css";

export const OPENING_SEEN = "yarnity.opening.seen";

export function OpeningIntro({ onDone }: { onDone: () => void }) {
  const stage = useRef<HTMLDivElement>(null), bg = useRef<HTMLDivElement>(null), cv = useRef<HTMLCanvasElement>(null), start = useRef<HTMLButtonElement>(null);
  const skipTo = useRef<() => void>(() => {});
  const [ready, setReady] = useState(false), [shown, setShown] = useState(false), [leaving, setLeaving] = useState(false);

  useEffect(() => {
    try { sessionStorage.setItem(OPENING_SEEN, "1"); } catch {}
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let alive = true, raf = 0, t0 = 0, pausedAt = 0, done = false, manual = false;
    let frame: ((t: number) => void) | null = null;
    const img = {} as OpeningImages;
    const load = (k: keyof typeof SRC) => new Promise<void>(r => { const i = new Image(); i.onload = i.onerror = () => r(); i.src = SRC[k]; img[k] = i; });

    // sizing (the reference's size()): contain the 941 x 1672 picture, the start button over the sentence
    const size = () => {
      const s = stage.current, c = cv.current, b = start.current; if (!s || !c || !b) return;
      const r = s.getBoundingClientRect(), VW = Math.max(1, r.width), VH = Math.max(1, r.height), DPR = Math.min(2, window.devicePixelRatio || 1), SC = Math.min(VW / IW, VH / IH);
      const w = IW * SC, h = IH * SC, l = (VW - w) / 2, tp = (VH - h) / 2;
      c.style.left = l + "px"; c.style.top = tp + "px"; c.style.width = w + "px"; c.style.height = h + "px"; c.width = Math.round(w * DPR); c.height = Math.round(h * DPR);
      b.style.left = l + 140 * SC + "px"; b.style.top = tp + 1205 * SC + "px"; b.style.width = 660 * SC + "px"; b.style.height = 100 * SC + "px";
    };
    const finish = () => { if (!done) { done = true; setShown(true); } };
    const tick = (now: number) => {
      if (!alive || manual || !frame) return;
      const t = (now - t0) / 1000; frame(t); if (t >= END) finish();
      raf = requestAnimationFrame(tick);
    };
    const play = () => { if (reduce || manual || !frame) return; cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); };
    skipTo.current = () => { t0 = performance.now() - END * 1000; if (reduce && frame) { frame(END); finish(); } };

    // the page hidden: stop; back: on from where it was
    const vis = () => {
      if (!frame || reduce) return;
      if (document.hidden) { cancelAnimationFrame(raf); pausedAt = performance.now(); }
      else { if (pausedAt) t0 += performance.now() - pausedAt; pausedAt = 0; play(); }
    };
    document.addEventListener("visibilitychange", vis);
    const ro = new ResizeObserver(() => { if (!frame) return; size(); if (reduce || manual || document.hidden) frame(reduce ? END : (performance.now() - t0) / 1000); });
    if (stage.current) ro.observe(stage.current);

    Promise.all((Object.keys(SRC) as (keyof typeof SRC)[]).map(load)).then(() => {
      if (!alive || !cv.current) return;
      frame = makeFrame(cv.current, img);
      if (bg.current) bg.current.style.backgroundImage = `url(${SRC.base})`;
      size(); setReady(true);
      if (process.env.NODE_ENV !== "production") {
        // development only: draw the scene at a given second (screenshots), as the reference's __seek
        (window as unknown as { __openingSeek?: (t: number) => void }).__openingSeek = (t: number) => { manual = true; cancelAnimationFrame(raf); frame!(t); };
      }
      if (reduce) { frame(END); finish(); return; }
      t0 = performance.now(); play();
    });
    return () => { alive = false; cancelAnimationFrame(raf); ro.disconnect(); document.removeEventListener("visibilitychange", vis); };
  }, []);

  const go = () => { if (leaving) return; setLeaving(true); setTimeout(onDone, matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 900); };
  return (
    <div ref={stage} className={"op-stage" + (leaving ? " is-leaving" : "")}>
      <div ref={bg} className={"op-bg" + (ready ? " is-on" : "")} />
      <canvas ref={cv} className="op-cv" aria-label="Yarnity 오프닝: 파랑새 메달리온 아래에 금실 Yarnity 로고와 'Start making my own pattern book' 문구가 한 땀씩 수놓아지고 반짝입니다." />
      <button ref={start} type="button" className="op-start" hidden={!shown} onClick={go}>Start making my own pattern book</button>
      {ready && !shown && <button type="button" className="op-skip" onClick={() => skipTo.current()}>건너뛰기</button>}
    </div>
  );
}
