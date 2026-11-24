"use client";
// 플로팅 (Kim: every pressable thing on the site floats a little under the pointer, and nothing jumps). The lift is
// CSS (app/patches.css: `translate` on hover, so it never fights an element's own `transform`); this makes it
// smooth everywhere: an element whose own styles set a `transition` without the lift's properties gets them
// added once, the first time the pointer comes over it - its own transitions kept as they are.
import { useEffect } from "react";

const PRESS = 'button, a[href], [role="button"], [role="tab"], [role="radio"], [role="menuitem"], [role="option"], summary, .my-prof-main, .my-data';
// transform too: some hovers lift with their own transform (My Page's buttons) and jumped without it
const ADD = ["translate", "transform", "box-shadow", "background-color", "color", "border-color"];

export function Floating() {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const seen = new WeakSet<Element>();
    const smooth = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest?.(PRESS) as HTMLElement | null;
      if (!el || seen.has(el)) return; seen.add(el);
      const cs = getComputedStyle(el), props = cs.transitionProperty.split(",").map(s => s.trim());
      if (props.includes("all")) return;
      const durs = cs.transitionDuration.split(","), only0 = props.length === 1 && (props[0] === "none" || parseFloat(durs[0]) === 0);
      const missing = ADD.filter(p => !props.includes(p)); if (!missing.length) return;
      // keep what it has (unless it has none), add the rest at the site's pace
      const own = only0 ? "" : props.map((p, i) => `${p} ${durs[i % durs.length].trim()} ${cs.transitionTimingFunction.split(",")[i % cs.transitionTimingFunction.split(",").length]?.trim() ?? "ease"} ${cs.transitionDelay.split(",")[i % cs.transitionDelay.split(",").length]?.trim() ?? "0s"}`).join(", ");
      el.style.transition = [own, ...missing.map(p => `${p} .2s ease`)].filter(Boolean).join(", ");
    };
    document.addEventListener("pointerover", smooth, { passive: true });
    return () => document.removeEventListener("pointerover", smooth);
  }, []);
  return null;
}
