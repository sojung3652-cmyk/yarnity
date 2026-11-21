"use client";
// My Page · 갤러리 (/my/gallery, Kim): the glossary's layout - the finished works listed on its cream card (a small
// photo or the cover, the name, when it was finished, how many photos), the chosen one on the ruled memo slip at the
// right: its photos large with ‹ › and a row of small ones, + 사진 올리기 and 이 사진 지우기. Nothing chosen: the
// first work comes up. Photos in IndexedDB (lib/photos.ts, 1600px); the finish date from lib/knitLog.ts.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { BookCover } from "@/components/BookCover";
import { addPhoto, photosOf, removePhoto, type Photo } from "@/lib/photos";
import { readLog } from "@/lib/knitLog";
import { statusOf } from "@/lib/status";
import type { Project } from "@/lib/types";
import { MyHead } from "./MyLayout";

const fmtDay = (ms: number) => { const d = new Date(ms); return `${d.getMonth() + 1}월 ${d.getDate()}일 완성`; };
type Shot = { photo: Photo; url: string };
type Shots = Record<string, Shot[]>;
const Chev = () => <svg className="my-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 5.5 16 12l-6.5 6.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;

/** the chosen work on the memo slip */
function WorkMemo({ p, shots, done, onAdd, onRemove }: { p: Project; shots: Shot[]; done: number; onAdd: () => void; onRemove: (id: string) => void }) {
  const [i, setI] = useState(0), n = shots.length, cur = shots[Math.min(i, n - 1)];
  const [ask, setAsk] = useState(false);
  useEffect(() => { if (i > n - 1) setI(Math.max(0, n - 1)); }, [n, i]);
  return (
    <article className="my-memo" aria-label={`${p.name} 사진`}>
      <p className="my-memo-kick">{fmtDay(done)}{n ? ` · 사진 ${n}장` : ""}</p>
      <h2>{p.name}</h2>
      {cur ? <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="my-memo-pic" src={cur.url} alt={`${p.name} 사진 ${i + 1}`} />
        {n > 1 && (
          <div className="my-memo-nav">
            <button type="button" aria-label="이전 사진" disabled={i === 0} onClick={() => setI(x => x - 1)}>‹</button>
            <span>{i + 1} / {n}</span>
            <button type="button" aria-label="다음 사진" disabled={i >= n - 1} onClick={() => setI(x => x + 1)}>›</button>
          </div>
        )}
        {n > 1 && (
          <ul className="my-thumbs">
            {shots.map((s, k) => <li key={s.photo.id}><button type="button" aria-label={`사진 ${k + 1}`} aria-current={k === i ? "true" : undefined} onClick={() => setI(k)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.url} alt="" /></button></li>)}
          </ul>
        )}
      </> : (
        <div className="my-memo-empty"><span>완성 사진을 남겨 보세요<button type="button" className="my-btn" onClick={onAdd}>+ 사진 올리기</button></span></div>
      )}
      {cur && (
        <div className="my-memo-btns">
          <button type="button" className="my-btn" onClick={onAdd}>+ 사진 올리기</button>
          {ask
            ? <><button type="button" className="my-btn is-sub" autoFocus onClick={() => { onRemove(cur.photo.id); setAsk(false); }}>정말 지우기</button><button type="button" className="my-btn is-sub" onClick={() => setAsk(false)}>취소</button></>
            : <button type="button" className="my-btn is-sub" onClick={() => setAsk(true)}>이 사진 지우기</button>}
        </div>
      )}
    </article>
  );
}

export function MyGallery() {
  const { ready, projects } = useApp();
  const [log] = useState(readLog);
  const doneAt = useCallback((p: Project) => log.doneAt[p.id] ?? p.updatedAt ?? p.created, [log]);
  const done = useMemo(() => projects.filter(p => statusOf(p) === "done").sort((a, b) => doneAt(b) - doneAt(a)), [projects, doneAt]);

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

  const [sel, setSel] = useState<string | null>(null);
  const cur = done.find(p => p.id === sel) ?? done[0] ?? null;
  // + 사진 올리기: for the chosen work
  const file = useRef<HTMLInputElement>(null);
  const onFiles = async (fs: FileList | null) => {
    if (!fs || !cur) return;
    for (const f of Array.from(fs)) if (f.type.startsWith("image/")) { try { await addPhoto(cur.id, f, 1600); } catch { /* skip a picture that cannot be read */ } }
    if (file.current) file.current.value = "";
    load(done);
  };

  if (!ready) return null;
  return (
    <>
      <MyHead title="갤러리" line={`완성한 작품 ${done.length}개`} />
      <input ref={file} type="file" accept="image/*" multiple hidden onChange={e => onFiles(e.target.files)} />
      {done.length ? (
        <div className="my-split">
          <div className="my-split-list">
            <div className="my-split-scroll">
              <h3 className="my-lace-sub"><span>완성한 작품</span></h3>
              <ul className="my-rows">
                {done.map(p => {
                  const s = shots[p.id] ?? [], on = cur?.id === p.id;
                  return (
                    <li key={p.id}>
                      <button type="button" className={"my-row" + (on ? " is-on" : "")} aria-current={on ? "true" : undefined} onClick={() => setSel(p.id)}>
                        <span className="my-row-pic">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {s[0] ? <img src={s[0].url} alt="" /> : <BookCover p={p} w={38} />}
                        </span>
                        <span className="my-row-text"><b>{p.name}</b><span>{fmtDay(doneAt(p))}{s.length ? ` · 사진 ${s.length}장` : " · 사진 없음"}</span></span>
                        <Chev />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
          {cur && <WorkMemo key={cur.id} p={cur} shots={shots[cur.id] ?? []} done={doneAt(cur)} onAdd={() => file.current?.click()}
            onRemove={async id => { await removePhoto(id).catch(() => {}); load(done); }} />}
        </div>
      ) : <p className="my-card my-empty"><span>완성한 작품이 생기면 여기에 모여요.</span></p>}
    </>
  );
}
