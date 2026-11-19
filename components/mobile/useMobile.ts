"use client";
// Phones (767px and narrower) get the spring-notebook screens (components/mobile/*); 768px and wider keep the
// desktop screens unchanged. null until the browser has answered (the server cannot know): callers then
// render the desktop markup, and mobile.css hides the parts that must not flash on a phone.
import { useSyncExternalStore } from "react";

export const MOBILE_QUERY = "(max-width: 767px)";
const subscribe = (cb: () => void) => { const mq = matchMedia(MOBILE_QUERY); mq.addEventListener("change", cb); return () => mq.removeEventListener("change", cb); };

export function useMobile(): boolean | null {
  return useSyncExternalStore(subscribe, () => matchMedia(MOBILE_QUERY).matches, () => null);
}
