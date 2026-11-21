"use client";
// My Page (web, Kim): on the starry linen under an ivory veil, two columns. Left: 지금 뜨는 중 - up to two works on the
// hook as cards (the latest first; a card opens its 따라 뜨기) - then 나의 도안집, the shelves that were /mine (tabs with
// counts, sort, covers; a cover opens its details as before). Right: AI와 나눈 대화 (the last three, 전체 -> the AI's
// list), 기록 (finished works, rows knitted so far, patterns), and a small note on where things are kept.
// Below 1000px the right column goes under the left one.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useApp } from "@/components/AppProvider";
import { useBook } from "@/components/Book/BookProvider";
import { BookCover, GoldDefs, whereOf } from "@/components/BookCover";
import { MineList } from "@/components/mine/MineList";
import { useChats } from "@/components/ai/useChats";
import { statusOf } from "@/lib/status";
import { plan, PART_KO } from "@/lib/pattern";
import type { Project } from "@/lib/types";
import "./myPage.css";

/** "어제 저녁 9:40에 멈춤" */
function stoppedAt(ms: number) {
  const d = new Date(ms), now = new Date(), day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(now) - day(d)) / 864e5), h = d.getHours(), m = String(d.getMinutes()).padStart(2, "0");
  const part = h < 6 ? "새벽" : h < 12 ? "오전" : h < 18 ? "오후" : "저녁", h12 = h % 12 || 12;
  const when = diff === 0 ? "오늘" : diff === 1 ? "어제" : `${d.getMonth() + 1}월 ${d.getDate()}일`;
  return `${when} ${part} ${h12}:${m}에 멈춤`;
}
const dateOf = (ms: number) => { const d = new Date(ms); return `${d.getMonth() + 1}월 ${d.getDate()}일`; };

function KnitCard({ p }: { p: Project }) {
  const { setActive } = useApp(), router = useRouter();
  const w = whereOf(p), pp = plan(p), nx = pp.rows[w.cur], prev = pp.rows[w.cur - 1];
  const line = `${prev ? PART_KO[prev.part] + " · " : ""}${w.cur} / ${w.total}단${nx ? ` · 다음 ${nx.label}` : ""}`;
  return (
    <button type="button" className="my-card my-knit" onClick={() => { setActive(p.id); router.push("/track"); }}>
      <span className="my-knit-cover"><BookCover p={p} w={76} /></span>
      <span className="my-knit-text">
        <span className="my-chip is-knitting">뜨는 중</span>
        <b>{p.name}</b>
        <small>{line}</small>
        <span className="my-bar"><i style={{ width: `${Math.round(w.pct * 100)}%` }} /></span>
        <span className="my-knit-foot"><span>{stoppedAt(p.updatedAt ?? p.created)}</span><em>이어서 뜨기 →</em></span>
      </span>
    </button>
  );
}

export function MyPage() {
  const { ready, projects } = useApp(), book = useBook(), chats = useChats();
  // development only: ?noknit shows the page as if nothing were on the hook (screenshots)
  const noKnit = process.env.NODE_ENV !== "production" && typeof location !== "undefined" && location.search.includes("noknit");
  const knitting = useMemo(() => noKnit ? [] : projects.filter(p => statusOf(p) === "knitting" && (p.current || 0) > 0)
    .sort((a, b) => (b.updatedAt ?? b.created) - (a.updatedAt ?? a.created)).slice(0, 2), [projects, noKnit]);
  const recent = useMemo(() => chats.filter(c => !c.archived).sort((a, b) => b.updated - a.updated).slice(0, 3), [chats]);
  const stats = useMemo(() => ({
    done: projects.filter(p => statusOf(p) === "done").length,
    rows: projects.reduce((a, p) => a + (p.current || 0), 0),
    patterns: projects.length,
  }), [projects]);

  return (
    <main className="my" id="view-my">
      <GoldDefs />
      <div className="my-bg" aria-hidden="true" />
      <div className="my-grid">
        <div className="my-left">
          <section aria-labelledby="myKnit">
            <h2 className="my-h" id="myKnit">지금 뜨는 중</h2>
            {!ready ? null : knitting.length ? (
              <div className="my-knits">{knitting.map(p => <KnitCard key={p.id} p={p} />)}</div>
            ) : (
              <p className="my-card my-none">아직 뜨고 있는 작품이 없어요 · <button type="button" className="my-link" onClick={book.newPattern}>New Pattern</button></p>
            )}
          </section>
          <section className="my-shelf" aria-labelledby="myShelf">
            <h2 className="my-h" id="myShelf">나의 도안집</h2>
            <div className="mine"><MineList /></div>
          </section>
        </div>
        <aside className="my-right">
          <section className="my-card my-side" aria-labelledby="myAi">
            <div className="my-side-head">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <span className="my-ai-badge" aria-hidden="true"><img src="/brand/ai_badge.webp" alt="" /></span>
              <h2 className="my-h my-h-sm" id="myAi">Yarni와 나눈 대화</h2>
              <Link className="my-all" href="/ai">전체 →</Link>
            </div>
            {recent.length ? (
              <ul className="my-chats">
                {recent.map(c => <li key={c.id}><Link href="/ai"><span>{c.title}</span><small>{dateOf(c.updated)}</small></Link></li>)}
              </ul>
            ) : <p className="my-quiet">아직 나눈 대화가 없어요</p>}
          </section>
          <section className="my-card my-side" aria-labelledby="myRec">
            <h2 className="my-h my-h-sm" id="myRec">기록</h2>
            <dl className="my-stats">
              <div><dt>완성 작품</dt><dd>{stats.done}<small>개</small></dd></div>
              <div><dt>지금까지 뜬 단</dt><dd>{stats.rows}<small>단</small></dd></div>
              <div><dt>도안</dt><dd>{stats.patterns}<small>권</small></dd></div>
            </dl>
          </section>
          {/* no backup yet: the note alone (Kim) */}
          <p className="my-note">작품과 사진은 이 브라우저에만 저장돼요.</p>
        </aside>
      </div>
    </main>
  );
}
