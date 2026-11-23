"use client";
// Picking a Girl's Diary book cover for a work (Kim): shown once the pattern is made (완성 도안, web and phone),
// and from 나의 도안집 (표지 바꾸기). Every cover is previewed as this work's book - its name on the plate.
// Phones: a sheet from the bottom, three to a row. Wide screens: a dialog, six to a row. Styles: diary.css.
import { useEffect, useState } from "react";
import { BookCover, GoldDefs } from "@/components/BookCover";
import { COVER_SETS, COVERS } from "@/lib/covers";
import type { Project } from "@/lib/types";
import { ClothPatch } from "./Diary";

// the four sets of 2026-11-22 (Kim): 꽃 자수, 레이스와 리본, 무늬 천, 금실 자수
const SETS: { title: string; ids: string[] }[] = COVER_SETS.map(st => ({ title: st.title, ids: COVERS.filter(c => c.id.startsWith(st.prefix)).map(c => c.id) }));

export function CoverPicker({ p, onPick, onClose, first, title }: { p: Project; onPick: (id: string) => void; onClose: () => void; first?: boolean; title?: string }) {
  const [sel, setSel] = useState<string | null>(p.coverAuto ? null : p.cover ?? null);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; addEventListener("keydown", k); return () => removeEventListener("keydown", k); }, [onClose]);
  // the preview book: this work, without its state tag
  const as = (id: string): Project => ({ ...p, cover: id, coverAuto: false, current: 0, status: "knitting" });
  return (
    <div className="cpk-dim" onClick={onClose}>
      <section className="cpk" role="dialog" aria-modal="true" aria-labelledby="cpkTitle" onClick={e => e.stopPropagation()}>
        <GoldDefs />
        <span className="cpk-grip" aria-hidden="true" />
        <header className="cpk-head">
          <h2 id="cpkTitle">{title ?? (first ? "도안이 완성되었습니다. 표지를 골라 주십시오" : "표지 바꾸기")}</h2>
          <p>나의 도안집에 이 표지로 꽂힙니다. 나중에 바꿀 수 있습니다.</p>
        </header>
        <div className="cpk-scroll">
          {SETS.map(s => (
            <div key={s.title} className="cpk-set">
              <h3>{s.title}</h3>
              <div className="cpk-grid" role="radiogroup" aria-label={s.title}>
                {s.ids.map(id => (
                  <button key={id} type="button" role="radio" aria-checked={sel === id} aria-label={`표지 ${id}`} className={"cpk-item" + (sel === id ? " is-on" : "")} onClick={() => setSel(id)}>
                    <BookCover p={as(id)} />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <footer className="cpk-foot">
          <button type="button" className="cpk-later" onClick={onClose}>{first ? "나중에 고르겠습니다" : "닫기"}</button>
          <ClothPatch color="yellow" disabled={!sel} onClick={() => sel && onPick(sel)}>이 표지로 하겠습니다</ClothPatch>
        </footer>
      </section>
    </div>
  );
}
