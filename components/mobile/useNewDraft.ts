"use client";
// 새 도안 on the phone: a pattern being made (a name typed, or past step 1) is carried on from its step;
// otherwise a fresh draft starts at step 1. The same draft and step keys as the desktop book.
import { useCallback } from "react";
import { useApp } from "@/components/AppProvider";
import { useBook, type WizStep } from "@/components/Book/BookProvider";
import { freshDraft } from "@/lib/items";
import { store } from "@/lib/store";

export const savedStep = (): WizStep => { const s = store.get<number>("iyarn.newstep", 1); return (s >= 1 && s <= 4 ? s : 1) as WizStep; };

export function useDraftState() {
  const { ready, draft } = useApp();
  const step = ready ? savedStep() : 1;
  return { hasDraft: ready && (step > 1 || draft.name.trim() !== ""), step, name: draft.name.trim() };
}

/** start a new pattern from step 1 (the draft cleared) */
export function useStartFresh() {
  const { setDraft } = useApp(), book = useBook();
  return useCallback(() => { setDraft(freshDraft()); store.set("iyarn.newstep", 1); book.startWizard(1); }, [setDraft, book]);
}

/** the bottom bar's 새 도안: carry on with the pattern being made, else a fresh one */
export function useNewDraft() {
  const { hasDraft, step } = useDraftState(), fresh = useStartFresh(), book = useBook();
  return useCallback(() => { if (hasDraft) book.startWizard(step); else fresh(); }, [hasDraft, step, fresh, book]);
}
