"use client";
// 색 (the 3D work screen; Kim): a colour gradient first - a saturation / brightness field over the picked hue,
// the hue as a strip under it, the hex in a box - then 내 색 (colours saved for later, kept in this browser),
// a colour taken from a photo with an eyedropper (or from anywhere on the screen where the browser can), and
// the usual yarn colours as small dots. Every pick goes to the draft's yarn colour at once (the 3D follows).
import { useEffect, useRef, useState } from "react";
import { store } from "@/lib/store";
import type { Draft } from "@/lib/types";
import { COLORS } from "./YarnStep";

type Patch = (p: Partial<Draft>) => void;
const FAV_KEY = "iyarn.favColors", MAX_FAV = 16;

// hex <-> hsv (h 0-360, s / v 0-1)
const toHsv = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  const h = d === 0 ? 0 : mx === r ? 60 * (((g - b) / d) % 6) : mx === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4);
  return [(h + 360) % 360, mx === 0 ? 0 : d / mx, mx];
};
const toHex = (h: number, s: number, v: number) => {
  const f = (n: number) => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
  return "#" + [f(5), f(3), f(1)].map(x => Math.round(x * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
};
const HEX = /^#[0-9a-f]{6}$/i;

export function ColorStudio({ draft, patch }: { draft: Draft; patch: Patch }) {
  const cur = HEX.test(draft.color ?? "") ? draft.color!.toUpperCase() : "#EFE6D4";
  const [hsv, setHsv] = useState(() => toHsv(cur));
  const [hexRaw, setHexRaw] = useState(cur);
  const [favs, setFavs] = useState<string[]>([]), [favOpen, setFavOpen] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const field = useRef<HTMLDivElement>(null), img = useRef<HTMLImageElement>(null), file = useRef<HTMLInputElement>(null);
  useEffect(() => { setFavs(store.get<string[]>(FAV_KEY, []).filter(c => HEX.test(c))); }, []);
  // the colour changed elsewhere (a dot, a photo): the gradient follows
  useEffect(() => { if (toHex(...hsv) !== cur) { setHsv(toHsv(cur)); } setHexRaw(cur); }, [cur]); // eslint-disable-line react-hooks/exhaustive-deps

  const put = (hex: string, name?: string) => patch({ color: hex.toUpperCase(), colorName: name });
  const fromHsv = (h: number, s: number, v: number) => { setHsv([h, s, v]); put(toHex(h, s, v)); };

  // the field: drag in it (pointer), or the arrow keys
  const onField = (e: React.PointerEvent) => {
    const el = field.current!; el.setPointerCapture(e.pointerId);
    const at = (ev: { clientX: number; clientY: number }) => {
      const r = el.getBoundingClientRect(), s = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)), v = 1 - Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height));
      fromHsv(hsv[0], s, v);
    };
    at(e);
    const move = (ev: PointerEvent) => at(ev), up = () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up); };
    el.addEventListener("pointermove", move); el.addEventListener("pointerup", up);
  };
  const onFieldKey = (e: React.KeyboardEvent) => {
    const d = e.shiftKey ? .1 : .02, [h, s, v] = hsv;
    const k: Record<string, [number, number]> = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, d], ArrowDown: [0, -d] };
    if (!k[e.key]) return; e.preventDefault();
    fromHsv(h, Math.min(1, Math.max(0, s + k[e.key][0])), Math.min(1, Math.max(0, v + k[e.key][1])));
  };

  const saveFav = () => { const next = [cur, ...favs.filter(c => c !== cur)].slice(0, MAX_FAV); setFavs(next); store.set(FAV_KEY, next); };
  const dropFav = (c: string) => { const next = favs.filter(x => x !== c); setFavs(next); store.set(FAV_KEY, next); };

  // a photo: shown here, a click on it takes that spot's colour
  const onFile = (f: File | undefined) => { if (!f || !f.type.startsWith("image/")) return; const r = new FileReader(); r.onload = () => setPhoto(String(r.result)); r.readAsDataURL(f); };
  const pickPhoto = (e: React.MouseEvent<HTMLImageElement>) => {
    const im = img.current!, rect = im.getBoundingClientRect(), c = document.createElement("canvas");
    c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext("2d")!; x.drawImage(im, 0, 0);
    const px = Math.floor((e.clientX - rect.left) / rect.width * im.naturalWidth), py = Math.floor((e.clientY - rect.top) / rect.height * im.naturalHeight);
    const [r, g, b] = x.getImageData(px, py, 1, 1).data;
    const hex = "#" + [r, g, b].map(n => n.toString(16).padStart(2, "0")).join("").toUpperCase();
    setHsv(toHsv(hex)); put(hex);
  };
  // the browser's own eyedropper (Chrome, Edge): a colour from anywhere on the screen
  const canDrop = typeof window !== "undefined" && "EyeDropper" in window;
  const screenDrop = async () => {
    try { const ED = (window as unknown as { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper; const r = await new ED().open(); if (HEX.test(r.sRGBHex)) { setHsv(toHsv(r.sRGBHex)); put(r.sRGBHex); } } catch { /* cancelled */ }
  };

  const [h, s, v] = hsv;
  return (
    <div className="cs">
      <div className="cs-main">
        <div ref={field} className="cs-field" role="slider" tabIndex={0} aria-label="채도와 밝기" aria-valuetext={cur}
          style={{ background: `linear-gradient(to top,#000,transparent),linear-gradient(to right,#fff,hsl(${h} 100% 50%))` }}
          onPointerDown={onField} onKeyDown={onFieldKey}>
          <i className="cs-knob" style={{ left: `${s * 100}%`, top: `${(1 - v) * 100}%`, background: cur }} />
        </div>
        <div className="cs-side">
          <span className="cs-now" style={{ background: cur }} aria-hidden="true" />
          <label className="cs-hex"><span>색 코드</span>
            <input value={hexRaw} maxLength={7} spellCheck={false} aria-label="색 코드"
              onChange={e => { const t = e.target.value.trim(); setHexRaw(t); const hx = t.startsWith("#") ? t : "#" + t; if (HEX.test(hx)) { setHsv(toHsv(hx)); put(hx); } }} />
          </label>
          <button type="button" className="cs-save" onClick={() => { saveFav(); setFavOpen(true); }} disabled={favs.includes(cur)}>{favs.includes(cur) ? "저장됨" : "이 색 저장"}</button>
        </div>
      </div>
      <input className="cs-hue" type="range" min={0} max={359} step={1} value={Math.round(h)} aria-label="색상" onChange={e => fromHsv(Number(e.target.value), s || .5, v || .9)} />

      {/* 저장된 색 (Kim): a toggle - closed, only its name and how many */}
      <div className="cs-row cs-favrow">
        <button type="button" className="cs-lb cs-favtoggle" aria-expanded={favOpen} onClick={() => setFavOpen(v => !v)}>
          <i aria-hidden="true">{favOpen ? "▾" : "▸"}</i>저장된 색{favs.length ? <small>{favs.length}</small> : null}</button>
        {favOpen && (favs.length ? (
          <div className="cs-dots" role="group" aria-label="저장된 색">
            {favs.map(c => (
              <span key={c} className="cs-fav">
                <button type="button" className="cs-dot" style={{ background: c }} aria-label={`저장된 색 ${c}`} aria-pressed={c === cur} onClick={() => { setHsv(toHsv(c)); put(c); }} />
                <button type="button" className="cs-x" aria-label={`${c} 지우기`} onClick={() => dropFav(c)}>×</button>
              </span>
            ))}
          </div>
        ) : <span className="cs-none">마음에 드는 색을 저장해 두면 여기에 모입니다.</span>)}
      </div>

      <div className="cs-row">
        <span className="cs-lb">스포이드</span>
        <div className="cs-tools">
          <button type="button" className="cs-tool" onClick={() => file.current?.click()}>사진에서 고르기</button>
          {canDrop && <button type="button" className="cs-tool" onClick={screenDrop}>화면에서 고르기</button>}
          <input ref={file} type="file" accept="image/*" hidden onChange={e => onFile(e.target.files?.[0])} />
        </div>
      </div>
      {photo && (
        <div className="cs-photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img ref={img} src={photo} alt="색을 고를 사진" onClick={pickPhoto} />
          <p><span>사진에서 원하는 곳을 누르면 그 색이 됩니다.</span><button type="button" className="nb-link" onClick={() => setPhoto(null)}>사진 닫기</button></p>
        </div>
      )}

      <div className="cs-row">
        <span className="cs-lb">기본 색</span>
        <div className="cs-dots cs-basic" role="radiogroup" aria-label="기본 색">
          {COLORS.map(([n, hex]) => <button key={n} type="button" role="radio" className="cs-dot" title={n} aria-label={n} aria-checked={cur === hex.toUpperCase()} style={{ background: hex }}
            onClick={() => { setHsv(toHsv(hex)); put(hex, n); }} />)}
        </div>
      </div>
    </div>
  );
}
