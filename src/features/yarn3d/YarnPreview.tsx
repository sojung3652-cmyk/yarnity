"use client";
// The 3D preview over the whole screen (portal to body, above the book and the NavBar; the NavBar's code is
// untouched). The engine (three.js scene) is imported here only, when the overlay opens. While it is open
// the book's canvas stops drawing (bookPause) and the page behind does not scroll; Esc or the X closes it,
// and everything the engine made (geometry, materials, textures, the renderer) is disposed.
// Only shows the pattern's own values (colour, yarn, hook, counts): nothing here changes the pattern.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GoldX } from "@/components/GoldX";
import { ClothLabel } from "@/components/newbook/ClothLabel";
import type { YarnInfo, YarnMaterial, YarnPattern, YarnViewer } from "./engine";
import { bookPause } from "./pause";
import "./yarn3d.css";

const MATS: [YarnMaterial, string][] = [["cotton", "면"], ["wool", "울"], ["mohair", "모헤어"], ["cord", "코드사"], ["fur", "털실"], ["metal", "메탈릭"]];

export default function YarnPreview({ pattern, onClose }: { pattern: YarnPattern; onClose: () => void }) {
  const root = useRef<HTMLDivElement>(null), cv = useRef<HTMLCanvasElement>(null), closeRef = useRef<HTMLButtonElement>(null), viewer = useRef<YarnViewer | null>(null);
  const [mat, setMat] = useState<YarnMaterial>(pattern.material);
  const [view, setView] = useState<"yarn" | "holo">("yarn");
  const [info, setInfo] = useState<YarnInfo | null>(null);
  const [noGL, setNoGL] = useState(false);
  const [builtMs, setBuiltMs] = useState<number | null>(null);
  // a material or view picked while the engine is still loading is handed over when it arrives
  const picked = useRef({ mat: pattern.material, view: "yarn" as "yarn" | "holo" });

  // the book stops, the page stays still, the X takes the focus, Esc closes
  useEffect(() => {
    bookPause.set(true);
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    // caught first (capture on window) and kept from the windows under it (나의 도안집's work window closes on
    // Esc and keeps Tab inside itself): Esc closes only this, Tab goes round this overlay's buttons
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onClose(); return; }
      if (e.key !== "Tab" || !root.current) return;
      e.stopPropagation();
      const f = [...root.current.querySelectorAll<HTMLElement>("button")];
      if (!f.length) return;
      const i = f.indexOf(document.activeElement as HTMLElement), j = e.shiftKey ? (i <= 0 ? f.length - 1 : i - 1) : (i < 0 || i === f.length - 1 ? 0 : i + 1);
      e.preventDefault(); f[j].focus();
    };
    window.addEventListener("keydown", onKey, true);
    return () => { window.removeEventListener("keydown", onKey, true); document.body.style.overflow = prev; bookPause.set(false); };
  }, [onClose]);

  // the engine, loaded now
  useEffect(() => {
    let gone = false;
    import("./engine").then(({ createYarnViewer, hasWebGL }) => {
      if (gone || !cv.current) return;
      const v = hasWebGL() ? createYarnViewer(cv.current, pattern, { phone: matchMedia("(max-width: 700px)").matches, onInfo: setInfo, onBuilt: setBuiltMs }) : null;
      if (!v) { setNoGL(true); return; }
      viewer.current = v;
      if (picked.current.mat !== pattern.material) v.setMaterial(picked.current.mat);
      if (picked.current.view !== "yarn") v.setView(picked.current.view);
    });
    return () => { gone = true; viewer.current?.dispose(); viewer.current = null; };
  }, [pattern]);

  const pick = (m: YarnMaterial) => { picked.current.mat = m; setMat(m); viewer.current?.setMaterial(m); };
  const show = (v: "yarn" | "holo") => { picked.current.view = v; setView(v); viewer.current?.setView(v); };
  const size = !info ? "" : (info.round ? `지름 약 ${info.widthCm}cm` : `${info.widthCm} × ${info.depthCm}cm`) + (info.heightCm ? ` · 높이 약 ${info.heightCm}cm` : "");

  return createPortal(
    <div ref={root} className="y3" onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="3D 미리 보기" data-built-ms={builtMs ?? undefined}>
      {noGL ? <p className="y3-nogl">이 기기에서는 3D 보기를 쓸 수 없습니다.</p>
        : <canvas ref={cv} className="y3-canvas" aria-label="완성 모양 3D" />}
      <button ref={closeRef} type="button" className="y3-close" aria-label="닫기" onClick={onClose}><GoldX /></button>
      {!noGL && (
        <div className="y3-panel">
          <div className="y3-row" role="group" aria-label="재질">
            {MATS.map(([k, label]) => <ClothLabel key={k} side="next" type="button" pressed={mat === k} onClick={() => pick(k)}>{label}</ClothLabel>)}
          </div>
          <div className="y3-row">
            <span role="group" aria-label="보기" className="y3-row">
              <ClothLabel side="back" type="button" pressed={view === "yarn"} onClick={() => show("yarn")}>실로 보기</ClothLabel>
              <ClothLabel side="back" type="button" pressed={view === "holo"} onClick={() => show("holo")}>구조로 보기</ClothLabel>
            </span>
            <ClothLabel side="next" type="button" onClick={() => viewer.current?.playDraw()}>뜨는 순서 보기</ClothLabel>
          </div>
          <p className="y3-info" aria-live="polite">
            <span>실 {pattern.yarnMm}mm</span><span>바늘 {pattern.hookMm}mm</span>
            {info ? <><span>{size}</span><span>{info.fit}</span></> : <span>모양을 계산하고 있습니다.</span>}
          </p>
        </div>
      )}
      {!noGL && <p className="y3-hint">끌기: 돌리기 · 휠, 두 손가락: 확대</p>}
    </div>,
    document.body,
  );
}
