"use client";
// My Page · 나의 프로필 (/my/profile, Kim): no login yet, so it lives in this browser. Left: the avatar, the nickname
// (Yarni still calls the user by it), 주로 하는 것, 주로 쓰는 단위 (Kim: no 뜨개 경력, no 자주 쓰는 바늘,
// no note about the AI) - 고치기 turns them into fields,
// 저장 keeps them. Right: 내 데이터 (everything as one .json file, and reading it back after a check), and a
// dotted note that login is coming.
import { useRef, useState } from "react";
import { addPhoto, removePhoto } from "@/lib/photos";
import { backupSummary, makeBackup, readBackup, restoreBackup, type Backup } from "@/lib/backup";
import { saveProfile, useProfile, type Craft, type Profile } from "@/lib/profile";
import { Avatar, MyHead } from "./MyLayout";

const CRAFTS: Craft[] = ["코바늘", "대바늘", "둘 다"];

export function MyProfile() {
  const prof = useProfile();
  const [edit, setEdit] = useState<Profile | null>(null);
  const pic = useRef<HTMLInputElement>(null);
  const setPic = async (f: File | undefined) => {
    if (!f || !f.type.startsWith("image/")) return;
    try {
      const p = await addPhoto("profile:avatar", f, 1600);
      if (prof.avatar) removePhoto(prof.avatar).catch(() => {});
      saveProfile({ ...prof, avatar: p.id });
    } catch { /* no IndexedDB */ }
    if (pic.current) pic.current.value = "";
  };

  // 내 데이터
  const [busy, setBusy] = useState(""), [pending, setPending] = useState<Backup | null>(null), [bad, setBad] = useState(false);
  const fileIn = useRef<HTMLInputElement>(null);
  const exportAll = async () => {
    setBusy("export");
    try {
      const blob = await makeBackup(), d = new Date(), a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = `yarnity-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}.json`;
      a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } finally { setBusy(""); }
  };
  const pick = async (f: File | undefined) => {
    setBad(false); if (!f) return;
    const b = await readBackup(f); if (fileIn.current) fileIn.current.value = "";
    if (!b) { setBad(true); return; }
    setPending(b);
  };
  const restore = async () => {
    if (!pending) return; setBusy("import");
    try { await restoreBackup(pending); location.reload(); } catch { setBusy(""); setBad(true); setPending(null); }
  };

  const rows: { k: string; v: string; note?: string; field: (p: Profile, set: (p: Profile) => void) => React.ReactNode }[] = [
    { k: "닉네임", v: prof.nickname, field: (p, set) => <input maxLength={20} value={p.nickname} onChange={e => set({ ...p, nickname: e.target.value })} aria-label="닉네임" /> },
    { k: "주로 하는 것", v: prof.craft, field: (p, set) => (
      <span className="my-seg" role="radiogroup" aria-label="주로 하는 것">{CRAFTS.map(c => <button key={c} type="button" role="radio" aria-checked={p.craft === c} className={p.craft === c ? "is-on" : ""} onClick={() => set({ ...p, craft: c })}>{c}</button>)}</span>) },
    { k: "주로 쓰는 단위", v: prof.unit, field: (p, set) => (
      <span className="my-seg" role="radiogroup" aria-label="주로 쓰는 단위">{(["cm", "inch"] as const).map(u => <button key={u} type="button" role="radio" aria-checked={p.unit === u} className={p.unit === u ? "is-on" : ""} onClick={() => set({ ...p, unit: u })}>{u}</button>)}</span>) },
  ];
  const sum = pending ? backupSummary(pending) : null;
  return (
    <>
      <MyHead title="나의 프로필" line="지금은 이 브라우저에만 저장돼요" />
      <div className="my-prof">
        <section className="my-prof-main" aria-label="프로필">
          <div className="my-prof-top">
            <Avatar size={76} />
            <div className="my-prof-who">
              <b className={prof.nickname ? "" : "is-empty"}>{prof.nickname || "닉네임을 정해 주세요"}</b>
              <button type="button" className="my-textbtn" onClick={() => pic.current?.click()}>프로필 사진 바꾸기</button>
              {prof.avatar && <button type="button" className="my-textbtn is-quiet" onClick={() => { removePhoto(prof.avatar!).catch(() => {}); saveProfile({ ...prof, avatar: undefined }); }}>사진 빼기</button>}
              <input ref={pic} type="file" accept="image/*" hidden onChange={e => setPic(e.target.files?.[0])} />
            </div>
            {edit
              ? <span className="my-prof-btns"><button type="button" className="my-btn is-sub" onClick={() => setEdit(null)}>취소</button><button type="button" className="my-btn" onClick={() => { saveProfile({ ...edit, nickname: edit.nickname.trim() }); setEdit(null); }}>저장</button></span>
              : <button type="button" className="my-btn is-sub" onClick={() => setEdit({ ...prof })}>고치기</button>}
          </div>
          <dl className="my-prof-rows">
            {rows.map(r => (
              <div key={r.k}>
                <dt>{r.k}{r.note && <small>{r.note}</small>}</dt>
                <dd>{edit ? r.field(edit, setEdit) : r.v ? r.v : <span className="is-empty">아직 없어요</span>}</dd>
              </div>
            ))}
          </dl>
        </section>
        <aside className="my-prof-side">
          <section className="my-data" aria-labelledby="myData">
            <h2 id="myData" className="my-h2">내 데이터</h2>
            <p>작품, 사진, 위시는 이 브라우저에만 있어요. 다른 기기로 옮기려면 파일로 내보내세요.</p>
            <div className="my-data-btns">
              <button type="button" className="my-btn" disabled={!!busy} onClick={exportAll}>{busy === "export" ? "만드는 중" : "내보내기"}</button>
              <button type="button" className="my-btn is-sub" disabled={!!busy} onClick={() => fileIn.current?.click()}>가져오기</button>
              <input ref={fileIn} type="file" accept="application/json,.json" hidden onChange={e => pick(e.target.files?.[0])} />
            </div>
            {bad && <p className="my-hint">Yarnity에서 내보낸 파일이 아니에요.</p>}
          </section>
          <p className="my-login">로그인 · 준비 중 — 나중에 로그인하면 여러 기기에서 같이 쓸 수 있어요.</p>
        </aside>
      </div>
      {pending && sum && (
        <div className="my-dim" onMouseDown={e => { if (e.target === e.currentTarget && !busy) setPending(null); }}>
          <div className="my-sheet" role="alertdialog" aria-modal="true" aria-label="가져오기 확인">
            <h2>이 파일로 바꿀까요?</h2>
            <p className="my-sheet-text">{new Date(sum.at).toLocaleString("ko-KR")}에 내보낸 파일이에요. 작품 {sum.works}개, 사진 {sum.photos}장, 위시 {sum.wishes}개가 들어 있어요.</p>
            <p className="my-sheet-text is-warn">지금 이 브라우저에 있는 작품, 사진, 위시, 프로필은 모두 이 파일의 내용으로 바뀌어요. 되돌릴 수 없어요.</p>
            <div className="my-sheet-foot">
              <button type="button" className="my-btn is-sub" autoFocus disabled={!!busy} onClick={() => setPending(null)}>취소</button>
              <button type="button" className="my-btn" disabled={!!busy} onClick={restore}>{busy === "import" ? "바꾸는 중" : "바꾸기"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
