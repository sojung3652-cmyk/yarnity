"use client";
// 실 확인 (Kim: before drawing, see whether the yarn on the screen is like the one you will knit with): a small
// piece in the picked yarn - thickness, material, hairiness, colour, hook and stitch - seen close up, and beside
// it a photo of your own yarn if you have one. When they differ, the 실 / 색 sections above are adjusted and the
// piece follows at once.
import { useState } from "react";
import type { Plan } from "@/lib/pattern";
import type { YarnSource } from "@/src/features/yarn3d/fromPattern";
import { YarnPagePreview } from "@/src/features/yarn3d/YarnPagePreview";

/** `big`: on the work screen's stage, the first thing shown (Kim) */
export function YarnCheck({ source, plan, big }: { source: YarnSource; plan: Plan; big?: boolean }) {
  const [photo, setPhoto] = useState<string | null>(null);
  const onFile = (f?: File) => { if (!f || !f.type.startsWith("image/")) return; const r = new FileReader(); r.onload = () => setPhoto(String(r.result)); r.readAsDataURL(f); };
  return (
    <div className={"yc" + (big ? " yc-big" : "")}>
      <div className={"yc-row" + (photo ? " has-photo" : "")}>
        <figure className="yc-swatch"><YarnPagePreview source={source} plan={plan} fabric live /><figcaption>화면 속 실</figcaption></figure>
        {photo && (
          <figure className="yc-photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt="내 실 사진" />
            <figcaption>내 실 <button type="button" className="nb-link" onClick={() => setPhoto(null)}>사진 빼기</button></figcaption>
          </figure>
        )}
      </div>
      <label className="yc-up">{photo ? "다른 사진" : "내 실 사진 넣기"}<input type="file" accept="image/*" hidden onChange={e => onFile(e.target.files?.[0])} /></label>
    </div>
  );
}
