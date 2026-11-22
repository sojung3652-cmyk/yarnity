"use client";
// A 가져온 도안 on the shelf (Kim, S_B): its first page as the cover - the PDF's page 1 drawn small, or the first
// photo - in the same box as a Yarnity book (3 : 4, the body inset as the diary covers' pictures inset theirs),
// with a small ivory cloth tag at the top right, "PDF" or "종이" (dashed stitch, Cormorant Garamond, the shadow to
// the lower left). Styles: imported.css.
import { useEffect, useState } from "react";
import type { Imported } from "@/lib/imported";
import "./imported.css";

/** an object URL for a Blob while it is shown */
export function useBlobUrl(b?: Blob | null) {
  // made and let go inside one effect (a memo + cleanup pair lost the URL under React's double effects in dev)
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!b) { setUrl(null); return; }
    const u = URL.createObjectURL(b); setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [b]);
  return url;
}

export function ImportedCover({ p, w }: { p: Imported; w?: number }) {
  const url = useBlobUrl(p.coverBlob);
  return (
    <span className={"im-cover is-" + p.kind} style={w ? { width: w } : undefined} aria-hidden="true">
      <span className="im-cover-page">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {url && <img src={url} alt="" />}
      </span>
      {/* the tag only where it can be read (not on the gallery's small row picture) */}
      {(!w || w >= 64) && <span className="im-tag" lang={p.kind === "pdf" ? "en" : "ko"}>{p.kind === "pdf" ? "PDF" : "종이"}</span>}
    </span>
  );
}
