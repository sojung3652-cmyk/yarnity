"use client";
// My Page (web only, Kim): the profile and a plain menu on the left - sticky under the NavBar, no box - and one of
// four screens on the right: 나의 도안집 (/my, the latest work on the hook on top), 갤러리 (/my/gallery), 위시
// 보관함 (/my/wish), 나의 프로필 (/my/profile). Below 1000px the left goes on top as a row of tabs. Phones (Kim): the
// app's 마이페이지 - the top bar, the avatar and name on top, the four as tabs, the screen below; its 나의 도안집 is
// the app's own shelf (MobileMine, without its bar).
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useApp } from "@/components/AppProvider";
import { useMobile } from "@/components/mobile/useMobile";
import { GoldDefs } from "@/components/BookCover";
import { photoById } from "@/lib/photos";
import { useProfile } from "@/lib/profile";
import { statusOf } from "@/lib/status";
import { useWishes } from "@/lib/wish";
import { useImported } from "@/lib/imported";
import { MobileTopBar } from "@/components/mobile/MobileTopBar";
import "./myPage.css";
import "./myPageMobile.css";

// no 진행 중 screen (Kim): 나의 도안집 is the first one, with the latest work on the hook on top of it
export const MY_MENU = [
  { href: "/my", label: "나의 도안집", short: "나의 도안집" },
  { href: "/my/gallery", label: "갤러리", short: "갤러리" },
  { href: "/my/wish", label: "위시 보관함", short: "위시" },
  { href: "/my/profile", label: "나의 프로필", short: "프로필" },
] as const;

/** a picture kept in IndexedDB, as an object URL while it is shown */
export function usePhotoUrl(id?: string) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!id) { setUrl(null); return; }
    let u: string | null = null, live = true;
    photoById(id).then(p => { if (live && p) { u = URL.createObjectURL(p.blob); setUrl(u); } }).catch(() => {});
    return () => { live = false; if (u) URL.revokeObjectURL(u); };
  }, [id]);
  return url;
}

/** the avatar (Kim): the ivory lace oval with a ribbon - no picture: linen with the gold embroidered bird inside;
 *  a picture: the photo in the oval (it shows through the frame's window). Both are 1 : 1.31, the same size. */
export function Avatar({ size }: { size: number }) {
  const prof = useProfile(), url = usePhotoUrl(prof.avatar);
  return (
    <span className={"my-avatar" + (url ? " has-photo" : "")} style={{ width: size, height: Math.round(size * 1345 / 1026) }} aria-hidden="true">
      {/* eslint-disable @next/next/no-img-element */}
      {url
        ? <><img className="my-avatar-pic" src={url} alt="" /><img className="my-avatar-frame" src="/brand/avatar_lace.webp" alt="" /></>
        : <img className="my-avatar-bird" src="/brand/avatar_bird.webp" alt="" />}
      {/* eslint-enable @next/next/no-img-element */}
    </span>
  );
}

/** a screen's head: its title and one line, its main button(s) at the right end */
export function MyHead({ title, line, children }: { title: string; line?: ReactNode; children?: ReactNode }) {
  return (
    <header className="my-head">
      <div><h1 className="my-title">{title}</h1>{line && <p className="my-line">{line}</p>}</div>
      {children && <div className="my-head-end">{children}</div>}
    </header>
  );
}

export function MyLayout({ children }: { children: ReactNode }) {
  const m = useMobile(), router = useRouter(), path = usePathname();
  const { projects } = useApp(), prof = useProfile(), wishes = useWishes(), imp = useImported();
  const counts = useMemo(() => {
    const st = projects.map(statusOf);
    // 나의 도안집 counts the 가져온 도안 too; 갤러리 the finished ones of both
    return [projects.length + imp.list.length, st.filter(s => s === "done").length + imp.list.filter(p => p.status === "done").length, wishes.length, null] as (number | null)[];
  }, [projects, wishes, imp.list]);
  const sub = prof.craft; // what the user mostly knits (Kim: no 경력)
  if (m === null || m === undefined) return <main id="view-my" />;
  if (m) return (
    <main className={"my my-m mf" + (path === "/my/profile" ? " is-profile" : "")} id="view-my">
      <GoldDefs />
      <MobileTopBar back={() => router.push("/")} center={<h1 className="mm-head-title"><span className="title-tag">마이페이지</span></h1>} />
      <Link href="/my/profile" className="my-m-me" aria-label="나의 프로필로">
        <Avatar size={64} />
        <span><b className={prof.nickname ? "" : "is-empty"}>{prof.nickname || "닉네임을 정해 주세요"}</b>{sub && <small>{sub}</small>}</span>
      </Link>
      <nav className="my-m-tabs" aria-label="마이페이지">
        {MY_MENU.map(it => {
          const on = path === it.href;
          return <Link key={it.href} href={it.href} replace className={on ? "is-on" : ""} aria-current={on ? "page" : undefined}>{it.short}</Link>;
        })}
      </nav>
      <div className="my-m-body">{children}</div>
    </main>
  );
  return (
    <main className="my" id="view-my">
      <GoldDefs />
      <div className="my-bg" aria-hidden="true" />
      <div className="my-grid">
        <aside className="my-left">
          <Link href="/my/profile" className="my-me" aria-label="나의 프로필로">
            <Avatar size={96} />
            <b className={prof.nickname ? "" : "is-empty"}>{prof.nickname || "닉네임을 정해 주세요"}</b>
            {sub && <small>{sub}</small>}
          </Link>
          <nav className="my-menu" aria-label="My Page">
            {MY_MENU.map((it, i) => {
              const on = path === it.href;
              return (
                <Link key={it.href} href={it.href} className={"my-mi" + (on ? " is-on" : "")} aria-current={on ? "page" : undefined}>
                  <span>{it.label}</span>{counts[i] !== null && <em>{counts[i]}</em>}
                </Link>
              );
            })}
          </nav>
        </aside>
        <div className="my-right">{children}</div>
      </div>
    </main>
  );
}
