"use client";
import Link from "next/link";
import { useApp } from "@/components/AppProvider";
import { plan } from "@/lib/pattern";

function Resume() {
  const { ready, active, projects, setActive } = useApp();
  if (!ready) return null;
  const p = active || projects[0]; if (!p) return null;
  const pp = plan(p), cur = p.current || 0; if (cur >= pp.rows.length) return null;
  return (
    <div className="resume">
      <div><span className="small muted">뜨고 있는 작품</span><p style={{ fontSize: 18, fontWeight: 300, letterSpacing: "-.02em" }}>{`${p.name} · ${pp.rows[cur].label}`}</p></div>
      <Link className="btn btn-line" href="/track" onClick={() => setActive(p.id)}>이어서 뜨기</Link>
    </div>
  );
}

// The hero (backdrop, logo, the 3D book) is in the root layout so the book survives / <-> /new;
// this page keeps the first screen free for it and adds what sits below.
export default function Home() {
  return (
    <main id="view-home">
      <div className="book-stage-space" aria-hidden="true" />
      <div className="hero-foot"><span className="tagline">YARNITY · MAKE · TRACK · SHARE</span></div>
      <div id="homeResume"><Resume /></div>
    </main>
  );
}
