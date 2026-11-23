"use client";
// The pattern so far in 3D on the left page of 도안 만들기 (web, from step 2 to the end; Kim). The 3D, the
// whole piece in view and in the middle, three small tools on its left edge (nearer, further, the first
// angle again) and one line under it with the pattern's size (`caption`). It follows the right page as it changes: colour and material at once (the yarn put on
// again, the shape as it is); counts, size, item, yarn and hook thickness, strap after 0.2s together, in one
// go (the gold dots move while the shape settles, then the yarn goes on). The angle the reader turned it to
// stays. It draws only when something changes, at a lower detail than the full screen, and everything it
// made is disposed when the page goes (leaving 도안 만들기).
import { useEffect, useMemo, useRef, useState } from "react";
import type { Plan } from "@/lib/pattern";
import type { YarnPattern, YarnViewer } from "./engine";
import { toYarnPattern, type YarnSource } from "./fromPattern";
import { bookPause } from "./pause";
import "./yarn3d-place.css";

const I = ({ d }: { d: string }) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
const shapeKey = (p: YarnPattern) => JSON.stringify([{ ...p.shape, stitch: undefined }, p.yarnMm, p.hookMm, p.strap, p.strapCm]);

/** `fabric`: the 무늬 page - close enough to read the stitches of a knitted piece */
export function YarnPagePreview({ source, plan, fabric, caption }: { source: YarnSource; plan: Plan; fabric?: boolean; caption?: string }) {
  const pattern = useMemo(() => { const p = toYarnPattern(source, plan); return p && fabric ? { ...p, focus: "fabric" as const } : p; }, [source, plan, fabric]);
  const box = useRef<HTMLDivElement>(null), cv = useRef<HTMLCanvasElement>(null), viewer = useRef<YarnViewer | null>(null), shown = useRef<YarnPattern | null>(null);
  const latest = useRef(pattern); latest.current = pattern;
  const [noGL, setNoGL] = useState(false);

  // the viewer: made once for the page, disposed with it
  useEffect(() => {
    let gone = false;
    import("./engine").then(({ createYarnViewer, hasWebGL }) => {
      const p = latest.current;
      if (gone || !cv.current || !p) return;
      // data-built-ms on the box: when the shape last finished, and how long it took (for checking)
      const v = hasWebGL() ? createYarnViewer(cv.current, p, { phone: false, detail: "page", fit: true, onInfo: () => {}, onBuilt: ms => { box.current?.setAttribute("data-built-ms", String(Math.round(ms))); } }) : null;
      if (!v) { setNoGL(true); return; }
      viewer.current = v; shown.current = p;
    });
    return () => { gone = true; viewer.current?.dispose(); viewer.current = null; shown.current = null; };
  }, []);

  // changes: colour / material now, shape after 0.2s of quiet
  // while the work screen covers the page (크게 보기), the page waits: one 3D at a time works on a change
  const [covered, setCovered] = useState(bookPause.get());
  useEffect(() => bookPause.subscribe(() => setCovered(bookPause.get())), []);
  useEffect(() => {
    const v = viewer.current, p = pattern;
    if (!v || !p || !shown.current || covered) return;
    if (JSON.stringify(p) === JSON.stringify(shown.current)) return; // something else on the page changed
    if (shapeKey(p) === shapeKey(shown.current)) { v.setPattern(p); shown.current = p; return; }
    const t = setTimeout(() => { v.setPattern(p); shown.current = p; }, 200);
    return () => clearTimeout(t);
  }, [pattern, covered]);

  return (
    <div ref={box} className="y3-page">
      {noGL ? <p className="y3-page-nogl">이 기기에서는 3D 보기를 쓸 수 없습니다.</p>
        : <canvas ref={cv} className="y3-page-canvas" aria-label="지금까지의 도안 3D" />}
      {!noGL && (
        <div className="y3-page-tools" role="group" aria-label="3D 보기 도구">
          <button type="button" aria-label="확대" title="확대" onClick={() => viewer.current?.zoom(.8)}><I d="M10.5 4a6.5 6.5 0 1 0 0 13a6.5 6.5 0 0 0 0-13zM15.5 15.5l5 5M10.5 8v5M8 10.5h5" /></button>
          <button type="button" aria-label="축소" title="축소" onClick={() => viewer.current?.zoom(1.25)}><I d="M10.5 4a6.5 6.5 0 1 0 0 13a6.5 6.5 0 0 0 0-13zM15.5 15.5l5 5M8 10.5h5" /></button>
          <button type="button" aria-label="처음 각도로" title="처음 각도로" onClick={() => viewer.current?.home()}><I d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></button>
        </div>
      )}
      {caption && <p className="y3-page-cap">{caption}</p>}
    </div>
  );
}
