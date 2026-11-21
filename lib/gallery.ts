// 갤러리's own records (My Page, Kim): works finished outside Yarnity's patterns, written in by hand - a name and
// the day it was finished. Kept in this browser (localStorage "iyarn.gallery"); their photos in IndexedDB
// (lib/photos.ts, projectId "gallery:<id>", which is never dropped as an orphan).
import { useSyncExternalStore } from "react";
import { store } from "./store";

export interface GalleryEntry { id: string; name: string; doneAt: number; at: number }
const KEY = "iyarn.gallery";
const NONE: GalleryEntry[] = [];
let cache: GalleryEntry[] | null = null;
const subs = new Set<() => void>();
export function readGallery(): GalleryEntry[] { if (!cache) cache = store.get<GalleryEntry[]>(KEY, []); return cache; }
export function saveGallery(g: GalleryEntry[]) { cache = g; store.set(KEY, g); subs.forEach(f => f()); }
export function useGallery(): GalleryEntry[] {
  return useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f); }; }, readGallery, () => NONE);
}
export const newGalleryId = () => "g" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
/** the photo store's key for an entry */
export const galleryPhotoKey = (id: string) => "gallery:" + id;
