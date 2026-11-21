"use client";
// The one AI button (Kim): a round linen badge with a gold-thread star, fixed at the lower right, web and phones.
// It opens the AI as before (web: the 400px window; phones: the AI sheet) and hides while the AI is open.
// Not shown on the phone home (its AI와 상의 tile stays), the opening, inside the book (the web 3D book, 도안 만들기 on both) or on /ai; there the book's own
// AI tab is the way in. Phones: it floats 12px above a screen's fixed foot (뜨기 시작, 한 단 끝 ...) when there is
// one, else 24px above the bottom (+ the safe area).
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { useBook } from "@/components/Book/BookProvider";
import { useMobile } from "@/components/mobile/useMobile";
import { useHomeState } from "@/lib/homeState";
import "./AiBadge.css";

// fixed bars a phone screen may have at its foot (the badge stays clear of the highest one shown)
const FEET = ".ms-foot, .m-nav, .mfw-foot, .mst-foot";

export function AiBadge() {
  const { chat, setChat } = useApp(), b = useBook(), m = useMobile(), path = usePathname(), hs = useHomeState();
  const ref = useRef<HTMLButtonElement>(null), [lift, setLift] = useState<number | null>(null);
  const phone = !!m;
  const hidden = m === null || !!chat.open || path === "/new" || path === "/ai" || path.startsWith("/ai/")
    // web: on / only once the opening has become the home (Kim: the badge shows at home too); not in the book
    || (!phone && ((path === "/" && !hs.home) || b.floating || b.view === "wizard"))
    // the phone home keeps its own AI와 상의 tile (Kim): no badge there
    || (phone && path === "/")
    // 도안 보기 and 따라 뜨기 have Yarni beside their main button (Kim): no second one floating above
    || (phone && (path === "/pattern" || path === "/track"));

  // phones: above the screen's fixed foot, measured (it changes with the screen and its state)
  useEffect(() => {
    if (!phone || hidden) return;
    const place = () => {
      let top = innerHeight;
      document.querySelectorAll<HTMLElement>(FEET).forEach(el => {
        const cs = getComputedStyle(el); if (cs.display === "none" || cs.visibility === "hidden" || cs.position !== "fixed") return;
        const r = el.getBoundingClientRect(); if (r.height > 0 && r.top < top && r.bottom >= innerHeight - 2) top = r.top;
      });
      setLift(top < innerHeight ? Math.round(innerHeight - top + 12) : null);
    };
    place(); const iv = setInterval(place, 600); addEventListener("resize", place);
    return () => { clearInterval(iv); removeEventListener("resize", place); };
  }, [phone, hidden, path]);

  if (hidden) return null;
  return (
    <button ref={ref} type="button" className="ai-badge" aria-label="Yarni에게 물어보기" aria-expanded={false}
      style={phone && lift != null ? { bottom: lift } : undefined}
      onClick={() => setChat(c => ({ ...c, open: true }))}>
      <span className="ai-badge__label" aria-hidden="true">Yarni에게 물어보기</span>
    </button>
  );
}
