"use client";
// The book cover, on 도안 만들기's last step (Kim: picked before the pattern is made; none picked = a random one
// when it is saved, AppProvider addProject). The work's book as it will stand in 나의 도안집 - the picked
// cover, or the plain linen book until then - and a cloth label that opens the cover picker.
import { useState } from "react";
import { CoverPicker } from "@/components/diary/CoverPicker";
import { coverSrc } from "@/lib/covers";
import type { Draft, Project } from "@/lib/types";
import { ClothLabel } from "./ClothLabel";

export function CoverChoice({ draft, patch }: { draft: Draft; patch: (p: Partial<Draft>) => void }) {
  const [open, setOpen] = useState(false);
  const chosen = !!draft.cover && !draft.coverAuto;
  // the draft as a work, for the preview book (no state tag: not started)
  const asWork: Project = { ...draft, name: draft.name.trim() || "이름 없는 작품", cover: chosen ? draft.cover : undefined, coverAuto: false, id: "draft", measuredH: null, current: 0, created: 0, status: "knitting" };
  return (
    <div className="nb-cover">
      {/* the picked cover's picture, or an empty book until one is picked */}
      {chosen ? <img className="nb-cover-img" src={coverSrc(draft.cover!)} alt="" /> : <span className="nb-cover-blank" aria-hidden="true" />}
      <div className="nb-cover-text">
        <span className="nb-lbl">표지</span>
        {!chosen && <p className="nb-help">고르지 않으면 무작위로 정해집니다.</p>}
      </div>
      <ClothLabel side="next" type="button" onClick={() => setOpen(true)}>{chosen ? "표지 바꾸기" : "표지 고르기"}</ClothLabel>
      {open && <CoverPicker p={{ ...asWork, cover: chosen ? draft.cover : undefined }} title="표지를 골라 주십시오"
        onPick={id => { patch({ cover: id, coverAuto: false }); setOpen(false); }} onClose={() => setOpen(false)} />}
    </div>
  );
}
