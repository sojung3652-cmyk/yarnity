// 내 데이터 (My Page's 나의 프로필, Kim): everything Yarnity keeps in this browser as one .json file - every
// "iyarn." localStorage entry (works, drafts, chats, profile, wishes, 뜬 날) and every picture (IndexedDB, as
// data URLs) - and reading such a file back (it replaces what is here; the page reloads after).
import { allPhotos, putPhotos, type Photo } from "./photos";

export interface Backup {
  app: "yarnity"; version: 1; at: number;
  local: Record<string, string>;
  photos: { id: string; projectId: string; at: number; data: string }[];
}

const toDataUrl = (b: Blob) => new Promise<string>((res, rej) => {
  const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = () => rej(r.error); r.readAsDataURL(b);
});
const ourKeys = () => { const out: string[] = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith("iyarn.")) out.push(k); } return out; };

export async function makeBackup(): Promise<Blob> {
  const local: Record<string, string> = {};
  for (const k of ourKeys()) local[k] = localStorage.getItem(k) ?? "";
  let photos: Backup["photos"] = [];
  try { photos = await Promise.all((await allPhotos()).map(async p => ({ id: p.id, projectId: p.projectId, at: p.at, data: await toDataUrl(p.blob) }))); }
  catch { /* no IndexedDB (private mode): the works alone */ }
  const b: Backup = { app: "yarnity", version: 1, at: Date.now(), local, photos };
  return new Blob([JSON.stringify(b)], { type: "application/json" });
}

/** A file read and checked; null when it is not a Yarnity backup. */
export async function readBackup(file: File): Promise<Backup | null> {
  try {
    const b = JSON.parse(await file.text()) as Backup;
    if (b?.app !== "yarnity" || !b.local || typeof b.local !== "object" || !Array.isArray(b.photos)) return null;
    return b;
  } catch { return null; }
}

/** What a backup holds (shown before it replaces this browser's data). */
export function backupSummary(b: Backup) {
  const parse = (k: string) => { try { return JSON.parse(b.local[k] ?? "null"); } catch { return null; } };
  const works = parse("iyarn.projects"), wish = parse("iyarn.wish");
  return { works: Array.isArray(works) ? works.length : 0, wishes: Array.isArray(wish) ? wish.length : 0, photos: b.photos.length, at: b.at };
}

/** Replace this browser's Yarnity data with the backup's. */
export async function restoreBackup(b: Backup) {
  const photos: Photo[] = await Promise.all(b.photos.map(async p => ({ id: p.id, projectId: p.projectId, at: p.at, blob: await (await fetch(p.data)).blob() })));
  await putPhotos(photos, true);
  ourKeys().forEach(k => localStorage.removeItem(k));
  for (const [k, v] of Object.entries(b.local)) if (k.startsWith("iyarn.") && typeof v === "string") localStorage.setItem(k, v);
}
