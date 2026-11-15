"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { store } from "@/lib/store";

export const THEME_EVENT = "yarnity:theme";

export function Nav() {
  const path = usePathname();
  const cur = (href: string) => (path === href ? "page" : undefined);
  const toggleTheme = () => {
    const el = document.documentElement;
    const now = el.getAttribute("data-theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = now === "dark" ? "light" : "dark";
    el.setAttribute("data-theme", next); store.set("iyarn.theme", next);
    window.dispatchEvent(new Event(THEME_EVENT)); // canvases read CSS colours, so they redraw
  };
  return (
    <nav className="nav" aria-label="주 메뉴">
      <Link className="brand" href="/" aria-label="Yarnity 홈">Yarnity.</Link>
      <div className="nav-links">
        <Link className="l" href="/new" aria-current={cur("/new")}>도안 만들기</Link>
        <Link className="l hide-sm" href="/mine" aria-current={cur("/mine")}>내 작품</Link>
        <button className="theme-btn" id="themeBtn" type="button" aria-label="밝게·어둡게 바꾸기" onClick={toggleTheme}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></svg>
        </button>
      </div>
    </nav>
  );
}
