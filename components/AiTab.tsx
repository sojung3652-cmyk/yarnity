"use client";
// The AI index tab: a thin gold plate sticking out of the open book's fore edge (the right page's outer
// edge), on every open spread - the menu and each 도안 만들기 step. The same gold leaf as the ribbon
// (RibbonGold.tsx GoldLeafDefs: gradient, grain, raised lit edges), a 1px light line on its upper-left edge
// and a dark one on its lower right, a shallow shadow. No words on it: hover or keyboard focus shows a small
// cream name tag "AI와 상의" beside it (on the page side when there is no room); touch screens just open
// the sheet. Pressing it opens / closes the AI sheet; while the sheet is open the plate stays bright.
// It lives inside the right page's DOM box, so it hides with the page during a turn and comes back with it
// (0.12s fade) and is not there while the book is closed. 38% down the page, moved up if it would cover the
// yarn photo; tucked inside the page's edge when there is no room beside the book.
import { useEffect, useId, useRef, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { GoldLeafDefs, leafIds } from "@/components/RibbonGold";

/** where the yarn skeins sit in the backdrop photo (hero-bg.webp, fractions of the image box) */
const SKEINS = { x0: 0.66, x1: 0.99, y0: 0.02, y1: 0.68 };

export function AiTab({ variant }: { variant: "menu" | "page" | "phone" }) {
  const { chat, setChat } = useApp();
  const ref = useRef<HTMLButtonElement>(null), id = useId().replace(/:/g, ""), L = leafIds(`t${id}`);
  const [inside, setInside] = useState(false), [top, setTop] = useState(38), [tipLeft, setTipLeft] = useState(false);
  const open = !!chat.open, phone = variant === "phone";
  // the plate: 26px out + 6px under the page (phones 22 + 6), outer corners rounded 5px
  const W = phone ? 28 : 32, H = phone ? 48 : 58, d = `M0 0H${W - 5}Q${W} 0 ${W} 5V${H - 5}Q${W} ${H} ${W - 5} ${H}H0Z`;

  // room beside the book? clear of the yarn photo? (on resize, and every second while shown)
  useEffect(() => {
    const check = () => {
      const el = ref.current, page = el?.parentElement; if (!el || !page) return;
      const pr = page.getBoundingClientRect(); if (!pr.width) return;
      const roomy = innerWidth - pr.right >= W + 4;
      setInside(!roomy);
      if (phone) return;
      const img = document.querySelector(".hero-bg-img")?.getBoundingClientRect();
      let t = 38;
      if (img && roomy) {
        const sk = { l: img.left + img.width * SKEINS.x0, r: img.left + img.width * SKEINS.x1, t: img.top + img.height * SKEINS.y0, b: img.top + img.height * SKEINS.y1 };
        const tabL = pr.right - 6, tabR = pr.right + W - 6 + 3;
        for (; t >= 8; t -= 2) {
          const y0 = pr.top + pr.height * t / 100, y1 = y0 + H;
          if (tabR < sk.l || tabL > sk.r || y1 < sk.t || y0 > sk.b) break;
        }
        if (t < 8) t = 38; // nowhere clear: keep the usual place
      }
      setTop(t);
    };
    check(); addEventListener("resize", check); const iv = setInterval(check, 1000);
    return () => { removeEventListener("resize", check); clearInterval(iv); };
  }, [phone, W, H]);
  // the name tag goes on the page side when it would leave the screen
  const placeTip = () => { const r = ref.current?.getBoundingClientRect(); if (r) setTipLeft(!inside && r.right + 6 + 90 > innerWidth); };

  return (
    <button ref={ref} type="button" aria-label="Yarni와 상의하기" aria-expanded={open}
      className={`ai-ftab ai-ftab-${variant}` + (inside ? " is-inside" : "") + (open ? " is-on" : "") + (tipLeft ? " tip-left" : "")}
      style={!phone ? { top: `${top}%` } : undefined}
      onPointerEnter={placeTip} onFocus={placeTip}
      onClick={() => setChat(c => ({ ...c, open: !c.open }))}>
      <svg className="ai-ftab-plate" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
        <defs><GoldLeafDefs ids={L} /></defs>
        <g filter={`url(#${L.fr})`}><path d={d} fill={`url(#${L.g})`} /><path d={d} fill={`url(#${L.weave})`} /></g>
        {/* the plate's edge: a light line on the upper left, a dark one on the lower right */}
        <path d={`M${W - 5} .5H.5V${H - .5}`} fill="none" stroke="#F7F0DA" strokeOpacity=".75" strokeWidth="1" />
        <path d={`M${W - .5} 5V${H - 5}Q${W - .5} ${H - .5} ${W - 5} ${H - .5}H.5`} fill="none" stroke="#4D3B1D" strokeOpacity=".5" strokeWidth="1" />
        {/* "AI" stamped small into the plate (debossed: dark letters, a light lip on their lower right),
            centred on the part that shows (the inner 6 units are under the page) */}
        <g className="ai-ftab-mark" fontFamily="var(--font-cormorant), 'Cormorant Garamond', serif" fontWeight="700" fontSize={phone ? 9 : 10} textAnchor="middle" letterSpacing=".6">
          <text x={(W + 6) / 2 + .6} y={H / 2 + 3.6} fill="#F7F0DA" fillOpacity=".7">AI</text>
          <text x={(W + 6) / 2} y={H / 2 + 3} fill="#4D3B1D" fillOpacity=".78">AI</text>
        </g>
      </svg>
      {/* the gold-thread star (Girl's Diary), as on the phone's AI와 상의 */}
      <img className="ai-ftab-star" src="/mobile/diary/star.webp" alt="" aria-hidden="true" />
      <span className="ai-ftab-tip" aria-hidden="true">Yarni와 상의</span>
    </button>
  );
}
