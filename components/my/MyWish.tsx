"use client";
// My Page · 위시 보관함 (/my/wish, Kim): shop links, pictures of things to knit or yarn to buy, notes - cards of
// the glossary's layout (Kim): the list on its cream card, under slim ivory laces (링크 / 뜨고 싶은 편물 / 갖고 싶은
// 실 / 메모), the chosen one on the ruled memo slip at the right (고치기, 지우기). A link reads its page's title,
// picture and price (app/api/link-preview) and whatever it cannot read is typed in.
// Kept in this browser (lib/wish.ts; pictures in IndexedDB).
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { addPhoto, removePhoto } from "@/lib/photos";
import { newWishId, saveWishes, useWishes, type Wish, type WishKind } from "@/lib/wish";
import { MyHead, usePhotoUrl } from "./MyLayout";

const I = { width: 15, height: 15, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" } as const;
// small line icons in place of emoji (the UI has none)
export const WishIcon = {
  link: <svg {...I} aria-hidden="true"><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.2 1.2" /><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2" /></svg>,
  photo: <svg {...I} aria-hidden="true"><path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.5-2h6l1.5 2h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" /><circle cx="12" cy="13" r="3.2" /></svg>,
  memo: <svg {...I} aria-hidden="true"><path d="M15.5 4.5l4 4L9 19H5v-4z" /><path d="M13.5 6.5l4 4" /></svg>,
};
type Filter = "all" | "link" | "knit" | "yarn" | "memo";
const FILTERS: { id: Filter; label: string }[] = [{ id: "all", label: "전체" }, { id: "link", label: "링크" }, { id: "knit", label: "편물" }, { id: "yarn", label: "실" }, { id: "memo", label: "메모" }];
const KIND_KO: Record<WishKind, string> = { link: "링크", knit: "뜨고 싶은 편물", yarn: "갖고 싶은 실", memo: "메모" };

/** a dialog over the page: Esc and the dim close it, focus starts inside */
function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    box.current?.querySelector<HTMLElement>("input,textarea,button")?.focus();
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", key); return () => document.removeEventListener("keydown", key);
  }, [onClose]);
  return (
    <div className="my-dim" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={box} className="my-sheet" role="dialog" aria-modal="true" aria-label={title}>
        <h2>{title}</h2>{children}
      </div>
    </div>
  );
}

/** adding or changing a card */
function WishForm({ kind, wish, onClose }: { kind: "link" | "photo" | "memo"; wish?: Wish; onClose: () => void }) {
  const all = useWishes();
  const [url, setUrl] = useState(wish?.url ?? ""), [title, setTitle] = useState(wish?.title ?? ""), [shop, setShop] = useState(wish?.shop ?? "");
  const [price, setPrice] = useState(wish?.price ?? ""), [image, setImage] = useState(wish?.image ?? "");
  const [reading, setReading] = useState<"" | "busy" | "fail" | "ok">("");
  const [ptype, setPtype] = useState<"knit" | "yarn">(wish?.kind === "yarn" ? "yarn" : "knit"), [file, setFile] = useState<File | null>(null);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const oldPic = usePhotoUrl(wish?.photo);
  const [text, setText] = useState(wish?.text ?? ""), [tone, setTone] = useState<"cream" | "rose">(wish?.tone ?? "cream");
  const [saving, setSaving] = useState(false);

  const read = async () => {
    if (!/^https?:\/\//i.test(url.trim())) { setReading("fail"); return; }
    setReading("busy");
    try {
      const r = await fetch("/api/link-preview", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: url.trim() }) });
      const j = await r.json();
      if (!r.ok || j.error) { setReading("fail"); return; }
      if (j.title) setTitle(t => t || j.title); if (j.shop) setShop(s => s || j.shop); if (j.price) setPrice(p => p || j.price); if (j.image) setImage(i => i || j.image);
      setReading("ok");
    } catch { setReading("fail"); }
  };
  const ok = kind === "link" ? /^https?:\/\//i.test(url.trim()) && !!title.trim() : kind === "photo" ? (!!file || !!wish?.photo) && !!title.trim() : !!text.trim();
  const save = async () => {
    if (!ok || saving) return; setSaving(true);
    const id = wish?.id ?? newWishId(), at = wish?.at ?? Date.now();
    let w: Wish;
    if (kind === "link") w = { id, kind: "link", title: title.trim(), url: url.trim(), shop: shop.trim() || undefined, price: price.trim() || undefined, image: image.trim() || undefined, at };
    else if (kind === "photo") {
      let photo = wish?.photo;
      if (file) { try { const p = await addPhoto("wish:" + id, file, 1600); if (photo) removePhoto(photo).catch(() => {}); photo = p.id; } catch { setSaving(false); return; } }
      w = { id, kind: ptype, title: title.trim(), photo, at };
    } else w = { id, kind: "memo", title: "", text: text.trim(), tone, at };
    saveWishes(wish ? all.map(x => (x.id === id ? w : x)) : [w, ...all]);
    onClose();
  };
  const head = (wish ? "고치기 · " : "") + (kind === "link" ? "링크" : kind === "photo" ? "사진" : "메모");
  return (
    <Sheet title={head} onClose={onClose}>
      {kind === "link" && <>
        <label className="my-field"><span>주소</span>
          <span className="my-field-row"><input type="url" inputMode="url" placeholder="https://" value={url} onChange={e => { setUrl(e.target.value); setReading(""); }} onBlur={() => { if (url.trim() && !reading && !title) read(); }} />
            <button type="button" className="my-btn is-sub" onClick={read} disabled={reading === "busy"}>{reading === "busy" ? "읽는 중" : "읽어 오기"}</button></span>
        </label>
        {reading === "fail" && <p className="my-hint">이 주소에서 정보를 읽지 못했어요. 아래에 직접 적어 주세요.</p>}
        {image && /* eslint-disable-next-line @next/next/no-img-element */ <img className="my-form-pic" src={image} alt="" onError={() => setImage("")} />}
        <label className="my-field"><span>상품명</span><input value={title} onChange={e => setTitle(e.target.value)} /></label>
        <div className="my-field-2">
          <label className="my-field"><span>가게 이름</span><input value={shop} onChange={e => setShop(e.target.value)} /></label>
          <label className="my-field"><span>가격</span><input value={price} onChange={e => setPrice(e.target.value)} /></label>
        </div>
      </>}
      {kind === "photo" && <>
        <div className="my-seg" role="radiogroup" aria-label="종류">
          {(["knit", "yarn"] as const).map(k => <button key={k} type="button" role="radio" aria-checked={ptype === k} className={ptype === k ? "is-on" : ""} onClick={() => setPtype(k)}>{KIND_KO[k]}</button>)}
        </div>
        <label className="my-drop">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {preview || oldPic ? <img src={preview ?? oldPic ?? ""} alt="" /> : <span>{WishIcon.photo}사진 고르기</span>}
          <input type="file" accept="image/*" hidden onChange={e => setFile(e.target.files?.[0] ?? null)} />
        </label>
        <label className="my-field"><span>제목</span><input value={title} onChange={e => setTitle(e.target.value)} /></label>
      </>}
      {kind === "memo" && <>
        <label className="my-field"><span>메모</span><textarea rows={4} maxLength={300} value={text} onChange={e => setText(e.target.value)} /></label>
        <div className="my-seg" role="radiogroup" aria-label="카드 색">
          {(["cream", "rose"] as const).map(t => <button key={t} type="button" role="radio" aria-checked={tone === t} className={(tone === t ? "is-on " : "") + "is-" + t} onClick={() => setTone(t)}>{t === "cream" ? "크림" : "연로즈"}</button>)}
        </div>
      </>}
      <div className="my-sheet-foot">
        <button type="button" className="my-btn is-sub" onClick={onClose}>취소</button>
        <button type="button" className="my-btn" disabled={!ok || saving} onClick={save}>저장</button>
      </div>
    </Sheet>
  );
}

const SECTIONS: { kind: WishKind; label: string }[] = [{ kind: "link", label: "링크" }, { kind: "knit", label: "뜨고 싶은 편물" }, { kind: "yarn", label: "갖고 싶은 실" }, { kind: "memo", label: "메모" }];
const Chev = () => <svg className="my-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 5.5 16 12l-6.5 6.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const memoTitle = (w: Wish) => (w.text ?? "").split("\n")[0].slice(0, 40);

/** one row of the list: a small picture (or the kind's mark), the title, one line under it */
function WishRow({ w, on, onPick }: { w: Wish; on: boolean; onPick: () => void }) {
  const pic = usePhotoUrl(w.photo);
  const src = w.kind === "link" ? w.image : pic ?? undefined;
  const sub = w.kind === "link" ? [w.shop, w.price].filter(Boolean).join(" · ") || "링크" : w.kind === "memo" ? new Date(w.at).toLocaleDateString("ko-KR") : KIND_KO[w.kind];
  return (
    <li>
      <button type="button" className={"my-row" + (on ? " is-on" : "")} aria-current={on ? "true" : undefined} onClick={onPick}>
        <span className={"my-row-pic" + (w.kind === "memo" ? " is-memo tone-" + (w.tone ?? "cream") : "")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {src ? <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
            : w.kind === "memo" ? "“" : w.kind === "link" ? WishIcon.link : WishIcon.photo}
        </span>
        <span className="my-row-text"><b>{w.kind === "memo" ? memoTitle(w) : w.title}</b><span>{sub}</span></span>
        <Chev />
      </button>
    </li>
  );
}

/** the chosen wish on the memo slip: the picture large, what it is, the link, the note; 고치기 / 지우기 */
function WishMemo({ w, onEdit }: { w: Wish; onEdit: () => void }) {
  const all = useWishes(), pic = usePhotoUrl(w.photo), [ask, setAsk] = useState(false);
  const remove = () => { if (w.photo) removePhoto(w.photo).catch(() => {}); saveWishes(all.filter(x => x.id !== w.id)); };
  const src = w.kind === "link" ? w.image : pic ?? undefined;
  return (
    <article className="my-memo" aria-label="고른 위시">
      <p className="my-memo-kick">{w.kind === "link" ? WishIcon.link : w.kind === "memo" ? WishIcon.memo : WishIcon.photo}<span>{w.kind === "link" ? `링크${w.shop ? ` · ${w.shop}` : ""}` : KIND_KO[w.kind]}</span></p>
      {w.kind !== "memo" && <h2>{w.title}</h2>}
      {w.price && <p className="my-memo-sub">{w.price}</p>}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src && <img className="my-memo-pic" src={src} alt="" referrerPolicy="no-referrer" onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />}
      {w.kind === "memo" && <p className="my-memo-text">{w.text}</p>}
      <div className="my-memo-btns">
        {w.kind === "link" && <a className="my-btn" href={w.url} target="_blank" rel="noopener noreferrer">바로가기 →</a>}
        <button type="button" className="my-btn is-sub" onClick={onEdit}>고치기</button>
        {ask
          ? <><button type="button" className="my-btn" autoFocus onClick={remove}>정말 지우기</button><button type="button" className="my-btn is-sub" onClick={() => setAsk(false)}>취소</button></>
          : <button type="button" className="my-btn is-sub" onClick={() => setAsk(true)}>지우기</button>}
      </div>
    </article>
  );
}

export function MyWish() {
  const wishes = useWishes(), [filter, setFilter] = useState<Filter>("all");
  const [form, setForm] = useState<{ kind: "link" | "photo" | "memo"; wish?: Wish } | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const counts = useMemo(() => { const c: Record<Filter, number> = { all: wishes.length, link: 0, knit: 0, yarn: 0, memo: 0 }; wishes.forEach(w => c[w.kind]++); return c; }, [wishes]);
  const sections = useMemo(() => SECTIONS.filter(s => filter === "all" || s.kind === filter)
    .map(s => ({ ...s, items: wishes.filter(w => w.kind === s.kind) })).filter(s => s.items.length), [wishes, filter]);
  // nothing chosen (or it was deleted): the first in the list comes up, as in the glossary
  const shown = sections.flatMap(s => s.items), cur = shown.find(w => w.id === sel) ?? shown[0] ?? null;
  const buttons = (
    <>
      <button type="button" className="my-btn is-sub" onClick={() => setForm({ kind: "link" })}>{WishIcon.link}링크</button>
      <button type="button" className="my-btn is-sub" onClick={() => setForm({ kind: "photo" })}>{WishIcon.photo}사진</button>
      <button type="button" className="my-btn" onClick={() => setForm({ kind: "memo" })}>{WishIcon.memo}메모</button>
    </>
  );
  return (
    <>
      <MyHead title="위시 보관함" line="갖고 싶은 실, 뜨고 싶은 편물, 판매 링크, 메모">{buttons}</MyHead>
      {wishes.length ? <>
        <div className="my-pills" role="tablist" aria-label="종류로 거르기">
          {FILTERS.map(f => <button key={f.id} type="button" role="tab" aria-selected={filter === f.id} className={"my-pill" + (filter === f.id ? " is-on" : "")} onClick={() => setFilter(f.id)}>{f.label} <span>{counts[f.id]}</span></button>)}
        </div>
        {shown.length ? (
          <div className="my-split">
            <div className="my-split-list">
              <div className="my-split-scroll">
                {sections.map(s => (
                  <section key={s.kind} aria-label={s.label}>
                    <h3 className="my-lace-sub"><span>{s.label}</span></h3>
                    <ul className="my-rows">{s.items.map(w => <WishRow key={w.id} w={w} on={cur?.id === w.id} onPick={() => setSel(w.id)} />)}</ul>
                  </section>
                ))}
              </div>
            </div>
            {cur && <WishMemo key={cur.id} w={cur} onEdit={() => setForm({ kind: cur.kind === "link" ? "link" : cur.kind === "memo" ? "memo" : "photo", wish: cur })} />}
          </div>
        ) : <p className="my-quiet">이 종류의 카드가 아직 없어요.</p>}
      </> : (
        <div className="my-card my-empty is-wish"><p>마음에 드는 실이나 편물을 모아 보세요</p><div className="my-head-end">{buttons}</div></div>
      )}
      {form && <WishForm key={form.wish?.id ?? form.kind} kind={form.kind} wish={form.wish} onClose={() => setForm(null)} />}
    </>
  );
}
