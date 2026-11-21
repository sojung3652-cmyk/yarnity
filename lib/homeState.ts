// Web: whether the / screen is in its home state (the opening has turned into the home), and whether it got there
// instantly (홈 from inside the site) or by Start (the NavBar then slides down with the menu panel). OpeningHome
// writes it; the NavBar and the AI badge read it.
import { useSyncExternalStore } from "react";

type HomeState = { home: boolean; instant: boolean };
let state: HomeState = { home: false, instant: false };
const subs = new Set<() => void>();
export function setHomeState(next: HomeState) { state = next; subs.forEach(f => f()); }
export const useHomeState = () => useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f); }; }, () => state, () => state);
