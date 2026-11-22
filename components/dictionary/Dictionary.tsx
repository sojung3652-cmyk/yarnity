"use client";
// 뜨개 사전 (web, Kim; mockups docs/mockups/dictionary): the glossary grown into a dictionary of knitting know-how.
// My Page's frame - the name and a text menu on the left (뜨개 상식 · 실 도감 · 작품별 가이드 · 막힐 때 · 한눈에 보는 표,
// a hairline, 용어집; the counts are the data's lengths), the screen on the right: its title on the ivory stitched
// cloth label, a row of filters (the chosen one on the see-through dusty rose), then its own layout. A card opens on
// the wish box's memo-paper pop-up. The content is in src/data/dictionary. Phones keep their own glossary (this
// frame is not used there).
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import { useApp } from "@/components/AppProvider";
import { MyHead } from "@/components/my/MyLayout";
import { TERMS } from "@/lib/glossary";
import { KNOWHOW, KNOWHOW_TOPICS, knowhowOf } from "@/src/data/dictionary/knowhow";
import { YARNS, YARN_GROUPS } from "@/src/data/dictionary/yarns";
import { PROJECTS } from "@/src/data/dictionary/projects";
import { TROUBLES } from "@/src/data/dictionary/trouble";
import { TABLES } from "@/src/data/dictionary/tables";
import { craftTags, SEASON_KO, type Craft, type DictTable, type Knowhow, type ProjectGuide, type Season, type Trouble, type Yarn } from "@/src/data/dictionary/types";
import { CareIcon, ProjectIcon, TroubleArt } from "./DictArt";
import "@/components/my/myPage.css";
import "@/components/glossary/glossary.css";
import "./dictionary.css";

export const DICT_MENU = [
  { href: "/glossary", label: "뜨개 상식", n: KNOWHOW.length },
  { href: "/glossary/yarns", label: "실 도감", n: YARNS.length },
  { href: "/glossary/projects", label: "작품별 가이드", n: PROJECTS.length },
  { href: "/glossary/trouble", label: "막힐 때", n: TROUBLES.length },
  { href: "/glossary/tables", label: "기타", n: TABLES.length },
] as const;

/** the frame (wide screens) */
export function DictLayout({ children }: { children: ReactNode }) {
  const path = usePathname();
  const onTerms = path === "/glossary/terms" || path.startsWith("/glossary/terms/");
  const item = (href: string, label: string, n: number, on: boolean) => (
    <Link key={href} href={href} className={"my-mi" + (on ? " is-on" : "")} aria-current={on ? "page" : undefined}><span>{label}</span><em>{n}</em></Link>
  );
  return (
    <main className="my dict" id="view-dict">
      <div className="my-grid">
        <aside className="my-left dict-left">
          {/* as My Page's avatar (Kim): the gold-thread spool and needle in the ivory lace oval (no name under it, Kim) */}
          <div className="my-me dict-me">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="dict-badge-img" src="/brand/dict_spool.webp" alt="뜨개 사전" width={112} height={147} />
          </div>
          <nav className="my-menu" aria-label="뜨개 사전">
            {/* 용어집 first, right under the medallion (Kim), then the dictionary's own five */}
            {item("/glossary/terms", "용어집", TERMS.length, onTerms)}
            <hr className="dict-rule" />
            {DICT_MENU.map(it => item(it.href, it.label, it.n, path === it.href))}
          </nav>
        </aside>
        <div className="my-right">{children}</div>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------- shared pieces

/** a subhead on a plain cloth label (Kim: not the lace) - its colour from a muted pastel set, one after another */
const Lace = ({ children }: { children: ReactNode }) => <h3 className="dict-label"><span>{children}</span></h3>;
const Soon = () => <p className="dict-soon">준비 중</p>;
/** a text with **bold** runs */
const Rich = ({ text }: { text: string }) => <>{text.split(/(\*\*[^*]+\*\*)/).map((t, i) => (t.startsWith("**") ? <b key={i}>{t.slice(2, -2)}</b> : <Fragment key={i}>{t}</Fragment>))}</>;

function Filters<T extends string>({ groups, value, onPick, label }: { groups: { id: T; label: string; n?: number }[][]; value: T; onPick: (v: T) => void; label: string }) {
  return (
    <div className="dict-filters" role="group" aria-label={label}>
      {groups.map((g, gi) => (
        <Fragment key={gi}>
          {gi > 0 && <span className="dict-filters-sep" aria-hidden="true" />}
          {g.map(f => <button key={f.id} type="button" className={"dict-chip" + (value === f.id ? " is-on" : "")} aria-pressed={value === f.id} onClick={() => onPick(f.id)}>{f.label}{f.n !== undefined ? ` ${f.n}` : ""}</button>)}
        </Fragment>
      ))}
    </div>
  );
}

/** the wish box's memo-paper pop-up (Esc, ✕ and the dim close it) */
function DictPop({ label, onClose, children, wide }: { label: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", key); return () => document.removeEventListener("keydown", key);
  }, [onClose]);
  return (
    <div className="my-dim" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <article className={"my-memo my-memo-pop dict-pop" + (wide ? " is-wide" : "")} role="dialog" aria-modal="true" aria-label={label}>
        <button type="button" className="my-pop-x" aria-label="닫기" autoFocus onClick={onClose}>✕</button>
        {children}
      </article>
    </div>
  );
}

/** Yarni opened with a question in its box (the user sends it) */
function useAskYarni() {
  const { setChat } = useApp();
  return (q: string) => setChat(c => ({ ...c, open: true, prefill: q }));
}

// ---------------------------------------------------------------- 1) 뜨개 상식

export function KnowhowScreen() {
  // 전체 first (Kim: with only the five topics it looked like five articles), each chip with its count
  const [topic, setTopic] = useState<"all" | (typeof KNOWHOW_TOPICS)[number]["id"]>("all");
  const list = useMemo(() => (topic === "all" ? KNOWHOW_TOPICS.flatMap(t => knowhowOf(t.id)) : knowhowOf(topic)), [topic]);
  const chips = useMemo(() => [{ id: "all" as const, label: "전체", n: KNOWHOW.length }, ...KNOWHOW_TOPICS.map(t => ({ ...t, n: knowhowOf(t.id).length }))], []);
  const [sel, setSel] = useState<string | null>(null);
  const cur = list.find(k => k.id === sel) ?? list[0] ?? null;
  const ask = useAskYarni();
  const next = cur ? (cur.next ? KNOWHOW.find(k => k.id === cur.next) : list[list.indexOf(cur) + 1]) ?? null : null;
  return (
    <>
      <MyHead title="뜨개 상식" />
      <Filters label="주제" groups={[chips]} value={topic} onPick={t => { setTopic(t); setSel(null); }} />
      <div className="dict-know">
        <ol className="dict-toc">
          {list.map((k, i) => (
            <li key={k.id}><button type="button" className={k.id === cur?.id ? "is-on" : ""} aria-current={k.id === cur?.id ? "true" : undefined} onClick={() => setSel(k.id)}>
              <i>{i + 1}</i><span>{k.title}</span></button></li>
          ))}
          {!list.length && <li className="dict-soon">준비 중</li>}
        </ol>
        {cur ? <KnowhowArticle key={cur.id} k={cur} n={list.indexOf(cur) + 1} next={next} onNext={() => next && setSel(next.id)} onAsk={() => ask(`'${cur.title}'에 대해 더 알려 주세요.`)} /> : <div />}
      </div>
    </>
  );
}

function KnowhowArticle({ k, n, next, onNext, onAsk }: { k: Knowhow; n: number; next: Knowhow | null; onNext: () => void; onAsk: () => void }) {
  return (
    <article className="my-memo dict-article">
      <p className="my-memo-kick">{KNOWHOW_TOPICS.find(t => t.id === k.topic)?.label} · {n}</p>
      <h2>{k.title}</h2>
      <p className="dict-summary">{k.summary}</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {k.image && <img className="dict-artphoto is-lead" src={k.image.src} alt={k.image.alt} loading="lazy" />}
      {k.sections.length ? k.sections.map(s => (
        <section key={s.heading} className={s.image ? "dict-sec has-photo" : undefined}><Lace>{s.heading}</Lace>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {s.image && <img className="dict-artphoto" src={s.image.src} alt={s.image.alt} loading="lazy" />}
          <p className="dict-body"><Rich text={s.body} /></p></section>
      )) : <Soon />}
      {k.table && (
        <table className="dict-table">
          <thead><tr><th />{k.table.cols.map(c => <th key={c} scope="col">{c}</th>)}</tr></thead>
          <tbody>{k.table.rows.map(r => <tr key={r[0]}><th scope="row">{r[0]}</th>{r.slice(1).map((c, i) => <td key={i}>{c}</td>)}</tr>)}</tbody>
        </table>
      )}
      <p className="dict-foot">
        <button type="button" onClick={onAsk}>Yarni에게 더 물어보기 →</button>
        {next && <button type="button" onClick={onNext}>다음 · {next.title} →</button>}
      </p>
    </article>
  );
}

// ---------------------------------------------------------------- 2) 실 도감

type YarnFilter = "all" | Yarn["group"] | "ss" | "aw";
const SS: Season[] = ["spring", "summer"], AW: Season[] = ["autumn", "winter"];
const TRAITS: [keyof NonNullable<Yarn["traits"]>, string][] = [["warmth", "보온성"], ["stretch", "신축성"], ["softness", "부드러움"], ["care", "세탁 편함"], ["price", "가격"]];
const seasonLine = (s: Season[]) => {
  const all = s.length === 4; if (all) return ["사계절"];
  return s.map(x => SEASON_KO[x]);
};

export function YarnsScreen() {
  const [f, setF] = useState<YarnFilter>("all"), [open, setOpen] = useState<Yarn | null>(null);
  const shown = YARNS.filter(y => f === "all" ? true : f === "ss" ? y.seasons.some(s => SS.includes(s)) : f === "aw" ? y.seasons.some(s => AW.includes(s)) : y.group === f);
  return (
    <>
      <MyHead title="실 도감" />
      <Filters label="거르기" value={f} onPick={setF} groups={[
        [{ id: "all", label: "전체", n: YARNS.length }, ...YARN_GROUPS.map(g => ({ id: g.id as YarnFilter, label: g.label }))],
        [{ id: "ss", label: "봄 · 여름" }, { id: "aw", label: "가을 · 겨울" }],
      ]} />
      <ul className="dict-grid is-4">
        {shown.map(y => (
          <li key={y.id}><button type="button" className="dict-card dict-yarn" aria-haspopup="dialog" onClick={() => setOpen(y)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <span className="dict-photo">{y.image ? <img src={y.image} alt="" /> : <span>실 사진</span>}</span>
            <span className="dict-card-text"><b>{y.name}</b><small>{y.short}</small>
              <span className="dict-tags">{seasonLine(y.seasons).map(s => <i key={s} className="is-rose">{s}</i>)}</span></span>
          </button></li>
        ))}
      </ul>
      {open && (
        <DictPop label={open.name} onClose={() => setOpen(null)}>
          <p className="my-memo-kick">실 도감 · {YARN_GROUPS.find(g => g.id === open.group)?.label}</p>
          <h2>{open.name} <span lang="en" className="dict-en">{open.nameEn}</span></h2>
          <Lace>실의 성격</Lace>
          {open.traits ? (
            <dl className="dict-traits">
              {TRAITS.map(([k, t]) => (
                <div key={k}><dt>{t}</dt><dd aria-label={`5점 중 ${open.traits![k]}점`}>{[1, 2, 3, 4, 5].map(i => <i key={i} className={i <= open.traits![k] ? "is-on" : ""} />)}</dd></div>
              ))}
            </dl>
          ) : <Soon />}
          <Lace>어울리는 계절</Lace>
          <p className="dict-tags is-big">{(Object.keys(SEASON_KO) as Season[]).map(s => <i key={s} className={open.seasons.includes(s) ? "is-rose" : ""}>{SEASON_KO[s]}</i>)}</p>
          <Lace>이런 실입니다</Lace>
          {open.about ? <p className="dict-body">{open.about}</p> : <Soon />}
          <Lace>주의할 점</Lace>
          {open.caution ? <p className="dict-body">{open.caution}</p> : <Soon />}
        </DictPop>
      )}
    </>
  );
}

// ---------------------------------------------------------------- 3) 작품별 가이드

type ProjFilter = "all" | "crochet" | "knit" | ProjectGuide["level"];
const crafted = (c: Craft, want: "crochet" | "knit") => c === want || c === "both";

export function ProjectsScreen() {
  const [f, setF] = useState<ProjFilter>("all"), [open, setOpen] = useState<ProjectGuide | null>(null);
  const shown = PROJECTS.filter(p => f === "all" ? true : f === "crochet" || f === "knit" ? crafted(p.craft, f) : p.level === f);
  return (
    <>
      <MyHead title="작품별 가이드" />
      <Filters label="거르기" value={f} onPick={setF} groups={[
        [{ id: "all", label: "전체", n: PROJECTS.length }, { id: "crochet", label: "코바늘" }, { id: "knit", label: "대바늘" }],
        [{ id: "쉬움", label: "쉬움" }, { id: "보통", label: "보통" }, { id: "어려움", label: "어려움" }],
      ]} />
      <ul className="dict-grid is-4">
        {shown.map(p => (
          <li key={p.id}><button type="button" className="dict-card dict-proj" aria-haspopup="dialog" onClick={() => setOpen(p)}>
            <span className="dict-proj-top"><span className="dict-badge"><ProjectIcon name={p.icon} /></span>
              <span><b>{p.name}</b><span className="dict-tags">{craftTags(p.craft).map(t => <i key={t} className="is-rose">{t}</i>)}<i>{p.level}</i></span></span></span>
            <span className="dict-kv"><em>실</em>{p.yarns}</span>
            <span className="dict-kv"><em>요령</em>{p.tip}</span>
          </button></li>
        ))}
      </ul>
      {open && (
        <DictPop label={open.name} onClose={() => setOpen(null)}>
          <p className="my-memo-kick">작품별 가이드 · {craftTags(open.craft).join(" · ")} · {open.level}</p>
          <h2>{open.name}</h2>
          {open.firstProject && <p className="dict-summary">첫 작품으로 좋습니다.</p>}
          <Lace>어울리는 실</Lace><p className="dict-body">{open.yarns}</p>
          <Lace>바늘</Lace>{open.hook ? <p className="dict-body">{open.hook}</p> : <p className="dict-body">{craftTags(open.craft).join(" · ")}</p>}
          <Lace>요령</Lace><p className="dict-body">{open.more ?? open.tip}</p>
        </DictPop>
      )}
    </>
  );
}

// ---------------------------------------------------------------- 4) 막힐 때

export function TroubleScreen() {
  const [f, setF] = useState<"all" | "crochet" | "knit">("all"), [open, setOpen] = useState<Trouble | null>(null);
  const shown = TROUBLES.filter(t => f === "all" || crafted(t.craft, f));
  const ask = useAskYarni();
  return (
    <>
      <MyHead title="막힐 때" />
      <Filters label="거르기" value={f} onPick={setF} groups={[[{ id: "all", label: "전체", n: TROUBLES.length }, { id: "crochet", label: "코바늘" }, { id: "knit", label: "대바늘" }]]} />
      <ul className="dict-grid is-3">
        {shown.map(t => (
          <li key={t.id}><button type="button" className="dict-card dict-trouble" aria-haspopup="dialog" onClick={() => setOpen(t)}>
            <span className="dict-art"><TroubleArt name={t.illustration} /></span>
            <span className="dict-card-text"><b>{t.title}</b><small>{t.cause}</small>
              <span className="dict-tags">{craftTags(t.craft).map(c => <i key={c}>{c}</i>)}</span></span>
          </button></li>
        ))}
      </ul>
      {open && (
        <DictPop label={open.title} onClose={() => setOpen(null)}>
          <p className="my-memo-kick">막힐 때 · {craftTags(open.craft).join(" · ")}</p>
          <h2>{open.title}</h2>
          {open.compare && (
            <ul className="dict-compare">
              {open.compare.map(c => (
                <li key={c.art} className={c.on ? "is-on" : ""}><TroubleArt name={c.art} /><small>{c.label}</small><b>{c.note}</b></li>
              ))}
            </ul>
          )}
          <Lace>왜 그럴까요</Lace>
          {open.why ? <p className="dict-body">{open.why}</p> : <Soon />}
          <Lace>이렇게 해 보세요</Lace>
          {open.fixes?.length ? <ol className="dict-fixes">{open.fixes.map(x => <li key={x}>{x}</li>)}</ol> : <Soon />}
          <p className="dict-foot"><button type="button" onClick={() => ask(`편물이 '${open.title}' 같아요. 사진을 보여 줄게요.`)}>Yarni에게 내 편물 사진 보여주기 →</button></p>
        </DictPop>
      )}
    </>
  );
}

// ---------------------------------------------------------------- 5) 기타 (was 한눈에 보는 표)

/** a table on its sheet of white paper; a cell "@name" is a care-label drawing, "-" a faint dash */
function Sheet({ cols, rows, num }: { cols: string[]; rows: string[][]; num?: number[] }) {
  return (
    <div className="dict-sheet">
      <table className="dict-table is-big">
        <thead><tr>{cols.map((c, j) => <th key={c} scope="col" className={num?.includes(j) ? "is-num" : undefined}>{c}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => r.length === 1 && r[0].startsWith("#") ? (
            <tr key={i} className="dict-group"><th colSpan={cols.length} scope="rowgroup">{r[0].slice(1)}</th></tr>
          ) : (
            <tr key={i}>
              {r.map((c, j) => <td key={j} className={(num?.includes(j) ? "is-num" : "") + (c === "-" ? " is-none" : "") + (c.startsWith("@") ? " is-icon" : "") || undefined}>{c.startsWith("@") ? <CareIcon name={c.slice(1)} className="dict-care" /> : c === "-" ? "–" : c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** "6호" / "6/0호" -> "6", "3.5mm" -> "3.5", "E-4" -> "e4": the forms people write, made alike */
const sizeKey = (s: string) => s.toLowerCase().replace(/\(.*?\)|\s|mm|호|\/0|-/g, "");
/** which rows a search finds (Kim: "6호 쓰라는데 내 바늘엔 3.5mm만 써 있어"): 호 or mm or the US size. A 호 search
 *  looks only at the 호 column and an mm search only at mm, so "6호" does not also find UK 6. */
function findSizes(rows: string[][], q: string) {
  const k = sizeKey(q);
  if (!k) return null;
  const ok = (c: string | undefined) => !!c && c !== "-";
  if (/호/.test(q)) return rows.filter(r => ok(r[0]) && sizeKey(r[0]) === k);
  if (/mm|\./.test(q)) return rows.filter(r => ok(r[1]) && Number(r[1]) === Number(k));
  // a US size: "E-4" / "E" (the letter) or "4" (its number); a bare number also means 호
  if (/^[a-z]/.test(k)) return rows.filter(r => ok(r[2]) && (sizeKey(r[2]) === k || (k.length === 1 && sizeKey(r[2]).startsWith(k))));
  return rows.filter(r => (ok(r[0]) && sizeKey(r[0]) === k) || (ok(r[2]) && sizeKey(r[2]).replace(/^[a-z]/, "") === k));
}

/** a table in groups (바늘 호수: 코바늘 / 대바늘): one group at a time, picked on cloth chips, and a search */
function GroupedSheet({ t }: { t: DictTable }) {
  const groups = t.groups!;
  const [gi, setGi] = useState(0);
  const [q, setQ] = useState("");
  const rows = groups[gi].rows;
  const found = useMemo(() => findSizes(rows, q), [rows, q]);
  return (
    <>
      <div className="dict-tools">
        <Filters label="종류" groups={[groups.map((g, i) => ({ id: String(i), label: g.label.replace(/\s*\(.*\)$/, "") }))]} value={String(gi)} onPick={v => setGi(Number(v))} />
        {t.sizeSearch && <label className="dict-find"><span className="sr">호수나 mm로 찾기</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></svg>
          <input type="search" value={q} placeholder="6호, 3.5mm, E-4" onChange={e => setQ(e.target.value)} />
        </label>}
      </div>
      {groups[gi].label.includes("(") && <p className="dict-sheet-note">{groups[gi].label.match(/\((.*)\)/)![1]}</p>}
      {found && found.length === 0 ? <p className="dict-none">{groups[gi].label.replace(/\s*\(.*\)$/, "")}에는 &lsquo;{q.trim()}&rsquo;에 맞는 굵기가 없어요.</p>
        : <Sheet cols={t.cols!} rows={found ?? rows} num={t.num} />}
      {t.foot && <p className="dict-sheet-note is-foot">{t.foot}</p>}
    </>
  );
}

export function TablesScreen() {
  const [open, setOpen] = useState<DictTable | null>(null);
  return (
    <>
      <MyHead title="기타" />
      <ul className="dict-grid is-2">
        {TABLES.map(t => (
          <li key={t.id}><button type="button" className="dict-card dict-tablecard" aria-haspopup="dialog" onClick={() => setOpen(t)}>
            <span className="dict-mini" aria-hidden="true">{[0, 1, 2, 3].map(i => <i key={i} />)}</span>
            <span className="dict-card-text"><b>{t.title}</b><small>{t.short}</small></span>
          </button></li>
        ))}
      </ul>
      {open && (
        <DictPop label={open.title} onClose={() => setOpen(null)} wide>
          <p className="my-memo-kick">기타</p>
          <h2>{open.title}</h2>
          {open.cols && open.groups ? <GroupedSheet key={open.id} t={open} />
            : open.cols && open.rows ? <><Sheet cols={open.cols} rows={open.rows} num={open.num} />{open.foot && <p className="dict-sheet-note is-foot">{open.foot}</p>}</> : <Soon />}
        </DictPop>
      )}
    </>
  );
}
