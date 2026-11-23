"use client";
// 실 확인 (Kim: before drawing, see whether the yarn on the screen is like the one you will knit with): a small
// piece in the picked yarn - thickness, material, hairiness, colour, hook and stitch - seen close up, and beside
// it a photo of your own yarn if one was put in (실 → 내 실 사진). When they differ, the 실 / 색 sections are
// adjusted and the piece follows at once. `big`: on the work screen's stage, filling it.
import type { Plan } from "@/lib/pattern";
import type { YarnSource } from "@/src/features/yarn3d/fromPattern";
import { YarnPagePreview } from "@/src/features/yarn3d/YarnPagePreview";
import { useYarnPhoto, yarnPhoto } from "@/src/features/yarn3d/yarnPhoto";

export function YarnCheck({ source, plan, big }: { source: YarnSource; plan: Plan; big?: boolean }) {
  const photo = useYarnPhoto();
  return (
    <div className={"yc" + (big ? " yc-big" : "")}>
      <div className="yc-swatch"><YarnPagePreview source={source} plan={plan} fabric live /></div>
      {photo && (
        <figure className="yc-photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt="내 실 사진" />
          <figcaption>내 실 <button type="button" className="nb-link" onClick={() => yarnPhoto.set(null)}>빼기</button></figcaption>
        </figure>
      )}
    </div>
  );
}
