"use client";
// 뜨개 용어집 (Kim's spec). Phones: the list (/glossary) and a term's own page (/glossary/[id]). Wide screens:
// the category tabs (180px, a column) | the list (420px) | the term in a panel on the right; a row changes only
// the panel (the address follows it, so a link or a reload lands on the same term).
// Cloth labels are the glossary's own patches (public/glossary/patch_{colour}.webp, stretched, no seams), in the
// category's colour; 전체 and the symbol squares are ivory (never white). The section titles of a term's page
// (뜨는 방법 / 자주 하는 실수 / 관련 용어) are slim laces in its category's colour.
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { MobileTopBar } from "@/components/mobile/MobileTopBar";
import { useMobile } from "@/components/mobile/useMobile";
import { CATEGORIES, DIFFICULTY, TERMS, categoryOf, colorOf, searchTerms, shortLine, termById, type GlossColor, type GlossTerm } from "@/lib/glossary";
import { GlossSymbol } from "./GlossSymbol";
import "./glossary.css";

const patch = (c: GlossColor): CSSProperties => ({ ["--gp" as string]: `url(/glossary/patch_${c}.webp)` });
const lace = (c: GlossColor): CSSProperties => ({ ["--gl" as string]: `url(/glossary/lace_${c}.webp)` });
const Chev = () => <svg className="gl-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 5.5 16 12l-6.5 6.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;

/** a square ivory patch with the term's symbol (or its first letter) */
const SymPatch = ({ term, size }: { term: GlossTerm; size: number }) => (
  <span className="gl-patch gl-sympatch" style={{ ...patch("ivory"), width: size, height: size }}><GlossSymbol term={term} size={size} /></span>
);

// ---------------------------------------------------------------- the list

function useList() {
  const [q, setQ] = useState(""), [cat, setCat] = useState<string>("all");
  const found = useMemo(() => searchTerms(q), [q]);
  const count = (id: string) => (id === "all" ? found.length : found.filter(t => t.category === id).length);
  const sections = useMemo(() => CATEGORIES.filter(c => cat === "all" || c.id === cat)
    .map(c => ({ c, terms: found.filter(t => t.category === c.id) })).filter(s => s.terms.length), [found, cat]);
  return { q, setQ, cat, setCat, count, sections, total: found.length };
}
type ListState = ReturnType<typeof useList>;

function Tabs({ s, column }: { s: ListState; column?: boolean }) {
  const tabs: { id: string; name: string; color: GlossColor }[] = [{ id: "all", name: "전체", color: "ivory" }, ...CATEGORIES];
  return (
    <div className={"gl-tabs" + (column ? " is-column" : "")} role="tablist" aria-label="카테고리">
      {tabs.map(t => (
        <button key={t.id} type="button" role="tab" aria-selected={s.cat === t.id} className="gl-tab gl-patch" style={patch(t.color)} onClick={() => s.setCat(t.id)}>
          <span>{t.name}</span><small>{s.count(t.id)}</small>
        </button>
      ))}
    </div>
  );
}

function Search({ s }: { s: ListState }) {
  return (
    <label className="gl-search"><span className="sr">용어 찾기</span>
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="m16 16 4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
      <input type="search" value={s.q} placeholder="이름이나 약어(sc, dc)로 찾기" onChange={e => s.setQ(e.target.value)} />
    </label>
  );
}

function Rows({ s, selected, onPick }: { s: ListState; selected?: string | null; onPick: (t: GlossTerm) => void }) {
  if (!s.sections.length) return <p className="gl-none">{s.q ? "찾는 용어가 없어요" : "이 칸에는 아직 용어가 없어요"}</p>;
  return (
    <>
      {s.sections.map(({ c, terms }) => (
        <section key={c.id} className="gl-section" aria-labelledby={`gls-${c.id}`}>
          <h2 id={`gls-${c.id}`} className="gl-sec-title"><span className="gl-patch" style={patch(c.color)}>{c.name}</span></h2>
          <ul className="gl-rows">
            {terms.map(t => (
              <li key={t.id}>
                <button type="button" className={"gl-row" + (selected === t.id ? " is-on" : "")} aria-current={selected === t.id ? "true" : undefined} onClick={() => onPick(t)}>
                  <SymPatch term={t} size={52} />
                  <span className="gl-row-text"><b>{t.name}</b><span>{shortLine(t)}</span></span>
                  <Chev />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}

function Head({ total }: { total: number }) {
  return (
    <header className="gl-head">
      <h1 className="gl-title" lang="en">Glossary<span className="sr"> · 뜨개 용어집</span></h1>
      <p className="gl-count">가나다순 · {total}개</p>
    </header>
  );
}

// ---------------------------------------------------------------- a term

/** the slim lace with a section's name, in the term's category colour */
const LaceTitle = ({ color, children }: { color: GlossColor; children: ReactNode }) => (
  <h3 className="gl-lace" style={lace(color)}><span>{children}</span></h3>
);

export function TermDetail({ term, onGo }: { term: GlossTerm; onGo: (t: GlossTerm) => void }) {
  const color = colorOf(term);
  const related = term.related.map(termById).filter((t): t is GlossTerm => !!t);
  return (
    <article className="gl-detail" aria-labelledby={`glt-${term.id}`}>
      <header className="gl-d-head">
        <SymPatch term={term} size={76} />
        <div>
          <p className="gl-d-cat">{categoryOf(term).name}</p>
          <h2 id={`glt-${term.id}`}>{term.name}</h2>
          <p className="gl-d-line">{shortLine(term)}</p>
          {term.aliases.length > 0 && <p className="gl-d-alias">다른 이름 · {term.aliases.join(", ")}</p>}
        </div>
      </header>
      <dl className="gl-patch gl-facts" style={patch("ivory")}>
        <div><dt>난이도</dt><dd>{DIFFICULTY[term.difficulty] || "—"}</dd></div>
        <div><dt>미국식</dt><dd lang="en">{term.en.us ?? "—"}</dd></div>
        <div><dt>영국식</dt><dd lang="en">{term.en.uk ?? "—"}</dd></div>
      </dl>
      <p className="gl-summary">{term.summary}</p>
      {term.note && <p className="gl-note">{term.note}</p>}
      {term.steps.length > 0 && (
        <section className="gl-block">
          <LaceTitle color={color}>뜨는 방법</LaceTitle>
          <ol className="gl-steps">
            {term.steps.map((st, i) => (
              <li key={i}>
                <span className="gl-step-no" aria-hidden="true">{i + 1}</span>
                <p>{st.text}</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {st.image ? <img className="gl-step-img" src={st.image} alt={`${i + 1}단계 그림`} /> : <span className="gl-step-img is-empty" aria-hidden="true" />}
              </li>
            ))}
          </ol>
        </section>
      )}
      {term.mistake && (
        <section className="gl-block">
          <LaceTitle color={color}>자주 하는 실수</LaceTitle>
          <p className="gl-patch gl-mistake" style={patch("ivory")}>{term.mistake}</p>
        </section>
      )}
      {related.length > 0 && (
        <section className="gl-block">
          <LaceTitle color={color}>관련 용어</LaceTitle>
          <div className="gl-related">
            {related.map(r => <button key={r.id} type="button" className="gl-patch gl-chip" style={patch(colorOf(r))} onClick={() => onGo(r)}>{r.name}</button>)}
          </div>
        </section>
      )}
    </article>
  );
}

// ---------------------------------------------------------------- the pages

/** /glossary and /glossary/[id]. `id`: the term shown (a term's page on phones; the panel on wide screens). */
export function GlossaryScreen({ id }: { id?: string }) {
  const m = useMobile(), router = useRouter(), s = useList();
  const [sel, setSel] = useState<string | null>(id ?? null);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => { setSel(id ?? null); }, [id]);
  const back = () => { if (history.length > 1) router.back(); else router.push("/"); };
  if (m === null) return null;

  if (m) {
    // phones: a term's page
    const term = id ? termById(id) : null;
    if (id) return (
      <main className="gl gl-phone gl-phone-term">
        <MobileTopBar back={back} center={<h1 className="gl-bar-title">뜨개 용어집</h1>} />
        {term ? <TermDetail term={term} onGo={t => router.push(`/glossary/${t.id}`)} /> : <p className="gl-none">이 용어를 찾지 못했어요</p>}
      </main>
    );
    return (
      <main className="gl gl-phone">
        <MobileTopBar back={back} center={<span className="gl-bar-title">뜨개 용어집</span>} />
        <Head total={TERMS.length} />
        <Search s={s} />
        <Tabs s={s} />
        <Rows s={s} onPick={t => router.push(`/glossary/${t.id}`)} />
      </main>
    );
  }

  // wide screens: tabs | list | the term
  const term = sel ? termById(sel) : null;
  const pick = (t: GlossTerm) => {
    setSel(t.id);
    // the address follows the panel without leaving the page
    history.replaceState(null, "", `/glossary/${t.id}`);
    panel.current?.scrollTo({ top: 0 });
  };
  return (
    <main className="gl gl-wide">
      <Head total={TERMS.length} />
      <div className="gl-cols">
        <aside className="gl-col-tabs"><Tabs s={s} column /></aside>
        <div className="gl-col-list">
          <Search s={s} />
          <div className="gl-list-scroll"><Rows s={s} selected={sel} onPick={pick} /></div>
        </div>
        <div className="gl-col-panel" ref={panel}>
          {term ? <TermDetail term={term} onGo={pick} /> : (
            <div className="gl-panel-empty"><p>왼쪽 목록에서 용어를 고르면<br />여기에 뜨는 방법이 나와요.</p></div>
          )}
        </div>
      </div>
    </main>
  );
}
