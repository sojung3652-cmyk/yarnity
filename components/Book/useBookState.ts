"use client";
// Open/close state shared by the CSS and WebGL books (same behaviour as the prototype:
// the button toggles, clicking the closed book opens it, "<" and Esc close it).
import { useCallback, useEffect, useState } from "react";

export interface BookState {
  open: boolean;
  setOpen: (v: boolean) => void;
  toggle: () => void;
}

export function useBookState(): BookState {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen(o => !o), []);
  // Esc closes the open book
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  return { open, setOpen, toggle };
}

export function useReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduce(mq.matches);
    on(); mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduce;
}
