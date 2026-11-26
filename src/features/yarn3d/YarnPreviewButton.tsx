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
import { partKo, plan as planOf, type Plan } from "@/lib/pattern";
import type { WorkExtra } from "./YarnWorkspace";
import { toYarnPattern, type YarnSource } from "./fromPattern";
import "./yarn3d-place.css";

const YarnPreview = dynamic(() => import("./YarnPreview"), { ssr: false });
// the work screen - tools, the 3D, panels - on every screen; phones take the web's (Kim, 11/25)
const YarnWorkspace = dynamic(() => import("./YarnWorkspace"), { ssr: false });

/** a plan's parts in the order they are made, with their counts (the work screen's 부분) */
export function partsOf(pp: Plan, startName?: string, item?: string | null): [string, string][] {
  const out: [string, string][] = [];
  let i = 0;
  while (i < pp.rows.length) {
    const part = pp.rows[i].part; let j = i; while (j + 1 < pp.rows.length && pp.rows[j + 1].part === part) j++;
    const n = Math.round(pp.rows[j].n), c = j - i + 1;
    out.push([part === "start" && startName ? startName : partKo(part, item), part === "handle" && pp.rows[i].grown ? `${c}단` : part === "handle" ? `${Math.round(pp.rows[i].n)}코` : part === "start" ? `${n}코` : `${c}단 · ${n}코`]);
    i = j + 1;
  }
  return out;
}

/** `source` may be missing while the work loads (hooks run before a screen's early return) */
export function useYarn3D(source: YarnSource | null | undefined, pp?: Plan | null, extra?: WorkExtra) {
  const thePlan = useMemo(() => (source ? pp ?? planOf(source) : null), [source, pp]);
  const raw = useMemo(() => (source && thePlan ? toYarnPattern(source, thePlan) : null), [source, thePlan]);
  // the same pattern stays the same object while its values do not change: screens make a new plan on every
  // render, and a new object would restart the open 3D view (YarnPreview builds again when `pattern` changes)
  const last = useRef<{ key: string; pattern: typeof raw }>({ key: "", pattern: null });
  const key = raw ? JSON.stringify(raw) : "";
  if (last.current.key !== key) last.current = { key, pattern: raw };
  const pattern = last.current.pattern;
  const [open, setOpen] = useState<false | "phone" | "wide">(false);
  const back = useRef<HTMLElement | null>(null), ex = useRef(extra); ex.current = extra;
  const show = useCallback(() => { back.current = document.activeElement as HTMLElement | null; setOpen("wide"); }, []); // phones too: the web's work screen, laid out narrow (Kim, 11/25)
  // focus goes back to what opened it (when it is still on the screen)
  const close = useCallback(() => { setOpen(false); ex.current?.onClosed?.(); requestAnimationFrame(() => { if (back.current?.isConnected) back.current.focus({ preventScroll: true }); }); }, []);
  const parts = useMemo(() => (thePlan ? partsOf(thePlan, undefined, source?.item) : []), [thePlan, source?.item]);
  /** the overlay with what the screen knows only later in its render (도안 만들기: its steps as the panel) */
  const render = (e?: WorkExtra): ReactNode => {
    ex.current = e ?? extra;
    return !open || !pattern ? null : open === "wide" ? <YarnWorkspace pattern={pattern} onClose={close} extra={{ parts, ...(e ?? extra) }} /> : <YarnPreview pattern={pattern} onClose={close} />;
  };
  return { supported: !!pattern, show, close, open: open === "wide", render, get node() { return render(); } };
}

/** look: "label" the book's cloth label, "ps" the pattern sheet's labels (도안 보기 / 따라 뜨기),
 *  "patch" 나의 도안집's cloth patch (web), "mm" the phone 도안집's label */
export function YarnPreviewButton({ source, plan, look = "label", className = "", onEdit }: { source: YarnSource; plan?: Plan; look?: "label" | "ps" | "patch" | "mm"; className?: string; onEdit?: () => void }) {
  const y = useYarn3D(source, plan, onEdit ? { onEdit } : undefined);
  if (!y.supported) return null;
  const text = "3D로 보기";
  const btn = look === "label" ? <ClothLabel side="next" type="button" onClick={y.show}>{text}</ClothLabel>
    : look === "patch" ? <ClothPatch color="cream" type="button" onClick={y.show}>{text}</ClothPatch>
    : <button type="button" className={look === "ps" ? "ps-label" : "mm-label is-cream"} onClick={y.show}><span>{text}</span></button>;
  return <span className={"y3-open " + className}>{btn}{y.node}</span>;
}
