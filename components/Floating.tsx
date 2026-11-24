"use client";
// 플로팅 (Kim: every pressable thing and every card floats under the pointer, all alike, and nothing jumps). The
// lift is CSS (app/patches.css: `translate` on hover, so it never fights an element's own `transform`); this makes
// it smooth everywhere: an element whose own styles set a `transition` without the lift's properties gets them
// added - on load and for whatever appears later, never at the moment of the hover (the first hover then jumped:
// Kim's "왜 어떤 건 한번에 뜨고 어떤 건 아니야"). Its own transitions are kept as they are.
import { useEffect } from "react";
import { usePathname } from "next/navigation";

export const FLOAT_SEL = 'button, a[href], [role="button"], [role="tab"], [role="radio"], [role="menuitem"], [role="option"], summary, .float-card, .my-prof-main, .my-data, .my-login, .my-row, .my-row-new, .my-wish, .my-gal-pic, .my-hook';
// transform too: some hovers lift with their own transform (My Page's buttons) and jumped without it
const ADD = ["translate", "transform", "box-shadow", "filter", "background-color", "color", "border-color"];

export function Floating() {
  // the home page is marked, so the page-wide fade leaves it as it is
  const path = usePathname();
  useEffect(() => { document.documentElement.toggleAttribute("data-home", path === "/"); }, [path]);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const seen = new WeakSet<Element>();
    const smooth = (el: HTMLElement) => {
      if (seen.has(el)) return; seen.add(el);
      const cs = getComputedStyle(el), props = cs.transitionProperty.split(",").map(s => s.trim());
      if (props.includes("all")) return;
      const durs = cs.transitionDuration.split(","), fns = cs.transitionTimingFunction.split(","), dels = cs.transitionDelay.split(",");
      const none = props.length === 1 && (props[0] === "none" || parseFloat(durs[0]) === 0);
      const missing = ADD.filter(p => !props.includes(p)); if (!missing.length) return;
      const own = none ? "" : props.map((p, i) => `${p} ${durs[i % durs.length].trim()} ${fns[i % fns.length].trim()} ${dels[i % dels.length].trim()}`).join(", ");
      el.style.transition = [own, ...missing.map(p => `${p} .22s ease`)].filter(Boolean).join(", ");
    };
    // cards found by how they look (Kim: 핸드북, 마이페이지 - everything): a pressable thing the size of a card, or a
    // panel with a shadow, a stitched border or a cloth picture round it - the outermost one only (a card in a
    // card does not float twice); the page's frame, the 3D screen and what is pinned to the screen are left out
    const SKIP = ".yw, nav, header, footer, .nb-book, #book, .ai-badge, .scroll-top, [role=dialog], [role=menu], [role=alertdialog]";
    const cardish = (el: HTMLElement) => {
      if (el.closest(SKIP) || el.closest(".float-card") !== null) return false;
      const r = el.getBoundingClientRect(); if (r.width < 80 || r.height < 44 || r.width > 900 || r.height > 720) return false;
      const cs = getComputedStyle(el); if (cs.position === "fixed" || cs.position === "sticky" || cs.display === "inline") return false;
      if (el.matches('button, a[href], [role="button"]')) return true;
      return cs.boxShadow !== "none" || cs.borderImageSource !== "none" || cs.borderTopStyle === "dashed";
    };
    const scan = (root: ParentNode) => {
      if (root instanceof HTMLElement && root.matches(FLOAT_SEL)) smooth(root); root.querySelectorAll<HTMLElement>(FLOAT_SEL).forEach(smooth);
      root.querySelectorAll<HTMLElement>("button, a[href], [role=button], section, article, aside, li, figure, div").forEach(el => {
        if (cardish(el)) { el.classList.add("float-card"); smooth(el); }
      });
    };
    scan(document);
    // what appears later (a page opened, a list grown): scanned once the browser is idle
    let queued: ParentNode[] = [], t = 0;
    // a screen changing inside the page (Kim: 실 도감, FAQ - "띡" 하고 나오지 않게): what came in, when it is a screen's
    // worth, floats up and fades in - before the browser paints it (this runs before the paint)
    const enter = (els: HTMLElement[]) => {
      if (location.pathname === "/") return; // the home page keeps its own (Kim: 홈화면 제외)
      els.slice(0, 60).forEach(el => {
        el.classList.add("y-enter");
        el.addEventListener("animationend", () => el.classList.remove("y-enter"), { once: true });
      });
    };
    const mo = new MutationObserver(ms => {
      for (const m of ms) {
        const els = [...m.addedNodes].filter((n): n is HTMLElement => n instanceof HTMLElement && !n.matches("canvas, script, style, .scroll-top, .y-enter") && !n.closest("nav, header, footer, .ai-badge, [aria-live]"));
        if (els.length) {
          let area = 0; for (const el of els) { const r = el.getBoundingClientRect(); area += r.width * r.height; }
          if (area >= 280 * 160) enter(els);
        }
        els.forEach(n => queued.push(n));
      }
      if (queued.length && !t) t = window.setTimeout(() => { const q = queued; queued = []; t = 0; q.forEach(n => { if ((n as HTMLElement).isConnected) scan(n); }); }, 60);
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { mo.disconnect(); if (t) clearTimeout(t); };
  }, []);
  return null;
}
