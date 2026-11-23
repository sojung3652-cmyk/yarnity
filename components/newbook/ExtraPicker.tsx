"use client";
// 단추 / 라벨 고르기 (Kim's pictures, lib/extras): small picture tiles, the picked one ringed; labels in their
// groups (원단, 가죽, 금속, 자개). The 3D puts the picked picture on the piece.
import { extraSrc, type ExtraPic } from "@/lib/extras";

export function ExtraPicker({ label, groups, value, onPick, wide }: { label: string; groups: [string, ExtraPic[]][]; value?: string; onPick: (p: ExtraPic) => void; wide?: boolean }) {
  return (
    <div className="xp" role="radiogroup" aria-label={label}>
      {groups.map(([g, list]) => (
        <div key={g} className="xp-group">
          {g && <p className="xp-head">{g}</p>}
          <div className={"xp-grid" + (wide ? " is-wide" : "")}>
            {list.map(p => (
              <button key={p.id} type="button" role="radio" aria-checked={value === p.id} className="xp-tile" title={p.name} aria-label={p.name} onClick={() => onPick(p)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={extraSrc(p.id)} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
