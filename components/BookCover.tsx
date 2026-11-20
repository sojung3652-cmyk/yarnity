"use client";
// A saved work as a book (나의 도안집 on phones and on the web): ivory linen tinted with the first yarn colour
// (cream when none was picked), a spine at the left, page edges at the right, the item drawn in gold lines
// (the wizard's item art, ItemArt line + the gold gradient of <GoldDefs />) with a paper name plate, and the
// state as a small tag. Sizes and shadows come from the page's stylesheet (mine-mobile.css / app/mine/mine.css).
import type { CSSProperties } from "react";
import { ItemArt } from "@/components/newbook/ItemArt";
import { ITEM, itemIdOf } from "@/lib/items";
import { PART_KO, plan } from "@/lib/pattern";
import { STATUS_KO, statusOf } from "@/lib/status";
import type { Project } from "@/lib/types";

/** where a work is, in words: "바닥 3 / 42단 · 다음 4단", "42단 · 아직 시작 전", "완성 · 42단" */
export function whereOf(p: Project) {
  const pp = plan(p), total = pp.rows.length, cur = Math.min(p.current || 0, total), st = statusOf(p);
  const nx = pp.rows[cur], done = st === "done" || cur >= total;
  const short = done ? `완성 · ${total}단` : cur === 0 ? `${total}단 · 아직 시작 전` : `${cur} / ${total}단 · 다음 ${nx.label}`;
  const long = done || cur === 0 ? short : `${PART_KO[pp.rows[cur - 1].part]} ${short}`;
  return { total, cur, pct: total ? cur / total : 0, short, long, next: nx?.label ?? "", started: cur > 0, done };
}
/** the cover's tag: 뜨는 중 (started), 시작 전, 중단, 완성 */
export const tagOf = (p: Project) => { const st = statusOf(p); return st === "knitting" ? ((p.current || 0) > 0 ? "뜨는 중" : "시작 전") : STATUS_KO[st]; };

function hexA(hex: string, a: number) {
  const m = hex.replace("#", ""), n = m.length === 3 ? m.split("").map(c => c + c).join("") : m;
  const v = parseInt(n, 16); if (!Number.isFinite(v) || n.length !== 6) return "rgba(251,247,238,.55)";
  return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${a})`;
}

/** the gold the covers' line drawings are painted with (once per page) */
export const GoldDefs = () => (
  <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
    <defs><linearGradient id="mmGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8A6E3A" /><stop offset=".35" stopColor="#C9AB6C" /><stop offset=".55" stopColor="#EADBB2" /><stop offset=".75" stopColor="#B4924F" /><stop offset="1" stopColor="#8F7038" /></linearGradient></defs>
  </svg>
);

export function BookCover({ p, w }: { p: Project; w?: number }) {
  const it = ITEM[itemIdOf(p)], going = statusOf(p) === "knitting" && (p.current || 0) > 0;
  const style = { "--tint": p.color ? hexA(p.color, 0.6) : "rgba(251,247,238,.55)", width: w } as CSSProperties;
  return (
    <span className="mm-cover" style={style} aria-hidden="true">
      <span className={"mm-tag" + (going ? " is-going" : "")}>{tagOf(p)}</span>
      <span className="mm-icon"><ItemArt id={it.id} line stroke="url(#mmGold)" /></span>
      <span className="mm-plate">{it.name}</span>
    </span>
  );
}

export const ProgressBar = ({ pct }: { pct: number }) => <span className="mm-bar" aria-hidden="true"><i style={{ width: `${Math.round(pct * 100)}%` }} /></span>;
