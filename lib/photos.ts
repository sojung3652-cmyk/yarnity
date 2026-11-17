// 사진 기록: photos of a work, kept in this browser only (IndexedDB "yarnity" / "photos"). localStorage is
// too small for pictures (~5MB in all), so photos never go there. Each photo is shrunk before saving
// (longest side 1280px, JPEG 0.82: ~150-300KB) and stored as a Blob with its work's id and the time.
// Nothing is uploaded anywhere.

export interface Photo { id: string; projectId: string; at: number; blob: Blob }

const DB = "yarnity", STORE = "photos", MAX = 1280;

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => { const s = r.result.createObjectStore(STORE, { keyPath: "id" }); s.createIndex("project", "projectId"); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await open();
  return new Promise((res, rej) => {
    const t = db.transaction(STORE, mode), req = fn(t.objectStore(STORE));
    t.oncomplete = () => { db.close(); res(req ? req.result : undefined); };
    t.onerror = () => { db.close(); rej(t.error); };
  });
}

/** A picture file shrunk to at most 1280px on its longest side, as JPEG. */
export async function shrink(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, MAX / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas"); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height); bmp.close();
  return new Promise((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error("toBlob failed"))), "image/jpeg", 0.82));
}

export async function addPhoto(projectId: string, file: File): Promise<Photo> {
  const p: Photo = { id: "ph" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), projectId, at: Date.now(), blob: await shrink(file) };
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
  for (const p of all) if (!ids.has(p.projectId)) await removePhoto(p.id);
}
