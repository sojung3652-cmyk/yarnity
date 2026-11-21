"use client";
// The saved conversations (lib/conversations.ts) as a small store every screen shares: read once from
// localStorage, written back on every change (a message is saved the moment it is sent). Also the words being
// typed, per conversation (iyarn.chatDrafts), so they are still there after looking at another one.
import { useSyncExternalStore } from "react";
import { CHATS_KEY, migrate, titleFrom, type CMsg, type Conversation } from "@/lib/conversations";
import { store } from "@/lib/store";

const DRAFTS_KEY = "iyarn.chatDrafts";
let list: Conversation[] | null = null;
const subs = new Set<() => void>();
const load = () => (list ??= store.get<Conversation[]>(CHATS_KEY, []).map(migrate));
const save = (next: Conversation[]) => { list = next; store.set(CHATS_KEY, next); subs.forEach(f => f()); };
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
const EMPTY: Conversation[] = [];
const edit = (id: string, fn: (c: Conversation) => Conversation) => save(load().map(c => (c.id === id ? fn(c) : c)));

export function useChats() {
  return useSyncExternalStore(subscribe, load, () => EMPTY);
}

let drafts: Record<string, string> | null = null;
const loadDrafts = () => (drafts ??= store.get<Record<string, string>>(DRAFTS_KEY, {}));

export const chats = {
  get: (id: string) => load().find(c => c.id === id) ?? null,
  /** a new conversation from its first question (it is saved at once) */
  create(first: string, opts: { projectId?: string | null; intro?: CMsg } = {}): Conversation {
    const now = Date.now(), c: Conversation = { id: "c" + now.toString(36), title: titleFrom(first), projectId: opts.projectId ?? null, created: now, updated: now, msgs: opts.intro ? [opts.intro] : [] };
    save([c, ...load()]); return c;
  },
  patch(id: string, p: Partial<Conversation>) { edit(id, c => ({ ...c, ...p })); },
  push(id: string, m: CMsg) { edit(id, c => ({ ...c, updated: m.at, msgs: [...c.msgs, m] })); },
  /** change one message (a proposal applied or kept) */
  setMsg(id: string, i: number, p: Partial<CMsg>) { edit(id, c => ({ ...c, msgs: c.msgs.map((m, j) => (j === i ? { ...m, ...p } : m)) })); },
  /** keep the messages before `i` (a question edited, an answer asked again, a failed answer tried again) */
  cut(id: string, i: number) { edit(id, c => ({ ...c, msgs: c.msgs.slice(0, i) })); },
  star(id: string, on: boolean) { edit(id, c => ({ ...c, starred: on })); },
  archive(id: string, on: boolean) { edit(id, c => ({ ...c, archived: on })); },
  remove(id: string) { save(load().filter(c => c.id !== id)); chats.setDraft(id, ""); },
  /** the words being typed, per conversation ("new" for a new one) */
  draft: (id: string) => loadDrafts()[id] ?? "",
  setDraft(id: string, text: string) {
    const d = { ...loadDrafts() };
    if (text) d[id] = text; else delete d[id];
    drafts = d; store.set(DRAFTS_KEY, d);
  },
};
