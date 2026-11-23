// 내 실 사진 (Kim: put it with the yarn's information): a photo of the reader's own yarn, shown beside the yarn on
// the work screen's stage to compare. Kept in this browser only (made small first), never in the draft - the draft
// goes to the server and to the AI, a photo has no business there.
import { useSyncExternalStore } from "react";

const KEY = "iyarn.photo";
let cur: string | null | undefined;
const subs = new Set<() => void>();
const read = () => { if (cur === undefined) { try { cur = localStorage.getItem(KEY); } catch { cur = null; } } return cur; };

export const yarnPhoto = {
  get: read,
  set(v: string | null) { cur = v; try { if (v) localStorage.setItem(KEY, v); else localStorage.removeItem(KEY); } catch { /* full or blocked: kept for this visit */ } subs.forEach(f => f()); },
  subscribe(f: () => void) { subs.add(f); return () => { subs.delete(f); }; },
};

export const useYarnPhoto = () => useSyncExternalStore(yarnPhoto.subscribe, read, () => null);

/** a picked file made small (the long side 640px, JPEG) and kept */
export function keepYarnPhoto(f?: File) {
  if (!f || !f.type.startsWith("image/")) return;
  const r = new FileReader();
  r.onload = () => {
    const im = new Image();
    im.onload = () => {
      const k = Math.min(1, 640 / Math.max(im.width, im.height)), c = document.createElement("canvas");
      c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
      c.getContext("2d")!.drawImage(im, 0, 0, c.width, c.height);
      yarnPhoto.set(c.toDataURL("image/jpeg", .82));
    };
    im.src = String(r.result);
  };
  r.readAsDataURL(f);
}
