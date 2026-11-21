"use client";
// My Page · 갤러리 (/my/gallery, Kim: in place of 나의 기록 - no numbers, no 뜬 날): every finished work has a
// slot (hatched until it has a photo); several photos a work; a photo opens large. + 사진 올리기 asks which work.
// Photos in IndexedDB (lib/photos.ts, 1600px); the finish date from lib/knitLog.ts.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { addPhoto, photosOf, removePhoto, type Photo } from "@/lib/photos";
import { readLog } from "@/lib/knitLog";
import { statusOf } from "@/lib/status";
import type { Project } from "@/lib/types";
import { MyHead } from "./MyLayout";

const fmtDay = (ms: number) => { const d = new Date(ms); return `${d.getMonth() + 1}월 ${d.getDate()}일 완성`; };

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

export function MyGallery() {
  const { ready, projects } = useApp();
  const [log] = useState(readLog);
  const done = useMemo(() => projects.filter(p => statusOf(p) === "done")
    .sort((a, b) => (log.doneAt[b.id] ?? b.updatedAt ?? b.created) - (log.doneAt[a.id] ?? a.updatedAt ?? a.created)), [projects, log]);

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


  if (!ready) return null;
  return (
    <>
      <MyHead title="갤러리" line={`완성한 작품 ${done.length}개`}>
        <div className="my-pick-wrap">
          <button type="button" className="my-btn" disabled={!done.length} onClick={() => setPicking(v => !v)} aria-expanded={picking}>+ 사진 올리기</button>
          {picking && (
            <div className="my-pop" role="menu" aria-label="어느 작품의 사진인가요">
              <p className="my-pop-kick">어느 작품의 사진인가요?</p>
              {done.map(p => <button key={p.id} type="button" role="menuitem" onClick={() => upload(p.id)}>{p.name}</button>)}
            </div>
          )}
        </div>
      </MyHead>
      <input ref={file} type="file" accept="image/*" multiple hidden onChange={e => onFiles(e.target.files)} />
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
      {lb && shots[lb.id]?.length ? (
        <Lightbox name={projects.find(p => p.id === lb.id)?.name ?? ""} shots={shots[lb.id]} at={lb.at} onClose={() => setLb(null)}
          onRemove={async id => { await removePhoto(id).catch(() => {}); load(done); }} />
      ) : null}
    </>
  );
}
