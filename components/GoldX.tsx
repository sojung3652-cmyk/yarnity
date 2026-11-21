"use client";
// The book's close mark (Kim: the gold ribbon was too big): a small X in the ribbon's gold leaf
// (RibbonGold.tsx GoldLeafDefs), with a light edge on its upper left and a dark one on its lower right.
import { useId } from "react";
import { GoldLeafDefs, leafIds } from "@/components/RibbonGold";

export function GoldX() {
  const L = leafIds(`x${useId().replace(/:/g, "")}`), d = "M5 5 15 15M15 5 5 15";
  return (
    <svg className="gold-x" viewBox="0 0 20 20" aria-hidden="true">
      <defs><GoldLeafDefs ids={L} /></defs>
      <path d={d} transform="translate(.7 .7)" stroke="#4D3B1D" strokeOpacity=".45" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <path d={d} transform="translate(-.5 -.5)" stroke="#F7F0DA" strokeOpacity=".7" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <g filter={`url(#${L.fr})`}><path d={d} stroke={`url(#${L.g})`} strokeWidth="2.6" strokeLinecap="round" fill="none" /></g>
    </svg>
  );
}
