"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FoilLogo } from "./FoilLogo";
import { useBook, wizardInBook } from "./Book/BookProvider";

export function Nav() {
  const path = usePathname(), book = useBook();
  const cur = (href: string) => (path === href ? "page" : undefined);
  // no nav bar over the book: home (도안 만들기 / 내 작품 live on the open book's page) and 도안 만들기
  // inside the same 3D book (it takes the whole screen; a click outside the book closes it, as at home)
  if (path === "/" || (path === "/new" && wizardInBook(book))) return null;
  return (
    <nav className="nav" aria-label="주 메뉴">
      {/* the wordmark in the middle, in gold foil like the home hero */}
      <Link className="brand brand-logo" href="/" aria-label="Yarnity 홈"><FoilLogo className="nav-foil" /></Link>
      <div className="nav-links">
        {/* 새 도안: the menu book opens right here, over this page; closing it leaves you on the page */}
        <button type="button" className="l nav-btn" aria-haspopup="dialog" onClick={book.openHere}>새 도안</button>
        <Link className="l hide-sm" href="/mine" aria-current={cur("/mine")}>My Patterns</Link>
      </div>
    </nav>
  );
}
