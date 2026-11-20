"use client";
// The book. Uses the WebGL (React Three Fiber) book when the browser can render it, otherwise the
// original CSS 3D book. The mode and the open/closed/wizard state come from BookProvider (root layout).
import dynamic from "next/dynamic";
import { Component, type ReactNode } from "react";
import "./Book.css";
import { BookCSS } from "./BookCSS";
import { useBook } from "./BookProvider";

// three.js touches window/WebGL at import time, so it is never server-rendered.
const Book3D = dynamic(() => import("./three/Book3D"), { ssr: false, loading: () => null });

// Any runtime failure inside the 3D tree (shader compile, context creation...) drops to the CSS book.
class Fallback extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e: unknown) { console.warn("[Book3D] falling back to CSS book:", e); noteFail(e); this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

// Why the 3D book gave up, kept so a phone we cannot debug can show it: open /?book=why on that phone.
const FAIL_KEY = "book.fail";
function noteFail(e: unknown) {
  const m = e instanceof Error ? `${e.name}: ${e.message}\n${(e.stack ?? "").split("\n").slice(0, 4).join("\n")}` : String(e);
  try { localStorage.setItem(FAIL_KEY, `${new Date().toISOString()}\n${m}`); } catch {}
}
function Why() {
  let saved = "(기록 없음)", gl = "?";
  try { saved = localStorage.getItem(FAIL_KEY) ?? saved; } catch {}
  try { const c = document.createElement("canvas"), g2 = c.getContext("webgl2"), g = g2 || c.getContext("webgl"); gl = g2 ? "webgl2" : g ? "webgl1" : "none"; g?.getExtension("WEBGL_lose_context")?.loseContext(); } catch (e) { gl = String(e); }
  return <pre style={{ position: "fixed", inset: "auto 8px 90px", zIndex: 99999, background: "#fff", color: "#222", font: "11px/1.4 monospace", padding: 10, whiteSpace: "pre-wrap", wordBreak: "break-all", border: "1px solid #999", borderRadius: 6 }}>{`${gl}\n${navigator.userAgent}\n\n${saved}`}</pre>;
}

export function Book() {
  const b = useBook();
  const why = typeof location !== "undefined" && new URLSearchParams(location.search).get("book") === "why";
  if (b.mode === "pending") return null;
  if (b.mode === "css") return <div className="book-css-slot">{why && <Why />}<BookCSS open={b.view === "home"} setOpen={v => (v ? b.open() : b.close())} /></div>;
  return (
    <Fallback onError={() => b.setMode("css")}>
      {why && <Why />}
      <Book3D onFail={why => { noteFail(why ?? "webglcontextlost"); b.setMode("css"); }} />
    </Fallback>
  );
}
