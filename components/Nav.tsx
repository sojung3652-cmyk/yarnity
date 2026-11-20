"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FoilLogo } from "./FoilLogo";
import { useBook, wizardInBook } from "./Book/BookProvider";
import { useMobile } from "./mobile/useMobile";

export function Nav() {
  const path = usePathname(), book = useBook(), m = useMobile(), router = useRouter();
  const cur = (href: string) => (path === href ? "page" : undefined);
  // no nav bar over the book: home (도안 만들기 / 내 작품 live on the open book's page) and 도안 만들기
  // inside the same 3D book (it takes the whole screen; a click outside the book closes it, as at home)
  if (m || path === "/" || (path === "/new" && wizardInBook(book))) return null;
  // 나의 도안집 (Kim): its My Patterns title where the wordmark is (a tap reloads the page), and 홈 · 새 도안
  // in place of the label that would point to the page you are on
  const mine = path === "/mine";
  return (
    <nav className={"nav" + (mine ? " is-mine" : "")} aria-label="주 메뉴">
      {mine
        // the title reloads the page (Kim)
        ? <h1 className="brand nav-mine-title" lang="en"><a href="/mine" aria-label="My Patterns · 나의 도안집 (새로고침)" onClick={e => { e.preventDefault(); location.reload(); }}>
            {/* in gold foil (Kim): the wordmark's shape as a mask over the foil gradient, with a slow shine */}
            <span className="nav-mine-foil" aria-hidden="true"><i /></span>
          </a></h1>
        /* the wordmark in the middle, in gold foil like the home hero */
        : <Link className="brand brand-logo" href="/" aria-label="Yarnity 홈"><FoilLogo className="nav-foil" /></Link>}
      <div className="nav-links">
        {/* 나의 도안집 (Kim): 홈 and 새 도안 as two labels; elsewhere 새 도안 and 나의 도안집 */}
        {mine && <button type="button" className="nav-label nav-label-home" onClick={() => router.push("/")}><span>홈</span></button>}
        {/* 새 도안: the menu book rises over this page; closing it leaves you on the page. Both as woven labels */}
        <button type="button" className="nav-label nav-label-new" aria-haspopup="dialog" onClick={book.openHere}><span>새 도안</span></button>
        {!mine && <Link className="nav-label" href="/mine" aria-current={cur("/mine")}><span>나의 도안집</span></Link>}
      </div>
    </nav>
  );
}
