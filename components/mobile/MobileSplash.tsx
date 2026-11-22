"use client";
// The phone's start screen: the embroidered opening, made the web's way (components/opening/PhoneOpening.tsx, Kim). Shown when the
// app is opened on the home or 도안 만들기 address, once a session (sessionStorage); its start button fades it
// away onto the home. Moving between screens inside the app never shows it again (it is mounted once).
// Wide screens keep their own start (the book); this is phones only (Hero renders it for phones).
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { OPENING_SEEN, PhoneOpening } from "@/components/opening/PhoneOpening";

// decided once per page load: the opening marks itself seen as it starts, so a remount must not ask again
let decided: boolean | null = null;

export function MobileSplash() {
  const path = usePathname(), router = useRouter();
  const [on, setOn] = useState(() => {
    if (decided === null) {
      if (path !== "/" && path !== "/new") decided = false;
      else { try { decided = !sessionStorage.getItem(OPENING_SEEN); } catch { decided = true; } }
    }
    return decided;
  });
  // once the opening's medallion and logo stay on as the home's (kept), leaving the home takes them away; back on the
  // home, the home's own glinting logo shows
  const kept = useRef<string | null>(null);
  useEffect(() => { if (kept.current !== null && path !== kept.current) { decided = false; setOn(false); } }, [path]);
  if (!on) return null;
  return <PhoneOpening onKept={() => { kept.current = path; }} onDone={() => { decided = false; setOn(false); if (path !== "/") router.push("/"); }} />;
}
