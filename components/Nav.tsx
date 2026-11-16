"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Nav() {
  const path = usePathname();
  const cur = (href: string) => (path === href ? "page" : undefined);
  // home: no nav bar over the photo; 도안 만들기 / 내 작품 live on the open book's page instead
  if (path === "/") return null;
  return (
    <nav className="nav" aria-label="주 메뉴">
      <Link className="brand brand-logo" href="/" aria-label="Yarnity 홈">
        {/* the home wordmark (dark brown) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/pic/logo-mark.svg" alt="" width={1170} height={579} />
      </Link>
      <div className="nav-links">
        <Link className="l" href="/new" aria-current={cur("/new")}>도안 만들기</Link>
        <Link className="l hide-sm" href="/mine" aria-current={cur("/mine")}>내 작품</Link>
      </div>
    </nav>
  );
}
