"use client";
import "./pattern-screen.css";
import { GlossText } from "@/components/glossary/GlossText";
// 완성 도안 on phones (/pattern): its own screen, outside the book. The same pattern as the web sheet
// (app/pattern/page.tsx: plan + withChains, the same grouping of identical rows, yarnUse, the drawing, the
// gauge and the 기둥사슬 note), laid out for a phone with room to breathe: a top bar (‹ 나의 도안집, the
// wordmark, ···), the title block, two tabs - 도안 (four facts, then the rows part by part) and 준비물과 모양 -
// and a bar fixed at the foot (고치기, the lavender ribbon into 따라 뜨기). Right after 도안 만들기 a line offers
// + 새 도안 · 나의 도안집. Styles: screens-mobile.css.
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { useBook } from "@/components/Book/BookProvider";
import { drawing } from "@/lib/drawing";
import { ITEM, itemIdOf } from "@/lib/items";
import { fmt, PART_KO, plan, SHAPE_KO, withChains, type Row } from "@/lib/pattern";
import { hookLabel, hookMmOf, yarnWeightText } from "@/lib/yarn";
import { yarnUse } from "@/lib/yarnUse";
import { DiaryIcon, LaceButton, StitchButton } from "@/components/diary/Diary";
import { CoverPicker } from "@/components/diary/CoverPicker";
import { MobileTopBar, MoreButton } from "./MobileTopBar";
import { GlossButton } from "@/components/glossary/GlossaryFloat";
import { MoreSheet } from "./MoreSheet";
import { useNewDraft } from "./useNewDraft";

export const JUST_MADE_KEY = "m.justMade";

export function MobilePatternScreen() {
  const { ready, active: p, updateProject, removeProjects } = useApp();
  const router = useRouter(), book = useBook(), newDraft = useNewDraft();
  const [tab, setTab] = useState<"rows" | "supplies">("rows"), [more, setMore] = useState(false);
  const [renaming, setRenaming] = useState(false), [name, setName] = useState("");
  const [justMade, setJustMade] = useState(false);
  // just made: the + 새 도안 · 나의 도안집 links, and the book cover to pick (once, if it has none yet)
  const [picking, setPicking] = useState(false);
  useEffect(() => { try { if (sessionStorage.getItem(JUST_MADE_KEY)) { sessionStorage.removeItem(JUST_MADE_KEY); setJustMade(true); setPicking(true); } } catch {} }, []);
  useEffect(() => { if (ready && !p) router.replace("/mine"); }, [ready, p, router]);
  if (!ready || !p) return <main id="view-pattern" className="ms-screen" />;

  const pp = withChains(plan(p)), it = ITEM[itemIdOf(p)], total = pp.rows.length;
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
  const partRows = (part: Row["part"]) => pp.rows.filter(x => x.part === part);
  const size = p.object === "rows" ? `폭 ${p.a} × 길이 ${p.b}cm` : p.object === "tube" ? `둘레 ${p.a} · ${it.id === "headband" ? "폭" : "높이"} ${p.h}cm`
    : `${SHAPE_KO[p.shape]} ${p.shape === "circle" ? `지름 ${p.a}cm` : `${p.a} × ${p.b}cm`}${p.object === "bag" ? ` · 높이 ${p.h}cm` : ""}`;
  const colors = [{ hex: p.color, name: p.colorName, no: p.colorNo }, ...(p.moreColors ?? [])].filter(c => c.hex || c.name);
  const use = yarnUse(pp, { weight: p.weight, yarnMm: p.yarnMm, yarnMode: p.yarnMode, skeinG: p.skeinG, skeinM: p.skeinM, colors: Math.max(1, colors.length), materials: p.materials });
  const made = new Date(p.created).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
  const cur = Math.min(p.current || 0, total), started = cur > 0 && cur < total;
  const shapeLine = p.object === "rows" || p.object === "tube" ? `${pp.bodyRows}단 · 한 단 ${pp.last}코` : `바닥 ${pp.bottomRounds}단 · 마지막 ${pp.last}코`;
  const yarnText = [p.yarn, colors.map(c => c.name).filter(Boolean).join(" · "), yarnWeightText(p) !== "—" ? yarnWeightText(p) : ""].filter(Boolean).join(" · ") || "—";
  const rounds = p.object === "coaster" || p.object === "bag";
  const go = () => router.push("/track");

  return (
    <main id="view-pattern" className="ms-screen msp">
      <MobileTopBar back={() => router.push("/mine")} logo={84} tip right={<><GlossButton /><MoreButton onClick={() => setMore(true)} /></>} />
      <header className="msp-head">
        <p className="msp-kicker" lang="en">Crochet pattern · <span>{made}</span></p>
        {renaming ? (
          <form className="msp-rename" onSubmit={e => { e.preventDefault(); const n = name.trim().slice(0, 30); if (n) updateProject(p.id, { name: n }); setRenaming(false); }}>
            <label className="sr" htmlFor="mspName">작품 이름</label>
            <input id="mspName" autoFocus maxLength={30} value={name} onChange={e => setName(e.target.value)} />
            <button type="submit">저장</button>
          </form>
        ) : <h1>{p.name}</h1>}
        <p className="msp-sub">{it.name} · {size}</p>
      </header>
      {/* the paper panel (Kim): from the tabs down the pattern reads on plain paper, the stars only above it */}
      <div className="msp-paper">
      <div className="msp-tabs" role="tablist" aria-label="도안 보기">
        <button type="button" role="tab" aria-selected={tab === "supplies"} onClick={() => setTab("supplies")}>준비물과 모양</button>
        <button type="button" role="tab" aria-selected={tab === "rows"} onClick={() => setTab("rows")}>도안</button>
      </div>

      {tab === "rows" ? (
        <section className="msp-body" aria-label="도안">
          <dl className="msp-facts">
            <div><dt>실</dt><dd>{yarnWeightText(p)}</dd></div>
            <div><dt>바늘</dt><dd>{hookLabel(hookMmOf(p)).split(" · ").pop()}</dd></div>
            <div><dt>실 양</dt><dd>약 {use.g}g</dd></div>
            <div><dt>한 코</dt><dd>{fmt(pp.g.h * 10)}mm</dd></div>
          </dl>
          {sections.map((s, k) => {
            const rows = partRows(s.part), last = rows[rows.length - 1];
            return (
              <div key={k} className="msp-part">
                <h2><span className="msp-no">{String(k + 1).padStart(2, "0")}</span><b>{PART_KO[s.part]}</b>
                  <small>{s.part === "start" ? `${last.n}코` : s.part === "handle" ? `${rows.length}개` : `${rows.length}단 · 마지막 ${last.n}코`}</small></h2>
                <ol>
                  {s.rows.map(({ label, r }) => (
                    <li key={r.idx}>
                      <div className="msp-row">
                        <span className="msp-pill">{label}</span>
                        <span className="msp-how"><GlossText text={r.how} />{r.why && <small>{r.why}</small>}</span>
                        <span className="msp-n">{r.n}<i>코</i></span>
                      </div>
                      {r.part === "bottom" && r.no === 3 && <p className="msp-note">3단을 뜬 뒤 한 번 지름을 재면, 남은 단을 내 손에 맞게 다시 계산해요.</p>}
                      {(r.part === "rows" || r.part === "rounds") && r.no === 1 && <p className="msp-note">5단을 뜬 뒤 폭{r.part === "rounds" ? "(둘레)" : ""}과 높이를 재면 남은 단 수를 고쳐 드려요.</p>}
                    </li>
                  ))}
                </ol>
              </div>
            );
          })}
        </section>
      ) : (
        <section className="msp-body" aria-label="준비물과 모양">
          <div className="msp-shape">
            {/* drawing() only interpolates numbers, fixed labels and hex colours */}
            <div className="msp-drawing drawing" aria-label="완성 모양 도면" dangerouslySetInnerHTML={{ __html: drawing(p, pp, p.color, p.moreColors?.map(c => c.hex)) }} />
            <div><p className="msp-cap">완성 모양</p><p className="msp-size">{size}</p><p className="msp-small">{shapeLine}</p></div>
          </div>
          <h2 className="msp-h">준비물</h2>
          <dl className="msp-list">
            <div><dt>실</dt><dd>{yarnText}</dd></div>
            <div><dt>바늘</dt><dd>{hookLabel(hookMmOf(p))}</dd></div>
            <div><dt>실 양</dt><dd><b>약 {use.g}g</b><small>{use.skeins != null ? `${use.skeins}타래 · ` : ""}길이 약 {use.m}m</small></dd></div>
          </dl>
          <h2 className="msp-h">게이지</h2>
          <p className="msp-gauge">한 코 높이 <b>{fmt(pp.g.h * 10)}</b> mm · {pp.g.measured ? "직접 잰 값" : "예상 값"}</p>
          <p className="msp-small">{rounds ? "3단을 뜬 뒤 지름을 재면 남은 단을 내 손에 맞게 다시 계산해요." : "5단을 뜬 뒤 폭과 높이를 재면 남은 단 수를 고쳐 드려요."}</p>
          <p className="msp-tip"><b>기둥사슬</b> {p.object === "rows" ? "단 끝에서 기둥사슬 1코를 세우고 뒤집어 다음 단을 떠요." : "한 단을 첫 코에 빼뜨기로 닫고, 바로 그 자리 위에 다음 단의 기둥사슬 1코를 세워요."} 짧은뜨기의 기둥사슬은 코 수에 세지 않아요.</p>
        </section>
      )}
      </div>

      <div className="ms-foot">
        {justMade && <p className="msp-made"><button type="button" onClick={newDraft}>+ 새 도안</button> · <button type="button" onClick={() => router.push("/mine")}>나의 도안집</button></p>}
        <div className="ms-foot-row">
          <StitchButton icon={DiaryIcon.pen} label="고치기" onClick={() => book.editHere(p.id)} />
          <div className="ms-go">
            <LaceButton variant="lavender" width="fill" onClick={go}>{started ? `이어서 뜨기 · ${pp.rows[cur].label}부터 →` : cur >= total ? "뜨기 기록 보기 →" : "뜨기 시작 →"}</LaceButton>
            <p className="ms-go-sub">{started ? `${pp.rows[cur].label}부터` : "1단부터"} · 화면이 꺼지지 않아요</p>
          </div>
        </div>
      </div>

      {picking && !p.cover && <CoverPicker first p={p} onPick={id => { updateProject(p.id, { cover: id }); setPicking(false); }} onClose={() => setPicking(false)} />}
      {more && (
        <MoreSheet title={p.name} onClose={() => setMore(false)} items={[
          { key: "edit", icon: "pen", label: "고치기", sub: "마법사로 돌아가요", onClick: () => { setMore(false); book.editHere(p.id); } },
          { key: "rename", icon: "tag", label: "이름 바꾸기", onClick: () => { setMore(false); setName(p.name); setRenaming(true); } },
          { key: "delete", icon: "trash", label: "지우기", danger: true, confirm: "이 작품을 지울까요? 되돌릴 수 없어요.", onClick: () => { setMore(false); removeProjects([p.id]); router.push("/mine"); } },
        ]} />
      )}
    </main>
  );
}
