// 사진 기록: photos of a work, kept in this browser only (IndexedDB "yarnity" / "photos"). localStorage is
// too small for pictures (~5MB in all), so photos never go there. Each photo is shrunk before saving
// (longest side 1280px, JPEG 0.82: ~150-300KB) and stored as a Blob with its work's id and the time.
// Nothing is uploaded anywhere.

export interface Photo { id: string; projectId: string; at: number; blob: Blob }

const DB = "yarnity", STORE = "photos", MAX = 1280;

/** the one Yarnity database: v1 "photos"; v2 adds "importedPatterns" (가져온 도안, lib/imported.ts, web) */
export function openDb(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 2);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains(STORE)) { const s = db.createObjectStore(STORE, { keyPath: "id" }); s.createIndex("project", "projectId"); }
      if (!db.objectStoreNames.contains("importedPatterns")) db.createObjectStore("importedPatterns", { keyPath: "id" });
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
const open = openDb;
async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await open();
  return new Promise((res, rej) => {
    const t = db.transaction(STORE, mode), req = fn(t.objectStore(STORE));
    t.oncomplete = () => { db.close(); res(req ? req.result : undefined); };
    t.onerror = () => { db.close(); rej(t.error); };
  });
}

/** A picture file shrunk to at most `max` px (1280 by default) on its longest side, as JPEG. */
export async function shrink(file: File, max = MAX): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas"); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height); bmp.close();
  return new Promise((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error("toBlob failed"))), "image/jpeg", 0.82));
}

/** `max`: My Page (web) keeps its pictures at 1600px on the longest side (Kim) */
export async function addPhoto(projectId: string, file: File, max = MAX): Promise<Photo> {
  const p: Photo = { id: "ph" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), projectId, at: Date.now(), blob: await shrink(file, max) };
  await tx("readwrite", s => s.put(p));
  return p;
}

/** A work's photos, newest first. */
export async function photosOf(projectId: string): Promise<Photo[]> {
  const all = (await tx<Photo[]>("readonly", s => s.index("project").getAll(projectId))) ?? [];
  return all.sort((a, b) => b.at - a.at);
}

/** How many photos each work has, and its newest one (for the list's covers). */
export async function photoSummary(): Promise<Record<string, { n: number; latest: Photo }>> {
  const all = (await tx<Photo[]>("readonly", s => s.getAll())) ?? [];
  const out: Record<string, { n: number; latest: Photo }> = {};
  for (const p of all) { const o = out[p.projectId]; if (!o) out[p.projectId] = { n: 1, latest: p }; else { o.n++; if (p.at > o.latest.at) o.latest = p; } }
  return out;
}

export async function removePhoto(id: string) { await tx("readwrite", s => s.delete(id)); }

/** Photos of works that no longer exist (deleted and past their undo). */
export async function dropOrphans(keep: string[]) {
  const all = (await tx<Photo[]>("readonly", s => s.getAll())) ?? [], ids = new Set(keep);
  // "wish:…" and "profile:…" pictures (My Page) belong to no work: never orphans
  for (const p of all) if (!ids.has(p.projectId) && !p.projectId.includes(":")) await removePhoto(p.id);
}

/** One picture by its id. */
export async function photoById(id: string): Promise<Photo | undefined> { return tx<Photo>("readonly", s => s.get(id)); }
/** Every picture (the backup file). */
export async function allPhotos(): Promise<Photo[]> { return (await tx<Photo[]>("readonly", s => s.getAll())) ?? []; }
/** Put pictures back as they were (the backup file); `clear` empties the store first. */
export async function putPhotos(list: Photo[], clear = false) {
  await tx("readwrite", s => { if (clear) s.clear(); for (const p of list) s.put(p); });
}
