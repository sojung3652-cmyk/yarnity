"use client";
// "3D로 보기" everywhere a pattern is (Kim: from the first step of 도안 만들기, between steps, on the finished
// pattern, while knitting, and from 나의 도안집). Shown only for patterns the yarn engine can draw (round
// coasters and bags); the overlay and the engine load when it is pressed.
// useYarn3D: the open / close and the overlay, for places that draw their own button (a ··· menu item);
// YarnPreviewButton: the same with the place's cloth label.
import dynamic from "next/dynamic";
import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { ClothLabel } from "@/components/newbook/ClothLabel";
import { ClothPatch } from "@/components/diary/Diary";
import { plan as planOf, type Plan } from "@/lib/pattern";
import { toYarnPattern, type YarnSource } from "./fromPattern";
import "./yarn3d-place.css";

const YarnPreview = dynamic(() => import("./YarnPreview"), { ssr: false });

/** `source` may be missing while the work loads (hooks run before a screen's early return) */
export function useYarn3D(source: YarnSource | null | undefined, pp?: Plan | null) {
  const raw = useMemo(() => (source ? toYarnPattern(source, pp ?? planOf(source)) : null), [source, pp]);
  // the same pattern stays the same object while its values do not change: screens make a new plan on every
  // render, and a new object would restart the open 3D view (YarnPreview builds again when `pattern` changes)
  const last = useRef<{ key: string; pattern: typeof raw }>({ key: "", pattern: null });
  const key = raw ? JSON.stringify(raw) : "";
  if (last.current.key !== key) last.current = { key, pattern: raw };
  const pattern = last.current.pattern;
  const [open, setOpen] = useState(false);
  const back = useRef<HTMLElement | null>(null);
  const show = useCallback(() => { back.current = document.activeElement as HTMLElement | null; setOpen(true); }, []);
  // focus goes back to what opened it (when it is still on the screen)
  const close = useCallback(() => { setOpen(false); requestAnimationFrame(() => { if (back.current?.isConnected) back.current.focus({ preventScroll: true }); }); }, []);
  const node: ReactNode = open && pattern ? <YarnPreview pattern={pattern} onClose={close} /> : null;
  return { supported: !!pattern, show, node };
}

/** look: "label" the book's cloth label, "ps" the pattern sheet's labels (도안 보기 / 따라 뜨기),
 *  "patch" 나의 도안집's cloth patch (web), "mm" the phone 도안집's label */
export function YarnPreviewButton({ source, plan, look = "label", className = "" }: { source: YarnSource; plan?: Plan; look?: "label" | "ps" | "patch" | "mm"; className?: string }) {
  const y = useYarn3D(source, plan);
  if (!y.supported) return null;
  const text = "3D로 보기";
  const btn = look === "label" ? <ClothLabel side="next" type="button" onClick={y.show}>{text}</ClothLabel>
    : look === "patch" ? <ClothPatch color="cream" type="button" onClick={y.show}>{text}</ClothPatch>
    : <button type="button" className={look === "ps" ? "ps-label" : "mm-label is-cream"} onClick={y.show}><span>{text}</span></button>;
  return <span className={"y3-open " + className}>{btn}{y.node}</span>;
}
