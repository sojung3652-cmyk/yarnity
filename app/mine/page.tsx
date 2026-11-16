"use client";
import Link from "next/link";
import { useApp } from "@/components/AppProvider";
import { ITEM, itemIdOf } from "@/lib/items";
import { CopyLot } from "@/components/YarnInfo";
import { plan } from "@/lib/pattern";
import { hookLabel, hookMmOf, yarnWeightText } from "@/lib/yarn";

function Cards() {
  const { ready, projects, setActive } = useApp();
  if (!ready) return null;
  if (!projects.length) return <div className="empty"><span>아직 작품이 없어요.</span><Link className="btn btn-line" href="/new">첫 도안 만들기</Link></div>;
  return (
    <div className="cards">
      {projects.map(p => {
        const pp = plan(p), total = pp.rows.length, cur = p.current || 0;
        return (
          <div key={p.id} className="pcard-wrap">
          <Link className="pcard" href="/track" onClick={() => setActive(p.id)}>
            <span className="small muted">{ITEM[itemIdOf(p)].name}</span>
            <h3>{p.name}</h3>
            <div className="bar"><i style={{ width: `${Math.round(cur / total * 100)}%` }} /></div>
            <span className="small muted">{cur >= total ? "완성" : `${cur} / ${total} · 다음 ${pp.rows[cur].label}`}</span>
          </Link>
          {/* edit: opens 도안 만들기 at step 3 with this work's values; saving overwrites it */}
          <Link className="pcard-edit" href={`/new?edit=${p.id}`}>고치기</Link>
          {/* 실 정보 (outside the card link so the copy button is its own control) */}
          <div className="pcard-yarn small muted">
            <span>{[p.yarn, p.materials?.join("·"), p.colorName ? p.colorName + (p.colorNo ? ` ${p.colorNo}` : "") : "", yarnWeightText(p), hookLabel(hookMmOf(p))].filter(Boolean).join(" · ")}</span>
            {p.lot && <span className="pcard-lot">LOT <b>{p.lot}</b><CopyLot lot={p.lot} /></span>}
          </div>
          </div>
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
