"use client";
import { useMobile } from "@/components/mobile/useMobile";
import { MobilePatternScreen } from "@/components/mobile/MobilePatternScreen";
// 도안: the pattern as a printed pattern sheet (Kim's pick: "인쇄된 도안지", like it was drafted on paper).
// One sheet of paper on the desk: a header (the work's name, what it is, its size), three boxes - the
// finished shape drawn on graph paper, the supplies with the yarn amount, the gauge - then the rows in
// numbered sections (01 바닥, 02 몸통...) as a ruled table, with notes in the margin where to measure.
// The buttons (고치기 / 인쇄 / 뜨기 시작) sit above the sheet; printing shows the sheet alone (pattern.css).
import { useRouter } from "next/navigation";
import { DiaryIcon, LaceButton, StitchButton } from "@/components/diary/Diary";
import { Fragment, useEffect, useState } from "react";
import { CoverPicker } from "@/components/diary/CoverPicker";
import { useApp } from "@/components/AppProvider";
import { useBook } from "@/components/Book/BookProvider";
import { CopyLot } from "@/components/YarnInfo";
import { drawing } from "@/lib/drawing";
import { ITEM, itemIdOf } from "@/lib/items";
import { fmt, PART_KO, plan, SHAPE_KO, withChains, type Row } from "@/lib/pattern";
import { hookLabel, hookMmOf, yarnWeightText } from "@/lib/yarn";
import { yarnUse } from "@/lib/yarnUse";
import "./pattern.css";

// phones: 완성 도안 as its own screen (components/mobile/MobilePatternScreen.tsx)
export default function PatternPage() {
  const m = useMobile();
  // nothing until the screen is known: the wide screen's PatternScreen must not take the phone's "just made"
  // signal (sessionStorage m.justMade: the links and the book covers) in the render before
  if (m === null) return <main id="view-pattern" />;
  if (m) return <MobilePatternScreen />;
  return <PatternScreen />;
}

export function PatternScreen() {
  const { ready, active: p, updateProject } = useApp();
  const book = useBook();
  const router = useRouter();
  useEffect(() => { if (ready && !p) router.replace("/new"); }, [ready, p, router]);
  // just made (NewBook save): the book covers, once, while the work has none
  const [picking, setPicking] = useState(false);
  useEffect(() => { try { if (sessionStorage.getItem("m.justMade")) { sessionStorage.removeItem("m.justMade"); setPicking(true); } } catch {} }, []);
  if (!ready || !p) return <main id="view-pattern" />;

  const pp = withChains(plan(p)), it = ITEM[itemIdOf(p)];
  const rounds = p.object === "coaster" || p.object === "bag";

  // the rows in sections by part; runs of identical rows read as one line ("26–50단")
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
  const count = (part: Row["part"]) => pp.rows.filter(x => x.part === part).length;

  const size = p.object === "rows" ? `폭 ${p.a} × 길이 ${p.b}cm` : p.object === "tube" ? `둘레 ${p.a} · ${it.id === "headband" ? "폭" : "높이"} ${p.h}cm`
    : `${SHAPE_KO[p.shape]} ${p.shape === "circle" ? `지름 ${p.a}cm` : `${p.a} × ${p.b}cm`}${p.object === "bag" ? ` · 높이 ${p.h}cm` : ""}`;
  const colors = [{ hex: p.color, name: p.colorName, no: p.colorNo, lot: p.lot }, ...(p.moreColors ?? [])].filter(c => c.hex || c.name);
  const mm = hookMmOf(p);
  const use = yarnUse(pp, { weight: p.weight, yarnMm: p.yarnMm, yarnMode: p.yarnMode, skeinG: p.skeinG, skeinM: p.skeinM, colors: Math.max(1, colors.length), materials: p.materials });
  const made = new Date(p.created).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });

  return (
    <main id="view-pattern" className="ps-main">
      {picking && !p.cover && <CoverPicker first p={p} onPick={id => { updateProject(p.id, { cover: id }); setPicking(false); }} onClose={() => setPicking(false)} />}
      <div className="ps-actions">
        <div className="steps"><span>준비물과 모양</span><span className="on">도안</span><span>따라 뜨기</span></div>
        <div className="ps-btns">
          {/* Girl's Diary (components/diary): two round cloth buttons and the lavender lace tag */}
          <StitchButton icon={DiaryIcon.pen} label="고치기" onClick={() => book.editHere(p.id)} />
          <StitchButton icon={DiaryIcon.print} label="인쇄" onClick={() => window.print()} />
          <LaceButton variant="lavender" width={260} id="startBtn" href="/track">{p.current > 0 ? (p.current >= pp.rows.length ? "뜨기 기록 보기 →" : `이어서 뜨기 · ${pp.rows[p.current].label} →`) : "뜨기 시작 →"}</LaceButton>
        </div>
      </div>

      <article className="ps-sheet" aria-labelledby="patTitle">
        {/* header: the maker's line, the name, what it is */}
        <header className="ps-head">
          <p className="ps-kicker" lang="en"><span>Yarnity</span><span>Crochet Pattern</span><span>{made}</span></p>
          <h1 id="patTitle">{p.name}</h1>
          <p className="ps-sub">{it.name} · {size}</p>
        </header>

        <section className="ps-boxes" aria-label="한눈에 보기">
          {/* the finished shape on graph paper (drawing() only interpolates numbers, fixed labels and hex colours) */}
          <div className="ps-box ps-shape">
            <h2 className="ps-box-title">완성 모양</h2>
            <div className="ps-grid drawing" id="drawing" aria-label="완성 모양 도면" dangerouslySetInnerHTML={{ __html: drawing(p, pp, p.color, p.moreColors?.map(c => c.hex)) }} />
          </div>
          <div className="ps-box">
            <h2 className="ps-box-title">준비물</h2>
            <dl className="ps-dl">
              <div><dt>실</dt><dd>{[p.yarn, p.materials?.join(" · ")].filter(Boolean).join(" · ") || "—"}<small>{yarnWeightText(p)}</small></dd></div>
              <div><dt>바늘</dt><dd>{hookLabel(mm)}</dd></div>
              {colors.length > 0 && <div><dt>색</dt><dd>{colors.map((c, i) => (
                <span key={i} className="ps-color">{c.hex && <i style={{ background: c.hex }} />}{c.name || "직접 고른 색"}{c.no ? ` ${c.no}` : ""}{c.lot && <small>LOT {c.lot} <CopyLot lot={c.lot} /></small>}</span>
              ))}</dd></div>}
              <div><dt>실 양</dt><dd><b>약 {use.g}g</b><small>{use.skeins != null ? `${use.skeins}타래 · ` : ""}길이 약 {use.m}m</small></dd></div>
            </dl>
          </div>
          <div className="ps-box">
            <h2 className="ps-box-title">게이지</h2>
            <p className="ps-gauge"><b>{fmt(pp.g.h * 10)}</b><span>mm</span></p>
            <p className="ps-small">한 코 높이 · {pp.g.measured ? "직접 잰 값" : "예상 값"}</p>
            <p className="ps-small">{rounds ? "3단을 뜬 뒤 지름을 재면 남은 단을 내 손에 맞게 다시 계산해요." : "5단을 뜬 뒤 폭과 높이를 재면 남은 단 수를 고쳐 드려요."}</p>
            <p className="ps-small ps-rule"><b>기둥사슬</b> {p.object === "rows" ? "단 끝에서 기둥사슬 1코를 세우고 뒤집어 다음 단을 떠요." : "한 단을 첫 코에 빼뜨기로 닫고, 바로 그 자리 위에 다음 단의 기둥사슬 1코를 세워요."} 짧은뜨기의 기둥사슬은 코 수에 세지 않아요.</p>
          </div>
        </section>

        {/* the rows, section by section */}
        <section className="ps-rows" id="patRows" aria-label="단별 도안">
          {sections.map((s, k) => (
            <div key={k} className="ps-part">
              <h2 className="ps-part-title"><span className="ps-part-no">{String(k + 1).padStart(2, "0")}</span>{PART_KO[s.part]}
                <span className="ps-part-cnt">{s.part === "handle" ? count(s.part) + "개" : s.part === "start" ? "" : count(s.part) + "단"}</span></h2>
              <table className="ps-table">
                <tbody>
                  {s.rows.map(({ label, r }) => (
                    <Fragment key={r.idx}>
                      <tr>
                        <th scope="row">{label}</th>
                        <td>{r.how}<small>{r.why}</small></td>
                        <td className="ps-n">{r.n}<span>코</span></td>
                      </tr>
                      {r.part === "bottom" && r.no === 3 && <tr className="ps-note"><td colSpan={3}><span>※</span>여기서 한 번 지름을 재면 남은 단을 다시 계산해요.</td></tr>}
                      {(r.part === "rows" || r.part === "rounds") && r.no === 1 && <tr className="ps-note"><td colSpan={3}><span>※</span>5단을 뜬 뒤 폭{r.part === "rounds" ? "(둘레)" : ""}과 높이를 재면 남은 단 수를 고쳐 드려요.</td></tr>}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </section>

        <footer className="ps-foot" lang="en"><span>yarnity · intelligent crochet</span><span>{p.name}</span></footer>
      </article>
    </main>
  );
}
