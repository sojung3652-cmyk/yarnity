"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SparkleLogo } from "@/components/SparkleLogo";
import { useBook, wizardInBook } from "./Book/BookProvider";
import { useMobile } from "./mobile/useMobile";
import { GlossButton } from "./glossary/GlossaryFloat";

export function Nav() {
  const path = usePathname(), book = useBook(), m = useMobile(), router = useRouter();
  const cur = (href: string) => (path === href ? "page" : undefined);
  // no nav bar over the book: home (도안 만들기 / 내 작품 live on the open book's page) and 도안 만들기
  // inside the same 3D book (it takes the whole screen; a click outside the book closes it, as at home)
  // nor over /ai: the chat takes the whole window there (its list has the way out)
  if (m || path === "/" || path === "/ai" || (path === "/new" && wizardInBook(book))) return null;
  // 나의 도안집 (Kim): its My Patterns title where the wordmark is (a tap reloads the page), and 홈 · 새 도안
  // in place of the label that would point to the page you are on
  const mine = path === "/mine";
  return (
    <nav className={"nav" + (mine ? " is-mine" : "")} aria-label="주 메뉴">
      {/* the wordmark in the middle, in gold foil like the home hero (나의 도안집 writes its own title under it,
          as the glossary does: Kim) */}
      <Link className="brand brand-logo" href="/" aria-label="Yarnity 홈"><SparkleLogo className="nav-foil" /></Link>
      <div className="nav-links">
        {/* 도안 보기 / 따라 뜨기 (Kim): the glossary floats over the page, which stays where it was */}
        {(path === "/pattern" || path === "/track") && <GlossButton />}
        {/* 나의 도안집 (Kim): 홈 · 새 도안 · 용어집; elsewhere 새 도안 and 나의 도안집 */}
        {mine && <button type="button" className="nav-label nav-label-home" onClick={() => router.push("/")}><span>홈</span></button>}
        {/* 새 도안: the menu book rises over this page; closing it leaves you on the page. Both as woven labels */}
        <button type="button" className="nav-label nav-label-new" aria-haspopup="dialog" onClick={book.openHere}><span>새 도안</span></button>
        {mine && <Link className="nav-label nav-label-gloss" href="/glossary"><span>용어집</span></Link>}
        {!mine && <Link className="nav-label" href="/mine" aria-current={cur("/mine")}><span>나의 도안집</span></Link>}
      </div>
    </nav>
  );
}
