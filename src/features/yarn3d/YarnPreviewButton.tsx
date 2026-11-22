"use client";
// "3D로 보기": a cloth label on the finished pattern's page in the book. Shown only for patterns the yarn
// engine can draw (round coasters and bags); the overlay and the engine load when it is pressed.
import dynamic from "next/dynamic";
import { useCallback, useMemo, useRef, useState } from "react";
import { ClothLabel } from "@/components/newbook/ClothLabel";
import type { Plan } from "@/lib/pattern";
import { toYarnPattern, type YarnSource } from "./fromPattern";

const YarnPreview = dynamic(() => import("./YarnPreview"), { ssr: false });

export function YarnPreviewButton({ source, plan }: { source: YarnSource; plan: Plan }) {
  const pattern = useMemo(() => toYarnPattern(source, plan), [source, plan]);
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLSpanElement>(null);
  // back to the button when the overlay closes
  const close = useCallback(() => { setOpen(false); requestAnimationFrame(() => wrap.current?.querySelector("button")?.focus()); }, []);
  if (!pattern) return null;
  return (
    <span ref={wrap} className="y3-open">
      <ClothLabel side="next" type="button" onClick={() => setOpen(true)}>3D로 보기</ClothLabel>
      {open && <YarnPreview pattern={pattern} onClose={close} />}
    </span>
  );
}
