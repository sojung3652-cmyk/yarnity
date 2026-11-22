"use client";
// The pattern so far in 3D on the left page of 도안 만들기 (web, from step 2 to the end; Kim). Only the 3D:
// no title, no words. It follows the right page as it changes: colour and material at once (the yarn put on
// again, the shape as it is); counts, size, item, yarn and hook thickness, strap after 0.2s together, in one
// go (the gold dots move while the shape settles, then the yarn goes on). The angle the reader turned it to
// stays. It draws only when something changes, at a lower detail than the full screen, and everything it
// made is disposed when the page goes (leaving 도안 만들기).
import { useEffect, useMemo, useRef, useState } from "react";
import type { Plan } from "@/lib/pattern";
import type { YarnPattern, YarnViewer } from "./engine";
import { toYarnPattern, type YarnSource } from "./fromPattern";
import "./yarn3d-place.css";

const shapeKey = (p: YarnPattern) => JSON.stringify([p.shape, p.yarnMm, p.hookMm, p.strap, p.strapCm]);

export function YarnPagePreview({ source, plan }: { source: YarnSource; plan: Plan }) {
  const pattern = useMemo(() => toYarnPattern(source, plan), [source, plan]);
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
      const v = hasWebGL() ? createYarnViewer(cv.current, p, { phone: false, detail: "page", onInfo: () => {}, onBuilt: ms => { box.current?.setAttribute("data-built-ms", String(Math.round(ms))); } }) : null;
      if (!v) { setNoGL(true); return; }
      viewer.current = v; shown.current = p;
    });
    return () => { gone = true; viewer.current?.dispose(); viewer.current = null; shown.current = null; };
  }, []);

  // changes: colour / material now, shape after 0.2s of quiet
  useEffect(() => {
    const v = viewer.current, p = pattern;
    if (!v || !p || !shown.current) return;
    if (JSON.stringify(p) === JSON.stringify(shown.current)) return; // something else on the page changed
    if (shapeKey(p) === shapeKey(shown.current)) { v.setPattern(p); shown.current = p; return; }
    const t = setTimeout(() => { v.setPattern(p); shown.current = p; }, 200);
    return () => clearTimeout(t);
  }, [pattern]);

  return (
    <div ref={box} className="y3-page">
      {noGL ? <p className="y3-page-nogl">이 기기에서는 3D 보기를 쓸 수 없습니다.</p>
        : <canvas ref={cv} className="y3-page-canvas" aria-label="지금까지의 도안 3D" />}
    </div>
  );
}
