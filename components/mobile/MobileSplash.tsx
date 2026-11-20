"use client";
// The phone's splash (unchanged from the book flow): the leaf-shadow wall (bg_shadow.webp), the gold foil logo
// with its shine, INTELLIGENT CROCHET, a hairline, MAKE · TRACK · SHARE. Shown on every fresh load of the home
// and 도안 만들기 addresses (Kim); tapping the logo fades it away (0.6s) onto the screen under it. Moving between
// screens inside the app never shows it again (it lives in the root layout and is mounted once).
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
      <button type="button" className="m-splash-logo" aria-label="Yarnity, 시작하기" onClick={leave}>
        <FoilLogo className="m-splash-foil" shine />
      </button>
      <p className="m-splash-cap" lang="en">Intelligent Crochet</p>
      <span className="m-splash-rule" aria-hidden="true" />
      <p className="m-splash-tag" lang="en">Make · Track · Share</p>
    </div>
  );
}
