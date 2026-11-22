"use client";
// The web's NavBar (Kim): 56px, the full width, stuck to the top; ivory with a light blur, a warm grey line and a soft
// shadow under it. Three columns: Home · New Pattern · Glossary · My Page in the middle (Cormorant 600, 15px) between
// two empty ones, so the menu sits exactly in the centre (no logo: Kim).
// Shown on the home (it slides down after Start, or is just there when you come back to it), My Page, the glossary,
// 도안 보기, 따라 뜨기 and over the raised book (Kim: always, once past the opening). Not during the opening, not on /ai, never on
// phones (the app has its own bars). Narrower than 1000px: tighter and 14px; narrower than 760px: ☰, an ivory panel.
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useBook } from "./Book/BookProvider";
import { useMobile } from "./mobile/useMobile";
import { useHomeState } from "@/lib/homeState";
import "./nav.css";

export function Nav() {
  const path = usePathname(), book = useBook(), m = useMobile(), router = useRouter(), hs = useHomeState();
  const [open, setOpen] = useState(false), box = useRef<HTMLDivElement>(null);
  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", off); document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", off); document.removeEventListener("keydown", key); };
  }, [open]);

  // the book raised from the home (Start, New Pattern) floats over it: the bar stays the home's (fixed on top)
  const atHome = path === "/" || book.fromOpening;
  // after the opening the NavBar is always there (Kim) - also while the book is up (it rises under it)
  if (m !== false || path === "/ai" || path.startsWith("/ai/") || (atHome && !hs.home)) return null;

  const mine = path === "/my" || path.startsWith("/my/") || path === "/mine" || path === "/library", gloss = path === "/glossary" || path.startsWith("/glossary/");
  const items: { label: string; on: boolean; go: () => void }[] = [
    // Home · My Page · Glossary · New Pattern (Kim)
    { label: "Home", on: atHome, go: () => router.push("/") },
    { label: "My Page", on: mine, go: () => router.push("/my") },
    { label: "Handbook", on: gloss, go: () => router.push("/glossary") },
    { label: "New Pattern", on: false, go: book.newPattern },
  ];
  const links = (cls: string) => items.map(it => (
    <button key={it.label} type="button" className={cls + (it.on ? " is-on" : "")} aria-current={it.on ? "page" : undefined}
      onClick={() => { setOpen(false); it.go(); }}>{it.label}</button>
  ));
  return (
    <nav className={"ynav" + (atHome ? " is-home" : "") + (atHome && !hs.instant ? " is-arriving" : "")} aria-label="주 메뉴">
      {/* no logo (Kim): an empty left column, as the right one, keeps the menu in the centre */}
      <span className="ynav-left" aria-hidden="true" />
      <div className="ynav-mid" ref={box}>
        <div className="ynav-links" lang="en">{links("ynav-link")}</div>
        <button type="button" className="ynav-burger" aria-label="메뉴" aria-expanded={open} onClick={() => setOpen(o => !o)}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        </button>
        {open && <div className="ynav-panel" lang="en">{links("ynav-plink")}</div>}
      </div>
      <span className="ynav-right" aria-hidden="true" />
    </nav>
  );
}
