"use client";
// My Page · 나의 기록 (/my/records, Kim): numbers on top (완성 작품, 지금까지 뜬 단, 뜬 시간 - only once there is
// some -, 연속으로 뜬 날), then the gallery of finished works (a slot for each, hatched until it has a photo;
// several photos a work; a photo opens large) and 뜬 날, the last 12 weeks as squares (lib/knitLog.ts).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { addPhoto, photosOf, removePhoto, type Photo } from "@/lib/photos";
import { dayKey, readLog, streak } from "@/lib/knitLog";
import { statusOf } from "@/lib/status";
import type { Project } from "@/lib/types";
import { MyHead } from "./MyLayout";

const fmtTime = (ms: number) => { const m = Math.round(ms / 60000), h = Math.floor(m / 60); return h ? `${h}시간${m % 60 ? ` ${m % 60}분` : ""}` : `${m}분`; };
const fmtDay = (ms: number) => { const d = new Date(ms); return `${d.getMonth() + 1}월 ${d.getDate()}일 완성`; };
/** 뜬 날's colours: none, then light to deep dusty rose */
const level = (n: number) => (n <= 0 ? 0 : n <= 3 ? 1 : n <= 9 ? 2 : 3);

type Shots = Record<string, { photo: Photo; url: string }[]>;

/** a photo large over the page: ← → through the work's photos, Esc / ✕ / the dim close it */
function Lightbox({ name, shots, at, onClose, onRemove }: { name: string; shots: { photo: Photo; url: string }[]; at: number; onClose: () => void; onRemove: (id: string) => void }) {
  const [i, setI] = useState(at), n = shots.length, cur = shots[Math.min(i, n - 1)];
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); if (e.key === "ArrowLeft") setI(x => (x - 1 + n) % n); if (e.key === "ArrowRight") setI(x => (x + 1) % n); };
    document.addEventListener("keydown", key); const o = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", key); document.body.style.overflow = o; };
  }, [n, onClose]);
  if (!cur) return null;
  return (
    <div className="my-lb" role="dialog" aria-modal="true" aria-label={`${name} 사진`} onClick={onClose}>
      <figure onClick={e => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cur.url} alt={`${name} 사진 ${i + 1}`} />
        <figcaption>
          <span>{name} · {i + 1} / {n}</span>
          <button type="button" className="my-lb-del" onClick={() => { onRemove(cur.photo.id); if (n <= 1) onClose(); else setI(x => Math.max(0, x - 1)); }}>이 사진 지우기</button>
        </figcaption>
        {n > 1 && <><button type="button" className="my-lb-nav is-prev" aria-label="이전 사진" onClick={() => setI(x => (x - 1 + n) % n)}>‹</button>
          <button type="button" className="my-lb-nav is-next" aria-label="다음 사진" onClick={() => setI(x => (x + 1) % n)}>›</button></>}
        <button type="button" className="my-lb-x" aria-label="닫기" autoFocus onClick={onClose}>✕</button>
      </figure>
    </div>
  );
}

export function MyRecords() {
  const { ready, projects } = useApp();
  const [log] = useState(readLog);
  const done = useMemo(() => projects.filter(p => statusOf(p) === "done")
    .sort((a, b) => (log.doneAt[b.id] ?? b.updatedAt ?? b.created) - (log.doneAt[a.id] ?? a.updatedAt ?? a.created)), [projects, log]);
  const rows = useMemo(() => projects.reduce((s, p) => s + (p.current || 0), 0), [projects]);

  // the finished works' photos, as object URLs while the page is open
  const [shots, setShots] = useState<Shots>({});
  const urls = useRef<string[]>([]);
  const load = useCallback(async (list: Project[]) => {
    const out: Shots = {}, made: string[] = [];
    try {
      for (const p of list) out[p.id] = (await photosOf(p.id)).map(photo => { const url = URL.createObjectURL(photo.blob); made.push(url); return { photo, url }; });
    } catch { /* no IndexedDB */ }
    urls.current.forEach(u => URL.revokeObjectURL(u)); urls.current = made; setShots(out);
  }, []);
  useEffect(() => { if (ready) load(done); }, [ready, done, load]);
  useEffect(() => () => urls.current.forEach(u => URL.revokeObjectURL(u)), []);

  // + 사진 올리기: pick the work, then the files
  const file = useRef<HTMLInputElement>(null), [target, setTarget] = useState<string | null>(null), [picking, setPicking] = useState(false);
  const upload = (id: string) => { setTarget(id); setPicking(false); file.current?.click(); };
  const onFiles = async (fs: FileList | null) => {
    if (!fs || !target) return;
    for (const f of Array.from(fs)) if (f.type.startsWith("image/")) { try { await addPhoto(target, f, 1600); } catch { /* skip a picture that cannot be read */ } }
    if (file.current) file.current.value = "";
    load(done);
  };
  const [lb, setLb] = useState<{ id: string; at: number } | null>(null);

  // 뜬 날: 12 weeks, Monday on top, this week on the right
  const grid = useMemo(() => {
    const today = new Date(), start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7) - 7 * 11);
    return Array.from({ length: 12 }, (_, w) => Array.from({ length: 7 }, (_, d) => {
      const x = new Date(start); x.setDate(start.getDate() + w * 7 + d);
      const k = dayKey(x), n = log.days[k] ?? 0;
      return { k, n, future: x > today, label: `${x.getMonth() + 1}월 ${x.getDate()}일 · ${n}단` };
    }));
  }, [log]);

  if (!ready) return null;
  const stats = [
    { k: "완성 작품", v: done.length, u: "개" },
    { k: "지금까지 뜬 단", v: rows, u: "단" },
    ...(log.ms > 60000 ? [{ k: "뜬 시간", v: fmtTime(log.ms), u: "" }] : []),
    { k: "연속으로 뜬 날", v: streak(log), u: "일" },
  ];
  return (
    <>
      <MyHead title="나의 기록" line="완성한 작품과 뜬 날을 모아 봐요" />
      <dl className="my-stats" style={{ gridTemplateColumns: `repeat(${stats.length},minmax(0,1fr))` }}>
        {stats.map(s => <div key={s.k} className="my-card"><dt>{s.k}</dt><dd>{s.v}{s.u && <small>{s.u}</small>}</dd></div>)}
      </dl>
      <div className="my-rec">
        <section aria-labelledby="myGal">
          <div className="my-sec-head">
            <h2 id="myGal" className="my-h2">갤러리</h2>
            <div className="my-pick-wrap">
              <button type="button" className="my-btn is-sub" disabled={!done.length} onClick={() => setPicking(v => !v)} aria-expanded={picking}>+ 사진 올리기</button>
              {picking && (
                <div className="my-pop" role="menu" aria-label="어느 작품의 사진인가요">
                  <p className="my-pop-kick">어느 작품의 사진인가요?</p>
                  {done.map(p => <button key={p.id} type="button" role="menuitem" onClick={() => upload(p.id)}>{p.name}</button>)}
                </div>
              )}
            </div>
            <input ref={file} type="file" accept="image/*" multiple hidden onChange={e => onFiles(e.target.files)} />
          </div>
          {done.length ? (
            <ul className="my-gal">
              {done.map(p => {
                const s = shots[p.id] ?? [];
                return (
                  <li key={p.id}>
                    {s.length
                      ? <button type="button" className="my-gal-pic" onClick={() => setLb({ id: p.id, at: 0 })} aria-label={`${p.name} 사진 크게 보기`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={s[0].url} alt="" />{s.length > 1 && <span className="my-gal-n">{s.length}장</span>}
                        </button>
                      : <button type="button" className="my-gal-pic is-empty" onClick={() => upload(p.id)}><span>완성 사진</span><small>+ 올리기</small></button>}
                    <b>{p.name}</b>
                    <small>{fmtDay(log.doneAt[p.id] ?? p.updatedAt ?? p.created)}</small>
                  </li>
                );
              })}
            </ul>
          ) : <p className="my-card my-empty"><span>완성한 작품이 생기면 여기에 칸이 생겨요.</span></p>}
        </section>
        <section aria-labelledby="myDays" className="my-card my-days">
          <h2 id="myDays" className="my-h2">뜬 날</h2>
          <div className="my-heat" role="img" aria-label="최근 12주 동안 뜬 날">
            {grid.map((week, w) => <div key={w} className="my-heat-col">{week.map(d => <i key={d.k} className={"l" + level(d.n) + (d.future ? " is-future" : "")} title={d.label} />)}</div>)}
          </div>
          <p className="my-heat-note">최근 12주 · 진할수록 많이 뜬 날</p>
        </section>
      </div>
      {lb && shots[lb.id]?.length ? (
        <Lightbox name={projects.find(p => p.id === lb.id)?.name ?? ""} shots={shots[lb.id]} at={lb.at} onClose={() => setLb(null)}
          onRemove={async id => { await removePhoto(id).catch(() => {}); load(done); }} />
      ) : null}
    </>
  );
}
