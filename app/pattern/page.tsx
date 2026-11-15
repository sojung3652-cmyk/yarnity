"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect } from "react";
import { useApp } from "@/components/AppProvider";
import { drawing } from "@/lib/drawing";
import { fmt, HOOK_MM, PART_KO, plan, SHAPE_KO, YARN_KO } from "@/lib/pattern";

export default function PatternPage() {
  const { ready, active: p } = useApp();
  const router = useRouter();
  useEffect(() => { if (ready && !p) router.replace("/new"); }, [ready, p, router]);
  if (!ready || !p) return <main id="view-pattern" />;

  const pp = plan(p);
  const blocks: React.ReactNode[] = [];
  let lastPart: string | null = null;
  for (let i = 0; i < pp.rows.length; i++) {
    const r = pp.rows[i];
    if (r.part !== lastPart) {
      const cnt = pp.rows.filter(x => x.part === r.part).length;
      blocks.push(<div key={"t" + i} className="part-title"><h3>{PART_KO[r.part]}</h3><span className="small muted">{r.part === "handle" ? cnt + "개" : cnt + "단"}</span></div>);
      lastPart = r.part;
    }
    let label = r.label, j = i;
    if (r.part === "body") { while (j + 1 < pp.rows.length && pp.rows[j + 1].part === "body") j++; if (j > i) label = `${r.label.replace("단", "")}–${pp.rows[j].label}`; }
    blocks.push(
      <Fragment key={"r" + i}>
        <div className="row"><span className="no">{label}</span><span className="how">{r.how}<span className="why">{r.why}</span></span><span className="cnt">{r.n + "코"}</span></div>
        {r.part === "bottom" && r.no === 3 && <p className="note">여기서 한 번 재면 남은 단을 다시 계산해요.</p>}
      </Fragment>
    );
    i = j;
  }
  const size = p.shape === "circle" ? `지름 ${p.a}cm` : `${p.a} × ${p.b}cm`;
  const stats: [string, string][] = [["작품", p.object === "bag" ? "미니 손가방" : "미니 코스터"], ["바닥", `${SHAPE_KO[p.shape]} · ${size}`], ...(p.object === "bag" ? [["몸통 높이", p.h + "cm"] as [string, string]] : []), ["실", `${p.yarn || "실"} · ${YARN_KO[p.weight]}`], ["코바늘", `${p.hook} · ${HOOK_MM[p.hook]}mm`], ["코 크기", `${fmt(pp.g.h * 10)}mm · ${pp.g.measured ? "실측" : "예상"}`]];

  return (
    <main id="view-pattern">
      <div className="app-head">
        <div><div className="steps"><span>준비물과 모양</span><span className="on">도안</span><span>따라 뜨기</span></div><h1 id="patTitle">{p.name}</h1></div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Link className="btn btn-line" href="/new">고치기</Link><Link className="btn btn-primary" id="startBtn" href="/track">뜨기 시작</Link></div>
      </div>
      <div className="grid-pattern">
        <aside style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          {/* drawing() only interpolates numbers and fixed labels */}
          <div className="card drawing" id="drawing" aria-label="완성 모양 도면" dangerouslySetInnerHTML={{ __html: drawing(p, pp) }} />
          <div className="card" id="patStats" style={{ gap: 0 }}>
            {stats.map(([k, v]) => <div key={k} className="stat"><span>{k}</span><b style={{ fontWeight: 400 }}>{v}</b></div>)}
          </div>
        </aside>
        <div className="card" style={{ gap: 0 }}><div id="patRows">{blocks}</div></div>
      </div>
    </main>
  );
}
