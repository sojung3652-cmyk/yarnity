"use client";
// The web's start screen (Kim's "자수 오프닝"): one canvas drawing reference.html's scene (webOpeningScene.ts) -
// the starry linen at once (cover), its stars breathing; the medallion; the gold logo stitched pixel by pixel in
// the order time.png gives; the sentence left to right, the flower rule from the middle out; the light band and
// twinkles going on after; a very slow zoom. Done at about 4.5s, it waits on that scene: only the sentence is a
// button (it opens the book, as the old Start link did). 건너뛰기 jumps to the finished scene. Seen this session
// already, or reduced motion: it starts finished (reduced motion: still). The five images load first (until then
// only #F1E7DA); the drawing stops while the tab is hidden and resumes where it was.
import { useEffect, useRef, useState } from "react";
import { END, makeScene, SRC, type WebOpeningImages } from "./webOpeningScene";
import "./opening.css";

export const WEB_OPENING_SEEN = "yarnity.web-opening.seen";

export function OpeningIntroWeb({ onStart }: { onStart: () => void }) {
  const stage = useRef<HTMLDivElement>(null), cv = useRef<HTMLCanvasElement>(null), start = useRef<HTMLButtonElement>(null);
  const skipTo = useRef<() => void>(() => {});
  const [ready, setReady] = useState(false), [shown, setShown] = useState(false);
  // seen this session: decided once per showing (a ref outlives React's second effect run in development, which
  // would otherwise read the mark the first run just wrote)
  const seenRef = useRef<boolean | null>(null);

  useEffect(() => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (seenRef.current === null) { try { seenRef.current = !!sessionStorage.getItem(WEB_OPENING_SEEN); sessionStorage.setItem(WEB_OPENING_SEEN, "1"); } catch { seenRef.current = false; } }
    const seen = seenRef.current;
    let alive = true, raf = 0, t0 = 0, pausedAt = 0, done = false, manual = false;
    let scene: ReturnType<typeof makeScene> | null = null;
    const img = {} as WebOpeningImages;
    const load = (k: keyof typeof SRC) => new Promise<void>(r => { const i = new Image(); i.onload = i.onerror = () => r(); i.src = SRC[k]; img[k] = i; });
    const size = () => {
      const s = stage.current, b = start.current; if (!s || !b || !scene) return;
      const r = s.getBoundingClientRect(), p = scene.size(r.width, r.height, window.devicePixelRatio || 1);
      b.style.left = p.left + "px"; b.style.top = p.top + "px"; b.style.width = p.width + "px"; b.style.height = p.height + "px";
    };
    const finish = () => { if (!done) { done = true; setShown(true); } };
    const tick = (now: number) => {
      if (!alive || manual || !scene) return;
      const t = (now - t0) / 1000; scene.frame(t); if (t >= END) finish();
      raf = requestAnimationFrame(tick);
    };
    const play = () => { if (reduce || manual || !scene) return; cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); };
    skipTo.current = () => { t0 = performance.now() - END * 1000; };
    const vis = () => {
      if (!scene || reduce) return;
      if (document.hidden) { cancelAnimationFrame(raf); pausedAt = performance.now(); }
      else { if (pausedAt) t0 += performance.now() - pausedAt; pausedAt = 0; play(); }
    };
    document.addEventListener("visibilitychange", vis);
    const ro = new ResizeObserver(() => { if (!scene) return; size(); if (reduce || manual || document.hidden) scene.frame(reduce ? END : (performance.now() - t0) / 1000); });
    if (stage.current) ro.observe(stage.current);

    Promise.all((Object.keys(SRC) as (keyof typeof SRC)[]).map(load)).then(() => {
      if (!alive || !cv.current) return;
      scene = makeScene(cv.current, img); size(); setReady(true);
      if (process.env.NODE_ENV !== "production") {
        // development only: draw the scene at a given second (screenshots), as the reference's __seek
        (window as unknown as { __webOpeningSeek?: (t: number) => void }).__webOpeningSeek = (t: number) => { manual = true; cancelAnimationFrame(raf); scene!.frame(t); };
      }
      if (reduce) { scene.frame(END); finish(); return; }
      // seen this session: from the finished scene (the light band and twinkles go on)
      t0 = performance.now() - (seen ? END : 0) * 1000; play();
    });
    return () => { alive = false; cancelAnimationFrame(raf); ro.disconnect(); document.removeEventListener("visibilitychange", vis); };
  }, []);

  return (
    <div ref={stage} className="opw-stage">
      <canvas ref={cv} className="opw-cv" aria-label="Yarnity 오프닝: 별 자수 린넨 위 파랑새 메달리온 아래로 금실 Yarnity 로고와 'Start making my own pattern book' 문구가 수놓아지고 반짝입니다. 문구가 시작 버튼입니다." />
      <button ref={start} type="button" className="opw-start" hidden={!shown} onClick={onStart}>Start making my own pattern book</button>
      {ready && !shown && <button type="button" className="op-skip opw-skip" onClick={() => skipTo.current()}>건너뛰기</button>}
    </div>
  );
}
