"use client";
// 입구 · 직접 그리기 (Kim): none of the usual closures - draw the opening you want. A small sheet of paper
// with a pen; the lines are kept with the pattern (Draft.closureSketch, SVG path data in a 200 x 120 box)
// and shown on 확인 and the finished pattern as the maker's own note. The 3D keeps the plain opening.
import { useRef, useState } from "react";

const W = 200, H = 120;

export function ClosureSketch({ value, onChange }: { value?: string; onChange: (d: string | undefined) => void }) {
  const box = useRef<SVGSVGElement>(null);
  const [live, setLive] = useState<string>("");
  const at = (e: { clientX: number; clientY: number }) => {
    const r = box.current!.getBoundingClientRect();
    return `${Math.round((e.clientX - r.left) / r.width * W * 10) / 10} ${Math.round((e.clientY - r.top) / r.height * H * 10) / 10}`;
  };
  const down = (e: React.PointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    let d = `M${at(e)}`; setLive(d);
    const el = e.currentTarget;
    const move = (ev: PointerEvent) => { d += ` L${at(ev)}`; setLive(d); };
    const up = () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up); setLive(""); onChange(((value ? value + " " : "") + d).trim()); };
    el.addEventListener("pointermove", move); el.addEventListener("pointerup", up);
  };
  return (
    <div className="nb-sketch">
      <svg ref={box} viewBox={`0 0 ${W} ${H}`} className="nb-sketch-pad" role="img" aria-label="원하는 입구 모양 그리기" onPointerDown={down}>
        <path d={[value, live].filter(Boolean).join(" ")} />
      </svg>
      <p className="nb-help"><span>원하는 입구 모양을 그려 두면 도안에 함께 남습니다.</span>{value && <button type="button" className="nb-link" onClick={() => onChange(undefined)}>지우고 다시 그리기</button>}</p>
    </div>
  );
}

/** the drawing, small, where the pattern is read back (확인) */
export function SketchView({ d }: { d: string }) {
  return <svg viewBox={`0 0 ${W} ${H}`} className="nb-sketch-view" aria-label="직접 그린 입구 모양"><path d={d} /></svg>;
}
