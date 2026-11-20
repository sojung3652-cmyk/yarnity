"use client";
// The saved conversations (lib/conversations.ts) as a small store every screen shares: read once from
// localStorage, written back on every change (a message is saved the moment it is sent).
import { useSyncExternalStore } from "react";
import { CHATS_KEY, titleFrom, type CMsg, type CTurn, type Conversation } from "@/lib/conversations";
import { store } from "@/lib/store";

let list: Conversation[] | null = null;
const subs = new Set<() => void>();
const load = () => (list ??= store.get<Conversation[]>(CHATS_KEY, []));
const save = (next: Conversation[]) => { list = next; store.set(CHATS_KEY, next); subs.forEach(f => f()); };
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
const EMPTY: Conversation[] = [];

export function useChats() {
  return useSyncExternalStore(subscribe, load, () => EMPTY);
}

export const chats = {
  get: (id: string) => load().find(c => c.id === id) ?? null,
  /** a new conversation from its first question (it is saved at once) */
  create(first: string, opts: { projectId?: string | null; intro?: CMsg } = {}): Conversation {
    const now = Date.now(), c: Conversation = { id: "c" + now.toString(36), title: titleFrom(first), projectId: opts.projectId ?? null, created: now, updated: now, msgs: opts.intro ? [opts.intro] : [], turns: [] };
    save([c, ...load()]); return c;
  },
  patch(id: string, p: Partial<Conversation>) { save(load().map(c => (c.id === id ? { ...c, ...p } : c))); },
  /** a message (and the turn sent to the AI for it, if any) */
  push(id: string, m: CMsg, turn?: CTurn) {
    save(load().map(c => (c.id === id ? { ...c, updated: m.at, msgs: [...c.msgs, m], turns: turn ? [...c.turns, turn] : c.turns } : c)));
  },
  /** change one message (a proposal applied or kept) */
  setMsg(id: string, i: number, p: Partial<CMsg>) { save(load().map(c => (c.id === id ? { ...c, msgs: c.msgs.map((m, j) => (j === i ? { ...m, ...p } : m)) } : c))); },
  /** a turn that failed is taken back (the words stay on screen as sent) */
  popTurn(id: string) { save(load().map(c => (c.id === id ? { ...c, turns: c.turns.slice(0, -1) } : c))); },
  archive(id: string, on: boolean) { save(load().map(c => (c.id === id ? { ...c, archived: on } : c))); },
  remove(id: string) { save(load().filter(c => c.id !== id)); },
};
