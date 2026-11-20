"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FoilLogo } from "./FoilLogo";
import { useBook, wizardInBook } from "./Book/BookProvider";
import { useMobile } from "./mobile/useMobile";

export function Nav() {
  const path = usePathname(), book = useBook(), m = useMobile(), router = useRouter();
  const [more, setMore] = useState(false), moreRef = useRef<HTMLDivElement>(null);
  const cur = (href: string) => (path === href ? "page" : undefined);
  useEffect(() => { setMore(false); }, [path]);
  useEffect(() => {
    if (!more) return;
    const out = (e: PointerEvent) => { if (!moreRef.current?.contains(e.target as Node)) setMore(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setMore(false); };
    addEventListener("pointerdown", out); addEventListener("keydown", esc);
    return () => { removeEventListener("pointerdown", out); removeEventListener("keydown", esc); };
  }, [more]);
  // no nav bar over the book: home (도안 만들기 / 내 작품 live on the open book's page) and 도안 만들기
  // inside the same 3D book (it takes the whole screen; a click outside the book closes it, as at home)
  if (m || path === "/" || (path === "/new" && wizardInBook(book))) return null;
  // 나의 도안집 (Kim): its My Patterns title where the wordmark is, and ··· (처음으로, 새 도안 만들기) in place
  // of the label that would point to the page you are on
  const mine = path === "/mine";
  return (
    <nav className={"nav" + (mine ? " is-mine" : "")} aria-label="주 메뉴">
      {mine
        ? <h1 className="brand nav-mine-title" lang="en"><img src="/pic/my-patterns.png" alt="My Patterns · 나의 도안집" width={900} height={366} /></h1>
        /* the wordmark in the middle, in gold foil like the home hero */
        : <Link className="brand brand-logo" href="/" aria-label="Yarnity 홈"><FoilLogo className="nav-foil" /></Link>}
      <div className="nav-links">
        {/* 새 도안: the menu book rises over this page; closing it leaves you on the page. Both as woven labels */}
        <button type="button" className="nav-label nav-label-new" aria-haspopup="dialog" onClick={book.openHere}><span>새 도안</span></button>
        {mine ? (
          <div className="nav-more" ref={moreRef}>
            <button type="button" className="nav-more-btn" aria-label="더 보기" aria-haspopup="menu" aria-expanded={more} onClick={() => setMore(o => !o)}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5.5" cy="12" r="1.6" fill="currentColor" /><circle cx="12" cy="12" r="1.6" fill="currentColor" /><circle cx="18.5" cy="12" r="1.6" fill="currentColor" /></svg>
            </button>
            {more && (
              <div className="nav-more-menu" role="menu">
                <button type="button" role="menuitem" onClick={() => { setMore(false); router.push("/"); }}>처음으로<span>홈 화면</span></button>
                <button type="button" role="menuitem" onClick={() => { setMore(false); book.openHere(); }}>새 도안 만들기</button>
              </div>
            )}
          </div>
        ) : <Link className="nav-label" href="/mine" aria-current={cur("/mine")}><span>나의 도안집</span></Link>}
      </div>
    </nav>
  );
}
