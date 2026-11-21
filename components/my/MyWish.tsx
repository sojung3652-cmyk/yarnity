"use client";
// My Page · 위시 보관함 (/my/wish, Kim): shop links, pictures of things to knit or yarn to buy, notes - cards of
// 나의 도안집's look (Kim): tabs with counts (전체 · 링크 · 편물 · 실 · 메모), the wishes on shelves like books (a
// picture as the cover, a note as its paper), a dashed + 위시 담기 slot at the end; one opens on the ruled memo
// slip over the page (바로가기, 고치기, 지우기). A link reads its page's title,
// picture and price (app/api/link-preview) and whatever it cannot read is typed in.
// Kept in this browser (lib/wish.ts; pictures in IndexedDB).
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { addPhoto, removePhoto } from "@/lib/photos";
import { newWishId, saveWishes, useWishes, type Wish, type WishKind } from "@/lib/wish";
import { MyHead, usePhotoUrl } from "./MyLayout";
import "@/app/mine/mine.css"; // 나의 도안집's tabs and shelves

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

const memoTitle = (w: Wish) => (w.text ?? "").split("\n")[0].slice(0, 40);
const TAB_KO: Record<Filter, string> = { all: "전체", link: "링크", knit: "편물", yarn: "실", memo: "메모" };

/** items per shelf from the shelves' width, as 나의 도안집 */
function useColumns() {
  const ref = useRef<HTMLDivElement>(null), [cols, setCols] = useState(6);
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const fit = () => { const w = el.clientWidth; setCols(w >= 1080 ? 7 : w >= 900 ? 6 : w >= 720 ? 5 : 4); };
    fit(); const ro = new ResizeObserver(fit); ro.observe(el); return () => ro.disconnect();
  });
  return [ref, cols] as const;
}

/** one wish on the shelf, like a book: its picture as the cover (a note: the paper with its first words) */
function WishBook({ w, onOpen }: { w: Wish; onOpen: () => void }) {
  const pic = usePhotoUrl(w.photo), src = w.kind === "link" ? w.image : pic ?? undefined;
  const sub = w.kind === "link" ? [w.shop, w.price].filter(Boolean).join(" · ") || "링크" : w.kind === "memo" ? "메모" : KIND_KO[w.kind];
  return (
    <button type="button" className="bk-book my-wbook" aria-haspopup="dialog" onClick={onOpen}>
      <span className={"my-wcover is-" + w.kind + (w.kind === "memo" ? " tone-" + (w.tone ?? "cream") : "")}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {src ? <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
          : w.kind === "memo" ? <span className="my-wcover-memo">{w.text}</span> : <span className="my-wcover-mark">{w.kind === "link" ? WishIcon.link : WishIcon.photo}</span>}
      </span>
      <span className="bk-name">{w.kind === "memo" ? memoTitle(w) : w.title}</span>
      <span className="bk-where">{sub}</span>
    </button>
  );
}

/** a wish opened: the memo slip over the page (Esc and the dim close it) */
function WishMemo({ w, onEdit, onClose }: { w: Wish; onEdit: () => void; onClose: () => void }) {
  const all = useWishes(), pic = usePhotoUrl(w.photo), [ask, setAsk] = useState(false);
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", key); return () => document.removeEventListener("keydown", key);
  }, [onClose]);
  const remove = () => { if (w.photo) removePhoto(w.photo).catch(() => {}); saveWishes(all.filter(x => x.id !== w.id)); onClose(); };
  const src = w.kind === "link" ? w.image : pic ?? undefined;
  return (
    <div className="my-dim" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <article className="my-memo my-memo-pop" role="dialog" aria-modal="true" aria-label="위시">
        <button type="button" className="my-pop-x" aria-label="닫기" autoFocus onClick={onClose}>✕</button>
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
            ? <><button type="button" className="my-btn" onClick={remove}>정말 지우기</button><button type="button" className="my-btn is-sub" onClick={() => setAsk(false)}>취소</button></>
            : <button type="button" className="my-btn is-sub" onClick={() => setAsk(true)}>지우기</button>}
        </div>
      </article>
    </div>
  );
}

export function MyWish() {
  const wishes = useWishes(), [filter, setFilter] = useState<Filter>("all");
  const [form, setForm] = useState<{ kind: "link" | "photo" | "memo"; wish?: Wish } | null>(null);
  const [open, setOpen] = useState<string | null>(null), [adding, setAdding] = useState(false);
  const counts = useMemo(() => { const c: Record<Filter, number> = { all: wishes.length, link: 0, knit: 0, yarn: 0, memo: 0 }; wishes.forEach(w => c[w.kind]++); return c; }, [wishes]);
  const shown = useMemo(() => (filter === "all" ? wishes : wishes.filter(w => w.kind === filter)), [wishes, filter]);
  const [shelvesRef, cols] = useColumns();
  // the dashed + 위시 담기 slot (null) after the last one, as 나의 도안집's + 새 도안
  const shelves = useMemo(() => { const all: (Wish | null)[] = [...shown, null], out: (Wish | null)[][] = []; for (let i = 0; i < all.length; i += cols) out.push(all.slice(i, i + cols)); return out; }, [shown, cols]);
  const openW = open ? wishes.find(w => w.id === open) ?? null : null;
  const add = (kind: "link" | "photo" | "memo") => { setAdding(false); setForm({ kind }); };
  const buttons = (
    <>
      <button type="button" className="my-btn is-sub" onClick={() => add("link")}>{WishIcon.link}링크</button>
      <button type="button" className="my-btn is-sub" onClick={() => add("photo")}>{WishIcon.photo}사진</button>
      <button type="button" className="my-btn" onClick={() => add("memo")}>{WishIcon.memo}메모</button>
    </>
  );
  return (
    <>
      <MyHead title="위시 보관함">{buttons}</MyHead>
      <div className="mine my-shelf my-wish-shelf">
        <div className="mine-tools">
          <div className="mine-row">
            <div className="mine-tabs" role="tablist" aria-label="종류로 거르기">
              {(Object.keys(TAB_KO) as Filter[]).map(f => <button key={f} type="button" role="tab" aria-selected={filter === f} className="mine-tab" onClick={() => setFilter(f)}>{TAB_KO[f]} <span>{counts[f]}</span></button>)}
            </div>
          </div>
        </div>
        <div ref={shelvesRef} className="bk-shelves" style={{ "--cols": cols } as React.CSSProperties}>
          {shelves.map((row, i) => (
            <div key={i} className="bk-row">
              <ul className="bk-books">
                {row.map(w => w
                  ? <li key={w.id}><WishBook w={w} onOpen={() => setOpen(w.id)} /></li>
                  : <li key="new" className="my-wnew-wrap">
                      <button type="button" className="my-newslot" aria-expanded={adding} onClick={() => setAdding(v => !v)}><span aria-hidden="true">+</span>위시 담기</button>
                      {adding && (
                        <div className="my-pop" role="menu">
                          <button type="button" role="menuitem" onClick={() => add("link")}>링크</button>
                          <button type="button" role="menuitem" onClick={() => add("photo")}>사진</button>
                          <button type="button" role="menuitem" onClick={() => add("memo")}>메모</button>
                        </div>
                      )}
                    </li>)}
              </ul>
              <div className="bk-shelf" aria-hidden="true" />
            </div>
          ))}
        </div>
      </div>
      {openW && <WishMemo key={openW.id} w={openW} onClose={() => setOpen(null)} onEdit={() => { setOpen(null); setForm({ kind: openW.kind === "link" ? "link" : openW.kind === "memo" ? "memo" : "photo", wish: openW }); }} />}
      {form && <WishForm key={form.wish?.id ?? form.kind} kind={form.kind} wish={form.wish} onClose={() => setForm(null)} />}
    </>
  );
}
