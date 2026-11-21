"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SparkleLogo } from "@/components/SparkleLogo";
import { useBook, wizardInBook } from "./Book/BookProvider";
import { useMobile } from "./mobile/useMobile";
import { openGloss } from "./glossary/glossFloat";
import { useEffect, useRef, useState } from "react";

export function Nav() {
  const path = usePathname(), book = useBook(), m = useMobile(), router = useRouter();
  // no nav bar over the book: home (도안 만들기 / 내 작품 live on the open book's page) and 도안 만들기
  // inside the same 3D book (it takes the whole screen; a click outside the book closes it, as at home)
  // nor over /ai: the chat takes the whole window there (its list has the way out)
  if (m || path === "/" || path === "/ai" || (path === "/new" && wizardInBook(book))) return null;
  // 나의 도안집 (Kim): its My Patterns title where the wordmark is (a tap reloads the page), and 홈 · 새 도안
  // in place of the label that would point to the page you are on
  const mine = path === "/mine", gloss = path === "/glossary" || path.startsWith("/glossary/");
  // their name on an ivory cloth label (Kim: no wordmark pictures)
  const mark = mine ? { label: "나의 도안집", alt: "나의 도안집" } : gloss ? { label: "뜨개 용어집", alt: "뜨개 용어집" } : null;
  // 완성 도안 and 따라 뜨기 (Kim): no wordmark and no labels - 홈, 새 도안, 나의 도안집 and 용어집 are in ···
  if (path === "/pattern" || path === "/track") return <nav className="nav is-sheet" aria-label="주 메뉴"><NavMore onNew={book.openHere} floatGloss /></nav>;
  return (
    <nav className={"nav" + (mine ? " is-mine" : "") + (mark ? " has-page-mark" : "")} aria-label="주 메뉴">
      {/* the wordmark in the middle, in gold foil like the home hero (나의 도안집 writes its own title under it,
          as the glossary does: Kim) */}
      {/* 나의 도안집 and the glossary (Kim, a try): the page's own wordmark takes the middle in place of Yarnity
          (the page's title under it is then hidden on wide screens, globals.css .nav-page-mark) */}
      {/* the page's wordmark reloads the page (Kim); Yarnity goes home */}
      {mark ? (
        <a className="brand brand-logo" href={path} aria-label={`${mark.alt} 새로고침`} onClick={e => { e.preventDefault(); location.reload(); }}>
          <span className="title-tag">{mark.label}</span>
        </a>
      ) : <Link className="brand brand-logo" href="/" aria-label="Yarnity 홈"><SparkleLogo className="nav-foil" /></Link>}
      {/* every way out is in ··· (Kim: no row of labels) */}
      <div className="nav-links"><NavMore onNew={book.openHere} /></div>
    </nav>
  );
}

/** the ··· of 완성 도안 / 따라 뜨기 on wide screens: a small paper menu under it */
function NavMore({ onNew, floatGloss = false }: { onNew: () => void; floatGloss?: boolean }) {
  const router = useRouter(), path = usePathname(), [open, setOpen] = useState(false), box = useRef<HTMLDivElement>(null);
  const inGloss = path === "/glossary" || path.startsWith("/glossary/");
  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", off); document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", off); document.removeEventListener("keydown", key); };
  }, [open]);
  const go = (f: () => void) => () => { setOpen(false); f(); };
  return (
    <div className="nav-more" ref={box}>
      <button type="button" className="nav-more-btn" aria-label="더 보기" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5.5" cy="12" r="1.6" fill="currentColor" /><circle cx="12" cy="12" r="1.6" fill="currentColor" /><circle cx="18.5" cy="12" r="1.6" fill="currentColor" /></svg>
      </button>
      {open && (
        <div className="nav-more-menu" role="menu">
          <button type="button" role="menuitem" onClick={go(() => router.push("/"))}>홈</button>
          <button type="button" role="menuitem" onClick={go(onNew)}>새 도안</button>
          {path !== "/mine" && <button type="button" role="menuitem" onClick={go(() => router.push("/mine"))}>나의 도안집</button>}
          {/* 도안 보기 / 따라 뜨기: the glossary floats over the page (it stays where it was); elsewhere its page */}
          {!inGloss && <button type="button" role="menuitem" onClick={go(floatGloss ? openGloss : () => router.push("/glossary"))}>뜨개 용어집</button>}
        </div>
      )}
    </div>
  );
}
