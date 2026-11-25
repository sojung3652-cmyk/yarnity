"use client";
// The phone's start screen: the embroidered opening, made the web's way (components/opening/PhoneOpening.tsx, Kim). Shown when the
// page is opened or reloaded at the home address (Kim: 새로고침하면 다시 시작화면) - not at any other address, and
// not when the home is reached inside the app; its start button (or a press anywhere) takes it onto the home.
// Wide screens keep their own start (the book); this is phones only (Hero renders it for phones).
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PhoneOpening } from "@/components/opening/PhoneOpening";

// decided once per page load: the opening marks itself seen as it starts, so a remount must not ask again
let decided: boolean | null = null;

export function MobileSplash() {
  const path = usePathname(), router = useRouter();
  const [on, setOn] = useState(() => {
    if (decided === null) {
      // the address this page load itself was made at (a reload of the home, or the home opened anew), as the web
      // decides it (OpeningHome)
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      let loadPath = path; try { loadPath = new URL(nav?.name ?? location.href).pathname; } catch {}
      decided = path === "/" && loadPath === "/";
    }
    return decided;
  });
  // once the opening's medallion and logo stay on as the home's (kept), leaving the home takes them away; back on the
  // home, the same scene shows again in its "home" mode
  const kept = useRef<string | null>(null);
  useEffect(() => { if (kept.current !== null && path !== kept.current) { decided = false; setOn(false); } }, [path]);
  // the home's medallion and logo are the opening's scene (Kim: one home, not two); off the home, nothing
  if (!on) return path === "/" ? <PhoneOpening key="home" mode="home" /> : null;
  return <PhoneOpening onKept={() => { kept.current = path; }} onDone={() => { decided = false; setOn(false); if (path !== "/") router.push("/"); }} />;
}
