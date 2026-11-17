"use client";
// Shared by the CSS and WebGL books. The book's open / home / wizard state itself lives in
// BookProvider.tsx (root layout); the CSS fallback book only needs open + setOpen.
import { useEffect, useState } from "react";

export interface BookState {
  open: boolean;
  setOpen: (v: boolean) => void;
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
