"use client";
// Inside of the front cover: the 15cm round coaster's stitch map, slowly turning (calm, monochrome).
import { useEffect, useRef } from "react";
import { dots, plan } from "@/lib/pattern";

const heroPlan = plan({ shape: "circle", a: 15, hook: "5호", weight: "medium", object: "coaster" });
const heroDots = dots(heroPlan, "circle", heroPlan.bottomRounds);
export const heroCaption = `지름 15cm · ${heroPlan.bottomRounds}단 · ${heroPlan.last}코`;

export function HeroDots() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const hctx = ref.current!.getContext("2d")!;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    function drawHero(t: number) {
      const W = 900, R = heroPlan.bottomRounds, sc = (W / 2 - 30) / (R * heroPlan.g.h);
      hctx.clearRect(0, 0, W, W);
      hctx.save(); hctx.translate(W / 2, W / 2); hctx.rotate(reduce ? 0 : t * 0.04);
      for (const d of heroDots) {
        const a = reduce ? 0.9 : 0.55 + 0.4 * (0.5 + 0.5 * Math.sin(t * 0.9 - d.r * 0.45));
        for (const p of d.pts) {
          hctx.beginPath(); hctx.arc(p.x * sc, p.y * sc, 5.5, 0, Math.PI * 2);
          if (p.inc) { hctx.lineWidth = 2.2; hctx.strokeStyle = `rgba(108,128,190,${a})`; hctx.stroke(); }
          else { hctx.fillStyle = `rgba(158,176,222,${a})`; hctx.fill(); }
        }
      }
      hctx.restore();
    }
    if (reduce) { drawHero(0); return; }
    let raf = 0; const t0 = performance.now();
    const loop = (now: number) => { drawHero((now - t0) / 1000); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} id="heroCanvas" width={900} height={900} aria-hidden="true" />;
}
