// 뜨개 사전 · 커뮤니티 표현 위키 (Kim): the shared 설명 of the community terms (app/api/glossary-wiki). Read once a
// page load; "off" when the server has no wiki (then only the built-in 설명 shows and 고치기 is hidden).
import { useSyncExternalStore } from "react";
import { shortLine, type GlossTerm } from "./glossary";

export interface WikiEdit { id: number; term_id: string; summary: string; author: string; note: string | null; reverts: number | null; created_at: string }
type State = { status: "loading" | "on" | "off"; latest: Record<string, WikiEdit> };

let state: State = { status: "loading", latest: {} }, started = false;
const subs = new Set<() => void>();
const set = (s: State) => { state = s; subs.forEach(f => f()); };
const SERVER: State = { status: "loading", latest: {} };

function load() {
  if (started) return; started = true;
  fetch("/api/glossary-wiki", { cache: "no-store" })
    .then(r => (r.ok ? r.json() : Promise.reject()))
    .then(j => set({ status: "on", latest: j.latest ?? {} }))
    .catch(() => set({ status: "off", latest: {} }));
}

export function useWiki(): State {
  return useSyncExternalStore(f => { subs.add(f); load(); return () => { subs.delete(f); }; }, () => state, () => SERVER);
}

export async function wikiHistory(term: string): Promise<WikiEdit[]> {
  const r = await fetch(`/api/glossary-wiki?term=${encodeURIComponent(term)}`, { cache: "no-store" });
  if (!r.ok) throw new Error("off");
  return (await r.json()).history ?? [];
}

/** a new 판: "busy" when too many changes came in at once, "off" when the wiki can't be reached */
export async function wikiSave(body: { term: string; summary: string; author?: string; note?: string; reverts?: number }): Promise<WikiEdit> {
  const r = await fetch("/api/glossary-wiki", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.edit) throw new Error(j.error ?? "off");
  set({ ...state, latest: { ...state.latest, [body.term]: j.edit } });
  return j.edit;
}

/** a term's one line, from its newest wiki 판 when there is one (the list rows and the detail's head) */
export function useTermLine() {
  const w = useWiki();
  return (t: GlossTerm) => { const e = w.latest[t.id]; return shortLine(e ? { ...t, summary: e.summary } : t); };
}
