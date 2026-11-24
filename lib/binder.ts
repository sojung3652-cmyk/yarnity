// 바인더 (Kim: as Photoshop keeps several files open and goes between them): the drafts being made, as tabs on the
// 3D 만들기 screen. The draft being worked on stays where it always was (the app's draft); the binder keeps the
// others - each either open as a tab, or put away (closed) to be brought back with 불러오기. A draft with nothing
// in it yet is not kept when left.
import type { Draft } from "./types";
import { freshDraft } from "./items";
import { store } from "./store";

export type BinderEntry = { id: string; n: number; draft: Draft; open: boolean; at: number };
type Binder = { list: BinderEntry[]; cur: { id: string; n: number } | null; next: number };
const KEY = "iyarn.binder";
const ev = "iyarn:binder";

const read = (): Binder => { const b = store.get<Binder>(KEY, { list: [], cur: null, next: 1 }); if (!b.cur) { b.cur = { id: newId(), n: b.next++ }; } return b; };
const write = (b: Binder) => { store.set(KEY, b); window.dispatchEvent(new Event(ev)); };
const newId = () => "d" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

/** anything in it differs from a new draft (older drafts carry no itemPicked, so nothing narrower is safe) */
export const hasContent = (d: Draft) => !d.editOf && JSON.stringify({ ...d, name: d.name.trim() }) !== JSON.stringify(freshDraft());
const keep = (b: Binder, d: Draft, open: boolean) => { if (hasContent(d)) b.list.push({ id: b.cur!.id, n: b.cur!.n, draft: JSON.parse(JSON.stringify(d)), open, at: Date.now() }); };

export const binder = {
  /** the tabs: the open drafts and the one being worked on, in the order they were started */
  tabs(current: Draft) {
    const b = read();
    return [...b.list.filter(e => e.open).map(e => ({ id: e.id, n: e.n, draft: e.draft, on: false })), { id: b.cur!.id, n: b.cur!.n, draft: current, on: true }].sort((x, y) => x.n - y.n);
  },
  /** put away (closed tabs), newest first - what 불러오기 lists */
  closed() { return read().list.filter(e => !e.open).sort((x, y) => y.at - x.at); },
  /** another draft to work on (a tab pressed or one brought back): the current one kept as an open tab */
  open(id: string, current: Draft): Draft | null {
    const b = read(), e = b.list.find(x => x.id === id); if (!e) return null;
    b.list = b.list.filter(x => x.id !== id); keep(b, current, true); b.cur = { id: e.id, n: e.n }; write(b); return e.draft;
  },
  /** + : a new draft, the current one kept as an open tab */
  add(current: Draft): Draft { const b = read(); keep(b, current, true); b.cur = { id: newId(), n: b.next++ }; write(b); return freshDraft(); },
  /** a tab closed: put away (not lost - 불러오기 brings it back). Closing the current one goes to the next open
   *  tab, or to a new draft */
  close(id: string, current: Draft): Draft | null {
    const b = read();
    if (id !== b.cur!.id) { const e = b.list.find(x => x.id === id); if (e) e.open = false; write(b); return null; }
    keep(b, current, false);
    const nx = b.list.filter(x => x.open).sort((x, y) => x.n - y.n)[0];
    if (nx) { b.list = b.list.filter(x => x.id !== nx.id); b.cur = { id: nx.id, n: nx.n }; write(b); return nx.draft; }
    b.cur = { id: newId(), n: b.next++ }; write(b); return freshDraft();
  },
  /** a put-away draft thrown out for good (불러오기's 지우기) */
  remove(id: string) { const b = read(); b.list = b.list.filter(x => x.id !== id); write(b); },
  /** 새로 시작하기 from the book: the draft so far is put away, not lost */
  stash(current: Draft) { const b = read(); keep(b, current, false); b.cur = { id: newId(), n: b.next++ }; write(b); },
  /** the current draft saved as a work or thrown away: the next one is a new tab */
  renew() { const b = read(); b.cur = { id: newId(), n: b.next++ }; write(b); },
  subscribe(f: () => void) { window.addEventListener(ev, f); return () => window.removeEventListener(ev, f); },
};
