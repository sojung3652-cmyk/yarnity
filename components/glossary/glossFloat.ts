"use client";
// Whether the glossary floats over the page (the 용어집 button of 도안 보기 and 따라 뜨기). Its own little store:
// opening it changes nothing of the page under it (the row and stitch being knitted stay as they are).
import { useSyncExternalStore } from "react";

let open = false;
const subs = new Set<() => void>();
const set = (v: boolean) => { open = v; subs.forEach(f => f()); };
export const openGloss = () => set(true);
export const closeGloss = () => set(false);
export const useGlossOpen = () => useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f); }; }, () => open, () => false);
