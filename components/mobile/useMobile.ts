"use client";
// Phones and the web (Kim, 2026-11-25: 모바일은 지금의 웹을 바탕으로, 디자인 레이아웃도 웹을 따라가도록).
//   usePhone()  - is this a phone (767px and narrower)? Only the opening and the home keep their phone screens
//                 (Kim: 오프닝과 홈화면의 틀은 건들지마) - Hero's splash, the home's medallion and buttons.
//   useMobile() - should the old phone-only screens (components/mobile/*) be used? No longer: every other page is
//                 the web's own, laid out for a narrow screen by its CSS. It stays null until the browser has
//                 answered (callers render nothing or the desktop markup until then), then false.
import { useSyncExternalStore } from "react";

export const MOBILE_QUERY = "(max-width: 767.98px)";
const subscribe = (cb: () => void) => { const mq = matchMedia(MOBILE_QUERY); mq.addEventListener("change", cb); return () => mq.removeEventListener("change", cb); };

export function usePhone(): boolean | null {
  return useSyncExternalStore(subscribe, () => matchMedia(MOBILE_QUERY).matches, () => null);
}

export function useMobile(): boolean | null {
  const p = usePhone();
  return p === null ? null : false;
}
