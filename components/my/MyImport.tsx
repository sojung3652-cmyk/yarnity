"use client";
// 도안 가져오기 (web, Kim; mockup S_C): a PDF or photos of a paper pattern onto the 나의 도안집 shelf. The wish
// box's memo-paper dialog (Sheet: ruled paper, up from below in 0.4s); two choices - PDF 파일 / 종이 도안 사진 (the
// chosen one gold-edged on the see-through dusty rose); a PDF (one, up to 30MB) or photos (up to 30, dragged into
// page order, "1쪽" on each, the first is the cover, a dashed + 사진 추가); 제목 (needed), 실 · 바늘, 메모 on
// underlined lines; 취소 / 책장에 꽂기. Files can be dropped anywhere on it. `edit`: the same dialog for a pattern
// already on the shelf (its words only).
import { useEffect, useRef, useState, type DragEvent } from "react";
import { MAX_PDF, MAX_PHOTOS, blankImported, newImportedId, putImported, readPdf, readPhotos, SaveError, updateImported, type Imported, type ImportedKind } from "@/lib/imported";
import { Sheet } from "./MyWish";
import { useBlobUrl } from "./ImportedCover";
import "./imported.css";

const isPdf = (f: File) => f.type === "application/pdf" || /\.pdf$/i.test(f.name);
const isPic = (f: File) => f.type.startsWith("image/");

const PdfIcon = () => <svg viewBox="0 0 40 48" aria-hidden="true"><path d="M6 2h20l10 10v32a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M26 2v10h10" fill="none" stroke="currentColor" strokeWidth="1.4" /><text x="20" y="33" textAnchor="middle" fontSize="7.5" fill="currentColor" fontFamily="serif">PDF</text></svg>;
const CamIcon = () => <svg viewBox="0 0 48 40" aria-hidden="true"><path d="M5 11h9l3-5h14l3 5h9a2 2 0 0 1 2 2v21a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V13a2 2 0 0 1 2-2z" fill="none" stroke="currentColor" strokeWidth="1.4" /><circle cx="24" cy="23" r="7.5" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>;

type Pic = { key: string; file: File; url: string };

export function MyImport({ onClose, edit }: { onClose: () => void; edit?: Imported }) {
  const [kind, setKind] = useState<ImportedKind>(edit?.kind ?? "pdf");
  const [pdf, setPdf] = useState<File | null>(null), [pdfInfo, setPdfInfo] = useState<{ pages: number; cover: Blob } | null>(null);
  const [pics, setPics] = useState<Pic[]>([]);
  const [title, setTitle] = useState(edit?.title ?? ""), [yarn, setYarn] = useState(edit?.yarn ?? ""), [memo, setMemo] = useState(edit?.memo ?? "");
  const [note, setNote] = useState(""), [busy, setBusy] = useState(false), [over, setOver] = useState(false);
  const pdfIn = useRef<HTMLInputElement>(null), picIn = useRef<HTMLInputElement>(null), drag = useRef<number | null>(null);
  useEffect(() => () => pics.forEach(p => URL.revokeObjectURL(p.url)), []); // eslint-disable-line react-hooks/exhaustive-deps
  const pdfCover = useBlobUrl(pdfInfo?.cover);

  const takePdf = async (f: File) => {
    setNote("");
    if (f.size > MAX_PDF) { setNote("PDF는 30MB까지 가져올 수 있어요."); return; }
    setKind("pdf"); setPdf(f); setPdfInfo(null); setBusy(true);
    try { const r = await readPdf(f); setPdfInfo({ pages: r.pageCount, cover: r.cover }); }
    catch { setPdf(null); setNote("이 PDF를 열지 못했어요."); }
    setBusy(false);
  };
  const takePics = (files: File[]) => {
    setNote("");
    const ok = files.filter(isPic); if (!ok.length) return;
    setKind("photo");
    setPics(cur => {
      const room = MAX_PHOTOS - cur.length;
      if (ok.length > room) setNote(`사진은 ${MAX_PHOTOS}장까지예요.`);
      return [...cur, ...ok.slice(0, Math.max(0, room)).map(f => ({ key: Math.random().toString(36).slice(2), file: f, url: URL.createObjectURL(f) }))];
    });
  };
  const dropFiles = (e: DragEvent) => {
    e.preventDefault(); setOver(false);
    if (edit || !e.dataTransfer.files.length) return;
    const fs = [...e.dataTransfer.files], p = fs.find(isPdf);
    if (p) takePdf(p); else takePics(fs);
  };
  const removePic = (k: string) => setPics(cur => { const x = cur.find(p => p.key === k); if (x) URL.revokeObjectURL(x.url); return cur.filter(p => p.key !== k); });
  const movePic = (from: number, to: number) => setPics(cur => { if (from === to) return cur; const n = [...cur], [m] = n.splice(from, 1); n.splice(to, 0, m); return n; });

  const ready = !!title.trim() && (edit ? true : kind === "pdf" ? !!pdf && !!pdfInfo : pics.length > 0);
  const save = async () => {
    if (!ready || busy) return; setBusy(true); setNote("");
    try {
      if (edit) await updateImported(edit.id, { title: title.trim().slice(0, 40), yarn: yarn.trim(), memo: memo.trim() });
      else {
        const id = newImportedId(), base = { ...blankImported(id, title.trim().slice(0, 40), kind), yarn: yarn.trim(), memo: memo.trim() };
        if (kind === "pdf") await putImported({ ...base, pdf: pdf!, pageCount: pdfInfo!.pages, coverBlob: pdfInfo!.cover });
        else { const r = await readPhotos(pics.map(p => p.file)); await putImported({ ...base, pages: r.pages, pageCount: r.pages.length, coverBlob: r.cover }); }
      }
      onClose();
    } catch (e) {
      setNote(e instanceof SaveError && e.message === "quota" ? "이 브라우저의 저장 공간이 부족해요." : "저장하지 못했어요. 다시 해 주세요.");
      setBusy(false);
    }
  };

  const head = (
    <header className="im-head">
      <h2>{edit ? "도안 정보 고치기" : "도안 가져오기"}</h2>
      <button type="button" className="im-x" aria-label="닫기" onClick={onClose}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg></button>
    </header>
  );
  return (
    <Sheet title={edit ? "도안 정보 고치기" : "도안 가져오기"} onClose={onClose} className={"im-sheet" + (over ? " is-over" : "")} head={head}>
      <div className="im-body" onDragOver={e => { if (!edit && e.dataTransfer.types.includes("Files")) { e.preventDefault(); setOver(true); } }} onDragLeave={() => setOver(false)} onDrop={dropFiles}>
        {!edit && <>
          <div className="im-choice" role="radiogroup" aria-label="가져올 것">
            <button type="button" role="radio" aria-checked={kind === "pdf"} className={kind === "pdf" ? "is-on" : ""} onClick={() => { setKind("pdf"); if (!pdf) pdfIn.current?.click(); }}>
              <span className="im-ico"><PdfIcon /></span><span><b>PDF 파일</b><small>산 도안, 받은 도안 파일</small></span>
            </button>
            <button type="button" role="radio" aria-checked={kind === "photo"} className={kind === "photo" ? "is-on" : ""} onClick={() => { setKind("photo"); if (!pics.length) picIn.current?.click(); }}>
              <span className="im-ico"><CamIcon /></span><span><b>종이 도안 사진</b><small>책 · 프린트를 찍어서, 여러 장</small></span>
            </button>
          </div>
          <input ref={pdfIn} type="file" accept="application/pdf,.pdf" hidden onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) takePdf(f); }} />
          <input ref={picIn} type="file" accept="image/*" multiple hidden onChange={e => { const fs = [...(e.target.files ?? [])]; e.target.value = ""; takePics(fs); }} />

          {kind === "pdf" ? (
            <div className="im-files">
              {pdf ? (
                <div className="im-pdf">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <span className="im-thumb">{pdfCover ? <img src={pdfCover} alt="" /> : null}<i>1쪽</i></span>
                  <span className="im-pdf-text"><b>{pdf.name}</b><small>{pdfInfo ? `${pdfInfo.pages}쪽` : "읽는 중"}</small></span>
                  <button type="button" className="im-link" onClick={() => pdfIn.current?.click()}>다른 파일</button>
                </div>
              ) : (
                <button type="button" className="im-add is-wide" onClick={() => pdfIn.current?.click()}><span aria-hidden="true">+</span>PDF 고르기</button>
              )}
            </div>
          ) : (
            <>
              <ol className="im-files im-pics">
                {pics.map((p, i) => (
                  <li key={p.key} draggable onDragStart={e => { drag.current = i; e.dataTransfer.effectAllowed = "move"; }}
                    onDragOver={e => { if (drag.current !== null) { e.preventDefault(); e.stopPropagation(); } }}
                    onDrop={e => { if (drag.current !== null) { e.preventDefault(); e.stopPropagation(); movePic(drag.current, i); drag.current = null; } }}
                    onDragEnd={() => { drag.current = null; }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <span className="im-thumb"><img src={p.url} alt={`${i + 1}쪽`} draggable={false} /><i>{i + 1}쪽</i></span>
                    <button type="button" className="im-del" aria-label={`${i + 1}쪽 지우기`} onClick={() => removePic(p.key)}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 4.5l7 7M11.5 4.5l-7 7" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg></button>
                  </li>
                ))}
                {pics.length < MAX_PHOTOS && <li><button type="button" className="im-add" onClick={() => picIn.current?.click()}><span aria-hidden="true">+</span>사진 추가</button></li>}
              </ol>
              {pics.length > 1 && <p className="im-hint">끌어서 쪽 순서를 바꿀 수 있어요. 첫 장이 표지가 돼요.</p>}
            </>
          )}
        </>}

        <div className="im-fields">
          <label><span>제목</span><input value={title} maxLength={40} onChange={e => setTitle(e.target.value)} /></label>
          <label><span>실 · 바늘</span><input value={yarn} maxLength={80} placeholder="선택 · 예: 아크릴 수세미실, 3.5mm" onChange={e => setYarn(e.target.value)} /></label>
          <label><span>메모</span><input value={memo} maxLength={200} placeholder="선택" onChange={e => setMemo(e.target.value)} /></label>
        </div>
        {note && <p className="im-note" role="alert">{note}</p>}
        <div className="my-sheet-foot">
          <button type="button" className="my-btn is-sub" onClick={onClose}>취소</button>
          <button type="button" className="my-btn" disabled={!ready || busy} onClick={save}>{busy ? "꽂는 중" : edit ? "저장" : "책장에 꽂기"}</button>
        </div>
      </div>
    </Sheet>
  );
}
