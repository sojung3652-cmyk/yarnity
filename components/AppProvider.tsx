"use client";
// App-wide client state. Mirrors the prototype's module-level variables
// (projects, activeId, draft, chat turns) so they survive client-side navigation
// between /new, /pattern, /track the same way they survived hash changes.
import { itemIdOf } from "@/lib/items";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { store } from "@/lib/store";
import { DEFAULT_DRAFT, type Draft, type Project } from "@/lib/types";

export interface ChatMsg { id: number; kind: "ai" | "me" | "note"; text: string; img?: string; applied?: string[]; thinking?: boolean }
export interface ChatTurn { role: "user" | "assistant"; content: string }
export interface ChatState { msgs: ChatMsg[]; chips: string[]; off: boolean; images: boolean; checked: boolean }

interface AppCtx {
  ready: boolean;
  projects: Project[];
  activeId: string | null;
  active: Project | null;
  draft: Draft;
  setDraft: (d: Draft, persist?: boolean) => void;
  addProject: (p: Project) => void;
  updateProject: (id: string, patch: Partial<Project>) => void;
  setActive: (id: string) => void;
  chat: ChatState;
  setChat: (fn: (c: ChatState) => ChatState) => void;
  turns: React.MutableRefObject<ChatTurn[]>;
}

const Ctx = createContext<AppCtx | null>(null);

const INITIAL_CHAT: ChatState = {
  msgs: [{ id: 0, kind: "ai", text: "무엇을 만들고 싶나요? 사진도 괜찮아요." }],
  chips: ["네트백 같은 손가방", "원형 코스터"],
  off: false,
  images: false,
  checked: false,
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraftState] = useState<Draft>(DEFAULT_DRAFT);
  const [chat, setChatState] = useState<ChatState>(INITIAL_CHAT);
  const turns = useRef<ChatTurn[]>([]);
  // refs so the persist helpers always write the latest values (like the prototype's save())
  const pr = useRef(projects), ar = useRef(activeId);

  useEffect(() => {
    // localStorage is only available in the browser, so load after mount.
    // older saves have no item id: a bag was the mini bag, a coaster the coaster
    const p = store.get<Project[]>("iyarn.projects", []).map(x => (x.item ? x : { ...x, item: itemIdOf(x) }));
    const a = store.get<string | null>("iyarn.active", null);
    pr.current = p; ar.current = a;
    setProjects(p); setActiveId(a);
    const d = Object.assign({}, DEFAULT_DRAFT, store.get<Partial<Draft>>("iyarn.draft", {}));
    setDraftState(d.item ? d : { ...d, item: itemIdOf(d) });
    setReady(true);
  }, []);

  const save = useCallback(() => { store.set("iyarn.projects", pr.current); store.set("iyarn.active", ar.current); }, []);

  const setDraft = useCallback((d: Draft, persist = true) => { setDraftState(d); if (persist) store.set("iyarn.draft", d); }, []);
  const addProject = useCallback((p: Project) => {
    pr.current = [p, ...pr.current]; ar.current = p.id; save();
    setProjects(pr.current); setActiveId(p.id);
  }, [save]);
  const updateProject = useCallback((id: string, patch: Partial<Project>) => {
    pr.current = pr.current.map(p => (p.id === id ? { ...p, ...patch } : p)); save();
    setProjects(pr.current);
  }, [save]);
  const setActive = useCallback((id: string) => { ar.current = id; save(); setActiveId(id); }, [save]);
  const setChat = useCallback((fn: (c: ChatState) => ChatState) => setChatState(fn), []);

  const active = useMemo(() => projects.find(p => p.id === activeId) || null, [projects, activeId]);

  const value: AppCtx = { ready, projects, activeId, active, draft, setDraft, addProject, updateProject, setActive, chat, setChat, turns };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useApp must be used inside <AppProvider>");
  return c;
}
