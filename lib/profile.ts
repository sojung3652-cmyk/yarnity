// 나의 프로필 (My Page, Kim): no login yet - kept in this browser (localStorage "iyarn.profile"). The nickname is
// how Yarni calls the user (components/ai/ask.ts sends it, app/api/chat adds it to the rules).
import { useSyncExternalStore } from "react";
import { store } from "./store";

export type Craft = "코바늘" | "대바늘" | "둘 다";
export interface Profile {
  nickname: string;
  /** 뜨개 경력, free text ("입문 6개월") */
  career: string;
  craft: Craft | "";
  /** 자주 쓰는 바늘, free text ("5호 · 3.0mm") */
  hook: string;
  unit: "cm" | "inch";
  /** the avatar picture (lib/photos.ts id); none: the nickname's first letter */
  avatar?: string;
}
const KEY = "iyarn.profile";
export const EMPTY_PROFILE: Profile = { nickname: "", career: "", craft: "", hook: "", unit: "cm" };

let cache: Profile | null = null;
const subs = new Set<() => void>();
export function readProfile(): Profile {
  if (!cache) cache = { ...EMPTY_PROFILE, ...store.get<Partial<Profile>>(KEY, {}) };
  return cache;
}
export function saveProfile(p: Profile) { cache = p; store.set(KEY, p); subs.forEach(f => f()); }
export function useProfile(): Profile {
  return useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f); }; }, readProfile, () => EMPTY_PROFILE);
}
/** the nickname as sent to Yarni: trimmed, short, on one line */
export function nicknameForAi(): string {
  try { return readProfile().nickname.replace(/\s+/g, " ").trim().slice(0, 20); } catch { return ""; }
}
