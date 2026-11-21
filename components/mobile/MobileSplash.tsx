"use client";
// The phone's splash (Kim): on the starry linen (the app's background), the gold-thread Yarnity on top with
// "Start making my own pattern book" and a small gold rule, the knitted bird in its lace oval under them.
// Built from its pieces (it was one picture with the oval above the logo; Kim swapped them). Shown on every
// fresh load of the home and 도안 만들기 addresses; a tap anywhere fades it away (0.6s) onto the screen under it.
// Moving between screens inside the app never shows it again (it lives in the root layout and is mounted once).
import { usePathname } from "next/navigation";
import { useState } from "react";
import { FoilLogo } from "@/components/FoilLogo";

export function MobileSplash() {
  const path = usePathname();
  const [splash, setSplash] = useState<"on" | "fading" | "off">(() => (path === "/" || path === "/new" ? "on" : "off"));
  if (splash === "off") return null;
  const leave = () => { setSplash("fading"); setTimeout(() => setSplash("off"), matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 600); };
  return (
    <div className={"m-splash mf-splash" + (splash === "fading" ? " is-fading" : "")}>
      <button type="button" className="m-splash-go" aria-label="Yarnity, 시작하기" onClick={leave}>
        <span className="m-splash-head">
          <FoilLogo className="m-splash-mark" />
          <span className="m-splash-line" lang="en">Start making my own pattern book</span>
          <span className="m-splash-orn" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/mobile/diary/star.webp" alt="" width={14} height={14} />
          </span>
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="m-splash-medal" src="/mobile/diary/lace_bird.webp" alt="" width={840} height={1030} />
      </button>
    </div>
  );
}
