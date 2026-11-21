"use client";
// The phone's start screen: the embroidered opening (components/opening/OpeningIntro.tsx, Kim). Shown when the
// app is opened on the home or 도안 만들기 address, once a session (sessionStorage); its start button fades it
// away onto the home. Moving between screens inside the app never shows it again (it is mounted once).
// Wide screens keep their own start (the book); this is phones only (Hero renders it for phones).
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { OPENING_SEEN, OpeningIntro } from "@/components/opening/OpeningIntro";

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
  if (!on) return null;
  return <OpeningIntro onDone={() => { decided = false; setOn(false); if (path !== "/") router.push("/"); }} />;
}
