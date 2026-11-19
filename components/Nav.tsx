"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FoilLogo } from "./FoilLogo";
import { useBook, wizardInBook } from "./Book/BookProvider";
import { useMobile } from "./mobile/useMobile";

export function Nav() {
  const path = usePathname(), book = useBook(), m = useMobile();
  const cur = (href: string) => (path === href ? "page" : undefined);
  // no nav bar over the book: home (도안 만들기 / 내 작품 live on the open book's page) and 도안 만들기
  // inside the same 3D book (it takes the whole screen; a click outside the book closes it, as at home)
  if (m || path === "/" || (path === "/new" && wizardInBook(book))) return null;
  return (
    <nav className="nav" aria-label="주 메뉴">
      {/* the wordmark in the middle, in gold foil like the home hero */}
      <Link className="brand brand-logo" href="/" aria-label="Yarnity 홈"><FoilLogo className="nav-foil" /></Link>
      <div className="nav-links">
        {/* 새 도안: the menu book rises over this page; closing it leaves you on the page. Both as woven labels */}
        <button type="button" className="nav-label nav-label-new" aria-haspopup="dialog" onClick={book.openHere}><span>새 도안</span></button>
        <Link className="nav-label" href="/mine" aria-current={cur("/mine")}><span>나의 도안집</span></Link>
      </div>
    </nav>
  );
}
