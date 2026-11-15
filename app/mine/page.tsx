"use client";
import Link from "next/link";
import { useApp } from "@/components/AppProvider";
import { plan, SHAPE_KO, YARN_KO } from "@/lib/pattern";

function Cards() {
  const { ready, projects, setActive } = useApp();
  if (!ready) return null;
  if (!projects.length) return <div className="empty"><span>아직 작품이 없어요.</span><Link className="btn btn-line" href="/new">첫 도안 만들기</Link></div>;
  return (
    <div className="cards">
      {projects.map(p => {
        const pp = plan(p), total = pp.rows.length, cur = p.current || 0;
        return (
          <Link key={p.id} className="pcard" href="/track" onClick={() => setActive(p.id)}>
            <span className="small muted">{`${SHAPE_KO[p.shape]} 바닥 · ${p.hook} · ${YARN_KO[p.weight]}`}</span>
            <h3>{p.name}</h3>
            <div className="bar"><i style={{ width: `${Math.round(cur / total * 100)}%` }} /></div>
            <span className="small muted">{cur >= total ? "완성" : `${cur} / ${total} · 다음 ${pp.rows[cur].label}`}</span>
          </Link>
        );
      })}
    </div>
  );
}

export default function MinePage() {
  return (
    <main id="view-mine">
      <div className="app-head"><h1>내 작품</h1><Link className="btn btn-primary" href="/new">새 도안</Link></div>
      <div id="mineList"><Cards /></div>
      <p className="small muted" style={{ marginTop: 16 }}>작품은 이 브라우저에만 저장돼요.</p>
    </main>
  );
}
