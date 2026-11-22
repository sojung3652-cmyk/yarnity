// 가져온 도안 (web, Kim): a PDF or photos of a paper pattern the user already has, on the 나의 도안집 shelf beside
// Yarnity's own and knitted along on /my/imported/[id]. Kept in this browser only (IndexedDB "yarnity" /
// "importedPatterns", lib/photos.ts openDb): the pages as Blobs (photos shrunk to 1600px on the long side), the
// PDF as it came, a small cover picture, and where the knitting is (단, the marker band, page, zoom). Never
// uploaded or shared. The backup file (lib/backup.ts) carries them as data URLs.
import { useSyncExternalStore } from "react";
import { openDb, shrink } from "./photos";
import { logRow } from "./knitLog";

export type ImportedKind = "pdf" | "photo";
export type ImportedStatus = "new" | "knitting" | "done";
export interface Imported {
  id: string;
  title: string;
  kind: ImportedKind;
  /** photo: the pages in order (the first is the cover) */
  pages?: Blob[];
  /** pdf: the file as it came */
  pdf?: Blob;
  pageCount: number;
  /** a small picture of the first page (the shelf's cover) */
  coverBlob: Blob;
  yarn: string;
  memo: string;
  /** 지금 뜨는 단 */
  row: number;
  /** the marker band on the page: its top and height as shares of the page's height */
  markerY: number;
  markerH: number;
  /** 0-based page shown; zoom (1 = the page fits the width); turns in quarter turns per page */
  page: number;
  zoom: number;
  turns?: Record<number, number>;
  status: ImportedStatus;
  startedAt: number | null;
  finishedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

const STORE = "importedPatterns";
export const MAX_PDF = 30 * 1024 * 1024, MAX_PHOTOS = 30, PHOTO_MAX = 1600;
/** the photo store's key for a pattern's gallery pictures (never dropped as orphans: it has a ":") */
export const importedPhotoKey = (id: string) => "imported:" + id;
export const newImportedId = () => "im" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((res, rej) => {
    const t = db.transaction(STORE, mode), req = fn(t.objectStore(STORE));
    t.oncomplete = () => { db.close(); res(req ? req.result : undefined); };
    t.onerror = () => { db.close(); rej(t.error); };
    t.onabort = () => { db.close(); rej(t.error); };
  });
}

// ---- the list, shared by every screen that shows it
let cache: Imported[] | null = null, loading: Promise<void> | null = null;
const subs = new Set<() => void>();
const EMPTY: Imported[] = [];
const emit = () => subs.forEach(f => f());
function load() {
  if (loading) return loading;
  loading = run<Imported[]>("readonly", s => s.getAll())
    .then(l => { cache = l ?? []; }).catch(() => { cache = []; }).then(emit);
  return loading;
}
export function useImported(): { ready: boolean; list: Imported[] } {
  const list = useSyncExternalStore(f => { subs.add(f); load(); return () => { subs.delete(f); }; }, () => cache ?? EMPTY, () => EMPTY);
  const ready = useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f); }; }, () => cache !== null, () => false);
  return { ready, list };
}
export const readImported = async () => { await load(); return cache ?? []; };

/** "quota": the browser has no room left (said briefly on screen); anything else: could not save */
export class SaveError extends Error {}
const isQuota = (e: unknown) => e instanceof DOMException && (e.name === "QuotaExceededError" || e.code === 22);

let persistAsked = false;
async function askPersist() {
  if (persistAsked) return; persistAsked = true;
  try { if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist(); } catch { /* not offered */ }
}

export async function putImported(p: Imported) {
  askPersist();
  try { await run("readwrite", s => s.put(p)); }
  catch (e) { throw new SaveError(isQuota(e) ? "quota" : "save"); }
  await load();
  cache = [p, ...(cache ?? []).filter(x => x.id !== p.id)];
  emit();
}
/** change some fields (the follow-along screen's state, the details) */
export async function updateImported(id: string, patch: Partial<Imported>) {
  await load();
  const cur = (cache ?? []).find(x => x.id === id); if (!cur) return;
  await putImported({ ...cur, ...patch, updatedAt: Date.now() });
}
export async function removeImported(id: string) {
  await run("readwrite", s => s.delete(id));
  cache = (cache ?? []).filter(x => x.id !== id); emit();
}
export const allImported = async () => (await run<Imported[]>("readonly", s => s.getAll())) ?? [];
export async function putAllImported(list: Imported[], clear = false) {
  await run("readwrite", s => { if (clear) s.clear(); for (const p of list) s.put(p); });
  cache = null; loading = null; load();
}

/** a row knitted (+1) or taken back (-1): the 단, the status and the days log, as 따라 뜨기 does */
export async function stepRow(p: Imported, d: 1 | -1, band: { markerY: number }) {
  const row = Math.max(0, p.row + d);
  if (row === p.row) return p;
  const now = Date.now();
  const patch: Partial<Imported> = { row, markerY: band.markerY };
  if (d > 0 && p.status === "new") { patch.status = "knitting"; patch.startedAt = p.startedAt ?? now; }
  logRow("imported:" + p.id, d, false);
  const next = { ...p, ...patch, updatedAt: now };
  await putImported(next);
  return next;
}
export async function finishImported(p: Imported, done: boolean) {
  const now = Date.now();
  // the days log keeps when it was finished (the gallery's day), as 따라 뜨기 does for Yarnity's patterns
  if (done) logRow("imported:" + p.id, 0, true);
  await putImported({ ...p, status: done ? "done" : (p.row > 0 ? "knitting" : "new"), finishedAt: done ? now : null, updatedAt: now });
}

// ---- making one
/** pdf.js, loaded only when a PDF is read (its worker is served from /pdfjs, the same version: pdfjs-dist 6.4.299) */
export async function pdfjs() {
  const lib = await import("pdfjs-dist");
  if (!lib.GlobalWorkerOptions.workerSrc) lib.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
  return lib;
}
const toJpeg = (c: HTMLCanvasElement, q = .85) => new Promise<Blob>((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error("toBlob"))), "image/jpeg", q));

/** a PDF: its page count and page 1 drawn small for the cover */
export async function readPdf(file: Blob): Promise<{ pageCount: number; cover: Blob }> {
  const lib = await pdfjs();
  const task = lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }), doc = await task.promise;
  try {
    const page = await doc.getPage(1), v0 = page.getViewport({ scale: 1 }), vp = page.getViewport({ scale: 480 / v0.width });
    const c = document.createElement("canvas"); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
    const g = c.getContext("2d")!; g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
    await page.render({ canvas: c, canvasContext: g, viewport: vp }).promise;
    return { pageCount: doc.numPages, cover: await toJpeg(c) };
  } finally { task.destroy(); }
}
/** photos: each shrunk to 1600px; the cover is the first one smaller */
export async function readPhotos(files: File[]): Promise<{ pages: Blob[]; cover: Blob }> {
  const pages = await Promise.all(files.map(f => shrink(f, PHOTO_MAX)));
  const cover = await shrink(new File([pages[0]], "c.jpg", { type: "image/jpeg" }), 480);
  return { pages, cover };
}

export function blankImported(id: string, title: string, kind: ImportedKind): Omit<Imported, "coverBlob" | "pageCount"> {
  const now = Date.now();
  return { id, title, kind, yarn: "", memo: "", row: 0, markerY: .12, markerH: .045, page: 0, zoom: 1, turns: {}, status: "new", startedAt: null, finishedAt: null, createdAt: now, updatedAt: now };
}

/** the shelf's line under the name: "PDF · 6쪽", "종이 · 사진 2장", or "5단" while it is being knitted */
export function importedLine(p: Imported) {
  if (p.status === "done") return "완성";
  if (p.status === "knitting" && p.row > 0) return `${p.row}단`;
  return p.kind === "pdf" ? `PDF · ${p.pageCount}쪽` : `종이 · 사진 ${p.pageCount}장`;
}
