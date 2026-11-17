"use client";
// 사진 기록: a work's photos in a paper dialog - "+ 사진 올리기" (several at once; on phones the camera is
// offered by the file picker), a grid newest first with the date, a photo opens large, and each can be
// removed (asked in place). Photos live in this browser only (lib/photos.ts).
import { useEffect, useRef, useState } from "react";
import { addPhoto, photosOf, removePhoto, type Photo } from "@/lib/photos";

const when = (t: number) => new Date(t).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });

export function PhotoLog({ projectId, name, onClose, onChange }: { projectId: string; name: string; onClose: () => void; onChange: () => void }) {
  const [photos, setPhotos] = useState<Photo[]>([]), [urls, setUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false), [err, setErr] = useState(""), [big, setBig] = useState<Photo | null>(null), [ask, setAsk] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);

  const load = async () => { setPhotos(await photosOf(projectId)); };
  useEffect(() => { load(); box.current?.querySelector<HTMLElement>(".pl-add")?.focus(); }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps
  // object URLs for the photos shown, revoked when they change or the dialog closes
  useEffect(() => {
    const u: Record<string, string> = {}; photos.forEach(p => { u[p.id] = URL.createObjectURL(p.blob); }); setUrls(u);
    return () => Object.values(u).forEach(URL.revokeObjectURL);
  }, [photos]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); if (big) setBig(null); else onClose(); } };
    document.addEventListener("keydown", k); return () => document.removeEventListener("keydown", k);
  }, [big, onClose]);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true); setErr("");
    try { for (const f of Array.from(files)) if (f.type.startsWith("image/")) await addPhoto(projectId, f); }
    catch { setErr("사진을 저장하지 못했어요. 브라우저 저장 공간이 부족할 수 있어요."); }
    setBusy(false); await load(); onChange();
  };
  const remove = async (id: string) => { await removePhoto(id); setAsk(null); setBig(null); await load(); onChange(); };

  return (
    <div className="pl-bg" onClick={onClose}>
      <div ref={box} className="pl" role="dialog" aria-modal="true" aria-labelledby="plTitle" onClick={e => e.stopPropagation()}>
        <div className="pl-head">
          <h2 id="plTitle">사진 기록<span>{name}</span></h2>
          <button type="button" className="pl-x" aria-label="닫기" onClick={onClose}>×</button>
        </div>
        {big ? (
          <figure className="pl-big">
            {urls[big.id] && <img src={urls[big.id]} alt={`${name} · ${when(big.at)}`} />}
            <figcaption>
              <span>{when(big.at)}</span>
              {ask === big.id
                ? <span className="pl-ask">이 사진을 지울까요? <button type="button" onClick={() => setAsk(null)}>취소</button><button type="button" className="danger" onClick={() => remove(big.id)}>지우기</button></span>
                : <span><button type="button" onClick={() => setAsk(big.id)}>지우기</button><button type="button" onClick={() => setBig(null)}>목록으로</button></span>}
            </figcaption>
          </figure>
        ) : (
          <>
            <label className="pl-add" tabIndex={0} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); (e.currentTarget.querySelector("input") as HTMLInputElement).click(); } }}>
              {busy ? "올리는 중…" : "+ 사진 올리기"}
              <input type="file" accept="image/*" multiple disabled={busy} onChange={e => { upload(e.target.files); e.target.value = ""; }} />
            </label>
            {err && <p className="pl-err" role="alert">{err}</p>}
            {photos.length ? (
              <ul className="pl-grid">
                {photos.map(p => (
                  <li key={p.id}><button type="button" onClick={() => setBig(p)}>{urls[p.id] && <img src={urls[p.id]} alt="" />}<span>{when(p.at)}</span></button></li>
                ))}
              </ul>
            ) : <p className="pl-none">아직 사진이 없어요. 뜨는 중간이나 완성한 모습을 남겨 보세요.</p>}
            <p className="pl-note">사진은 이 브라우저에만 저장돼요.</p>
          </>
        )}
      </div>
    </div>
  );
}
