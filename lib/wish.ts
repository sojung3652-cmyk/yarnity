// 위시 보관함 (My Page, Kim): yarn to buy, things to knit, shop links, notes. Kept in this browser
// (localStorage "iyarn.wish"); uploaded pictures live in IndexedDB (lib/photos.ts, projectId "wish:<id>").
import { useSyncExternalStore } from "react";
import { store } from "./store";

// 사진 (Kim): one kind of picture - the old 편물 / 실 ("knit" / "yarn") are read as "photo"
export type WishKind = "link" | "photo" | "memo";
export interface Wish {
  id: string;
  kind: WishKind;
  title: string;
  /** link: the page, its shop, its price, its picture (a web address) */
  url?: string; shop?: string; price?: string; image?: string;
  /** photo: the uploaded picture (lib/photos.ts id) */
  photo?: string;
  /** memo: the words (with #해시태그, tagsOf) and the card's colour */
  text?: string; tone?: "cream" | "rose";
  at: number;
}
const KEY = "iyarn.wish";
const NONE: Wish[] = [];
let cache: Wish[] | null = null;
const subs = new Set<() => void>();
export function readWishes(): Wish[] {
  if (!cache) cache = store.get<Wish[]>(KEY, []).map(w => ((w.kind as string) === "knit" || (w.kind as string) === "yarn" ? { ...w, kind: "photo" as const } : w));
  return cache;
}
/** a memo's hashtags (Kim): #words, without the #, each once, in the order written */
export const TAG_RE = /#([^\s#.,!?()[\]{}"'`]+)/g;
export const tagsOf = (text?: string) => [...new Set([...(text ?? "").matchAll(TAG_RE)].map(m => m[1]))];
export function saveWishes(w: Wish[]) { cache = w; store.set(KEY, w); subs.forEach(f => f()); }
export function useWishes(): Wish[] {
  return useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f); }; }, readWishes, () => NONE);
}
export const newWishId = () => "w" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
