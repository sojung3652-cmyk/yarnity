"use client";
// 도안 on phones, as the book's right page: the title, four facts (실 / 바늘 / 실 양 / 한 코), then the rows
// section by section, scrolling inside the page with a soft fade at its foot; ← 도안집 and 뜨기 시작 → stay
// at the foot. The same numbers as the web's pattern sheet (app/pattern/page.tsx): plan + withChains, the
// same grouping of identical rows, yarnUse, hookLabel, the gauge.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useApp } from "@/components/AppProvider";
import { ITEM, itemIdOf } from "@/lib/items";
import { fmt, PART_KO, plan, SHAPE_KO, withChains, type Row } from "@/lib/pattern";
import { hookLabel, hookMmOf, yarnWeightText } from "@/lib/yarn";
import { yarnUse } from "@/lib/yarnUse";

export function MobilePatternPage() {
  const { ready, active: p } = useApp(), router = useRouter();
  useEffect(() => { if (ready && !p) router.replace("/new"); }, [ready, p, router]);
  if (!ready || !p) return null;

  const pp = withChains(plan(p)), it = ITEM[itemIdOf(p)];
  // the rows in sections by part; runs of identical rows read as one line ("26–50단"), as on the web sheet
  const sections: { part: Row["part"]; rows: { label: string; r: Row }[] }[] = [];
  for (let i = 0; i < pp.rows.length; i++) {
    const r = pp.rows[i];
    if (!sections.length || sections[sections.length - 1].part !== r.part) sections.push({ part: r.part, rows: [] });
    let label = r.label, j = i;
    if (r.part === "body" || r.part === "rows" || r.part === "rounds") {
      while (j + 1 < pp.rows.length && pp.rows[j + 1].part === r.part && pp.rows[j + 1].how === r.how) j++;
      if (j > i) label = `${r.label.replace("단", "")}–${pp.rows[j].label}`;
    }
    sections[sections.length - 1].rows.push({ label, r });
    i = j;
  }
  const size = p.object === "rows" ? `폭 ${p.a} × 길이 ${p.b}cm` : p.object === "tube" ? `둘레 ${p.a} · ${it.id === "headband" ? "폭" : "높이"} ${p.h}cm`
    : `${SHAPE_KO[p.shape]} ${p.shape === "circle" ? `지름 ${p.a}cm` : `${p.a} × ${p.b}cm`}${p.object === "bag" ? ` · 높이 ${p.h}cm` : ""}`;
  const colors = [{ hex: p.color, name: p.colorName }, ...(p.moreColors ?? [])].filter(c => c.hex || c.name);
  const use = yarnUse(pp, { weight: p.weight, yarnMm: p.yarnMm, yarnMode: p.yarnMode, skeinG: p.skeinG, skeinM: p.skeinM, colors: Math.max(1, colors.length), materials: p.materials });
  const go = p.current > 0 ? (p.current >= pp.rows.length ? "뜨기 기록 보기" : `이어서 뜨기 · ${pp.rows[p.current].label}`) : "뜨기 시작";

  return (
    <div className="mpp">
      <header className="mpp-head">
        <p className="mpp-kicker" lang="en" aria-hidden="true">Crochet pattern</p>
        <h1>{p.name}</h1>
        <p className="mpp-sub">{it.name} · {size}</p>
      </header>
      <dl className="mpp-facts">
        <div><dt>실</dt><dd>{yarnWeightText(p)}{colors.length > 0 && <span className="mpp-colors">{colors.map((c, i) => <i key={i} style={{ background: c.hex || "#EFE7DA" }} title={c.name} />)}</span>}</dd></div>
        <div><dt>바늘</dt><dd>{hookLabel(hookMmOf(p))}</dd></div>
        <div><dt>실 양</dt><dd><b>약 {use.g}g</b></dd></div>
        <div><dt>한 코</dt><dd><b>{fmt(pp.g.h * 10)}</b>mm</dd></div>
      </dl>
      <section className="mpp-rows" aria-label="단별 도안">
        {sections.map((s, k) => (
          <div key={k} className="mpp-part">
            <h2><span>{String(k + 1).padStart(2, "0")}</span>{PART_KO[s.part]}</h2>
            <ol>
              {s.rows.map(({ label, r }) => (
                <li key={r.idx}>
                  <span className="mpp-no">{label}</span>
                  <span className="mpp-how">{r.how}{r.why && <small>{r.why}</small>}</span>
                  <span className="mpp-n"><b>{r.n}</b>코</span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </section>
      <div className="mbz-foot mpp-foot">
        <Link className="mbz-btn" href="/library"><span className="mbz-face">← 도안집</span></Link>
        <Link className="mbz-btn mbz-next" href="/track"><span className="mbz-face">{go} →</span></Link>
      </div>
    </div>
  );
}
