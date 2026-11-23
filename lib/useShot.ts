"use client";
// 완성 모양 (Kim: the 3D seen from the front): the work's picture, or - for a work saved without one - its 3D built
// once off the screen, taken from the front and kept (lib/shots). Without WebGL there is none (the drawing stays).
import { useEffect, useState } from "react";
import type { Plan } from "@/lib/pattern";
import { shots } from "@/lib/shots";
import { toYarnPattern, type YarnSource } from "@/src/features/yarn3d/fromPattern";
import type { YarnViewer } from "@/src/features/yarn3d/engine";

export function useShot(id: string | undefined, src: YarnSource | null | undefined, pp: Plan | null) {
  const [shot, setShot] = useState<string | null>(null);
  useEffect(() => {
    if (!id || !src || !pp) { setShot(null); return; }
    const have = shots.get(id); if (have) { setShot(have); return; }
    const pat = toYarnPattern(src, pp); if (!pat) return;
    let gone = false, v: YarnViewer | null = null;
    const c = document.createElement("canvas");
    Object.assign(c.style, { position: "fixed", left: "-10000px", top: "0", width: "560px", height: "480px", pointerEvents: "none" });
    document.body.appendChild(c);
    const done = () => { v?.dispose(); v = null; c.remove(); };
    import("@/src/features/yarn3d/engine").then(({ createYarnViewer, hasWebGL }) => {
      if (gone || !hasWebGL()) { done(); return; }
      v = createYarnViewer(c, pat, { phone: false, fit: true, onInfo: () => {}, onBuilt: () => {
        // a moment for the yarn to settle and draw, then the picture
        setTimeout(() => { if (gone || !v) return; const u = v.snapshot(); if (u) { shots.set(id, u); setShot(u); } done(); }, 600);
      } });
      if (!v) done();
    });
    return () => { gone = true; done(); };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  return shot;
}
