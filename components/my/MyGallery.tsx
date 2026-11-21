"use client";
// My Page · 갤러리 (/my/gallery, Kim): the glossary's layout - the finished works listed on its cream card (a small
// photo or the cover, the name, when it was finished, how many photos), the chosen one on the ruled memo slip at the
// right: its photos large with ‹ › and a row of small ones, + 사진 올리기 and 이 사진 지우기. Nothing chosen: the
// first comes up. A dashed slot at the end of the list records a work made outside Yarnity's patterns (Kim): its
// name, the day it was finished, photos (lib/gallery.ts). Photos in IndexedDB (lib/photos.ts, 1600px).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { BookCover } from "@/components/BookCover";
import { addPhoto, photosOf, removePhoto, type Photo } from "@/lib/photos";
import { readLog } from "@/lib/knitLog";
import { galleryPhotoKey, newGalleryId, saveGallery, useGallery, type GalleryEntry } from "@/lib/gallery";
import { statusOf } from "@/lib/status";
import type { Project } from "@/lib/types";
import { MyHead } from "./MyLayout";

const fmtDay = (ms: number) => { const d = new Date(ms); return `${d.getMonth() + 1}월 ${d.getDate()}일 완성`; };
type Shot = { photo: Photo; url: string };
type Shots = Record<string, Shot[]>;
/** a work in the gallery: one of the user's patterns, finished, or a record written in by hand */
type Item = { key: string; name: string; doneAt: number; project?: Project; entry?: GalleryEntry };
const Chev = () => <svg className="my-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 5.5 16 12l-6.5 6.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

/** the chosen work on the memo slip */
function WorkMemo({ it, shots, onAdd, onRemove, onDelete }: { it: Item; shots: Shot[]; onAdd: () => void; onRemove: (id: string) => void; onDelete?: () => void }) {
  const [i, setI] = useState(0), n = shots.length, cur = shots[Math.min(i, n - 1)];
  const [ask, setAsk] = useState(false), [askAll, setAskAll] = useState(false);
  useEffect(() => { if (i > n - 1) setI(Math.max(0, n - 1)); }, [n, i]);
  return (
    <article className="my-memo" aria-label={`${it.name} 사진`}>
      <p className="my-memo-kick">{fmtDay(it.doneAt)}{n ? ` · 사진 ${n}장` : ""}{it.entry ? " · 직접 기록" : ""}</p>
      <h2>{it.name}</h2>
      {cur ? <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="my-memo-pic" src={cur.url} alt={`${it.name} 사진 ${i + 1}`} />
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
      <div className="my-memo-btns">
        {cur && <button type="button" className="my-btn" onClick={onAdd}>+ 사진 올리기</button>}
        {cur && (ask
          ? <><button type="button" className="my-btn is-sub" autoFocus onClick={() => { onRemove(cur.photo.id); setAsk(false); }}>정말 지우기</button><button type="button" className="my-btn is-sub" onClick={() => setAsk(false)}>취소</button></>
          : <button type="button" className="my-btn is-sub" onClick={() => setAsk(true)}>이 사진 지우기</button>)}
        {onDelete && (askAll
          ? <><button type="button" className="my-btn is-sub" autoFocus onClick={onDelete}>기록과 사진 모두 지우기</button><button type="button" className="my-btn is-sub" onClick={() => setAskAll(false)}>취소</button></>
          : <button type="button" className="my-btn is-sub" onClick={() => setAskAll(true)}>이 기록 지우기</button>)}
      </div>
    </article>
  );
}

/** writing in a work made outside the patterns: its name, the day it was finished, photos */
function RecordForm({ onClose, onSaved }: { onClose: () => void; onSaved: (id: string) => void }) {
  const all = useGallery();
  const [name, setName] = useState(""), [day, setDay] = useState(""), [files, setFiles] = useState<File[]>([]), [saving, setSaving] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const previews = useMemo(() => files.map(f => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach(u => URL.revokeObjectURL(u)), [previews]);
  useEffect(() => {
    box.current?.querySelector<HTMLElement>("input")?.focus();
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", key); return () => document.removeEventListener("keydown", key);
  }, [onClose]);
  const ok = !!name.trim() && !!day;
  const save = async () => {
    if (!ok || saving) return; setSaving(true);
    const id = newGalleryId(), [y, m, d] = day.split("-").map(Number);
    for (const f of files) { try { await addPhoto(galleryPhotoKey(id), f, 1600); } catch { /* skip a picture that cannot be read */ } }
    saveGallery([{ id, name: name.trim().slice(0, 40), doneAt: new Date(y, m - 1, d, 12).getTime(), at: Date.now() }, ...all]);
    onSaved(id); onClose();
  };
  return (
    <div className="my-dim" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={box} className="my-sheet" role="dialog" aria-modal="true" aria-label="작품 직접 기록하기">
        <h2>작품 직접 기록하기</h2>
        <label className="my-field"><span>작품 이름</span><input maxLength={40} value={name} onChange={e => setName(e.target.value)} /></label>
        <label className="my-field"><span>완성한 날</span><input type="date" max={today()} value={day} onChange={e => setDay(e.target.value)} /></label>
        <label className="my-drop">
          {previews.length
            // eslint-disable-next-line @next/next/no-img-element
            ? <span className="my-drop-many">{previews.map(u => <img key={u} src={u} alt="" />)}</span>
            : <span>사진 고르기 (여러 장 가능)</span>}
          <input type="file" accept="image/*" multiple hidden onChange={e => setFiles(Array.from(e.target.files ?? []).filter(f => f.type.startsWith("image/")))} />
        </label>
        <div className="my-sheet-foot">
          <button type="button" className="my-btn is-sub" onClick={onClose}>취소</button>
          <button type="button" className="my-btn" disabled={!ok || saving} onClick={save}>{saving ? "저장하는 중" : "저장"}</button>
        </div>
      </div>
    </div>
  );
}

export function MyGallery() {
  const { ready, projects } = useApp(), entries = useGallery();
  const [log] = useState(readLog);
  const items = useMemo<Item[]>(() => [
    ...projects.filter(p => statusOf(p) === "done").map(p => ({ key: p.id, name: p.name, doneAt: log.doneAt[p.id] ?? p.updatedAt ?? p.created, project: p })),
    ...entries.map(e => ({ key: galleryPhotoKey(e.id), name: e.name, doneAt: e.doneAt, entry: e })),
  ].sort((a, b) => b.doneAt - a.doneAt), [projects, entries, log]);

  // the photos, as object URLs while the page is open
  const [shots, setShots] = useState<Shots>({});
  const urls = useRef<string[]>([]);
  const load = useCallback(async (list: Item[]) => {
    const out: Shots = {}, made: string[] = [];
    try {
      for (const it of list) out[it.key] = (await photosOf(it.key)).map(photo => { const url = URL.createObjectURL(photo.blob); made.push(url); return { photo, url }; });
    } catch { /* no IndexedDB */ }
    urls.current.forEach(u => URL.revokeObjectURL(u)); urls.current = made; setShots(out);
  }, []);
  useEffect(() => { if (ready) load(items); }, [ready, items, load]);
  useEffect(() => () => urls.current.forEach(u => URL.revokeObjectURL(u)), []);

  const [sel, setSel] = useState<string | null>(null), [recording, setRecording] = useState(false);
  const cur = items.find(it => it.key === sel) ?? items[0] ?? null;
  // + 사진 올리기: for the chosen work
  const file = useRef<HTMLInputElement>(null);
  const onFiles = async (fs: FileList | null) => {
    if (!fs || !cur) return;
    for (const f of Array.from(fs)) if (f.type.startsWith("image/")) { try { await addPhoto(cur.key, f, 1600); } catch { /* skip a picture that cannot be read */ } }
    if (file.current) file.current.value = "";
    load(items);
  };
  const deleteEntry = async (it: Item) => {
    if (!it.entry) return;
    for (const s of shots[it.key] ?? []) await removePhoto(s.photo.id).catch(() => {});
    saveGallery(entries.filter(e => e.id !== it.entry!.id)); setSel(null);
  };

  if (!ready) return null;
  return (
    <>
      <MyHead title="갤러리" />
      <input ref={file} type="file" accept="image/*" multiple hidden onChange={e => onFiles(e.target.files)} />
      <div className="my-split">
        <div className="my-split-list">
          <div className="my-split-scroll">
            <h3 className="my-lace-sub"><span>완성한 작품</span></h3>
            <ul className="my-rows">
              {items.map(it => {
                const s = shots[it.key] ?? [], on = cur?.key === it.key;
                return (
                  <li key={it.key}>
                    <button type="button" className={"my-row" + (on ? " is-on" : "")} aria-current={on ? "true" : undefined} onClick={() => setSel(it.key)}>
                      <span className="my-row-pic">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {s[0] ? <img src={s[0].url} alt="" /> : it.project ? <BookCover p={it.project} w={38} /> : <span className="my-row-mark" aria-hidden="true">✿</span>}
                      </span>
                      <span className="my-row-text"><b>{it.name}</b><span>{fmtDay(it.doneAt)}{s.length ? ` · 사진 ${s.length}장` : " · 사진 없음"}</span></span>
                      <Chev />
                    </button>
                  </li>
                );
              })}
              {/* the dashed slot (Kim): a work made outside the patterns, recorded by hand */}
              <li><button type="button" className="my-row-new" onClick={() => setRecording(true)}><span aria-hidden="true">+</span>직접 기록하기</button></li>
            </ul>
          </div>
        </div>
        {cur ? <WorkMemo key={cur.key} it={cur} shots={shots[cur.key] ?? []} onAdd={() => file.current?.click()}
            onRemove={async id => { await removePhoto(id).catch(() => {}); load(items); }} onDelete={cur.entry ? () => deleteEntry(cur) : undefined} />
          : <article className="my-memo"><p className="my-memo-text">완성한 작품이 생기면 여기에 모여요. 다른 곳에서 뜬 작품은 왼쪽의 &lsquo;직접 기록하기&rsquo;로 남길 수 있어요.</p></article>}
      </div>
      {recording && <RecordForm onClose={() => setRecording(false)} onSaved={id => setSel(galleryPhotoKey(id))} />}
    </>
  );
}
