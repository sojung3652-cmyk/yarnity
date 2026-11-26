"use client";
// 단계 카드 보기 (Kim): the pattern as a few steps - a big number, a short title, two lines, one picture
// (lib/stepCards). The picture is the step's symbol chart, or the 3D where the shape has to be seen (joining,
// the finished piece). Beside the rows list, never instead of it: the reader picks one of the two.
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef } from "react";
import { drawTrack } from "@/lib/drawMap";
import type { Plan } from "@/lib/pattern";
import { stepCards, type StepCard } from "@/lib/stepCards";
import type { Project } from "@/lib/types";
import { usePhone } from "@/components/mobile/useMobile";
import "./stepcards.css";

const Preview = dynamic(() => import("@/src/features/yarn3d/YarnPagePreview").then(m => m.YarnPagePreview), { ssr: false, loading: () => <span className="sc-wait">3D를 준비하고 있습니다.</span> });

function ChartPic({ p, pp, card }: { p: Project; pp: Plan; card: StepCard }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const draw = () => { if (ref.current) drawTrack(ref.current, { ...p, current: Math.min(card.to, pp.rows.length - 1) }, pp); };
    draw(); let t: ReturnType<typeof setTimeout>; const on = () => { clearTimeout(t); t = setTimeout(draw, 120); };
    window.addEventListener("resize", on); return () => { window.removeEventListener("resize", on); clearTimeout(t); };
  }, [p, pp, card.to]);
  return <canvas ref={ref} role="img" aria-label={`${card.title} 기호도안`} />;
}

/** `current`: the row being made (the knitting screen) - the step it is in is marked, the steps before it done.
 *  `flat`: no 3D picture (a phone: more than one 3D view ran its graphics memory out) - joining shows the
 *  joined edge's chart, the other shape steps their two lines alone. */
export function StepCards({ p, pp, current, startName, onPick, flat }: { p: Project; pp: Plan; current?: number; startName?: string; onPick?: (row: number) => void; flat?: boolean }) {
  const cards = useMemo(() => stepCards(pp, startName, p.item), [pp, startName, p.item]);
  // a phone shows the web's own pages (components/mobile/useMobile): there the cards carry no 3D picture
  const phone = usePhone(), noLive = flat || phone !== false;
  return (
    <ol className="sc-list" aria-label="단계 카드">
      {cards.map(c => {
        const state = current == null ? "" : current > c.to ? " is-done" : current >= c.from ? " is-now" : "";
        const pic = noLive && c.pic !== "chart" ? (c.part === "join" ? "chart" : "off") : c.pic;
        return (
          <li key={c.no} className={"sc-card" + state} aria-current={state === " is-now" ? "step" : undefined}>
            <span className="sc-no" aria-hidden="true">{c.no}</span>
            <div className="sc-text">
              <h3><span className="sr-only">{`${Number(c.no)}단계 `}</span>{c.title}{state === " is-now" && <small>지금 뜨는 단계</small>}</h3>
              <p>{c.lines[0]}</p><p>{c.lines[1]}</p>
              {onPick && c.part !== "end" && <button type="button" className="sc-go" onClick={() => onPick(c.from)}>이 단계의 첫 단 보기</button>}
            </div>
            {pic !== "off" && <div className={"sc-pic sc-pic-" + pic}>
              {pic === "chart" ? <ChartPic p={p} pp={pp} card={c} /> : pic === "3d" ? <Preview source={p} plan={pp} live /> : <span className="sc-wait">다 뜬 모습은 마지막 카드에서 봅니다.</span>}
            </div>}
          </li>
        );
      })}
    </ol>
  );
}
