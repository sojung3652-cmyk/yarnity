"use client";
// The phone's splash (Kim): the knitted bird in its lace oval with the gold-thread Yarnity under it, one picture
// (public/mobile/splash_bird.webp; it replaced the leaf-shadow wall with the foil logo). Shown on every fresh load
// of the home and 도안 만들기 addresses; a tap anywhere fades it away (0.6s) onto the screen under it. Moving
// between screens inside the app never shows it again (it lives in the root layout and is mounted once).
import { usePathname } from "next/navigation";
import { useState } from "react";

export function MobileSplash() {
  const path = usePathname();
  const [splash, setSplash] = useState<"on" | "fading" | "off">(() => (path === "/" || path === "/new" ? "on" : "off"));
  if (splash === "off") return null;
  const leave = () => { setSplash("fading"); setTimeout(() => setSplash("off"), matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 600); };
  return (
    <div className={"m-splash mf-splash" + (splash === "fading" ? " is-fading" : "")}>
      <button type="button" className="m-splash-pic" aria-label="Yarnity, 시작하기" onClick={leave}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/mobile/splash_bird.webp" alt="" width={941} height={1672} />
      </button>
    </div>
  );
}
