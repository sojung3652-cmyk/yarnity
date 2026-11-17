"use client";
// "실 정보": the yarn and hook of a saved work (pattern screen card), with the LOT number easy to find and
// copy (to buy more of the same dye lot later).
import { useState } from "react";
import { hookLabel, hookMmOf, yarnWeightText } from "@/lib/yarn";
import type { Project } from "@/lib/types";

export function CopyLot({ lot, className = "" }: { lot: string; className?: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(lot); }
    catch { const t = document.createElement("textarea"); t.value = lot; document.body.appendChild(t); t.select(); document.execCommand("copy"); t.remove(); }
    setDone(true); setTimeout(() => setDone(false), 1600);
  };
  return <button type="button" className={"lot-copy " + className} onClick={copy} aria-label={`LOT ${lot} 복사`}>{done ? "복사했어요" : "복사"}</button>;
}

export function YarnInfo({ p }: { p: Project }) {
  const mm = hookMmOf(p);
  const label = [p.skeinG ? `${p.skeinG}g` : "", p.skeinM ? `${p.skeinM}m` : "", p.skeins ? `${p.skeins}타래` : ""].filter(Boolean).join(" · ");
  const rows: [string, React.ReactNode][] = [
    ["이름", p.yarn || "—"],
    ...(p.materials?.length ? [["재질", p.materials.join(", ") + (p.blend ? ` (${p.blend})` : "")] as [string, React.ReactNode]] : []),
    ...(p.color || p.colorName ? [["색", <span key="c">{p.color && <i className="sw-dot" style={{ background: p.color }} />}{p.colorName || "직접 고른 색"}{p.colorNo ? ` (${p.colorNo})` : ""}</span>] as [string, React.ReactNode]] : []),
    // colours added after the first one (도안 만들기 "+ 색 추가"), each with its own number and LOT
    ...(p.moreColors ?? []).filter(c => c.hex || c.name || c.no || c.lot).map((c, i): [string, React.ReactNode] => [`색 ${i + 2}`,
      <span key={"c" + i}>{c.hex && <i className="sw-dot" style={{ background: c.hex }} />}{c.name || (c.hex ? "직접 고른 색" : "")}{c.no ? ` (${c.no})` : ""}{c.lot ? <> · LOT {c.lot} <CopyLot lot={c.lot} /></> : ""}</span>]),
    ["굵기", yarnWeightText(p)],
    ["코바늘", hookLabel(mm) + (p.hookMaterial ? ` · ${p.hookMaterial}` : "")],
    ...(label ? [["라벨", label] as [string, React.ReactNode]] : []),
    ...(p.shop ? [["구입처", p.shop] as [string, React.ReactNode]] : []),
    ...(p.memo ? [["메모", p.memo] as [string, React.ReactNode]] : []),
  ];
  return (
    <div className="card yarn-info" id="yarnInfo" style={{ gap: 0 }}>
      <span className="small muted" style={{ marginBottom: 6 }}>실 정보</span>
      {p.lot && <div className="lot-box"><span className="small muted">LOT</span><b id="lotNo">{p.lot}</b><CopyLot lot={p.lot} /></div>}
      {rows.map(([k, v]) => <div key={k} className="stat"><span>{k}</span><b style={{ fontWeight: 400 }}>{v}</b></div>)}
    </div>
  );
}
