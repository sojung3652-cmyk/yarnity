"use client";
// 뜨개 사전 · 커뮤니티 표현 (Kim): the 설명 anyone can rewrite, like a wiki. Shows the newest 판 (or the built-in one
// before anyone has written), who wrote it and when; 고치기 opens it on the page (the words, a one-line why), and
// 수정 기록 lists every 판 - each can be brought back (a new 판 that copies it; nothing is ever erased). The name
// left is the profile's nickname, or 익명. No wiki on the server (lib/glossWiki "off"): the built-in 설명 only.
import { useState } from "react";
import type { GlossTerm } from "@/lib/glossary";
import { useWiki, wikiHistory, wikiSave, type WikiEdit } from "@/lib/glossWiki";
import { readProfile } from "@/lib/profile";

const when = (iso: string) => {
  const d = new Date(iso), m = (Date.now() - d.getTime()) / 60000;
  if (m < 1) return "방금"; if (m < 60) return `${Math.floor(m)}분 전`; if (m < 1440) return `${Math.floor(m / 60)}시간 전`;
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
};
const ERR: Record<string, string> = { busy: "지금 고치는 사람이 많아요. 잠시 뒤에 다시 저장해 주세요.", short: "설명을 두 글자 이상 적어 주세요.", off: "저장하지 못했어요. 잠시 뒤에 다시 해 주세요." };

export function WikiSummary({ term }: { term: GlossTerm }) {
  const wiki = useWiki(), cur = wiki.latest[term.id];
  const [edit, setEdit] = useState(false), [text, setText] = useState(""), [note, setNote] = useState("");
  const [busy, setBusy] = useState(false), [err, setErr] = useState("");
  const [hist, setHist] = useState<WikiEdit[] | null>(null), [histOpen, setHistOpen] = useState(false);
  const shown = cur?.summary ?? term.summary;
  const author = () => { try { return readProfile().nickname?.trim() || "익명"; } catch { return "익명"; } };

  const open = () => { setText(shown); setNote(""); setErr(""); setEdit(true); };
  const save = async (summary: string, extra: { note?: string; reverts?: number } = {}) => {
    if (busy) return; setBusy(true); setErr("");
    try {
      await wikiSave({ term: term.id, summary, author: author(), ...extra });
      setEdit(false); if (histOpen) setHist(await wikiHistory(term.id));
    } catch (e) { setErr(ERR[(e as Error).message] ?? ERR.off); }
    setBusy(false);
  };
  const toggleHist = async () => {
    if (histOpen) { setHistOpen(false); return; }
    setHistOpen(true); setHist(null);
    try { setHist(await wikiHistory(term.id)); } catch { setHist([]); }
  };

  return (
    <div className="gl-wiki">
      {!edit && <p className="gl-summary">{shown}</p>}
      {wiki.status === "on" && !edit && (
        <div className="gl-wiki-bar">
          <span>{cur ? `${cur.author} · ${when(cur.created_at)}` : "처음 설명"}</span>
          <button type="button" onClick={toggleHist} aria-expanded={histOpen}>수정 기록</button>
          <button type="button" className="is-main" onClick={open}>고치기</button>
        </div>
      )}
      {edit && (
        <form className="gl-wiki-form" onSubmit={e => { e.preventDefault(); const t = text.trim(); if (t !== shown.trim()) save(t, { note: note.trim() || undefined }); else setEdit(false); }}>
          <label><span>설명</span><textarea rows={4} maxLength={600} value={text} onChange={e => setText(e.target.value)} autoFocus /></label>
          <label><span>무엇을 고쳤나요</span><input maxLength={80} value={note} onChange={e => setNote(e.target.value)} /></label>
          <p className="gl-wiki-who">{author()}(으)로 남아요</p>
          {err && <p className="gl-wiki-err" role="alert">{err}</p>}
          <div className="gl-wiki-btns">
            <button type="button" onClick={() => setEdit(false)}>취소</button>
            <button type="submit" className="is-main" disabled={busy || text.trim().length < 2}>{busy ? "저장 중" : "저장"}</button>
          </div>
        </form>
      )}
      {histOpen && !edit && (
        <ol className="gl-wiki-hist" aria-label="수정 기록">
          {hist === null ? <li className="is-quiet">불러오는 중</li>
            : !hist.length ? <li className="is-quiet">아직 고친 사람이 없어요</li>
            : hist.map((h, i) => (
              <li key={h.id}>
                <p className="gl-wiki-h-head"><b>{h.author}</b><span>{when(h.created_at)}</span>{i === 0 && <em>지금 판</em>}</p>
                {(h.note || h.reverts) && <p className="gl-wiki-h-note">{h.reverts ? "이전 판으로 되돌림" : h.note}</p>}
                <p className="gl-wiki-h-text">{h.summary}</p>
                {i > 0 && <button type="button" disabled={busy} onClick={() => save(h.summary, { reverts: h.id })}>이 판으로 되돌리기</button>}
              </li>
            ))}
          {hist && hist.length > 0 && <li className="is-quiet">맨 처음 설명 · {term.summary}</li>}
        </ol>
      )}
      {err && !edit && <p className="gl-wiki-err" role="alert">{err}</p>}
    </div>
  );
}
