"use client";
// My Page (web only, Kim): the profile and a plain menu on the left - sticky under the NavBar, no box - and one of
// four screens on the right: 나의 도안집 (/my, the latest work on the hook on top), 나의 기록 (/my/records), 위시
// 보관함 (/my/wish), 나의 프로필 (/my/profile). Below 1000px the left goes on top as a row of tabs. Phones keep their own
// 나의 도안집 (/mine): every /my address sends them there.
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
import "./myPage.css";

// no 진행 중 screen (Kim): 나의 도안집 is the first one, with the latest work on the hook on top of it
export const MY_MENU = [
  { href: "/my", label: "나의 도안집" },
  { href: "/my/records", label: "나의 기록" },
  { href: "/my/wish", label: "위시 보관함" },
  { href: "/my/profile", label: "나의 프로필" },
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

/** the avatar (Kim): no picture - the ivory patch with the gold embroidered bird; a picture - set in the stitched
 *  ivory frame with the little stars at its corners (the photo shows through the frame's window) */
export function Avatar({ size }: { size: number }) {
  const prof = useProfile(), url = usePhotoUrl(prof.avatar);
  return (
    <span className={"my-avatar" + (url ? " has-photo" : "")} style={{ width: size, height: size }} aria-hidden="true">
      {/* eslint-disable @next/next/no-img-element */}
      {url
        ? <><img className="my-avatar-pic" src={url} alt="" /><img className="my-avatar-frame" src="/brand/avatar_frame.webp" alt="" /></>
        : <img className="my-avatar-bird" src="/brand/avatar_bird.webp" alt="" />}
      {/* eslint-enable @next/next/no-img-element */}
    </span>
  );
}

/** a screen's head: its title and one line, its main button(s) at the right end */
export function MyHead({ title, line, children }: { title: string; line: ReactNode; children?: ReactNode }) {
  return (
    <header className="my-head">
      <div><h1 className="my-title">{title}</h1><p className="my-line">{line}</p></div>
      {children && <div className="my-head-end">{children}</div>}
    </header>
  );
}

export function MyLayout({ children }: { children: ReactNode }) {
  const m = useMobile(), router = useRouter(), path = usePathname();
  const { projects } = useApp(), prof = useProfile(), wishes = useWishes();
  useEffect(() => { if (m) router.replace("/mine"); }, [m, router]);
  const counts = useMemo(() => {
    const st = projects.map(statusOf);
    return [projects.length, st.filter(s => s === "done").length, wishes.length, null] as (number | null)[];
  }, [projects, wishes]);
  if (m !== false) return <main id="view-my" />;
  const sub = prof.craft; // what the user mostly knits (Kim: no 경력)
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
